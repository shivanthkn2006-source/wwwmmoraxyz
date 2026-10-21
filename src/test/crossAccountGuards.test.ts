import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = (name: string) => readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');

describe('cross-account execution guards', () => {
  it('sentinel binds biometric events to the signed-in member', () => {
    const s = src('zoe-sentinel');
    expect(s).toContain("const authUserId = bindOwner(__caller, requestData?.userId)");
    expect(s).not.toMatch(/userId:\s*authUserId,\s*\n\s*authMethod/);
  });
  it('sentinel records lockdowns under the verified caller', () => {
    expect(src('zoe-sentinel')).toContain("__caller.kind === 'member' ? __caller.userId");
  });
  it('quantum loop refuses scheduled and webhook modes to members', () => {
    expect(src('quantum-asi-loop')).toMatch(/\(mode === 'scheduled' \|\| mode === 'webhook'\) && !\(__c\.kind === 'service' \|\| __c\.isAdmin\)/);
  });
  it('indexer backfill only queues the caller profile and posts', () => {
    const s = src('zoe-search-indexer');
    expect(s).toContain("db.from('profiles').select('user_id').eq('user_id', userId)");
    expect(s).toContain("db.from('posts').select('id,user_id,media_type,content').eq('user_id', userId)");
  });
  it('indexer hides failed-job details from ordinary members', () => {
    expect(src('zoe-search-indexer')).toContain('failures: canSeeFailures ? (failedRows.data || []) : []');
  });
});
