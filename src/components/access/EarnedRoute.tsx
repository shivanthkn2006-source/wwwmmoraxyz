/**
 * EARNED ROUTE
 *
 * Wraps a page that only opens after seven active days. Monochrome, no new
 * visual language: a short explanation and a way back, nothing more.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import useEarnedAccess, { REQUIRED_ACTIVE_DAYS } from '@/hooks/useEarnedAccess';

interface EarnedRouteProps {
  /** Plain-language name of the thing being unlocked. */
  feature: string;
  children: React.ReactNode;
}

export const EarnedRoute: React.FC<EarnedRouteProps> = ({ feature, children }) => {
  const { unlocked, activeDays, daysRemaining } = useEarnedAccess();

  if (unlocked === null) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  if (unlocked) return <>{children}</>;

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-16">
      <div className="mx-auto w-full max-w-md space-y-5 rounded-md border border-border p-6 text-center">
        <Lock className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-xl font-semibold tracking-tight">{feature} opens soon</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This part of M'Mora needs to know you a little first. It opens after{' '}
          {REQUIRED_ACTIVE_DAYS} days of using the app. You are on day {Math.min(activeDays, REQUIRED_ACTIVE_DAYS)}
          {daysRemaining > 0 ? ` — ${daysRemaining} to go.` : '.'}
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link to="/home" className="underline underline-offset-4">
            Back to Home
          </Link>
          <Link to="/help" className="underline underline-offset-4">
            Why?
          </Link>
        </div>
      </div>
    </main>
  );
};

export default EarnedRoute;
