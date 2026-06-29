/**
 * Platform Audit Export — download the full end-to-end platform status as
 * JSON or PDF (top-50 features + provider deep-root + runtime signals).
 */
import { useState } from 'react';
import { Download, FileJson, FileText } from 'lucide-react';
import { downloadAuditJSON, downloadAuditPDF, buildPlatformAuditReport } from '@/utils/zoePlatformAuditReport';

export default function PlatformAuditExport() {
  const [last, setLast] = useState<ReturnType<typeof buildPlatformAuditReport> | null>(null);

  const run = (fmt: 'json' | 'pdf') => {
    const report = fmt === 'json' ? downloadAuditJSON() : downloadAuditPDF();
    setLast(report);
  };

  return (
    <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Platform audit export</h3>
        <div className="flex gap-1.5">
          <button onClick={() => run('json')}
            className="flex items-center gap-1 rounded-md bg-emerald-600/40 px-2 py-1 text-[11px] hover:bg-emerald-600/60">
            <FileJson className="h-3 w-3" /> JSON
          </button>
          <button onClick={() => run('pdf')}
            className="flex items-center gap-1 rounded-md bg-rose-600/40 px-2 py-1 text-[11px] hover:bg-rose-600/60">
            <FileText className="h-3 w-3" /> PDF
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-white/60">
        Whole-platform end-to-end: top-50 features (priority · status · reason · fix), latest provider deep-root, runtime signals, scan history, cascade 24h.
      </p>
      {last && (
        <p className="mt-2 rounded bg-black/30 px-2 py-1 text-[11px] text-white/70">
          Last export: {new Date(last.generatedAt).toLocaleString()} — {last.summary.ok}✅ {last.summary.warn}⚠️ {last.summary.fail}❌ of {last.summary.total}
        </p>
      )}
      <p className="mt-2 flex items-center gap-1 text-[10px] text-white/40">
        <Download className="h-3 w-3" /> Files save to your browser downloads.
      </p>
    </section>
  );
}
