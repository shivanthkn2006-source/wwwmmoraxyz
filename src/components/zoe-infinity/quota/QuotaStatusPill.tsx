// Admin-only quota indicator. Renders nothing for non-admins.
import { useZoeInfinityQuota } from "@/hooks/zoe-infinity/quota/useZoeInfinityQuota";
import { cn } from "@/lib/utils";

export const QuotaStatusPill = ({ className }: { className?: string }) => {
  const q = useZoeInfinityQuota();
  if (!q.isAdmin || q.loading) return null;

  const max = Math.max(q.dbPercent, q.storagePercent, q.mauPercent, q.egressPercent);
  const tone =
    max >= 90 ? "bg-destructive/15 text-destructive border-destructive/40"
    : max >= 70 ? "bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-400"
    : "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-400";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur",
        tone,
        className,
      )}
      title={`Throttle: ${q.throttleLevel}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      DB {q.dbPercent.toFixed(0)}% · Storage {q.storagePercent.toFixed(0)}% · MAU {q.mauPercent.toFixed(0)}%
      {q.throttleActive && <span className="opacity-80">· {q.throttleLevel}</span>}
    </div>
  );
};
