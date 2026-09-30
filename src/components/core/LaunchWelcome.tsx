import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STEPS = [
  { title: "Signing in", body: "Next time, use Google, your email and password, or your device passkey on the sign-in page. They all open this same account." },
  { title: "Claim a challenge", body: "Open your profile and find Challenges. Finish one, then tap Claim to collect your points." },
  { title: "Swap karma for credits", body: "Likes, star ratings, chats, time spent and real walks earn karma. On your profile, Karma swap turns every 100 karma into 1 credit, or you can spend it in the VR world." },
];

/** One-time welcome for first-time members, remembered per account. */
export default function LaunchWelcome() {
  const [uid, setUid] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id;
      if (!id) return;
      setUid(id);
      if (!localStorage.getItem(`mmora-welcome-seen-${id}`)) setOpen(true);
    });
  }, []);

  const close = (to?: string) => {
    if (uid) localStorage.setItem(`mmora-welcome-seen-${uid}`, "1");
    setOpen(false);
    if (to) navigate(to);
  };

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Welcome to M'Mora — {step + 1}/{STEPS.length}</DialogTitle>
          <DialogDescription className="pt-1 text-base">
            <span className="block font-semibold text-foreground">{s.title}</span>
            {s.body}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={() => close()}>Skip</Button>
          {last
            ? <Button onClick={() => close("/profile")}>Open my profile</Button>
            : <Button onClick={() => setStep(step + 1)}>Next</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
