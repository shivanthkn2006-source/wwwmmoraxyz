/**
 * ZOE ASSET JOBS (client)
 * =======================
 * Zoe can start a background asset — today a 3D model — and keep talking while
 * a small status card tracks it. Nothing here fakes progress: the card mirrors
 * the row in the database, including the honest "no provider connected" state.
 */
import { supabase } from '@/integrations/supabase/client';

export type AssetJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'unavailable';

export interface AssetJob {
  id: string;
  kind: string;
  prompt: string;
  status: AssetJobStatus;
  progress: number;
  detail: string | null;
  result_url: string | null;
  created_at: string;
}

export const ASSET_JOB_EVENT = 'zoe-asset-job';

/** Broadcast so the global status card picks the job up wherever the user is. */
export function announceAssetJob(job: AssetJob): void {
  window.dispatchEvent(new CustomEvent(ASSET_JOB_EVENT, { detail: { job } }));
}

export async function requestAssetJob(prompt: string, kind: '3d' | 'image' | 'video' = '3d') {
  const { data, error } = await supabase.functions.invoke('zoe-asset-job', {
    body: { mode: 'create', kind, prompt },
  });
  if (error) return { ok: false as const, error: error.message };
  const job = (data as { job?: AssetJob } | null)?.job;
  if (!job) return { ok: false as const, error: 'The asset job could not be created.' };
  announceAssetJob(job);
  return { ok: true as const, job };
}

export async function fetchAssetJob(jobId: string): Promise<AssetJob | null> {
  const { data, error } = await supabase.functions.invoke('zoe-asset-job', {
    body: { mode: 'status', jobId },
  });
  if (error) return null;
  return ((data as { job?: AssetJob } | null)?.job) ?? null;
}

/** What Zoe says out loud the moment a job is accepted — truthful in every state. */
export function spokenAssetAcknowledgement(job: AssetJob): string {
  switch (job.status) {
    case 'unavailable':
      return `I logged the request for a 3D ${job.prompt}, but no 3D generator is connected to the platform yet, so nothing is being built. The status card shows that.`;
    case 'failed':
      return `I tried to start the 3D ${job.prompt} and the generator refused. ${job.detail ?? ''}`.trim();
    default:
      return `Starting a 3D ${job.prompt}. The status card will update as it builds — keep talking, I'm still here.`;
  }
}
