/**
 * LANDING PAGE — public front door for the beta.
 *
 * Black-and-white only, no new design language: plain type, thin borders,
 * one clear call to action pointing at /signup (carrying any ?ref= code),
 * plus share links so members can invite people.
 */
import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { captureReferralFromUrl, referralLink, shareTargets } from '@/lib/referral';

const POINTS: Array<{ title: string; body: string }> = [
  { title: 'Zoe, on every page', body: 'Ask her anything — she reads the page you are on, searches inside M\u2019Mora and the open web, and answers in plain words.' },
  { title: 'Feeds that know your people', body: 'Global, Friends and Mosaic. Mosaic orders what you see by how close you actually are to someone, not by shouting.' },
  { title: 'Your vault, your memories', body: 'Speak a memory and it is saved. Private by default, yours to delete at any time.' },
  { title: 'Built quiet', body: 'No ads, no noise, no engagement traps. One black-and-white place that stays calm.' },
];

export default function LandingPage() {
  const location = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const ref = useMemo(() => captureReferralFromUrl(location.search), [location.search]);
  const signupHref = ref ? `/signup?ref=${encodeURIComponent(ref)}` : '/signup';
  const shareUrl = useMemo(
    () => (ref ? referralLink(ref) : `${typeof window !== 'undefined' ? window.location.origin : ''}/signup`),
    [ref],
  );
  const targets = useMemo(() => shareTargets(shareUrl, "Join me on M'Mora — a calm place with Zoe."), [shareUrl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Long-press the link to copy it.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>M'Mora — a calm place with Zoe</title>
        <meta name="description" content="M'Mora is a quiet black-and-white space with Zoe: feeds ranked by real closeness, a private memory vault and an assistant that answers in plain words. Join the beta." />
        <meta property="og:title" content="M'Mora — a calm place with Zoe" />
        <meta property="og:description" content="Feeds ranked by real closeness, a private memory vault, and Zoe on every page. Join the beta." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between">
          <span className="text-sm tracking-[0.3em] uppercase">M'Mora</span>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Button asChild size="sm" variant="outline">
              <Link to={signupHref}>Join</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14 space-y-14">
        <section className="space-y-5">
          <h1 className="text-3xl sm:text-5xl font-light leading-tight">
            A quiet place to be with your people — and with Zoe.
          </h1>
          <p className="text-muted-foreground max-w-xl">
            M'Mora is in private beta with a small first group. Black and white, no ads,
            no scroll traps. Zoe helps you find things, remember things and make sense of your day.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link to={signupHref}>Create your account</Link>
            </Button>
            <Link to="/demo" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
              Try the live demo
            </Link>
            <Link to="/help" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
              See how it works
            </Link>

          </div>
          {ref && (
            <p className="text-xs text-muted-foreground">
              You were invited with code <span className="font-mono">{ref}</span> — it is applied when you join.
            </p>
          )}
        </section>

        <section className="grid gap-px bg-border sm:grid-cols-2 border border-border">
          {POINTS.map((p) => (
            <div key={p.title} className="bg-background p-5 space-y-2">
              <h2 className="text-sm uppercase tracking-widest">{p.title}</h2>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3 border border-border p-5">
          <h2 className="text-sm uppercase tracking-widest">Invite someone</h2>
          <p className="text-sm text-muted-foreground">Share this link — it opens the join page.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-xs border border-border px-2 py-1 break-all">{shareUrl}</code>
            <Button size="sm" variant="outline" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy link'}</Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {targets.map((t) => (
              <a
                key={t.label}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs border border-border px-3 py-1 hover:bg-foreground hover:text-background transition-colors"
              >
                {t.label}
              </a>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border pt-6">
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/data-policy" className="hover:text-foreground">Data policy</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/help" className="hover:text-foreground">Help</Link>
          <Link to="/map" className="hover:text-foreground">Site map</Link>
        </footer>
      </main>
    </div>
  );
}
