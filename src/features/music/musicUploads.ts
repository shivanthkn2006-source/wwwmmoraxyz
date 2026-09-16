import { supabase } from '@/integrations/supabase/client';
import { logMusicEvent } from './musicDiagnostics';
import type { MusicTrack } from './musicProviders';

const BUCKET = 'music-uploads';
const SIGNED_SECONDS = 60 * 60;
const MAX_STORED_BYTES = 12 * 1024 * 1024;

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

async function decode(file: File): Promise<AudioBuffer> {
  const context = new AudioContext();
  try { return await context.decodeAudioData(await file.arrayBuffer()); }
  finally { await context.close(); }
}

/** Encodes uploads to compact 96kbps MP3 when that makes the file smaller. */
export async function compactAudio(file: File): Promise<{ blob: Blob; duration: number; compressed: boolean }> {
  if (!file.type.startsWith('audio/')) throw new Error('Choose an audio file.');
  const decoded = await decode(file);
  const duration = Math.round(decoded.duration);
  try {
    // lamejs ships CommonJS, so the encoder can arrive on the module or on its default interop object.
    const lame = (await import('lamejs')) as unknown as Record<string, unknown> & { default?: Record<string, unknown> };
    const Mp3Encoder = (lame.Mp3Encoder ?? lame.default?.Mp3Encoder) as
      | (new (channels: number, sampleRate: number, kbps: number) => { encodeBuffer: (l: Int16Array, r?: Int16Array) => Uint8Array | number[]; flush: () => Uint8Array | number[] })
      | undefined;
    if (!Mp3Encoder) throw new Error('encoder unavailable');
    const channels = Math.min(decoded.numberOfChannels, 2);
    const encoder = new Mp3Encoder(channels, decoded.sampleRate, 96);
    const block = 1152;
    const chunks: ArrayBuffer[] = [];
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
      if (encoded.length) chunks.push(Uint8Array.from(encoded).buffer);
    }
    const tail = encoder.flush();
    if (tail.length) chunks.push(Uint8Array.from(tail).buffer);
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    if (blob.size > 0 && blob.size < file.size && blob.size <= MAX_STORED_BYTES) return { blob, duration, compressed: true };
  } catch (error) {
    // Retain an already-small original when conversion is unavailable, but record why.
    logMusicEvent('upload:convert', error, { fileName: file.name, bytes: file.size, type: file.type });
  }
  if (file.size > MAX_STORED_BYTES) throw new Error('This file cannot be reduced below 12 MB.');
  return { blob: file, duration, compressed: false };
}

async function signedUrl(path: string | null): Promise<string | undefined> {
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_SECONDS);
  return error ? undefined : data.signedUrl;
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
  if (error || !data) return null;
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
  if (audioResult.error) throw audioResult.error;
  if (draft.artwork && artworkPath) {
    const artResult = await supabase.storage.from(BUCKET).upload(artworkPath, draft.artwork, { contentType: draft.artwork.type, upsert: false });
    if (artResult.error) { await supabase.storage.from(BUCKET).remove([audioPath]); throw artResult.error; }
  }
  const { data, error } = await supabase.from('music_uploads').insert({
    user_id: user.id, title: draft.title.trim(), artist: draft.artist.trim() || 'My music', album: draft.album?.trim() || null,
    storage_path: audioPath, artwork_path: artworkPath, mime_type: compacted.blob.type || draft.file.type,
    duration_seconds: compacted.duration, file_size_bytes: compacted.blob.size,
  }).select('id,title,artist,album,storage_path,artwork_path,duration_seconds').single();
  if (error) { await supabase.storage.from(BUCKET).remove([audioPath, ...(artworkPath ? [artworkPath] : [])]); throw error; }
  const tracks = await rowsToTracks([data as UploadRow]);
  if (!tracks[0]) throw new Error('The upload was saved but could not be opened.');
  // A new upload counts as one play, so it appears on the Home listening shelf right away.
  try {
    const { logListen } = await import('./musicSocial');
    await logListen(tracks[0]);
  } catch {
    // History is best-effort: never fail the upload because the shelf entry could not be written.
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
