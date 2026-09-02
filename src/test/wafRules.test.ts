import { describe, it, expect } from 'vitest';
import {
  WAF_RULES,
  evaluateCloudflareRules,
  rulesByLayer,
  CF_BOT_SCORE_BLOCK,
  CF_THREAT_SCORE_BLOCK,
} from '@/lib/security/wafRules';

describe('WAF rule catalog', () => {
  it('exposes a unique id, mitigation and response for every rule', () => {
    const ids = WAF_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const rule of WAF_RULES) {
      expect(rule.mitigation.length).toBeGreaterThan(10);
      expect(rule.response.length).toBeGreaterThan(4);
      expect([400, 403, 405, 413, 429]).toContain(rule.status);
    }
  });

  it('groups rules by enforcement layer', () => {
    expect(rulesByLayer('cloudflare').length).toBeGreaterThan(0);
    expect(rulesByLayer('edge').length).toBeGreaterThan(0);
    expect(rulesByLayer('sentinel').length).toBeGreaterThan(0);
  });
});

describe('Cloudflare rule evaluation', () => {
  it('lets a clean human request through', () => {
    expect(evaluateCloudflareRules({ threatScore: 0, botScore: 92, country: 'IN' })).toBeNull();
  });

  it('blocks a bad-reputation address', () => {
    expect(evaluateCloudflareRules({ threatScore: CF_THREAT_SCORE_BLOCK })).toBe('cf_threat_score');
  });

  it('blocks hostile automation by bot score', () => {
    expect(evaluateCloudflareRules({ botScore: CF_BOT_SCORE_BLOCK })).toBe('cf_bot_score');
  });

  it('exempts verified good bots from the bot score rule', () => {
    expect(evaluateCloudflareRules({ botScore: 1, verifiedBot: true })).toBeNull();
  });

  it('blocks anonymised exits', () => {
    expect(evaluateCloudflareRules({ country: 't1', botScore: 90 })).toBe('cf_geo_block');
  });

  it('ignores missing signals rather than failing closed', () => {
    expect(evaluateCloudflareRules({})).toBeNull();
  });
});
