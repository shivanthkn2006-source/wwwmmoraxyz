/**
 * Member life report: built + saved by Zoe's backend the moment birth details
 * are saved, then answered straight from the saved report (no AI tokens).
 * Replies never name where the reading comes from.
 */
import { supabase } from '@/integrations/supabase/client';

export async function rebuildLifeReport(): Promise<{ saved: boolean; reason?: string }> {
  try {
    const { data } = await supabase.functions.invoke('zoe-life-projection', {
      body: { action: 'report', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    });
    return data ?? { saved: false };
  } catch {
    return { saved: false };
  }
}

export const LIFE_REPORT_QUESTION =
  /\b(?:how(?:'s| is| will)?|what(?:'s| is| about)?|tell me(?: about)?|read)\b.*\b(?:my|me)\b.*\b(tomorrow|next month|next year|career|job|work|love|relationship|marriage|personal life|family|money|finances?|health|life)\b/i;

const WEATHERISH = /\b(weather|rain|umbrella|temperature|forecast for the weather)\b/i;

function pickSection(q: string): string {
  const t = q.toLowerCase();
  if (/tomorrow/.test(t)) return 'tomorrow';
  if (/next month/.test(t)) return 'next_month';
  if (/next year/.test(t)) return 'next_year';
  if (/career|job|work/.test(t)) return 'career';
  if (/love|relationship|marriage/.test(t)) return 'love';
  if (/family/.test(t)) return 'family';
  if (/money|financ/.test(t)) return 'money';
  if (/health/.test(t)) return 'health';
  return 'personal';
}

/** Returns Zoe's spoken answer from the saved report, or null if not a report question. */
export async function lifeReportAnswer(question: string, userId?: string | null): Promise<string | null> {
  if (!LIFE_REPORT_QUESTION.test(question) || WEATHERISH.test(question)) return null;
  let uid = userId;
  if (!uid) uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  let { data } = await (supabase as any).from('zoe_life_reports').select('sections').eq('user_id', uid).maybeSingle();
  if (!data) {
    const r = await rebuildLifeReport();
    if (!r.saved) return "I can read that once your birth date is saved on your profile. Add your birth date, time and place, and I'll have your reading ready straight away.";
    ({ data } = await (supabase as any).from('zoe_life_reports').select('sections').eq('user_id', uid).maybeSingle());
  }
  const text = data?.sections?.[pickSection(question)];
  return typeof text === 'string' && text ? text : null;
}
