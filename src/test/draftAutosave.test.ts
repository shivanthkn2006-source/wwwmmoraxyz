/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DRAFT_MAX_FILE_BYTES,
  DRAFT_TTL_MS,
  clearDraft,
  filesWithinCap,
  hasDraftContent,
  loadDraft,
  saveDraft,
  type DraftFileStore,
} from '@/lib/draftAutosave';

const memoryStore = (): DraftFileStore => {
  const map = new Map<string, File[]>();
  return {
    get: async (surface) => map.get(surface) ?? [],
    put: async (surface, files) => void map.set(surface, files),
    clear: async (surface) => void map.delete(surface),
  };
};

const textFile = (name: string, size: number) => new File([new Uint8Array(size)], name, { type: 'image/png' });

beforeEach(() => localStorage.clear());

describe('draft autosave', () => {
  it('round-trips typed text through a reload', async () => {
    const files = memoryStore();
    await saveDraft('home-post', { title: 'Monsoon walk', text: 'Draft body', tags: 'rain' }, [], files);
    const draft = await loadDraft('home-post', files);
    expect(draft?.values).toEqual({ title: 'Monsoon walk', text: 'Draft body', tags: 'rain' });
  });

  it('round-trips chosen files with their bytes', async () => {
    const files = memoryStore();
    await saveDraft('home-post', { title: 'x' }, [textFile('photo.png', 128)], files);
    const draft = await loadDraft('home-post', files);
    expect(draft?.files).toHaveLength(1);
    expect(draft?.files[0].name).toBe('photo.png');
    expect(draft?.files[0].size).toBe(128);
  });

  it('drops a draft older than the retention window and clears its files', async () => {
    const files = memoryStore();
    await saveDraft('home-post', { title: 'old' }, [textFile('a.png', 8)], files);
    const raw = JSON.parse(localStorage.getItem('mmora-draft:home-post')!);
    localStorage.setItem('mmora-draft:home-post', JSON.stringify({ ...raw, savedAt: Date.now() - DRAFT_TTL_MS - 1000 }));
    expect(await loadDraft('home-post', files)).toBeNull();
    expect(await files.get('home-post')).toEqual([]);
    expect(localStorage.getItem('mmora-draft:home-post')).toBeNull();
  });

  it('clears the draft when every field is emptied', async () => {
    const files = memoryStore();
    await saveDraft('home-post', { title: 'something' }, [], files);
    await saveDraft('home-post', { title: '', text: '' }, [], files);
    expect(await loadDraft('home-post', files)).toBeNull();
  });

  it('keeps text but skips files past the size cap', async () => {
    const files = memoryStore();
    await saveDraft('home-post', { title: 'big' }, [textFile('huge.png', DRAFT_MAX_FILE_BYTES + 1)], files);
    const draft = await loadDraft('home-post', files);
    expect(draft?.values.title).toBe('big');
    expect(draft?.files).toEqual([]);
  });

  it('keeps only the files that fit under the cap, in order', () => {
    const kept = filesWithinCap([textFile('a', DRAFT_MAX_FILE_BYTES - 10), textFile('b', 20), textFile('c', 5)]);
    expect(kept.map((f) => f.name)).toEqual(['a']);
  });

  it('never throws when storage is full or unavailable', async () => {
    const failing: DraftFileStore = {
      get: async () => { throw new Error('blocked'); },
      put: async () => { throw new Error('full'); },
      clear: async () => { throw new Error('full'); },
    };
    await expect(saveDraft('home-post', { title: 'x' }, [textFile('a', 1)], failing)).resolves.toBeUndefined();
    await expect(clearDraft('home-post', failing)).resolves.toBeUndefined();
  });

  it('treats whitespace-only text with no files as empty', () => {
    expect(hasDraftContent({ title: '   ', text: '' }, [])).toBe(false);
    expect(hasDraftContent({ title: '', text: '' }, [textFile('a', 1)])).toBe(true);
  });

  it('clearDraft removes both text and files', async () => {
    const files = memoryStore();
    await saveDraft('submit-joke', { title: 'joke' }, [textFile('a', 4)], files);
    await clearDraft('submit-joke', files);
    expect(await loadDraft('submit-joke', files)).toBeNull();
  });
});
