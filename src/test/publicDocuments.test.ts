import { describe, expect, it } from 'vitest';
import { filterPublicDocuments, PUBLIC_DOCUMENTS } from '@/config/publicDocuments';
import { isPublicDocumentRoute } from '@/lib/publicDocumentRoutes';

describe('public document boundaries', () => {
  it('does not give pending India, Singapore or US notices a published link', () => {
    for (const id of ['india', 'singapore', 'us']) {
      const doc = PUBLIC_DOCUMENTS.find(item => item.id === id);
      expect(doc?.status).toBe('Draft for review');
      expect(doc?.summary?.some(p => p.includes('Shivanth KN'))).toBe(true);
      expect(doc?.summary?.some(p => p.includes('draft until legal review'))).toBe(true);
      expect(doc?.href).toBeUndefined();
    }
  });
  it('never publishes corporate or admin file addresses', () => {
    const published = PUBLIC_DOCUMENTS.flatMap(doc => doc.href ? [doc.href] : []);
    expect(published.length).toBe(4);
    expect(published.every(path => ['/terms', '/data-policy'].includes(path))).toBe(true);
  });
  it('country filter retains common policies without another country notice', () => {
    const ids = filterPublicDocuments('', 'India').map(doc => doc.id);
    expect(ids).toContain('india');
    expect(ids).toContain('terms');
    expect(ids).not.toContain('singapore');
    expect(ids).not.toContain('us');
  });
  it('search narrows document results', () => {
    expect(filterPublicDocuments('Singapore', 'All regions').map(doc => doc.id)).toEqual(['singapore']);
    expect(filterPublicDocuments('no-such-document', 'All regions')).toEqual([]);
  });
  it('light document classification excludes member, admin and lookalike paths', () => {
    expect(isPublicDocumentRoute('/documents')).toBe(true);
    for (const path of ['/privacy', '/admin/vault', '/home', '/documents/private']) expect(isPublicDocumentRoute(path)).toBe(false);
  });
});