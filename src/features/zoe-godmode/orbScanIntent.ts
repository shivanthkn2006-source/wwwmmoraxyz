/**
 * Orb ↔ God Mode bridge.
 *
 * Evidence (05 Sep 2026, @moksh50 orb transcript): "security scan", "system
 * scan", "run security scan", "mmora scan", "whats the error you have
 * currently" all reached the language model, which — having no tool — replied
 * "I can't run a scan from here, install nmap…" or "running smoothly".
 *
 * The scan ability already existed in two places (client `runGodModePlatformScan`
 * and the admin-only `zoe-god-mode` function) but neither was reachable from a
 * typed sentence. This module classifies those sentences and turns the real
 * reports into a reply in Zoe's own voice. No UI changes.
 */
import type { PlatformScanReport, CheckResult } from './platformScan';
import { getRuntimeIssues, type RuntimeIssue } from './runtimeIssueCollector';

export type OrbScanIntent = 'platform_scan' | 'self_diagnostics' | null;

const SCAN_TARGET = /\b(platform|system|security|mmora|m'?mora|site|app|infra(?:structure)?|backend|everything|whole|entire|full|deep|health|brain|god\s*-?\s*mode)\b/i;
const SCAN_VERB = /\b(scan|audit|diagnos(?:e|is|tics)|health\s*check|self\s*-?\s*check|integrity\s*check)\b/i;
const BARE_SCAN = /^\s*(?:please\s+|can you\s+|could you\s+|zoe\s+|run\s+(?:a\s+)?|do\s+(?:a\s+)?|start\s+(?:a\s+)?|perform\s+(?:a\s+)?)*(?:a\s+)?(?:security|system|platform|deep|full|health|brain|god\s*-?\s*mode)?\s*(?:scan|audit)\s*(?:now|please)?\s*[.!?]*\s*$/i;
const SELF_DIAG = /\b(what(?:'?s| is| are)?\s+(?:the\s+)?(?:errors?|bugs?|issues?|problems?)\s+(?:do\s+)?(?:you|u)\s+(?:have|got|see|facing|are facing)|any\s+errors?\s+(?:right\s+)?(?:now|currently)|your\s+(?:current\s+)?(?:errors?|issues?|bugs?)|are you (?:working|ok|okay|broken|healthy)|what(?:'?s| is)\s+(?:wrong|broken)\s+(?:with you|right now|currently)|status\s+report|system\s+status)\b/i;

/** Classifies a typed orb turn. Pure; safe to unit test. */
export function classifyOrbScanIntent(text: string): OrbScanIntent {
  const t = (text || '').trim();
  if (!t || t.length > 240) return null;
  if (SELF_DIAG.test(t)) return 'self_diagnostics';
  if (BARE_SCAN.test(t)) return 'platform_scan';
  if (SCAN_VERB.test(t) && SCAN_TARGET.test(t)) return 'platform_scan';
  return null;
}

/** Minimal shape of the admin god-mode report we render (mirrors useZoeGodMode). */
export interface ServerScanSummary {
  overallHealth: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  results: Array<{ category: string; status: string; message: string }>;
  fixes?: { attempted: number; successful: number; failed: number; details: string[] };
  recommendations?: string[];
  zoeNarrative?: string;
}

const badge = (s: CheckResult['status']) => ({ pass: '✅', warn: '⚠️', fail: '❌', skip: '⏭️' })[s];

function issueLine(i: RuntimeIssue): string {
  const when = new Date(i.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msg = i.message.length > 140 ? `${i.message.slice(0, 137)}…` : i.message;
  return `- ${when} · ${i.kind}: ${msg}${i.source ? ` (${i.source})` : ''}`;
}

/**
 * Builds Zoe's spoken/written reply from the real reports. `server` is null when
 * the caller is not the root admin (the function answers 403) — we say so
 * plainly rather than pretending a platform-wide scan ran.
 */
export function buildScanReply(opts: {
  client: PlatformScanReport;
  server: ServerScanSummary | null;
  isAdmin: boolean | null;
  serverError?: string | null;
}): string {
  const { client, server, isAdmin, serverError } = opts;
  const lines: string[] = [];

  const overallWord = client.overall === 'pass' ? 'clean' : client.overall === 'warn' ? 'mostly healthy with a few warnings' : 'showing real failures';
  lines.push(`I ran the scan myself just now — this device and session look ${overallWord}: ${client.counts.pass} passed, ${client.counts.warn} warnings, ${client.counts.fail} failed (${Math.round(client.durationMs)} ms).`);

  const notable = client.checks.filter((c) => c.status === 'fail' || c.status === 'warn');
  if (notable.length) {
    lines.push('');
    lines.push('**Needs attention here:**');
    for (const c of notable.slice(0, 12)) {
      lines.push(`- ${badge(c.status)} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`);
    }
  }

  if (server) {
    lines.push('');
    lines.push(`**Platform-wide (God Mode):** ${server.overallHealth}% healthy · ${server.overallStatus}.`);
    const bad = server.results.filter((r) => r.status === 'critical' || r.status === 'warning');
    for (const r of bad.slice(0, 10)) {
      lines.push(`- ${r.status === 'critical' ? '❌' : '⚠️'} ${r.category} — ${r.message}`);
    }
    if (!bad.length) lines.push('- Every backend check came back healthy.');
    if (server.fixes && server.fixes.attempted > 0) {
      lines.push(`- Auto-fixes: ${server.fixes.successful}/${server.fixes.attempted} applied${server.fixes.failed ? `, ${server.fixes.failed} failed` : ''}.`);
    }
    if (server.recommendations?.length) {
      lines.push('');
      lines.push('**I recommend:**');
      for (const rec of server.recommendations.slice(0, 5)) lines.push(`- ${rec}`);
    }
  } else if (isAdmin === false) {
    lines.push('');
    lines.push('The platform-wide God Mode sweep is reserved for the root admin, so I only checked what I can see from your side.');
  } else if (serverError) {
    lines.push('');
    lines.push(`I tried the platform-wide God Mode sweep too, but the backend answered: ${serverError}.`);
  }

  if (client.runtimeIssues.length) {
    lines.push('');
    lines.push(`**Recent runtime issues I caught in this session (${client.runtimeIssues.length}):**`);
    for (const i of client.runtimeIssues.slice(-6)) lines.push(issueLine(i));
  }

  lines.push('');
  lines.push('Want me to dig into any one of these, or export the full audit as a PDF from the God Mode menu?');
  return lines.join('\n');
}

/** Honest answer to "what errors do you have currently". */
export function buildSelfDiagnosticsReply(): string {
  const issues = getRuntimeIssues();
  if (!issues.length) {
    return "Nothing has thrown in this session so far — no runtime errors, no unhandled promise rejections, no console errors logged since the page loaded. If something felt off, tell me what you did and I'll run a full platform scan.";
  }
  const errors = issues.filter((i) => i.kind !== 'console');
  const lines: string[] = [];
  lines.push(`Honest answer: I've caught ${issues.length} issue${issues.length === 1 ? '' : 's'} in this session (${errors.length} hard error${errors.length === 1 ? '' : 's'}). The most recent:`);
  for (const i of issues.slice(-8)) lines.push(issueLine(i));
  lines.push('');
  lines.push('Say "run a platform scan" and I will check the backend and this device end to end.');
  return lines.join('\n');
}
