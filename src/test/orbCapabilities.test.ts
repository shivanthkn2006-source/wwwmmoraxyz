import { describe, it, expect } from 'vitest';
import {
  detectOrbCapability,
  formatDocumentXray,
  formatSong,
  formatProviderStatus,
} from '@/lib/orbCapabilities';

describe('detectOrbCapability', () => {
  it('detects document analysis from text', () => {
    expect(detectOrbCapability('Zoe, summarize this pdf please')).toBe('document_xray');
    expect(detectOrbCapability('analyze the contract')).toBe('document_xray');
  });

  it('detects song identification', () => {
    expect(detectOrbCapability('what song is this?')).toBe('song_id');
    expect(detectOrbCapability('identify this track')).toBe('song_id');
  });

  it('detects provider status', () => {
    expect(detectOrbCapability('provider status')).toBe('provider_status');
    expect(detectOrbCapability('which models are online?')).toBe('provider_status');
  });

  it('returns null for ordinary chat', () => {
    expect(detectOrbCapability('hey Zoe, how are you today?')).toBeNull();
    expect(detectOrbCapability('')).toBeNull();
  });

  it('routes document attachments even without text', () => {
    expect(
      detectOrbCapability('', { type: 'document', mimeType: 'application/pdf', fileName: 'a.pdf' }),
    ).toBe('document_xray');
  });

  it('routes audio attachments to song id', () => {
    expect(detectOrbCapability('', { type: 'audio', mimeType: 'audio/mp3' })).toBe('song_id');
  });

  it('does not hijack image attachments', () => {
    expect(detectOrbCapability('what is this?', { type: 'image', mimeType: 'image/png' })).toBeNull();
  });
});

describe('formatters', () => {
  it('formats a document analysis', () => {
    const text = formatDocumentXray(
      { summary: 'A lease agreement.', keyPoints: ['12 month term', 'No pets'], documentType: 'contract', wordCount: 900 },
      'lease.pdf',
    );
    expect(text).toContain('lease.pdf');
    expect(text).toContain('12 month term');
    expect(text).toContain('contract');
  });

  it('formats a song', () => {
    expect(formatSong({ title: 'Reptilia', artist: 'The Strokes' })).toContain('Reptilia');
  });

  it('formats provider status with configured and missing keys', () => {
    const out = formatProviderStatus({ keys: { GEMINI: true, GROQ: false }, tiers: [{ label: 'T1', ok: true }] });
    expect(out).toContain('✅ Configured: GEMINI');
    expect(out).toContain('⚠️ Not configured: GROQ');
    expect(out).toContain('T1 — online');
  });
});

describe('relevance ranking', () => {
  it('detects feed ranking intents', async () => {
    const { detectOrbCapability } = await import('@/lib/orbCapabilities');
    expect(detectOrbCapability('rank my feed')).toBe('relevance_rank');
    expect(detectOrbCapability('what should I read today?')).toBe('relevance_rank');
    expect(detectOrbCapability('show me the most relevant posts')).toBe('relevance_rank');
  });

  it('formats ranked posts', async () => {
    const { formatRelevance } = await import('@/lib/orbCapabilities');
    const out = formatRelevance([{ id: '1', content: 'Deep work notes', relevance_score: 0.82 }]);
    expect(out).toContain('Deep work notes');
    expect(out).toContain('82% match');
  });

  it('handles an empty ranking', async () => {
    const { formatRelevance } = await import('@/lib/orbCapabilities');
    expect(formatRelevance([])).toContain('nothing');
  });
});
