/**
 * RESUME DATA
 * ===========
 * Builds the resume payload from what the platform genuinely knows about the
 * member — their profile and the life facts they have told Zoe. Nothing is
 * invented: a field with no source is simply left out of the PDF.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ResumeData } from '@/utils/headlessResumeBuilder';

interface LifeFact {
  category: string;
  fact_key: string;
  fact_value: string;
}

export async function buildResumeDataForUser(userId?: string): Promise<ResumeData> {
  const data: ResumeData = {};

  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, real_name, username, bio, city, contact_email, job_title, profession, organization')
      .eq('user_id', userId)
      .maybeSingle();
    if (profile) {
      data.name = profile.real_name || profile.display_name || profile.username || undefined;
      data.summary = profile.bio || undefined;
      data.location = profile.city || undefined;
      data.email = profile.contact_email || undefined;
      data.title = profile.job_title || profile.profession || undefined;
      if (profile.organization) data.experience = `${data.title ?? 'Role'} — ${profile.organization}`;
    }
  }

  try {
    const { data: recall } = await supabase.functions.invoke('zoe-life-context', {
      body: { mode: 'recall', limit: 60 },
    });
    const facts: LifeFact[] = (recall as { facts?: LifeFact[] } | null)?.facts ?? [];
    const pick = (category: string, key: string) =>
      facts.find((f) => f.category === category && f.fact_key === key)?.fact_value;

    data.title = data.title || pick('work', 'role');
    data.location = data.location || pick('location', 'home');
    const employer = pick('work', 'employer');
    const project = pick('work', 'project');
    const experience = [
      employer ? `${data.title ?? 'Role'} — ${employer}` : '',
      project ? `Currently building ${project}` : '',
    ].filter(Boolean);
    if (experience.length) data.experience = experience.join('\n');

    const skills = facts.filter((f) => f.category === 'preference').map((f) => f.fact_value);
    if (skills.length) data.skills = skills.slice(0, 8);
  } catch {
    /* life context is an enrichment, never a blocker */
  }

  if (!data.name) data.name = 'Resume';
  return data;
}

export default buildResumeDataForUser;
