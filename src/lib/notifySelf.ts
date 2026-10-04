import { supabase } from "@/integrations/supabase/client";

/** Member's own in-app alert (e.g. VR World finds). The admin notifications switches gate delivery in the database. */
export async function notifySelf(type: string, title: string, message: string, extra: Record<string, unknown> = {}): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    await supabase.from("notifications").insert({
      user_id: uid, from_user_id: uid, type, priority: "normal",
      context_data: { title, message, ...extra } as never,
    } as never);
  } catch { /* alerts must never break gameplay */ }
}
