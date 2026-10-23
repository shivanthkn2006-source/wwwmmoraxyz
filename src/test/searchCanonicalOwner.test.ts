import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const types = ['post', 'loop_video', 'image', 'quote', 'profile', 'chat', 'dhf_node', 'visual_memory', 'dhf_post', 'growth_card', 'astro_prediction', 'wisdom_goal', 'direct_message', 'post_comment', 'important_date', 'post_attachment', 'life_fact'];

function fixture(owner: string) {
  const tables: string[] = [];
  const media = vi.fn(async () => null);
  const db = { from(table: string) {
    tables.push(table);
    const query = {
      select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: { user_id: owner, sender_id: owner, content: 'fixture', value: 'fixture', fact_value: 'fixture', media_url: 'https://fixture.test/picture', active: true }, error: null }),
    };
    return query;
  } };
  const source = readFileSync('supabase/functions/zoe-search-indexer/index.ts', 'utf8').replace(/^import\s[\s\S]*?;\s*$/gm, '');
  const context = vm.createContext({ Deno: { env: { get: () => '' }, serve: () => {} }, describeSearchMedia: media });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context);
  const load = vm.runInContext('loadCanonical', context) as (db: unknown, job: unknown, member?: string) => Promise<unknown>;
  return { tables, media, load: (type: string, member?: string) => load(db, { entity_type: type, entity_id: 'fixture', owner_id: 'member-a' }, member) };
}

describe('canonical ownership checked before downstream work', () => {
  it.each(types)('%s refuses a mismatched source owner before parent/author/media work', async type => {
    const f = fixture('member-b');
    await expect(f.load(type, 'member-a')).rejects.toThrow('CANONICAL_OWNER_MISMATCH');
    expect(f.tables).toHaveLength(1);
    expect(f.media).not.toHaveBeenCalled();
  });
  it('a falsely member-owned shared video is refused before any source read', async () => {
    const f = fixture('member-a');
    await expect(f.load('dhf_video', 'member-a')).rejects.toThrow('CANONICAL_OWNER_MISMATCH');
    expect(f.tables).toEqual([]);
  });
  it('owned media retains ordinary description behavior', async () => {
    const f = fixture('member-a');
    expect(await f.load('post', 'member-a')).toMatchObject({ ownerId: 'member-a' });
    expect(f.media).toHaveBeenCalledTimes(1);
  });
  it('scheduler and administrator source loading remains unrestricted', async () => {
    const f = fixture('member-b');
    expect(await f.load('post')).toMatchObject({ ownerId: 'member-b' });
    expect(f.media).toHaveBeenCalledTimes(1);
  });
});