/**
 * Lets Zoe answer questions about her own integrations instead of stalling.
 *
 * "can you check flights?", "is your voice working?", "what APIs do you use?",
 * "why can't you send email?" now resolve against the live `zoe-api-status`
 * inventory and Zoe answers with the real state of that service.
 */
import { fetchApiStatus, matchApis, apiHealthWord, type ApiStatusEntry, type ApiStatusReport } from './apiStatus';
import { getBrainStats, formatDuration } from './brainTelemetry';

export type ApiIntent = 'api_inventory' | 'api_specific' | 'brain_status' | null;

const INVENTORY = /\b(what|which|list|show|how many)\b[^?]{0,40}\b(api|apis|integrations?|services?|tools?|connections?|capabilit(?:y|ies))\b/i;
const ABOUT_API = /\b(api|apis|integration|service|provider|key|connected|wired|working|available|hooked up|online|down|broken|failing)\b/i;
const ASK = /\b(can|could|do|does|are|is|why|able|status|check)\b/i;
const BRAIN_STATUS = /\b(uptime|response time|latency|how fast|brain (?:status|dashboard|health|stats)|your (?:performance|stats|metrics)|which intents?|failing intents?)\b/i;

export function classifyApiIntent(text: string): ApiIntent {
  const t = (text || '').trim();
  if (!t || t.length > 240) return null;
  if (BRAIN_STATUS.test(t)) return 'brain_status';
  if (INVENTORY.test(t)) return 'api_inventory';
  if (ABOUT_API.test(t) && ASK.test(t)) return 'api_specific';
  return null;
}

const icon = (a: ApiStatusEntry) =>
  ({ live: '🟢', configured: '🟡', failing: '🔴', missing: '⚪' })[apiHealthWord(a)];

function describe(a: ApiStatusEntry): string {
  const word = apiHealthWord(a);
  const latency = a.probe.latencyMs != null ? ` · ${a.probe.latencyMs} ms` : '';
  switch (word) {
    case 'live':
      return `${icon(a)} **${a.label}** — live and answering${latency}. ${a.capability}`;
    case 'failing':
      return `${icon(a)} **${a.label}** — configured but failing right now (${a.probe.detail}). ${a.capability}`;
    case 'missing':
      return `${icon(a)} **${a.label}** — not connected yet (${a.keyName} isn't set), so I can't use it. ${a.capability}`;
    default:
      return `${icon(a)} **${a.label}** — connected. ${a.capability}`;
  }
}

export function buildApiInventoryReply(report: ApiStatusReport): string {
  const lines: string[] = [];
  const live = report.apis.filter((a) => apiHealthWord(a) === 'live').length;
  const failing = report.apis.filter((a) => apiHealthWord(a) === 'failing');
  const missing = report.apis.filter((a) => apiHealthWord(a) === 'missing');

  lines.push(
    `I'm wired to ${report.apis.length} outside services right now — ${live} answered my live ping, ${failing.length} are failing, ${missing.length} aren't connected yet.`,
  );
  lines.push('');
  for (const a of report.apis) lines.push(`- ${describe(a)}`);
  if (failing.length) {
    lines.push('');
    lines.push(`The failing ones are: ${failing.map((a) => a.label).join(', ')} — that's a provider-side problem, not a wiring gap.`);
  }
  lines.push('');
  lines.push('Ask me about any one of them ("is Deepgram working?") and I\'ll check it live, or open the brain dashboard at /zoe/brain.');
  return lines.join('\n');
}

export function buildApiSpecificReply(matches: ApiStatusEntry[], report: ApiStatusReport): string {
  if (!matches.length) return buildApiInventoryReply(report);
  const lines: string[] = [];
  for (const a of matches.slice(0, 4)) {
    lines.push(describe(a));
    lines.push(`  ↳ I use it through: ${a.edgeFunctions.join(', ')}.`);
    lines.push('');
  }
  const broken = matches.filter((a) => apiHealthWord(a) === 'failing' || apiHealthWord(a) === 'missing');
  if (broken.length) {
    lines.push(
      `So yes — I'd normally handle that, but ${broken.map((a) => a.label).join(' and ')} ${broken.length === 1 ? "isn't" : "aren't"} usable at this moment. I'd rather tell you that than pretend.`,
    );
  } else {
    lines.push('That one is healthy, so go ahead — ask me the real question and I\'ll use it.');
  }
  return lines.join('\n');
}

export function buildBrainStatusReply(report: ApiStatusReport | null): string {
  const s = getBrainStats();
  const lines: string[] = [];
  lines.push(
    `**My brain, measured:** up ${formatDuration(s.sessionUptimeMs)} this session (tracking since ${formatDuration(s.trackedSinceMs)} ago), ${s.totalTurns} turns handled, ${s.successRate}% succeeded.`,
  );
  lines.push(`Average reply time ${s.avgLatencyMs} ms, 95th percentile ${s.p95LatencyMs} ms.`);
  if (s.failingIntents.length) {
    lines.push('');
    lines.push('**Intents that are failing:**');
    for (const i of s.failingIntents.slice(0, 6)) {
      lines.push(`- ${i.intent} — ${i.errors} error(s) of ${i.total}, ${i.successRate}% success${i.lastError ? ` · last: ${i.lastError.slice(0, 120)}` : ''}`);
    }
  } else {
    lines.push('No intent is failing right now — every path I ran came back clean.');
  }
  if (report) {
    const failing = report.apis.filter((a) => apiHealthWord(a) === 'failing');
    const missing = report.apis.filter((a) => apiHealthWord(a) === 'missing');
    lines.push('');
    lines.push(
      `**Integrations:** ${report.apis.length} total · ${report.apis.length - failing.length - missing.length} usable · ${failing.length} failing · ${missing.length} not connected.`,
    );
  }
  lines.push('');
  lines.push('The full picture, live, is on the brain dashboard: /zoe/brain');
  return lines.join('\n');
}

/** One call the orb can await: classify, fetch real status, produce the reply. */
export async function answerApiQuestion(text: string): Promise<string | null> {
  const intent = classifyApiIntent(text);
  if (!intent) return null;
  let report: ApiStatusReport | null = null;
  try {
    report = await fetchApiStatus({ probe: true });
  } catch {
    report = null;
  }
  if (intent === 'brain_status') return buildBrainStatusReply(report);
  if (!report) {
    return "I couldn't reach my own integration check just now, so I won't guess at which services are up. Try again in a moment, or open /zoe/brain.";
  }
  if (intent === 'api_inventory') return buildApiInventoryReply(report);
  const matches = matchApis(text, report.apis);
  return buildApiSpecificReply(matches, report);
}
