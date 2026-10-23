import type { SupabaseClient } from '@supabase/supabase-js';

type Env = Record<string, string | undefined>;
const productionHost = 'qwufiqkeoyvqasimcmbd.supabase.co';
const keys = ['RLS_TEST_URL', 'RLS_TEST_PUBLISHABLE_KEY', 'RLS_TEST_ISOLATED', 'RLS_TEST_USER_A_EMAIL', 'RLS_TEST_USER_A_PASSWORD', 'RLS_TEST_USER_B_EMAIL', 'RLS_TEST_USER_B_PASSWORD'];

export function isolationRequested(env: Env): boolean {
  return keys.some(key => Boolean(env[key]));
}

export function isolationConfig(env: Env) {
  if (keys.some(key => !env[key])) throw new Error('Isolated privacy test configuration is incomplete');
  const url = new URL(env.RLS_TEST_URL || '');
  if (env.RLS_TEST_ISOLATED !== 'true') throw new Error('Disposable isolated backend must be explicitly confirmed');
  if (url.hostname.toLowerCase().replace(/\.$/, '') === productionHost ||
      (env.VITE_SUPABASE_URL && url.origin === new URL(env.VITE_SUPABASE_URL).origin)) {
    throw new Error('Privacy tests cannot target the application backend');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Privacy tests require an exact HTTPS isolated backend origin');
  }
  if (env.RLS_TEST_USER_A_EMAIL?.toLowerCase() === env.RLS_TEST_USER_B_EMAIL?.toLowerCase()) {
    throw new Error('Privacy tests require two distinct disposable members');
  }
  return {
    url: url.origin, key: env.RLS_TEST_PUBLISHABLE_KEY || '',
    aEmail: env.RLS_TEST_USER_A_EMAIL || '', aPassword: env.RLS_TEST_USER_A_PASSWORD || '',
    bEmail: env.RLS_TEST_USER_B_EMAIL || '', bPassword: env.RLS_TEST_USER_B_PASSWORD || '',
  };
}

/** Only predetermined IDs from this test run may ever be deleted. */
export async function cleanupIsolationRows(client: SupabaseClient, owner: string, ids: string[]) {
  if (!owner || ids.length === 0) return;
  const { error } = await client.from('agent_interactions').delete().eq('user_id', owner).in('id', ids);
  if (error) throw new Error('Privacy fixture cleanup failed');
}