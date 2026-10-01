import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// TEMPORARY QA helper — deleted after the friends flow test.
Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  if (body.key !== "qa-fr-7731-temp") return new Response("no", { status: 403 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const out: unknown[] = [];
  if (body.action === "create") {
    for (const n of ["a", "b"]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: `qa.friends.${n}@example.com`, password: "QaFriends!2026x", email_confirm: true,
        user_metadata: { full_name: `QA Friend ${n.toUpperCase()}` },
      });
      out.push({ n, id: data?.user?.id, error: error?.message });
    }
  } else if (body.action === "delete") {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data.users.filter((u) => u.email?.startsWith("qa.friends."))) {
      await admin.from("friend_requests").delete().or(`sender_id.eq.${u.id},receiver_id.eq.${u.id}`);
      await admin.from("friendships").delete().or(`user1_id.eq.${u.id},user2_id.eq.${u.id}`);
      const { error } = await admin.auth.admin.deleteUser(u.id);
      out.push({ id: u.id, error: error?.message });
    }
  }
  return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
});
