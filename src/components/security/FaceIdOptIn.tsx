import { useEffect, useRef, useState } from 'react';
import { ScanFace } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { enrollWithIdentity, getFaceConsent, scanFiveSeconds, setFaceConsent } from '@/lib/faceIdAuto';

/** One-time first sign-in offer: a 5-second face scan to turn on Face ID. */
export default function FaceIdOptIn() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'ask' | 'scan' | 'done'>('ask');
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const uid = user?.id;
    if (!uid || getFaceConsent(uid)) return;
    let cancelled = false;
    const tryOpen = async () => {
      const w = window as unknown as { __mmoraPermOpen?: boolean };
      if (cancelled || w.__mmoraPermOpen || document.querySelector('[role="dialog"]')) { window.setTimeout(tryOpen, 4000); return; }
      const { data } = await supabase.functions.invoke('face-verification', { body: { operation: 'check_face_enrolled' } });
      if (cancelled) return;
      if (data?.enrolled) { setFaceConsent(uid, 'yes'); return; }
      setOpen(true);
    };
    const t = window.setTimeout(tryOpen, 8000);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [user?.id]);

  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  useEffect(() => stop, []);

  const decline = () => { if (user) setFaceConsent(user.id, 'no'); stop(); setOpen(false); };

  const start = async () => {
    if (!user) return;
    setPhase('scan'); setNote('Look at the screen and hold still.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream; await v.play();
      const descriptor = await scanFiveSeconds(v, setProgress);
      stop();
      if (!descriptor) { setPhase('ask'); setNote('No clear face found. Try again in good light.'); return; }
      const r = await enrollWithIdentity(user.id, descriptor);
      setNote(r.message);
      if (r.ok) { setFaceConsent(user.id, 'yes'); setPhase('done'); } else setPhase('ask');
    } catch {
      stop(); setPhase('ask'); setNote('Camera is not available. You can set up Face ID later in your profile.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) decline(); }}>
      <DialogContent className="max-w-sm surface-warm-tan border-0 shadow-none text-center">
        <ScanFace className="mx-auto h-10 w-10 text-foreground" strokeWidth={1.6} />
        <DialogTitle className="text-center">Secure your account with Face ID</DialogTitle>
        <DialogDescription className="text-center">
          A 5-second face scan lets you sign in with your face and confirms it's you in security checks. Your face is kept as private numbers, never shared. You can turn it off any time in your profile.
        </DialogDescription>
        <video ref={videoRef} muted playsInline className={phase === 'scan' ? 'mx-auto h-40 w-40 rounded-full object-cover' : 'hidden'} />
        {phase === 'scan' && (
          <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-foreground/20">
            <div className="h-full bg-green-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {note && <p className="text-sm text-foreground">{note}</p>}
        <div className="flex justify-center gap-3 pt-1">
          {phase === 'ask' && (<><Button variant="ghost" onClick={decline}>Not now</Button><Button variant="ghost" onClick={start}>Scan my face</Button></>)}
          {phase === 'done' && <Button variant="ghost" onClick={() => setOpen(false)}>Done</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
