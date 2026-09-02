/**
 * ADMIN OVERVIEW — one screen with the real platform counts.
 *
 * Users, essays, DHF cards, DHF videos and posts, counted straight from the
 * database with head-only queries (no rows transferred). Access is gated on the
 * `has_role(uid,'admin')` function — the same check the rest of the admin
 * surfaces use — and row-level security remains the real boundary underneath.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, FileText, Compass, Video, Image as ImageIcon, RefreshCw, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageSeo from '@/components/seo/PageSeo';

type TableName = 'profiles' | 'dhf_essay_schedules' | 'dhf_feed_posts' | 'dhf_videos' | 'posts' | 'user_roles';

interface Metric {
  key: TableName;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

const METRICS: Metric[] = [
  { key: 'profiles', label: 'Users', hint: 'Registered profiles', icon: Users },
  { key: 'dhf_essay_schedules', label: 'Essays', hint: 'Scheduled DHF essays', icon: FileText },
  { key: 'dhf_feed_posts', label: 'DHF cards', hint: 'Compass cards delivered', icon: Compass },
  { key: 'dhf_videos', label: 'DHF videos', hint: 'Ingested video library', icon: Video },
  { key: 'posts', label: 'Posts', hint: 'User posts and loops', icon: ImageIcon },
  { key: 'user_roles', label: 'Role grants', hint: 'Admin / moderator assignments', icon: ShieldAlert },
];

const countRows = async (table: TableName): Promise<number | null> => {
  const client = supabase as unknown as {
    from: (t: string) => { select: (c: string, o: { count: 'exact'; head: boolean }) => Promise<{ count: number | null; error: unknown }> };
  };
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
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
      METRICS.map(async (m) => [m.key, await countRows(m.key)] as const),
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

            <section className="mt-8">
              <h2 className="text-sm font-semibold text-foreground">Admin surfaces</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ['/admin/health', 'Health'],
                  ['/admin/sentinel', 'Sentinel'],
                  ['/admin/dhf-generation', 'DHF generation'],
                  ['/admin/growth-runs', 'Growth runs'],
                  ['/admin/growth-delivery', 'Growth delivery'],
                  ['/admin/control-panel', 'Moderation'],
                  ['/admin/feed-debug', 'Feed debug'],
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
