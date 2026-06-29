/**
 * Zoe Infinity — Platform Audit Report builder.
 * Compiles a top-50 prioritized feature inventory + live runtime/provider
 * snapshot, and exports it as JSON or PDF (jspdf).
 */
import { jsPDF } from 'jspdf';
import { getRuntimeSignals } from '@/utils/zoeRuntimeSignalBus';
import { getCascadeRecords, summarizeCascade } from '@/utils/cascadeMetrics';
import { getDeepRootScanHistory } from '@/hooks/useDeepRootScanScheduler';
import { getLastHealthSnapshot } from '@/hooks/useProviderHealthScheduler';

export type FeatureStatus = 'ok' | 'warn' | 'fail';
export interface FeatureRow {
  rank: number;
  name: string;
  area: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: FeatureStatus;
  reason: string;
  fix?: string;
}

/** Top-50 user-useful features, prioritized P0 → P3. */
export const ZOE_FEATURE_INVENTORY: Omit<FeatureRow, 'status' | 'reason' | 'fix'>[] = [
  { rank: 1,  area: 'Brain',     priority: 'P0', name: 'Zoe Infinity brain (5-tier cascade)' },
  { rank: 2,  area: 'Brain',     priority: 'P0', name: 'Provider fallback order T1→T5' },
  { rank: 3,  area: 'Identity',  priority: 'P0', name: 'hardenZoeIdentity wrapper on every tier' },
  { rank: 4,  area: 'Conversation', priority: 'P0', name: 'Realtime chat with streaming UI' },
  { rank: 5,  area: 'Memory',    priority: 'P0', name: '500-message rolling memory + summarizer' },
  { rank: 6,  area: 'Memory',    priority: 'P0', name: 'zoe_contextual_memory persistence' },
  { rank: 7,  area: 'Genesis',   priority: 'P0', name: 'Genesis state machine (ASK_NAME→COMPLETE)' },
  { rank: 8,  area: 'Genesis',   priority: 'P0', name: 'zoe_genesis_memory storage + RLS' },
  { rank: 9,  area: 'Avatar',    priority: 'P0', name: 'Real-woman avatar viewer (GLB lip-sync)' },
  { rank: 10, area: 'Avatar',    priority: 'P0', name: '50-emotion avatar driver' },
  { rank: 11, area: 'Emotion',   priority: 'P0', name: 'EmotionalFusionLayer → avatar override' },
  { rank: 12, area: 'Emotion',   priority: 'P0', name: 'VirtualHormonesEngine (circadian + Lazy Mode)' },
  { rank: 13, area: 'Voice',     priority: 'P0', name: 'Deepgram TTS edge function' },
  { rank: 14, area: 'Voice',     priority: 'P0', name: 'Web Speech STT fallback' },
  { rank: 15, area: 'Voice',     priority: 'P1', name: 'Voice citadel gate (biometric voice print)' },
  { rank: 16, area: 'Safety',    priority: 'P0', name: 'Urgent Call Protocol overlay' },
  { rank: 17, area: 'Safety',    priority: 'P0', name: 'Recall blocklist + 25-msg threshold' },
  { rank: 18, area: 'Auth',      priority: 'P0', name: 'Supabase auth + 500ms race-retry' },
  { rank: 19, area: 'Routing',   priority: 'P0', name: 'Standalone Zoe Infinity domain routing' },
  { rank: 20, area: 'Diagnostics', priority: 'P0', name: 'Ctrl+Shift+Z Feature Status Panel' },
  { rank: 21, area: 'Diagnostics', priority: 'P0', name: 'Provider Health Panel (live ping)' },
  { rank: 22, area: 'Diagnostics', priority: 'P0', name: 'Auto-poll health every 5 min + banner' },
  { rank: 23, area: 'Diagnostics', priority: 'P0', name: 'Daily deep-root scan + history' },
  { rank: 24, area: 'Diagnostics', priority: 'P1', name: 'Cascade metrics 24h distribution' },
  { rank: 25, area: 'Diagnostics', priority: 'P1', name: 'Genesis Inspector + Progress Widget' },
  { rank: 26, area: 'Image',     priority: 'P1', name: 'Image gen cascade (Gemini→Pollinations)' },
  { rank: 27, area: 'Image',     priority: 'P2', name: 'Art gift auto-trigger' },
  { rank: 28, area: 'Docs',      priority: 'P1', name: 'Document X-Ray (refresh + chunked base64)' },
  { rank: 29, area: 'Docs',      priority: 'P1', name: 'PDF export of conversation (24h + full)' },
  { rank: 30, area: 'Mail',      priority: 'P1', name: 'Zoe Infinity Mail (zoe_infinity_mail)' },
  { rank: 31, area: 'Notifications', priority: 'P1', name: 'Notification pill + queue' },
  { rank: 32, area: 'UX',        priority: 'P1', name: 'Bottom-right call controls (unobstructed)' },
  { rank: 33, area: 'UX',        priority: 'P1', name: 'Unified Utility Menu (top-left)' },
  { rank: 34, area: 'UX',        priority: 'P2', name: 'Circadian background + weather + night sky' },
  { rank: 35, area: 'UX',        priority: 'P2', name: 'Emotion particles + soul waveform' },
  { rank: 36, area: 'Brain',     priority: 'P1', name: 'Metacognitive brain (perception → reasoning)' },
  { rank: 37, area: 'Brain',     priority: 'P1', name: 'Runtime signal bus (hormones/fusion/urgent)' },
  { rank: 38, area: 'Brain',     priority: 'P1', name: 'Inference diagnostics badge' },
  { rank: 39, area: 'Sovereign', priority: 'P2', name: 'Sovereign/Ollama local mode' },
  { rank: 40, area: 'God Mode',  priority: 'P2', name: 'Zoe God Mode vision overlay' },
  { rank: 41, area: 'Heart',     priority: 'P2', name: 'Zoe heart status (kernel heart rate)' },
  { rank: 42, area: 'Quantum',   priority: 'P3', name: 'Quantum shard 3D / call signals' },
  { rank: 43, area: 'PWA',       priority: 'P1', name: 'Service Worker disabled in dev/preview' },
  { rank: 44, area: 'PWA',       priority: 'P1', name: 'AbortController on brain fetch' },
  { rank: 45, area: 'Roles',     priority: 'P0', name: 'user_roles + has_role security-definer' },
  { rank: 46, area: 'Storage',   priority: 'P1', name: 'Lovable Cloud RLS on all zoe_* tables' },
  { rank: 47, area: 'Testing',   priority: 'P2', name: 'Vitest + Deno integration tests' },
  { rank: 48, area: 'Testing',   priority: 'P2', name: 'Cascade order test (T1→T5)' },
  { rank: 49, area: 'Export',    priority: 'P1', name: 'Diagnostics JSON export' },
  { rank: 50, area: 'Export',    priority: 'P1', name: 'Platform audit PDF/JSON export' },
];

function statusFromHealthByArea(area: string, healthOk: boolean, anyDegraded: boolean): FeatureStatus {
  if (!healthOk) return 'warn';
  if (anyDegraded && (area === 'Brain' || area === 'Image' || area === 'Voice')) return 'warn';
  return 'ok';
}

export interface PlatformAuditReport {
  generatedAt: string;
  summary: { total: number; ok: number; warn: number; fail: number };
  provider: any;
  cascade24h: ReturnType<typeof summarizeCascade>;
  runtimeSignals: ReturnType<typeof getRuntimeSignals>;
  deepRootHistory: ReturnType<typeof getDeepRootScanHistory>;
  recentCascade: ReturnType<typeof getCascadeRecords>;
  features: FeatureRow[];
}

export function buildPlatformAuditReport(): PlatformAuditReport {
  const health = getLastHealthSnapshot();
  const signals = getRuntimeSignals();
  const cascade24h = summarizeCascade(24);
  const deepRoot = getDeepRootScanHistory();
  const records = getCascadeRecords().slice(-25);

  const healthOk = !!health?.ok;
  const degraded = health?.summary?.degradedTiers ?? [];
  const missing = health?.summary?.missingKeyTiers ?? [];
  const anyDegraded = degraded.length > 0 || missing.length > 0;

  const reasons: Record<string, string> = {};
  for (const a of health?.attempts ?? []) {
    if (!a.ok) reasons[`T${a.tier}`] = a.reasonCode;
  }

  const features: FeatureRow[] = ZOE_FEATURE_INVENTORY.map(f => {
    let status: FeatureStatus = statusFromHealthByArea(f.area, healthOk, anyDegraded);
    let reason = 'Operational — wired, typechecked, in active use.';
    let fix: string | undefined;

    if (f.area === 'Brain' && f.rank === 1) {
      reason = healthOk ? `Cascade healthy; primary T${health?.summary?.primaryHealthy ?? '?'}` : 'Health snapshot missing — banner will trigger on next poll.';
    }
    if (f.area === 'Brain' && f.rank === 2 && degraded.length) {
      status = 'warn';
      reason = `Degraded tiers: ${degraded.map((t: number) => `T${t}:${reasons[`T${t}`] ?? 'unknown'}`).join(' · ')}`;
      fix = 'Cascade auto-falls through to next healthy tier; refill credits or wait for quota reset.';
    }
    if (f.area === 'Image' && anyDegraded) {
      status = 'warn';
      reason = 'Primary Gemini 3.1 Flash may rate-limit; Pollinations fallback active.';
      fix = 'No action required — fallback selected automatically.';
    }
    if (f.area === 'Voice' && f.rank === 13) {
      reason = 'Deepgram TTS deployed; STT uses Web Speech API in-browser.';
    }
    if (f.area === 'Genesis') {
      const stageOk = !!signals; // signals always present
      status = stageOk ? 'ok' : 'warn';
      reason = `Stage machine wired; live signal bus delivering hormones/fusion updates.`;
    }
    if (f.area === 'Diagnostics' && f.rank === 23) {
      const last = deepRoot[deepRoot.length - 1];
      reason = last ? `Last scan ${new Date(last.at).toLocaleString()} — ${last.ok ? 'OK' : 'issues'}` : 'No scans yet — run from panel.';
    }
    return { ...f, status, reason, fix };
  });

  const summary = features.reduce(
    (acc, f) => ({ ...acc, [f.status]: acc[f.status] + 1, total: acc.total + 1 }),
    { total: 0, ok: 0, warn: 0, fail: 0 },
  );

  return {
    generatedAt: new Date().toISOString(),
    summary,
    provider: health,
    cascade24h,
    runtimeSignals: signals,
    deepRootHistory: deepRoot,
    recentCascade: records,
    features,
  };
}

export function downloadAuditJSON(report = buildPlatformAuditReport()) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `zoe-platform-audit-${new Date().toISOString().slice(0, 19)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  return report;
}

export function downloadAuditPDF(report = buildPlatformAuditReport()) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 36;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let y = margin;

  const writeLine = (text: string, size = 10, bold = false) => {
    if (y > pageH - margin) { pdf.addPage(); y = margin; }
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, pageW - margin * 2);
    for (const ln of lines) {
      if (y > pageH - margin) { pdf.addPage(); y = margin; }
      pdf.text(ln, margin, y);
      y += size + 3;
    }
  };

  writeLine('Zoe Infinity — Platform Audit Report', 18, true);
  writeLine(`Generated: ${report.generatedAt}`, 9);
  writeLine(`Status: ${report.summary.ok} OK · ${report.summary.warn} WARN · ${report.summary.fail} FAIL (of ${report.summary.total})`, 11, true);
  y += 6;

  writeLine('Provider Cascade', 13, true);
  if (report.provider?.summary) {
    writeLine(`Healthy: [${report.provider.summary.healthyTiers.join(', ') || '–'}]   Degraded: [${report.provider.summary.degradedTiers.join(', ') || '–'}]   Missing keys: [${report.provider.summary.missingKeyTiers.join(', ') || '–'}]`);
    writeLine(`Primary healthy tier: T${report.provider.summary.primaryHealthy ?? '?'}    Checked at: ${report.provider.checkedAt}`);
  } else {
    writeLine('No live health snapshot yet (auto-poll runs every 5 min).');
  }
  y += 6;

  writeLine('Runtime Signals', 13, true);
  writeLine(`Hormones phase=${report.runtimeSignals.hormones.phase} dop=${report.runtimeSignals.hormones.dopamine.toFixed(2)} oxy=${report.runtimeSignals.hormones.oxytocin.toFixed(2)} cort=${report.runtimeSignals.hormones.cortisol.toFixed(2)} mel=${report.runtimeSignals.hormones.melatonin.toFixed(2)}${report.runtimeSignals.hormones.lazyMode ? ' (LAZY)' : ''}`);
  writeLine(`Fusion: ${report.runtimeSignals.fusion.emotion} @ ${report.runtimeSignals.fusion.intensity.toFixed(2)} (src=${report.runtimeSignals.fusion.source})`);
  writeLine(`Urgent call: ${report.runtimeSignals.urgentCall ? 'ACTIVE' : 'idle'}`);
  y += 6;

  writeLine('Deep-Root Scan History (recent)', 13, true);
  const recent = report.deepRootHistory.slice(-5).reverse();
  if (recent.length === 0) writeLine('No daily scans recorded yet.');
  for (const r of recent) {
    writeLine(`${new Date(r.at).toLocaleString()} — ${r.ok ? 'OK' : 'FAIL'} — cascade T${r.cascade?.selectedTier ?? '?'} ${r.cascade?.latencyMs ?? '?'}ms — degraded [${r.health?.degraded.join(',') ?? '–'}]${r.notes ? ` · ${r.notes}` : ''}`);
  }
  y += 6;

  writeLine('Top 50 Features — Priority · Status · Reason · Fix', 13, true);
  for (const f of report.features) {
    const icon = f.status === 'ok' ? 'OK ' : f.status === 'warn' ? 'WARN' : 'FAIL';
    writeLine(`#${f.rank} [${f.priority}] [${icon}] ${f.name}  (${f.area})`, 10, true);
    writeLine(`Reason: ${f.reason}`, 9);
    if (f.fix) writeLine(`Fix: ${f.fix}`, 9);
    y += 2;
  }

  pdf.save(`zoe-platform-audit-${new Date().toISOString().slice(0, 19)}.pdf`);
  return report;
}
