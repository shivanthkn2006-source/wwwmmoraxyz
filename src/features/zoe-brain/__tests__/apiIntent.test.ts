import { describe, it, expect } from 'vitest';
import { classifyApiIntent, buildApiInventoryReply, buildApiSpecificReply } from '../apiIntent';
import { matchApis, type ApiStatusEntry, type ApiStatusReport } from '../apiStatus';

const entry = (over: Partial<ApiStatusEntry>): ApiStatusEntry => ({
  id: 'deepgram',
  label: 'Deepgram voice',
  provider: 'Deepgram',
  capability: 'Voice',
  keyless: false,
  keyName: 'DEEPGRAM_API_KEY',
  configured: true,
  edgeFunctions: ['deepgram-tts'],
  probe: { ran: true, ok: true, status: 200, latencyMs: 120, detail: 'reachable' },
  ...over,
});

const report = (apis: ApiStatusEntry[]): ApiStatusReport => ({
  checkedAt: new Date().toISOString(),
  apis,
  summary: { total: apis.length, configured: apis.length, missingKey: [], probed: apis.length, failing: [] },
});

describe('classifyApiIntent', () => {
  it('detects inventory questions', () => {
    expect(classifyApiIntent('what APIs do you use?')).toBe('api_inventory');
    expect(classifyApiIntent('list your integrations')).toBe('api_inventory');
  });

  it('detects service-specific questions', () => {
    expect(classifyApiIntent('is deepgram working?')).toBe('api_specific');
    expect(classifyApiIntent('why can you not send email, is that api down?')).toBe('api_specific');
  });

  it('detects brain status questions', () => {
    expect(classifyApiIntent('what is your uptime and response time?')).toBe('brain_status');
    expect(classifyApiIntent('which intents are failing')).toBe('brain_status');
  });

  it('ignores ordinary chat', () => {
    expect(classifyApiIntent('good morning zoe')).toBeNull();
    expect(classifyApiIntent('tell me a story about the sea')).toBeNull();
  });
});

describe('replies use real status', () => {
  it('names a failing service instead of stalling', () => {
    const apis = [entry({ probe: { ran: true, ok: false, status: 401, latencyMs: 90, detail: 'HTTP 401' } })];
    const matched = matchApis('is deepgram working', apis);
    expect(matched).toHaveLength(1);
    const reply = buildApiSpecificReply(matched, report(apis));
    expect(reply).toMatch(/failing right now/i);
    expect(reply).toContain('deepgram-tts');
  });

  it('counts the inventory', () => {
    const apis = [entry({}), entry({ id: 'groq', label: 'Groq inference' })];
    expect(buildApiInventoryReply(report(apis))).toMatch(/wired to 2 outside services/);
  });
});
