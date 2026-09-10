/**
 * DEMO PAGE — a public door into a real M'Mora account.
 *
 * Anyone with the link can open the shared demo member and walk the platform
 * exactly as a member would. The password never reaches the browser: the
 * backend signs in and returns a session.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { markTourPending, TOUR_STOPS } from '@/components/onboarding/GuidedTour';

export default function DemoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const enter = async (withTour: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-session', { body: {} });
      if (error) throw error;
      const session = (data as { ok?: boolean; error?: string; session?: { access_token: string; refresh_token: string } })?.session;
      if (!session?.access_token) {
        throw new Error((data as { error?: string })?.error || 'The demo could not be opened.');
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (sessionError) throw sessionError;
      if (withTour) markTourPending();
      navigate(withTour ? '/home?tour=1' : '/home');
    } catch (error) {
      toast({
        title: 'Demo unavailable',
        description: error instanceof Error ? error.message : 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Try M'Mora — live demo account</title>
        <meta
          name="description"
          content="Open a real M'Mora account and look around: Home, Mosaic, Zoe's cards and astrology. No signup, no card, nothing to install."
        />
        <meta property="og:title" content="Try M'Mora — live demo account" />
        <meta property="og:description" content="Open a real M'Mora account and look around. No signup needed." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between">
          <Link to="/welcome" className="text-sm tracking-[0.3em] uppercase">M'Mora</Link>
          <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground">Join</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14 space-y-10">
        <section className="space-y-5">
          <h1 className="text-3xl sm:text-5xl font-light leading-tight">Look around inside M'Mora.</h1>
          <p className="text-muted-foreground max-w-xl">
            This opens a real account — same pages, same Zoe, same feeds a member sees.
            It is shared, so treat anything you write in it as public. Nothing is charged and
            you do not need to sign up.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={loading} onClick={() => void enter(true)}>
              {loading ? 'Opening…' : 'Open the demo with a guided walk'}
            </Button>
            <Button variant="outline" disabled={loading} onClick={() => void enter(false)}>
              Just let me in
            </Button>
          </div>
        </section>

        <section className="border border-border">
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {TOUR_STOPS.map((stop) => (
              <div key={stop.path} className="bg-background p-5 space-y-2">
                <h2 className="text-sm uppercase tracking-widest">{stop.title}</h2>
                <p className="text-sm text-muted-foreground">{stop.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 border border-border p-5">
          <h2 className="text-sm uppercase tracking-widest">Good to know</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Everyone using this link shares one account, so posts made here are visible to other visitors.</li>
            <li>Private things — messages, the vault, admin pages — are not part of the demo account.</li>
            <li>Ready for your own space? <Link to="/signup" className="underline underline-offset-4 hover:text-foreground">Create an account</Link>.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
