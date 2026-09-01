import React, { useEffect, useId, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface Props {
  onTokenChange: (token: string | null) => void;
  resetSignal?: number;
}

let scriptPromise: Promise<void> | null = null;

const loadTurnstile = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-mmora-turnstile]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Security check failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.mmoraTurnstile = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Security check failed to load'));
    document.head.appendChild(script);
  });
  return scriptPromise;
};

export const verifyTurnstileToken = async (token: string): Promise<boolean> => {
  if (!token || token.length > 4096) return false;
  const { data, error } = await supabase.functions.invoke('signup-security', {
    body: { action: 'verify', token },
  });
  return !error && data?.ok === true;
};

const TurnstileSignup: React.FC<Props> = ({ onTokenChange, resetSignal = 0 }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<string | null>(null);
  const callbackRef = useRef(onTokenChange);
  const [unavailable, setUnavailable] = useState(false);
  const rawId = useId();
  const id = `turnstile-${rawId.replace(/:/g, '')}`;

  useEffect(() => { callbackRef.current = onTokenChange; }, [onTokenChange]);

  useEffect(() => {
    let alive = true;
    const mount = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('signup-security', { body: { action: 'config' } });
        if (error || !data?.siteKey) throw new Error('Security check unavailable');
        await loadTurnstile();
        if (!alive || !hostRef.current || !window.turnstile) return;
        widgetRef.current = window.turnstile.render(hostRef.current, {
          sitekey: data.siteKey,
          theme: 'auto',
          size: 'flexible',
          callback: (token: string) => callbackRef.current(token),
          'expired-callback': () => callbackRef.current(null),
          'error-callback': () => callbackRef.current(null),
        });
      } catch {
        if (alive) setUnavailable(true);
      }
    };
    void mount();
    return () => {
      alive = false;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
      callbackRef.current(null);
    };
  }, []);

  useEffect(() => {
    if (resetSignal > 0 && widgetRef.current && window.turnstile) {
      window.turnstile.reset(widgetRef.current);
      onTokenChange(null);
    }
  }, [resetSignal, onTokenChange]);

  if (unavailable) {
    return <p role="alert" className="text-xs text-destructive">Security check unavailable. Please refresh and try again.</p>;
  }

  return (
    <div className="space-y-2" aria-label="Account security check">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verify you are human
      </p>
      <div id={id} ref={hostRef} className="min-h-[65px] w-full overflow-hidden" />
    </div>
  );
};

export default TurnstileSignup;