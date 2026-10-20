import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getKarmaBalance } from "@/lib/karma";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from '@/lib/auth';
import { claimFirstTimePanel } from '@/lib/firstTimePanel';

type Challenge = { id: string; is_completed: boolean | null; reward_claimed: boolean | null };

/** One-time, hands-on welcome for first-time members: confirm sign-in, claim a challenge, swap karma. */
export default function LaunchWelcome() {
  const { user, loading } = useAuth();
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [methods, setMethods] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [karma, setKarma] = useState(0);
  const [points, setPoints] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
      const u = user;
      setOpen(false);
      if (loading || !u) return;
      let cancelled = false;
      let timer: number | undefined;
      let attempted = false;
      setUid(u.id); setEmail(u.email ?? "");
      setMethods(Array.from(new Set((u.identities ?? []).map((i) => i.provider === "email" ? "Email & password" : i.provider === "google" ? "Google" : i.provider))));
      // The unique account claim prevents replay on another device or tab.
      let seen = !!u.user_metadata?.welcome_seen;
      try { seen ||= !!localStorage.getItem(`mmora-welcome-seen-${u.id}`); } catch { /* optional legacy cache */ }
      // Wait until the permissions window has closed so two windows never stack.
      const tryOpen = async () => {
        if (cancelled || attempted || (window as unknown as { __mmoraPermOpen?: boolean }).__mmoraPermOpen) return;
        attempted = true;
        const allowed = await claimFirstTimePanel(u.id, 'launch', seen);
        if (!cancelled && allowed) setOpen(true);
      };
      const onPermissions = (e: Event) => {
        if ((e as CustomEvent<boolean>).detail) setOpen(false);
        else { window.clearTimeout(timer); timer = window.setTimeout(() => void tryOpen(), 600); }
      };
      timer = window.setTimeout(() => void tryOpen(), 1500);
      window.addEventListener('mmora-perm-modal', onPermissions);
      return () => { cancelled = true; window.clearTimeout(timer); window.removeEventListener('mmora-perm-modal', onPermissions); };
  }, [user?.id, loading]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const [{ data: ch }, bal, { data: prof }] = await Promise.all([
      supabase.from("user_challenges").select("id,is_completed,reward_claimed").eq("user_id", uid).eq("reward_claimed", false).limit(5),
      getKarmaBalance(),
      supabase.from("profiles").select("total_points").eq("user_id", uid).maybeSingle(),
    ]);
    setChallenges((ch as Challenge[]) ?? []);
    setKarma(bal);
    setPoints(Number(prof?.total_points ?? 0));
  }, [uid]);

  useEffect(() => { if (open) void refresh(); }, [open, refresh]);

  // Mark as seen the moment it is shown, so a reload or crash never shows it again.
  useEffect(() => {
    if (!open || !uid) return;
    try { localStorage.setItem(`mmora-welcome-seen-${uid}`, "1"); } catch { /* ignore */ }
    void supabase.auth.updateUser({ data: { welcome_seen: true } });
  }, [open, uid]);

  const mark = (i: number) => setDone((d) => d.map((v, j) => (j === i ? true : v)));

  const claim = async (id: string) => {
    setBusy(true); setNote(null);
    const { data, error } = await supabase.rpc("claim_challenge_reward", { p_user_challenge_id: id });
    setBusy(false);
    if (error) { setNote("Couldn't claim that one yet."); return; }
    setNote(`Claimed. +${Number(data) || 0} points saved to your account.`);
    mark(1); void refresh();
  };

  const swap = async () => {
    const amount = Math.floor(karma / 100) * 100;
    if (amount < 100) return;
    setBusy(true); setNote(null);
    const { error } = await supabase.rpc("exchange_karma_for_credits", { p_karma: amount });
    setBusy(false);
    if (error) { setNote("Couldn't swap right now."); return; }
    window.dispatchEvent(new CustomEvent("karma-changed"));
    setNote(`Swapped ${amount} karma for ${amount / 100} credit${amount > 100 ? "s" : ""}. Saved.`);
    mark(2); void refresh();
  };

  const close = () => {
    try { if (uid) localStorage.setItem(`mmora-welcome-seen-${uid}`, "1"); } catch { /* optional cache */ }
    setOpen(false);
  };

  const next = () => { setNote(null); if (step === 0) mark(0); setStep(step + 1); };
  const last = step === 2;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm surface-warm-tan border-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Welcome to M'Mora — {step + 1}/3
            {done[step] && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-base text-muted-foreground">
              {step === 0 && (
                <>
                  <p className="font-semibold text-foreground">You're signed in</p>
                  <p>{email || "Your account"} is saved. Next time use: {methods.join(", ") || "Google or email"}, or your device passkey. They all open this same account.</p>
                </>
              )}
              {step === 1 && (
                <>
                  <p className="font-semibold text-foreground">Claim a challenge</p>
                  {challenges.length === 0
                    ? <p>No challenge to claim yet. Start one from your profile, then come back.</p>
                    : challenges.map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between">
                        <span>Challenge {i + 1}</span>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => claim(c.id)}>Claim</Button>
                      </div>
                    ))}
                  {points !== null && <p className="text-sm">Your points: {points}</p>}
                </>
              )}
              {step === 2 && (
                <>
                  <p className="font-semibold text-foreground">Swap karma for credits</p>
                  <p>Likes, ratings, chats, time spent and real walks earn karma. Every 100 karma = 1 credit.</p>
                  <p className="text-sm">Your karma: {karma}</p>
                  <Button variant="ghost" disabled={busy || karma < 100} onClick={swap}>
                    {karma < 100 ? "Need 100 karma to swap" : `Swap ${Math.floor(karma / 100) * 100} karma`}
                  </Button>
                </>
              )}
              {note && <p className="text-sm font-medium text-foreground">{note}</p>}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={close}>Skip</Button>
          {last ? <Button variant="ghost" onClick={close}>Done</Button> : <Button variant="ghost" onClick={next}>Next</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
