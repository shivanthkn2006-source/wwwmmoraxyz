/**
 * Audit group #7 — AI authority guards. Pins the ownership-binding and
 * authentication gates on paid-inference edge functions so a body-supplied
 * userId can never override the verified caller, and no AI endpoint runs
 * paid inference for anonymous callers.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = (name: string) => readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');

describe('AI authority: body userId is bound to the verified caller', () => {
  const bound: Array<[string, string]> = [
    ['generate-text', 'const userId = bindOwner(caller, requestedUserId)'],
    ['zoe-system2-cortex', 'const userId = bindOwner(__caller, requestedUserId)'],
    ['zoe-multiagent', 'const userId = bindOwner(__caller, requestedUserId)'],
    ['zoe-pentarchy-core', 'const userId = bindOwner(__caller, requestedUserId)'],
    ['zoe-profile-analyzer', 'const userId = bindOwner(__caller, requestedUserId)'],
    ['zoe-session-summariser', 'const userId = bindOwner(__caller, requestedUserId)'],
    ['zoe-agent', 'const userId = bindOwner(__c, requestedUserId)'],
  ];

  for (const [fn, needle] of bound) {
    it(`${fn} binds the requested userId to the verified caller`, () => {
      const s = src(fn);
      expect(s).toContain(needle);
      expect(s).toContain('requireCaller');
    });
  }

  it('generate-text attributes usage to the bound id, not the raw body id', () => {
    const s = src('generate-text');
    expect(s).toContain('userId: requestedUserId');
    expect(s).not.toContain('const { prompt, model, generateImage, userId }');
  });
});

describe('AI authority: no anonymous paid inference', () => {
  it('zoe-realtime-voice rejects requests without a token', () => {
    const s = src('zoe-realtime-voice');
    expect(s).toContain("if (!authHeader)");
    expect(s).toContain("'Authentication required'");
    expect(s).not.toContain("let userId = 'anonymous'");
  });

  it('zoe-realtime-voice rejects invalid sessions before inference', () => {
    const s = src('zoe-realtime-voice');
    expect(s).toContain("'Invalid session'");
    expect(s).toContain('const userId = user.id');
  });

  it('ai-companion-chat requires a verified member before inference', () => {
    const s = src('ai-companion-chat');
    expect(s).toContain("requireCaller(req, 'member')");
    expect(s).toContain('if (__caller instanceof Response) return __caller;');
  });
});

describe('AI authority: schedulers and status probes are not anonymously triggerable', () => {
  it('execute-scheduled-macros requires the scheduler token or admin', () => {
    const s = src('execute-scheduled-macros');
    expect(s).toContain("requireCronOrAdmin(req, 'execute-scheduled-macros')");
  });

  it('generate-humor-drops requires the scheduler token or admin', () => {
    const s = src('generate-humor-drops');
    expect(s).toContain("requireCronOrAdmin(req, 'generate-humor-drops')");
  });

  it('zoe-api-status requires a member and restricts live probes to admins', () => {
    const s = src('zoe-api-status');
    expect(s).toContain("requireCaller(req, 'member')");
    expect(s).toContain("caller.kind === 'service' || caller.isAdmin");
    expect(s).toContain('mayProbe &&');
  });
});
