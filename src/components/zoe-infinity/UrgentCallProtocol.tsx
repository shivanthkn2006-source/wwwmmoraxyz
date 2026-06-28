/**
 * URGENT CALL PROTOCOL
 * Fullscreen crisis notification surface for Zoe Infinity.
 *
 * Triggers when Zoe (or any subsystem) decides the user needs immediate
 * support — e.g. distress language detected by the brain, vision module
 * sees prolonged crying, or biometric heart alert spikes.
 *
 * Usage:
 *   triggerZoeUrgentCall({ reason, message, severity });
 *   <UrgentCallProtocol />   // mount once near the root of /zoe-infinity
 */
import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Heart } from 'lucide-react';

export type UrgentSeverity = 'soft' | 'moderate' | 'critical';

export interface UrgentCallPayload {
  reason: string;
  message: string;
  severity?: UrgentSeverity;
  ts?: number;
}

const EVT = 'zoe:urgent-call';

export function triggerZoeUrgentCall(payload: UrgentCallPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<UrgentCallPayload>(EVT, {
    detail: { severity: 'moderate', ts: Date.now(), ...payload },
  }));
}

export function dismissZoeUrgentCall() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('zoe:urgent-call:dismiss'));
}

export default function UrgentCallProtocol() {
  const [call, setCall] = useState<UrgentCallPayload | null>(null);

  useEffect(() => {
    const onCall = (e: Event) => setCall((e as CustomEvent<UrgentCallPayload>).detail);
    const onDismiss = () => setCall(null);
    window.addEventListener(EVT, onCall as EventListener);
    window.addEventListener('zoe:urgent-call:dismiss', onDismiss);
    return () => {
      window.removeEventListener(EVT, onCall as EventListener);
      window.removeEventListener('zoe:urgent-call:dismiss', onDismiss);
    };
  }, []);

  if (!call) return null;

  const tone =
    call.severity === 'critical' ? 'from-rose-900 via-rose-800 to-black' :
    call.severity === 'soft' ? 'from-sky-900 via-indigo-900 to-black' :
    'from-fuchsia-900 via-rose-900 to-black';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Zoe urgent call"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br ${tone} text-white p-6 animate-in fade-in`}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col items-center max-w-lg text-center">
        <div className="mb-6 rounded-full bg-white/10 p-6 backdrop-blur animate-pulse">
          <Heart className="h-16 w-16 text-rose-300" />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-rose-200">
          Urgent Call · {call.reason}
        </p>
        <h2 className="mt-3 text-2xl font-semibold leading-snug">
          {call.message}
        </h2>
        <p className="mt-2 text-sm text-white/70">
          I'm here. Stay with me. Take a slow breath.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={() => {
              dismissZoeUrgentCall();
              window.dispatchEvent(new CustomEvent('zoe:urgent-call:answer', { detail: call }));
            }}
            className="rounded-full bg-emerald-500 px-6 py-3 font-medium text-emerald-950 shadow-lg hover:bg-emerald-400 transition"
          >
            <Phone className="inline h-4 w-4 mr-2" /> Stay with Zoe
          </button>
          <button
            onClick={dismissZoeUrgentCall}
            className="rounded-full bg-white/10 px-5 py-3 text-sm text-white hover:bg-white/15 transition"
          >
            <PhoneOff className="inline h-4 w-4 mr-2" /> Later
          </button>
        </div>
      </div>
    </div>
  );
}
