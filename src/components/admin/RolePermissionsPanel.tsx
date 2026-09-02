/**
 * ROLE PERMISSIONS PANEL — the human side of the role model.
 *
 * Roles live in `public.user_roles` (never on the profile), and every grant or
 * revoke here is still checked server-side by the `has_role(uid,'admin')`
 * policies on that table: a non-admin who forges this request is refused by
 * the database, not by the UI.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export type AppRole = 'admin' | 'moderator' | 'tester' | 'user';

export interface RoleDefinition {
  role: AppRole;
  label: string;
  grants: string[];
}

/** What each role may do. Mirrors the row-level policies in the database. */
export const ROLE_MODEL: RoleDefinition[] = [
  {
    role: 'admin',
    label: 'Admin',
    grants: [
      'Full platform metrics on /admin/overview',
      'Sentinel surveillance, blocks and releases',
      'Grant and revoke every role',
      'DHF generation, growth dispatch and feed debug tools',
    ],
  },
  {
    role: 'moderator',
    label: 'Moderator',
    grants: [
      'Moderation queue: review, action and dismiss reports',
      'Hide or unhide member posts and loops',
      'Read-only view of platform counts',
    ],
  },
  {
    role: 'tester',
    label: 'Tester',
    grants: [
      'Early access to feature-flagged surfaces',
      'Bug reporter with build and session context attached',
      'No access to member data or moderation actions',
    ],
  },
  {
    role: 'user',
    label: 'Member',
    grants: ['Own feed, growth cards, posts and DHF content only'],
  },
];

const ASSIGNABLE: AppRole[] = ['admin', 'moderator', 'tester'];

interface Grant {
  id: string;
  user_id: string;
  role: AppRole;
  username: string | null;
}

interface Candidate {
  id: string;
  username: string | null;
}

const RolePermissionsPanel: React.FC = () => {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const db = supabase as unknown as {
    from: (t: string) => any;
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from('user_roles').select('id, user_id, role');
    if (error) {
      setGrants([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Array<{ id: string; user_id: string; role: AppRole }>;
    const ids = [...new Set(rows.map((r) => r.user_id))];
    let names = new Map<string, string | null>();
    if (ids.length) {
      // Roles key on the auth user id, which lives in `profiles.user_id`
      // (`profiles.id` is the profile row's own id and never matches).
      const { data: profiles } = await db
        .from('profiles')
        .select('user_id, username')
        .in('user_id', ids);
      names = new Map(
        (profiles ?? []).map((p: { user_id: string; username: string | null }) => [p.user_id, p.username]),
      );
    }
    setGrants(rows.map((r) => ({ ...r, username: names.get(r.user_id) ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const search = useCallback(async () => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const { data } = await db
      .from('profiles')
      .select('user_id, username')
      .ilike('username', `%${term}%`)
      .limit(8);
    setResults(
      ((data ?? []) as Array<{ user_id: string; username: string | null }>).map((row) => ({
        id: row.user_id,
        username: row.username,
      })),
    );
  }, [query]);

  const grant = useCallback(
    async (userId: string, role: AppRole) => {
      setBusy(`${userId}:${role}`);
      const { error } = await db.from('user_roles').insert({ user_id: userId, role });
      setBusy(null);
      if (error) {
        const message = error.message ?? '';
        if (message.includes('duplicate')) toast.error('Role already granted');
        else if (message.includes('sovereign')) toast.error('Admin is reserved for the sovereign administrator');
        else toast.error('Could not grant role');
        return;
      }
      toast.success(`${role} granted`);
      void load();
    },
    [load],
  );

  const revoke = useCallback(
    async (id: string) => {
      setBusy(id);
      const { error } = await db.from('user_roles').delete().eq('id', id);
      setBusy(null);
      if (error) {
        toast.error('Could not revoke role');
        return;
      }
      toast.success('Role revoked');
      void load();
    },
    [load],
  );

  const byRole = useMemo(() => {
    const map = new Map<AppRole, Grant[]>();
    for (const g of grants) map.set(g.role, [...(map.get(g.role) ?? []), g]);
    return map;
  }, [grants]);

  return (
    <Card data-role-panel>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Roles and permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_MODEL.map((definition) => (
            <div key={definition.role} className="rounded-lg border border-border p-3" data-role-def={definition.role}>
              <p className="text-sm font-semibold text-foreground">
                {definition.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {(byRole.get(definition.role) ?? []).length} assigned
                </span>
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {definition.grants.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Current grants</p>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
            </div>
          ) : grants.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">No roles granted yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {grants.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="truncate">
                    <span className="font-medium text-foreground">{g.username ?? g.user_id.slice(0, 8)}</span>
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{g.role}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void revoke(g.id)}
                    disabled={busy === g.id}
                    aria-label={`Revoke ${g.role}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Assign a role</p>
          <div className="mt-2 flex gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void search();
              }}
              placeholder="Search by username"
              aria-label="Search members by username"
            />
            <Button size="sm" variant="outline" onClick={() => void search()}>
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
          {results.length > 0 && (
            <ul className="mt-3 space-y-2">
              {results.map((candidate) => (
                <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="text-sm text-foreground">{candidate.username ?? candidate.id.slice(0, 8)}</span>
                  <span className="flex gap-1">
                    {ASSIGNABLE.map((role) => (
                      <Button
                        key={role}
                        size="sm"
                        variant="outline"
                        disabled={busy === `${candidate.id}:${role}`}
                        onClick={() => void grant(candidate.id, role)}
                      >
                        <UserPlus className="mr-1 h-3 w-3" aria-hidden="true" />
                        {role}
                      </Button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RolePermissionsPanel;
