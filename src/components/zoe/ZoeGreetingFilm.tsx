/**
 * ZoeGreetingFilm — Zoe's first-launch greeting, as a short film.
 *
 * Contract (deliberately narrow so it can never break the platform):
 *  - Renders NOTHING unless a signed-in person has not yet seen the film.
 *  - Owns its own fixed overlay. It never mounts inside, wraps, or re-renders
 *    Home / feed / loops / dock — those trees are untouched.
 *  - Full screen first. One click (or the minimise control) drops it into a
 *    small picture-in-picture tile at the bottom-LEFT, keeping the bottom-right
 *    call/dock zone completely clear.
 *  - Self-closing: on end, on error, on a missing file, or after a hard
 *    watchdog timeout. It can never leave a stuck black screen.
 *  - Silent-fail everywhere: any exception dismisses the film.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'react-router-dom';
import {
  ZOE_GREETING_MAX_MS,
  ZOE_GREETING_SOURCES,
  hasSeenZoeGreeting,
  markZoeGreetingSeen,
} from '@/config/zoeGreeting';

const EXCLUDED_PREFIXES = ['/auth', '/signup', '/welcome', '/voice-auth', '/password-recovery', '/zoe-infinity'];

export const ZoeGreetingFilm: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pip, setPip] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);

  const excluded = EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const close = useCallback(
    (seen: boolean) => {
      setOpen(false);
      // Only remember it as "watched" when the film really ran (or the person
      // skipped it). A missing/broken file must NOT burn the one-time greeting.
      if (seen) markZoeGreetingSeen(user?.id);
      try {
        videoRef.current?.pause();
        window.dispatchEvent(new CustomEvent('zoe-greeting-film-ended'));
      } catch {
        /* noop */
      }
    },
    [user?.id],
  );

  const dismiss = useCallback(() => close(true), [close]);

  // Decide once per session whether the film should run at all.
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__greetMark = {
      user: user?.id ?? null,
      excluded,
      seen: user?.id ? hasSeenZoeGreeting(user.id) : null,
    };
    if (!user?.id || excluded) return;
    if (hasSeenZoeGreeting(user.id)) return;
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, [user?.id, excluded]);

  // Watchdog: the overlay always goes away.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(dismiss, ZOE_GREETING_MAX_MS);
    return () => clearTimeout(t);
  }, [open, dismiss]);

  // Escape closes it, like any modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  const handleError = useCallback(() => {
    // Try the next candidate file; if none are left, close quietly WITHOUT
    // marking it watched, so the real film still gets its one showing.
    setSourceIndex((i) => {
      const next = i + 1;
      if (next >= ZOE_GREETING_SOURCES.length) {
        close(false);
        return i;
      }
      return next;
    });
  }, [close]);

  // Phones refuse to auto-play with sound. Start with sound, and if the browser
  // blocks it, fall back to a silent play rather than showing a frozen frame.
  const handleCanPlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    void el.play().catch(() => {
      el.muted = true;
      void el.play().catch(() => close(false));
    });
  }, [close]);

  if (!open) return null;

  const src = ZOE_GREETING_SOURCES[sourceIndex];

  return (
    <div
      data-testid="zoe-greeting-film"
      data-mode={pip ? 'pip' : 'fullscreen'}
      className={
        pip
          ? 'fixed bottom-4 left-4 z-[140] h-40 w-28 overflow-hidden rounded-xl border border-border bg-background shadow-lg'
          : 'fixed inset-0 z-[140] flex items-center justify-center bg-background'
      }
      role="dialog"
      aria-label="Zoe welcome"
    >
      <video
        ref={videoRef}
        key={src}
        src={src}
        autoPlay
        playsInline
        muted={false}
        controls={false}
        onEnded={dismiss}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onClick={() => setPip((v) => !v)}
        className={pip ? 'h-full w-full object-cover' : 'h-full w-full object-contain'}
      />

      <div className={`absolute ${pip ? 'right-1 top-1 gap-1' : 'right-4 top-4 gap-2'} flex`}>
        {!pip && (
          <button
            type="button"
            data-testid="zoe-greeting-minimize"
            onClick={() => setPip(true)}
            className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-foreground hover:opacity-70"
          >
            Minimise
          </button>
        )}
        <button
          type="button"
          data-testid="zoe-greeting-skip"
          onClick={dismiss}
          className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-foreground hover:opacity-70"
        >
          {pip ? 'Close' : 'Skip'}
        </button>
      </div>
    </div>
  );
};

export default ZoeGreetingFilm;
