/**
 * orbCapabilities — wires previously unwired backend capabilities into the
 * Zoe orb chat WITHOUT changing any orb UI, icons or existing flows.
 *
 * Each capability is:
 *  - detected from plain text (or from the attachment type),
 *  - executed against its backend function,
 *  - returned as plain text that the orb renders through its normal
 *    assistant-message path.
 *
 * Every runner degrades gracefully: a missing key, a 401 or an outage returns
 * `{ ok: false, text }` so the orb can fall back to its existing brain instead
 * of surfacing a raw error.
 */
import { supabase } from '@/integrations/supabase/client';

export type OrbCapability = 'document_xray' | 'song_id' | 'provider_status';

export interface OrbCapabilityResult {
  ok: boolean;
  capability: OrbCapability;
  text: string;
  /** True when the orb should fall through to its normal pipeline instead. */
  fallback?: boolean;
  data?: unknown;
}

const DOC_PATTERNS = [
  /\b(analy[sz]e|summari[sz]e|read|extract|explain|review|scan)\b[^.?!]{0,40}\b(this |the |my )?(document|doc|pdf|file|contract|invoice|report|paper|resume|cv)\b/i,
  /\bdocument\s+x-?ray\b/i,
  /\b(what|whats|what's)\b[^.?!]{0,20}\b(in|inside)\b[^.?!]{0,10}\b(this |the |my )?(document|pdf|file)\b/i,
];

const SONG_PATTERNS = [
  /\b(what|which|name)\b[^.?!]{0,20}\bsong\b/i,
  /\bidentify\b[^.?!]{0,20}\b(song|track|music|tune)\b/i,
  /\bwhat('| i)?s playing\b/i,
  /\bshazam\b/i,
];

const PROVIDER_PATTERNS = [
  /\b(provider|model|ai)\s+(status|health|check)\b/i,
  /\b(which|what)\b[^.?!]{0,20}\b(models?|providers?)\b[^.?!]{0,20}\b(online|available|up|working|live)\b/i,
  /\bare (your|the) (models|providers|brains)\b[^.?!]{0,20}\b(up|online|working)\b/i,
];

const matches = (text: string, patterns: RegExp[]) => patterns.some((p) => p.test(text));

/** Document / audio attachments can decide the capability on their own. */
export const detectOrbCapability = (
  rawText: string,
  attachment?: { type?: string; mimeType?: string; fileName?: string } | null,
): OrbCapability | null => {
  const text = (rawText || '').trim();
  const mime = (attachment?.mimeType || '').toLowerCase();
  const name = (attachment?.fileName || '').toLowerCase();

  if (attachment) {
    const isAudio = attachment.type === 'audio' || mime.startsWith('audio/');
    if (isAudio && (matches(text, SONG_PATTERNS) || !text)) return 'song_id';

    const isDoc =
      attachment.type === 'document' ||
      mime.includes('pdf') ||
      mime.startsWith('text/') ||
      /\.(pdf|txt|md|csv|docx?|rtf)$/.test(name);
    if (isDoc) return 'document_xray';
  }

  if (!text) return null;
  if (matches(text, PROVIDER_PATTERNS)) return 'provider_status';
  if (matches(text, SONG_PATTERNS)) return 'song_id';
  if (matches(text, DOC_PATTERNS)) return 'document_xray';
  return null;
};

const failure = (capability: OrbCapability, text: string): OrbCapabilityResult => ({
  ok: false,
  capability,
  text,
  fallback: true,
});

export interface DocumentXrayAnalysis {
  extractedText?: string;
  summary?: string;
  keyPoints?: string[];
  documentType?: string;
  wordCount?: number;
  language?: string;
}

export const formatDocumentXray = (analysis: DocumentXrayAnalysis, fileName?: string): string => {
  const lines: string[] = [];
  lines.push(fileName ? `Here's what I read in **${fileName}**:` : "Here's what I read in your document:");
  if (analysis.summary) lines.push('', analysis.summary);
  if (analysis.keyPoints?.length) {
    lines.push('', 'Key points:');
    analysis.keyPoints.slice(0, 6).forEach((p) => lines.push(`• ${p}`));
  }
  const meta: string[] = [];
  if (analysis.documentType) meta.push(analysis.documentType);
  if (analysis.wordCount) meta.push(`${analysis.wordCount} words`);
  if (meta.length) lines.push('', `_${meta.join(' · ')}_`);
  if (!analysis.summary && !analysis.keyPoints?.length && analysis.extractedText) {
    lines.push('', analysis.extractedText.slice(0, 1200));
  }
  return lines.join('\n').trim();
};

/** POST the file to zoe-document-xray (multipart, authenticated). */
export const runDocumentXray = async (
  file: File,
  userId?: string,
): Promise<OrbCapabilityResult> => {
  try {
    const form = new FormData();
    form.append('file', file);
    if (userId) form.append('userId', userId);
    form.append('analysisType', 'full');

    const { data, error } = await supabase.functions.invoke('zoe-document-xray', { body: form });
    if (error) return failure('document_xray', `Document reader unavailable: ${error.message}`);

    const payload = data as { success?: boolean; analysis?: DocumentXrayAnalysis; fileName?: string; error?: string };
    if (!payload?.success || !payload.analysis) {
      return failure('document_xray', payload?.error || 'The document reader returned nothing usable.');
    }
    return {
      ok: true,
      capability: 'document_xray',
      text: formatDocumentXray(payload.analysis, payload.fileName ?? file.name),
      data: payload.analysis,
    };
  } catch (e) {
    return failure('document_xray', (e as Error)?.message ?? 'Document reader failed.');
  }
};

export interface IdentifiedSong {
  title?: string;
  artist?: string;
  album?: string;
  release_date?: string;
  genre?: string;
}

export const formatSong = (song: IdentifiedSong): string => {
  const bits = [`🎵 That's **${song.title ?? 'an unknown track'}**`];
  if (song.artist) bits.push(`by ${song.artist}`);
  const tail: string[] = [];
  if (song.album) tail.push(song.album);
  if (song.release_date) tail.push(song.release_date);
  if (song.genre) tail.push(song.genre);
  return `${bits.join(' ')}${tail.length ? `\n\n_${tail.join(' · ')}_` : ''}`;
};

/** base64-encode an audio blob without blowing the call stack on big files. */
export const fileToBase64 = async (file: Blob): Promise<string> => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < buffer.length; i += CHUNK) {
    binary += String.fromCharCode(...buffer.subarray(i, Math.min(i + CHUNK, buffer.length)));
  }
  return btoa(binary);
};

export const runSongIdentification = async (file: Blob): Promise<OrbCapabilityResult> => {
  try {
    const audio = await fileToBase64(file);
    const { data, error } = await supabase.functions.invoke('identify-song', { body: { audio } });
    if (error) return failure('song_id', `Song recognition unavailable: ${error.message}`);

    const payload = data as { success?: boolean; identified?: boolean; song?: IdentifiedSong; message?: string };
    if (payload?.identified && payload.song) {
      return { ok: true, capability: 'song_id', text: formatSong(payload.song), data: payload.song };
    }
    return failure('song_id', payload?.message || "I couldn't recognise that audio clearly enough.");
  } catch (e) {
    return failure('song_id', (e as Error)?.message ?? 'Song recognition failed.');
  }
};

export interface ProviderStatusPayload {
  ok?: boolean;
  keys?: Record<string, boolean>;
  tiers?: Array<{ tier?: number | string; name?: string; label?: string; ok?: boolean; healthy?: boolean; keyPresent?: boolean }>;
  results?: Array<{ model?: string; ok?: boolean; status?: number }>;
}

export const formatProviderStatus = (payload: ProviderStatusPayload): string => {
  const lines = ['Here is my current provider wiring:'];
  const keys = payload.keys ?? {};
  const configured = Object.entries(keys).filter(([, v]) => v).map(([k]) => k);
  const missing = Object.entries(keys).filter(([, v]) => !v).map(([k]) => k);
  if (configured.length) lines.push('', `✅ Configured: ${configured.join(', ')}`);
  if (missing.length) lines.push(`⚠️ Not configured: ${missing.join(', ')}`);
  if (payload.tiers?.length) {
    lines.push('', 'Cascade tiers:');
    payload.tiers.forEach((t) => {
      const label = t.label ?? t.name ?? t.tier ?? 'tier';
      const healthy = t.ok ?? t.healthy ?? t.keyPresent;
      lines.push(`• ${label}${healthy === undefined ? '' : healthy ? ' — online' : ' — offline'}`);
    });
  }
  if (payload.results?.length) {
    lines.push('', 'Model probes:');
    payload.results.forEach((r) => lines.push(`• ${r.model ?? 'model'} — ${r.ok ? 'pong' : `failed${r.status ? ` (${r.status})` : ''}`}`));
  }
  return lines.join('\n');
};

export const runProviderStatus = async (): Promise<OrbCapabilityResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('provider-health', {
      body: { ping: false },
    });
    if (error) return failure('provider_status', `Provider status unavailable: ${error.message}`);
    return {
      ok: true,
      capability: 'provider_status',
      text: formatProviderStatus((data ?? {}) as ProviderStatusPayload),
      data,
    };
  } catch (e) {
    return failure('provider_status', (e as Error)?.message ?? 'Provider status failed.');
  }
};

/** Single entry point used by the orb. */
export const runOrbCapability = async (
  capability: OrbCapability,
  ctx: { file?: File | Blob | null; userId?: string },
): Promise<OrbCapabilityResult> => {
  switch (capability) {
    case 'document_xray':
      return ctx.file
        ? runDocumentXray(ctx.file as File, ctx.userId)
        : failure('document_xray', 'Attach the document and I will read it for you.');
    case 'song_id':
      return ctx.file
        ? runSongIdentification(ctx.file)
        : failure('song_id', 'Record or attach a short audio clip and I will name the track.');
    case 'provider_status':
      return runProviderStatus();
    default:
      return failure(capability, 'Unknown capability.');
  }
};
