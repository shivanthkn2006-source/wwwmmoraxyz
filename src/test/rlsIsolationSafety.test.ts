import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanupIsolationRows, isolationConfig, isolationRequested } from './rlsIsolationSafety';

const env = {
  RLS_TEST_URL: 'https://isolated.example.test', RLS_TEST_PUBLISHABLE_KEY: 'fixture-key', RLS_TEST_ISOLATED: 'true',
  RLS_TEST_USER_A_EMAIL: 'a@example.test', RLS_TEST_USER_A_PASSWORD: 'fixture-a',
  RLS_TEST_USER_B_EMAIL: 'b@example.test', RLS_TEST_USER_B_PASSWORD: 'fixture-b',
};

describe('isolated privacy fixture safety', () => {
  it('skips only when no isolated configuration was supplied', () => {
    expect(isolationRequested({})).toBe(false);
    expect(isolationRequested({ RLS_TEST_USER_A_EMAIL: 'a@example.test' })).toBe(true);
  });
  it('rejects partial configuration instead of silently passing', () => {
    expect(() => isolationConfig({ RLS_TEST_URL: env.RLS_TEST_URL })).toThrow('incomplete');
  });
  it('requires explicit isolated-backend confirmation', () => {
    expect(() => isolationConfig({ ...env, RLS_TEST_ISOLATED: 'false' })).toThrow('explicitly');
  });
  it.each(['https://qwufiqkeoyvqasimcmbd.supabase.co', 'https://qwufiqkeoyvqasimcmbd.supabase.co.'])('rejects the production origin %s', url => {
    expect(() => isolationConfig({ ...env, RLS_TEST_URL: url })).toThrow('application backend');
  });
  it('rejects a configured application backend even if its hostname changes', () => {
    expect(() => isolationConfig({ ...env, VITE_SUPABASE_URL: env.RLS_TEST_URL })).toThrow('application backend');
  });
  it('requires distinct disposable identities', () => {
    expect(() => isolationConfig({ ...env, RLS_TEST_USER_B_EMAIL: 'A@example.test' })).toThrow('distinct');
  });
  it('accepts a separately configured isolated HTTPS origin', () => {
    expect(isolationConfig(env).url).toBe(env.RLS_TEST_URL);
  });
  it('cleanup constrains both owner and exact created IDs', async () => {
    const query = { eq: vi.fn(), in: vi.fn(async () => ({ error: null })) };
    query.eq.mockReturnValue(query);
    const client = { from: vi.fn(() => ({ delete: () => query })) } as unknown as SupabaseClient;
    await cleanupIsolationRows(client, 'test-a', ['created-1', 'created-2']);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'test-a');
    expect(query.in).toHaveBeenCalledWith('id', ['created-1', 'created-2']);
  });
  it('empty cleanup never sends a delete', async () => {
    const from = vi.fn();
    await cleanupIsolationRows({ from } as unknown as SupabaseClient, 'test-a', []);
    expect(from).not.toHaveBeenCalled();
  });
  it('cleanup failure cannot be reported as success', async () => {
    const query = { eq: () => query, in: async () => ({ error: { message: 'offline' } }) };
    const client = { from: () => ({ delete: () => query }) } as unknown as SupabaseClient;
    await expect(cleanupIsolationRows(client, 'test-a', ['created'])).rejects.toThrow('cleanup failed');
  });
});