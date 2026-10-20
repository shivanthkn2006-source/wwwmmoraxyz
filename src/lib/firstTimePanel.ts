import { supabase } from '@/integrations/supabase/client';

type ClaimWriter = (userId: string, panelId: string) => Promise<boolean>;
/** The existing unique (user_id, feature_id) key arbitrates across tabs/devices.
 * No identity metadata, daily keys or device cache can authorize a showing. */
export function createPanelClaimer(write: ClaimWriter) {
  const attempted = new Set<string>();
  return async (userId: string, panelId: string, previouslySeen = false): Promise<boolean> => {
    const key = `${userId}:${panelId}`;
    if (attempted.has(key)) return false;
    attempted.add(key);
    try {
      const inserted = await write(userId, panelId);
      return inserted && !previouslySeen;
    } catch {
      return false; // offline/unknown membership: never display a repeat overlay
    }
  };
}

export const claimFirstTimePanel = createPanelClaimer(async (userId, panelId) => {
  const { error } = await supabase.from('feature_announcements').insert({
    user_id: userId, feature_id: `welcome:${panelId}`, feature_name: panelId,
  });
  return !error;
});