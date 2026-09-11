/**
 * ZOE ASSET STATUS CARD
 * =====================
 * A small, dismissible card that appears when Zoe starts a background asset and
 * tracks it to a real outcome. It polls the job row, so the bar only moves when
 * the provider actually moved. If no generator is connected it says exactly
 * that instead of spinning.
 *
 * Positioned top-left so it never touches the bottom-right call controls.
 */
import React from 'react';
import { X, Box, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ASSET_JOB_EVENT, fetchAssetJob, type AssetJob } from '@/services/zoeAssetJobs';

const ACTIVE = new Set(['queued', 'running']);

export const ZoeAssetStatusCard: React.FC = () => {
  const [job, setJob] = React.useState<AssetJob | null>(null);

  React.useEffect(() => {
    const onJob = (event: Event) => {
      const detail = (event as CustomEvent).detail as { job?: AssetJob } | undefined;
      if (detail?.job) setJob(detail.job);
    };
    window.addEventListener(ASSET_JOB_EVENT, onJob);
    return () => window.removeEventListener(ASSET_JOB_EVENT, onJob);
  }, []);

  React.useEffect(() => {
    if (!job || !ACTIVE.has(job.status)) return;
    let cancelled = false;
    const id = window.setInterval(async () => {
      const next = await fetchAssetJob(job.id);
      if (!cancelled && next) setJob(next);
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [job]);

  if (!job) return null;

  const icon =
    job.status === 'succeeded' ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    ) : job.status === 'failed' || job.status === 'unavailable' ? (
      <AlertCircle className="h-4 w-4 text-amber-400" />
    ) : (
      <Loader2 className="h-4 w-4 animate-spin text-white/70" />
    );

  const label =
    job.status === 'succeeded'
      ? 'Ready'
      : job.status === 'unavailable'
        ? 'Not available'
        : job.status === 'failed'
          ? 'Failed'
          : job.status === 'running'
            ? `Building · ${job.progress}%`
            : 'Queued';

  return (
    <div
      data-testid="zoe-asset-status-card"
      className="fixed left-4 top-20 z-[9000] w-64 rounded-2xl border border-white/10 bg-black/70 p-3 text-xs text-white/80 backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <Box className="mt-0.5 h-4 w-4 text-white/50" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white/90">{job.prompt}</p>
          <p className="mt-1 flex items-center gap-1.5 text-white/60">
            {icon}
            <span>{label}</span>
          </p>
          {job.detail && <p className="mt-1 text-[11px] leading-snug text-white/50">{job.detail}</p>}
          {job.result_url && (
            <a
              href={job.result_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[11px] underline text-white/70 hover:text-white"
            >
              Open the model
            </a>
          )}
          {ACTIVE.has(job.status) && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-white/60 transition-[width] duration-500"
                style={{ width: `${Math.max(3, job.progress)}%` }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss asset status"
          onClick={() => setJob(null)}
          className="rounded-full p-1 text-white/40 transition hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ZoeAssetStatusCard;
