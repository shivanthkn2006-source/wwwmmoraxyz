/**
 * Local-first draft autosave.
 *
 * Typed text and chosen files are kept on the member's own device
 * (localStorage for text, IndexedDB for files) so an internet drop, reload or
 * accidental navigation never loses work in progress. Nothing leaves the
 * device until the member publishes; publishing or cancelling clears the draft.
 */
import Dexie, { type EntityTable } from 'dexie';

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Files above this total size are not kept; text is always kept. */
export const DRAFT_MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface DraftPayload {
  values: Record<string, string>;
  files: File[];
  savedAt: number;
}

export interface DraftFileStore {
  get(surface: string): Promise<File[]>;
  put(surface: string, files: File[]): Promise<void>;
  clear(surface: string): Promise<void>;
}

interface DraftFileRecord {
  surface: string;
  files: File[];
}

class DexieDraftFileStore implements DraftFileStore {
  private db: Dexie & { files: EntityTable<DraftFileRecord, 'surface'> };

  constructor() {
    this.db = new Dexie('mmora-drafts') as Dexie & { files: EntityTable<DraftFileRecord, 'surface'> };
    this.db.version(1).stores({ files: 'surface' });
  }

  async get(surface: string): Promise<File[]> {
    return (await this.db.files.get(surface))?.files ?? [];
  }

  async put(surface: string, files: File[]): Promise<void> {
    await this.db.files.put({ surface, files });
  }

  async clear(surface: string): Promise<void> {
    await this.db.files.delete(surface);
  }
}

let defaultStore: DraftFileStore | null = null;
const store = (): DraftFileStore => {
  if (!defaultStore) defaultStore = new DexieDraftFileStore();
  return defaultStore;
};

const key = (surface: string) => `mmora-draft:${surface}`;

export function hasDraftContent(values: Record<string, string>, files: File[]): boolean {
  return files.length > 0 || Object.values(values).some((value) => value.trim().length > 0);
}

/** Files are kept only while their combined size stays under the cap. */
export function filesWithinCap(files: File[]): File[] {
  let total = 0;
  const kept: File[] = [];
  for (const file of files) {
    if (total + file.size > DRAFT_MAX_FILE_BYTES) break;
    kept.push(file);
    total += file.size;
  }
  return kept;
}

export async function loadDraft(surface: string, fileStore: DraftFileStore = store()): Promise<DraftPayload | null> {
  try {
    const raw = localStorage.getItem(key(surface));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { values?: Record<string, string>; savedAt?: number };
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0;
    if (!parsed.values || Date.now() - savedAt > DRAFT_TTL_MS) {
      await clearDraft(surface, fileStore);
      return null;
    }
    const files = await fileStore.get(surface).catch(() => [] as File[]);
    return { values: parsed.values, files, savedAt };
  } catch {
    return null;
  }
}

export async function saveDraft(
  surface: string,
  values: Record<string, string>,
  files: File[],
  fileStore: DraftFileStore = store(),
): Promise<void> {
  try {
    if (!hasDraftContent(values, files)) {
      await clearDraft(surface, fileStore);
      return;
    }
    localStorage.setItem(key(surface), JSON.stringify({ values, savedAt: Date.now() }));
    await fileStore.put(surface, filesWithinCap(files));
  } catch {
    // Autosave must never interrupt typing; a full disk simply skips a save.
  }
}

export async function clearDraft(surface: string, fileStore: DraftFileStore = store()): Promise<void> {
  try {
    localStorage.removeItem(key(surface));
    await fileStore.clear(surface);
  } catch {
    // Best effort only.
  }
}
