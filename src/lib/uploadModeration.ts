import { supabase } from '@/integrations/supabase/client';

export interface ModerationVerdict {
  approved: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high' | null;
  checked: boolean;
}

const PASS: ModerationVerdict = { approved: true, reason: '', severity: null, checked: false };

/**
 * Screens an upload before it becomes a public post.
 *
 * Fails open on transport/service errors — a moderation outage must never stop
 * members posting — but blocks on an explicit high-severity rejection.
 */
export async function screenUpload(input: {
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | null;
}): Promise<ModerationVerdict> {
  const mediaType = input.mediaType === 'image' || input.mediaType === 'video' ? input.mediaType : undefined;
  if (!input.content && !input.mediaUrl) return PASS;

  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        content: input.content?.slice(0, 10_000) || undefined,
        mediaUrl: input.mediaUrl || undefined,
        mediaType,
      },
    });

    if (error || !data || typeof data.approved !== 'boolean') return PASS;

    return {
      approved: data.approved !== false,
      reason: String(data.reason ?? ''),
      severity: (data.severity ?? null) as ModerationVerdict['severity'],
      checked: true,
    };
  } catch {
    return PASS;
  }
}

/** Records a blocked upload so administrators can review the decision. */
export async function reportBlockedUpload(userId: string, verdict: ModerationVerdict, mediaUrl?: string) {
  try {
    await supabase.from('content_reports').insert({
      reporter_id: userId,
      target_type: 'upload',
      target_owner_id: userId,
      reason: 'automated_moderation',
      notes: [verdict.reason, verdict.severity ? `severity: ${verdict.severity}` : '', mediaUrl ?? '']
        .filter(Boolean)
        .join(' | ')
        .slice(0, 500),
    });
  } catch {
    /* reporting is best-effort */
  }
}
