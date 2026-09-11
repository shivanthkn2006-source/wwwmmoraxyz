/**
 * /admin/memory — WHAT ZOE REMEMBERS
 *
 * Staff-only. Pick a member and see the three things Zoe's memory is made of:
 * the preferences she has learned, the life timeline she can recall from, and
 * the orb conversation history. Everything shown is read live through the
 * admin-gated `zoe-memory-admin` function; nothing here is invented.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageSeo from '@/components/seo/PageSeo';

interface UserRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  real_name: string | null;
  city: string | null;
}

interface Fact {
  category: string;
  fact_key: string;
  fact_value: string;
  confidence: number | null;
  last_seen_at: string | null;
}

interface TimelineItem {
  kind: string;
  id: string;
  label: string;
  at: string | null;
}

interface OrbMessage {
  id: string;
  role: string | null;
  content: string | null;
  created_at: string | null;
}

interface MemoryPayload {
  profile: { username: string | null; display_name: string | null; bio: string | null; city: string | null } | null;
  facts: Fact[];
  timeline: TimelineItem[];
  orb: OrbMessage[];
  counts: Record<string, number>;
}

const when = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const AdminMemoryPage: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [memory, setMemory] = useState<MemoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  const loadUsers = useCallback(async (term: string) => {
    setError(null);
    const { data, error: err } = await supabase.functions.invoke('zoe-memory-admin', {
      body: { mode: 'users', search: term },
    });
    if (err) {
      setError(err.message);
      return;
    }
    setUsers(((data as { users?: UserRow[] } | null)?.users ?? []) as UserRow[]);
  }, []);

  useEffect(() => {
    if (isAdmin) void loadUsers('');
  }, [isAdmin, loadUsers]);

  const openMember = useCallback(async (row: UserRow) => {
    setSelected(row);
    setMemory(null);
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke('zoe-memory-admin', {
      body: { mode: 'memory', userId: row.user_id },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMemory(data as MemoryPayload);
  }, []);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Staff only</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page shows what Zoe remembers about members and is limited to platform staff.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/home">Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageSeo title="Zoe memory — staff view" description="What Zoe remembers about a member: preferences, timeline and orb history." />
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Admin
            </Link>
          </Button>
        </div>
        <h1 className="text-xl font-semibold text-foreground">What Zoe remembers</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Pick a member to see the preferences Zoe has learned, the life timeline she recalls from, and the orb history.
        </p>

        <div className="mb-4 flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void loadUsers(search);
            }}
            placeholder="Search by name or handle"
            aria-label="Search members"
          />
          <Button variant="outline" onClick={() => void loadUsers(search)}>
            <Search className="mr-1 h-4 w-4" />
            Search
          </Button>
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Members</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[60vh] space-y-1 overflow-y-auto p-2">
              {users.length === 0 && <p className="p-2 text-xs text-muted-foreground">No members found.</p>}
              {users.map((row) => (
                <button
                  key={row.user_id}
                  type="button"
                  onClick={() => void openMember(row)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted ${
                    selected?.user_id === row.user_id ? 'bg-muted' : ''
                  }`}
                >
                  <span className="block truncate font-medium text-foreground">
                    {row.display_name || row.real_name || row.username || 'Member'}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">@{row.username ?? '—'}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="min-h-[320px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selected
                  ? `${selected.display_name || selected.username || 'Member'} — Zoe's memory`
                  : 'Select a member'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {!loading && !memory && (
                <p className="text-sm text-muted-foreground">Choose someone on the left to load their memory.</p>
              )}
              {!loading && memory && (
                <Tabs defaultValue="facts">
                  <TabsList className="mb-3">
                    <TabsTrigger value="facts">Preferences ({memory.counts?.facts ?? 0})</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline ({memory.timeline?.length ?? 0})</TabsTrigger>
                    <TabsTrigger value="orb">Orb history ({memory.counts?.orb ?? 0})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="facts" className="space-y-2">
                    {memory.facts.length === 0 && (
                      <p className="text-sm text-muted-foreground">Zoe has not learned anything about this member yet.</p>
                    )}
                    {memory.facts.map((fact) => (
                      <div
                        key={`${fact.category}-${fact.fact_key}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border p-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {fact.category} · {fact.fact_key}
                          </p>
                          <p className="text-foreground">{fact.fact_value}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{when(fact.last_seen_at)}</span>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-2">
                    {memory.timeline.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nothing recorded on this member's timeline yet.</p>
                    )}
                    {memory.timeline.map((item) => (
                      <div key={`${item.kind}-${item.id}`} className="rounded-lg border border-border p-2 text-sm">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {item.kind} · {when(item.at)}
                        </p>
                        <p className="text-foreground">{item.label || '—'}</p>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="orb" className="space-y-2">
                    {memory.orb.length === 0 && (
                      <p className="text-sm text-muted-foreground">No orb conversations recorded.</p>
                    )}
                    {memory.orb.map((msg) => (
                      <div key={msg.id} className="rounded-lg border border-border p-2 text-sm">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {msg.role === 'assistant' ? 'Zoe' : 'Member'} · {when(msg.created_at)}
                        </p>
                        <p className="whitespace-pre-wrap text-foreground">{msg.content ?? ''}</p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminMemoryPage;
