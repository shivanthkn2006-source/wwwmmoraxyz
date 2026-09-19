import { supabase } from '@/integrations/supabase/client';
import { logMusicEvent } from './musicDiagnostics';
import type { MusicTrack } from './musicProviders';

const BUCKET = 'music-uploads';
const SIGNED_SECONDS = 60 * 60;
export const MAX_STORED_BYTES = 150 * 1024 * 1024;
const COMPRESSED_AUDIO = /(mpeg|mp3|mp4|m4a|aac|ogg|opus|webm)/i;


export interface MusicUploadDraft {
  file: File;
  artwork?: File | null;
  title: string;
  artist: string;
  album?: string;
}

type UploadRow = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  storage_path: string;
  artwork_path: string | null;
  duration_seconds: number | null;
};

function safeName(value: string): string {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 100) || 'track';
}

function looksLikeAudio(file: File): boolean {
  if (file.type.startsWith('audio/') || file.type.startsWith('video/mp4')) return true;
  // Phones sometimes hand over a file with no type at all, so fall back to the name.
  return /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|aif|aiff|wma)$/i.test(file.name);
}

/** Reads the playing length without decoding the whole song, so phones stay responsive. */
async function probeDuration(file: File): Promise<number> {
  if (typeof Audio === 'undefined' || typeof URL?.createObjectURL !== 'function') return 0;
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve) => {
      const probe = new Audio();
      const finish = (value: number) => resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
      const timer = setTimeout(() => finish(0), 8000);
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => { clearTimeout(timer); finish(probe.duration); };
      probe.onerror = () => { clearTimeout(timer); finish(0); };
      probe.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

async function decode(file: File): Promise<AudioBuffer> {
  const Context = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) throw new Error('This browser cannot read that audio file.');
  const context = new Context();
  try { return await context.decodeAudioData(await file.arrayBuffer()); }
  finally { await context.close(); }
}

/** Encodes to 96 kbps MP3. Only used when the original is uncompressed or too large. */
async function encodeMp3(file: File): Promise<{ blob: Blob; duration: number }> {
  const decoded = await decode(file);
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const channels = Math.min(decoded.numberOfChannels, 2);
  const encoder = new Mp3Encoder(channels, decoded.sampleRate, 96);
  const block = 1152;
  const chunks: Uint8Array[] = [];
  const pcm = Array.from({ length: channels }, (_, channel) => {
    const source = decoded.getChannelData(channel);
    const output = new Int16Array(source.length);
    for (let i = 0; i < source.length; i += 1) output[i] = Math.max(-32768, Math.min(32767, Math.round(source[i] * 32767)));
    return output;
  });
  for (let i = 0; i < pcm[0].length; i += block) {
    const encoded = channels === 1
      ? encoder.encodeBuffer(pcm[0].subarray(i, i + block))
      : encoder.encodeBuffer(pcm[0].subarray(i, i + block), pcm[1].subarray(i, i + block));
    if (encoded.length) chunks.push(Uint8Array.from(encoded));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(Uint8Array.from(tail));
  return { blob: new Blob(chunks as BlobPart[], { type: 'audio/mpeg' }), duration: Math.round(decoded.duration) };
}

/**
 * Prepares a picked song for storage. Already-compressed songs (MP3, M4A, AAC,
 * OGG) are kept exactly as they are, which is both faster and safer on a phone;
 * only uncompressed or oversized files are converted to a compact MP3.
 */
export async function compactAudio(file: File): Promise<{ blob: Blob; duration: number; compressed: boolean }> {
  if (!looksLikeAudio(file)) throw new Error('Choose an audio file, for example an MP3 or M4A.');
  if (!file.size) throw new Error('That file is empty. Pick the song again.');
  const alreadyCompressed = COMPRESSED_AUDIO.test(file.type) || /\.(mp3|m4a|aac|ogg|oga|opus)$/i.test(file.name);
  if (alreadyCompressed && file.size <= MAX_STORED_BYTES) {
    return { blob: file, duration: await probeDuration(file), compressed: false };
  }
  try {
    const encoded = await encodeMp3(file);
    if (encoded.blob.size > 0 && encoded.blob.size <= MAX_STORED_BYTES) {
      return { blob: encoded.blob, duration: encoded.duration, compressed: encoded.blob.size < file.size };
    }
    if (file.size <= MAX_STORED_BYTES) return { blob: file, duration: encoded.duration, compressed: false };
    throw new Error(`This song is ${Math.round(encoded.blob.size / (1024 * 1024))} MB even after compressing. Please pick a shorter recording.`);
  } catch (error) {
    logMusicEvent('upload:convert', error, { fileName: file.name, bytes: file.size, type: file.type });
    if (file.size > MAX_STORED_BYTES) {
      throw new Error(`This song is ${Math.round(file.size / (1024 * 1024))} MB. Songs up to 150 MB can be uploaded.`);
    }
    return { blob: file, duration: await probeDuration(file), compressed: false };
  }
}


/** Signs a private upload path, retrying once so a flaky connection is survivable. */
async function signedUrl(path: string | null, attempts = 2): Promise<string | undefined> {
  if (!path) return undefined;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_SECONDS);
      if (!error && data?.signedUrl) return data.signedUrl;
      logMusicEvent('artwork:resign', error ?? 'No signed link was returned.', { path, attempt });
    } catch (error) {
      logMusicEvent('artwork:resign', error, { path, attempt });
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }
  return undefined;
}

async function rowsToTracks(rows: UploadRow[]): Promise<MusicTrack[]> {
  return Promise.all(rows.map(async (row) => ({
    id: `upload:${row.id}`,
    uploadId: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album ?? undefined,
    artwork: await signedUrl(row.artwork_path),
    url: (await signedUrl(row.storage_path)) ?? '',
    duration: row.duration_seconds ?? undefined,
    source: 'upload' as const,
    credit: 'My upload',
  }))).then((tracks) => tracks.filter((track) => Boolean(track.url)));
}

/**
 * Uploads are stored privately, so their playable link is only valid for a
 * limited time. Playback always mints a fresh link (and fresh album art) from
 * the stable upload id, which is what keeps saved songs and listening history
 * playable days later.
 */
export async function refreshUploadTrack(track: MusicTrack): Promise<MusicTrack | null> {
  const id = (track as MusicTrack & { uploadId?: string }).uploadId ?? track.id.replace(/^upload:/, '');
  if (!id) return null;
  const { data, error } = await supabase
    .from('music_uploads')
    .select('id,title,artist,album,storage_path,artwork_path,duration_seconds')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) {
    logMusicEvent('playback:retry', error ?? 'This upload is no longer in your library.', { uploadId: id });
    return null;
  }
  const [fresh] = await rowsToTracks([data as UploadRow]);
  return fresh ?? null;
}

export async function listMyUploads(): Promise<MusicTrack[]> {
  const { data, error } = await supabase.from('music_uploads').select('id,title,artist,album,storage_path,artwork_path,duration_seconds').order('created_at', { ascending: false });
  if (error) throw error;
  return rowsToTracks((data ?? []) as UploadRow[]);
}

export async function searchMyUploads(query: string): Promise<MusicTrack[]> {
  const needle = query.trim().toLowerCase();
  const tracks = await listMyUploads();
  if (!needle) return tracks;
  return tracks.filter((track) => `${track.title} ${track.artist} ${track.album ?? ''}`.toLowerCase().includes(needle));
}

export async function uploadMyMusic(draft: MusicUploadDraft): Promise<{ track: MusicTrack; compressed: boolean }> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Sign in to upload music.');
  const compacted = await compactAudio(draft.file);
  const token = crypto.randomUUID();
  const audioPath = `${user.id}/${token}/${safeName(draft.title)}.${compacted.compressed ? 'mp3' : safeName(draft.file.name.split('.').pop() ?? 'audio')}`;
  const artworkPath = draft.artwork ? `${user.id}/${token}/cover.${safeName(draft.artwork.name.split('.').pop() ?? 'jpg')}` : null;
  const audioResult = await supabase.storage.from(BUCKET).upload(audioPath, compacted.blob, { contentType: compacted.blob.type, upsert: false });
  if (audioResult.error) { logMusicEvent('upload:store', audioResult.error, { path: audioPath, bytes: compacted.blob.size }); throw audioResult.error; }
  if (draft.artwork && artworkPath) {
    const artResult = await supabase.storage.from(BUCKET).upload(artworkPath, draft.artwork, { contentType: draft.artwork.type, upsert: false });
    if (artResult.error) { logMusicEvent('upload:store', artResult.error, { path: artworkPath, kind: 'artwork' }); await supabase.storage.from(BUCKET).remove([audioPath]); throw artResult.error; }
  }
  const { data, error } = await supabase.from('music_uploads').insert({
    user_id: user.id, title: draft.title.trim(), artist: draft.artist.trim() || 'My music', album: draft.album?.trim() || null,
    storage_path: audioPath, artwork_path: artworkPath, mime_type: compacted.blob.type || draft.file.type,
    duration_seconds: compacted.duration > 0 ? compacted.duration : null, file_size_bytes: compacted.blob.size,
  }).select('id,title,artist,album,storage_path,artwork_path,duration_seconds').single();
  if (error) { logMusicEvent('upload:store', error, { stage: 'record' }); await supabase.storage.from(BUCKET).remove([audioPath, ...(artworkPath ? [artworkPath] : [])]); throw error; }
  const tracks = await rowsToTracks([data as UploadRow]);
  if (!tracks[0]) throw new Error('The upload was saved but could not be opened.');
  // A new upload counts as one play, so it appears on the Home listening shelf right away.
  try {
    const { logListen } = await import('./musicSocial');
    await logListen(tracks[0]);
  } catch (historyError) {
    // History is best-effort: never fail the upload because the shelf entry could not be written.
    logMusicEvent('upload:history', historyError, { trackId: tracks[0].id });
  }
  return { track: tracks[0], compressed: compacted.compressed };

}

export async function deleteMyUpload(trackId: string): Promise<void> {
  const id = trackId.replace(/^upload:/, '');
  const { data, error } = await supabase.from('music_uploads').select('storage_path,artwork_path').eq('id', id).single();
  if (error) throw error;
  const paths = [data.storage_path, data.artwork_path].filter((path): path is string => Boolean(path));
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  const result = await supabase.from('music_uploads').delete().eq('id', id);
  if (result.error) throw result.error;
}
