/**
 * ADMIN OVERVIEW — one screen with the real platform counts.
 *
 * Users, sessions, activity, Planner events and Smart Reminders, counted with
 * head-only queries (no rows transferred). Root-admin row rules remain the
 * boundary underneath.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, CalendarDays, Bell, Activity, Radio, RefreshCw, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageSeo from '@/components/seo/PageSeo';
import RolePermissionsPanel from '@/components/admin/RolePermissionsPanel';
import EdgeFunctionHealthPanel from '@/components/admin/EdgeFunctionHealthPanel';
import DhfLinkHealthPanel from '@/components/admin/DhfLinkHealthPanel';
import LoadTestPanel from '@/components/admin/LoadTestPanel';
import GrowthOnboardingWizard from '@/components/admin/GrowthOnboardingWizard';
import AdminDataTables from '@/components/admin/AdminDataTables';
import StartupTimingPanel from '@/components/admin/StartupTimingPanel';



type TableName = 'profiles' | 'online_sessions' | 'user_sessions' | 'user_activity_log' | 'important_dates' | 'reminders';

interface Metric {
  key: TableName;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  filter?: (query: any) => any;
}

const METRICS: Metric[] = [
  { key: 'profiles', label: 'Users', hint: 'Registered profiles', icon: Users },
  { key: 'online_sessions', label: 'Active now', hint: 'Heartbeat received in the last 2 minutes', icon: Radio, filter: (q) => q.eq('status', 'active').gte('last_heartbeat', new Date(Date.now() - 120_000).toISOString()) },
  { key: 'user_sessions', label: 'Sessions', hint: 'Sessions started in the last 24 hours', icon: Activity, filter: (q) => q.gte('started_at', new Date(Date.now() - 86_400_000).toISOString()) },
  { key: 'user_activity_log', label: 'Events', hint: 'Activity events in the last 24 hours', icon: Activity, filter: (q) => q.gte('created_at', new Date(Date.now() - 86_400_000).toISOString()) },
  { key: 'important_dates', label: 'Planner events', hint: 'Upcoming shared calendar events', icon: CalendarDays, filter: (q) => q.gte('date_value', new Date().toISOString().slice(0, 10)) },
  { key: 'reminders', label: 'Smart Reminders', hint: 'Active reminders across members', icon: Bell, filter: (q) => q.eq('is_completed', false) },
];

const countRows = async (metric: Metric): Promise<number | null> => {
  const client = supabase as unknown as {
    from: (t: string) => { select: (c: string, o: { count: 'exact'; head: boolean }) => Promise<{ count: number | null; error: unknown }> };
  };
  const baseQuery = client.from(metric.key).select('*', { count: 'exact', head: true });
  const { count, error } = await (metric.filter ? metric.filter(baseQuery) : baseQuery);
  return error ? null : count ?? 0;
};

const AdminOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Partial<Record<TableName, number | null>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const entries = await Promise.all(
      METRICS.map(async (m) => [m.key, await countRows(m)] as const),
    );
    setCounts(Object.fromEntries(entries) as Partial<Record<TableName, number | null>>);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background">
        <PageSeo title="Admin overview" description="Administrator-only platform metrics." noIndex />
        <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 text-lg font-semibold text-foreground">Administrators only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This dashboard is restricted. Sign in with an administrator account to view platform metrics.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-6">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageSeo title="Admin overview" description="Administrator-only platform metrics." noIndex />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back
          </Link>
        </Button>

        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Platform overview</h1>
            <p className="text-sm text-muted-foreground">Live counts, read directly from the database.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading || !isAdmin}>
            {loading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Refresh
          </Button>
        </header>

        {isAdmin === null ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking permissions…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-admin-metrics>
              {METRICS.map((metric) => {
                const value = counts[metric.key];
                return (
                  <Card key={metric.key} data-metric={metric.key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <metric.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        {metric.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold text-foreground">
                        {value === undefined ? '—' : value === null ? 'restricted' : value.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <section className="mt-6">
              <StartupTimingPanel />
            </section>

            <section className="mt-6">
              <AdminDataTables />
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-2">
              <EdgeFunctionHealthPanel />
              <DhfLinkHealthPanel />
            </section>


            <section className="mt-4">
              <LoadTestPanel />
            </section>

            <section className="mt-4">
              <GrowthOnboardingWizard />
            </section>

            <section className="mt-8">
              <RolePermissionsPanel />
            </section>


            <section className="mt-8">
              <h2 className="text-sm font-semibold text-foreground">Admin surfaces</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ['/admin/vault', 'Sovereign vault'],
                  ['/admin/health', 'Health'],
                  ['/admin/sentinel', 'Sentinel'],
                  ['/admin/dhf-generation', 'DHF generation'],
                  ['/admin/growth-runs', 'Growth runs'],
                  ['/admin/growth-delivery', 'Growth delivery'],
                  ['/admin/control-panel', 'Moderation'],
                  ['/admin/feed-debug', 'Feed debug'],
                  ['/admin/search-index', 'Search index'],
                  ['/admin/zoe-preview', 'Zoe preview'],
                  ['/attack-response', 'Attack response'],
                  ['/platform-architecture', 'Architecture'],
                  ['/platform-overview', 'Platform overview'],
                  ['/compatibility-report', 'Compatibility report'],
                  ['/zoe-astro/birth', 'Birth details'],
                ].map(([to, label]) => (

                  <Button key={to} asChild size="sm" variant="outline">
                    <Link to={to}>{label}</Link>
                  </Button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOverviewPage;
