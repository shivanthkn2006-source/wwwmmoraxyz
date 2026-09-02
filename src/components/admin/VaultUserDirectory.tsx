/**
 * VAULT USER DIRECTORY — the sovereign's member table.
 *
 * Lists every member with their live role grants and lets the sovereign assign
 * or revoke moderator / tester (and attempt admin, which the database's
 * sovereign guard refuses for anyone but the bound account). Every mutation is
 * re-checked server-side by the `has_role(uid,'admin')` policies on
 * `public.user_roles` — this UI cannot grant anything the database won't.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'tester' | 'user';

const ASSIGNABLE: Exclude<AppRole, 'user'>[] = ['admin', 'moderator', 'tester'];

interface Member {
  userId: string;
  username: string | null;
  displayName: string | null;
  createdAt: string | null;
  roles: { id: string; role: AppRole }[];
}

const db = supabase as unknown as { from: (table: string) => any };

const VaultUserDirectory: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      db
        .from('profiles')
        .select('user_id, username, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      db.from('user_roles').select('id, user_id, role'),
    ]);
    const roleRows = (roles ?? []) as Array<{ id: string; user_id: string; role: AppRole }>;
    const byUser = new Map<string, { id: string; role: AppRole }[]>();
    for (const row of roleRows) {
      byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), { id: row.id, role: row.role }]);
    }
    setMembers(
      ((profiles ?? []) as Array<{
        user_id: string;
        username: string | null;
        display_name: string | null;
        created_at: string | null;
      }>).map((p) => ({
        userId: p.user_id,
        username: p.username,
        displayName: p.display_name,
        createdAt: p.created_at,
        roles: byUser.get(p.user_id) ?? [],
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grant = useCallback(
    async (userId: string, role: AppRole) => {
      setBusy(`${userId}:${role}`);
      const { error } = await db.from('user_roles').insert({ user_id: userId, role });
      setBusy(null);
      if (error) {
        const message: string = error.message ?? '';
        toast.error(
          message.includes('duplicate')
            ? 'Role already granted'
            : message.includes('sovereign')
              ? 'Admin is sealed to the sovereign account'
              : 'Could not grant role',
        );
        return;
      }
      toast.success(`${role} granted`);
      void load();
    },
    [load],
  );

  const revoke = useCallback(
    async (grantId: string) => {
      setBusy(grantId);
      const { error } = await db.from('user_roles').delete().eq('id', grantId);
      setBusy(null);
      if (error) {
        toast.error(
          (error.message ?? '').includes('sovereign')
            ? 'The sovereign role cannot be revoked'
            : 'Could not revoke role',
        );
        return;
      }
      toast.success('Role revoked');
      void load();
    },
    [load],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) =>
      [m.username, m.displayName, m.userId].some((v) => (v ?? '').toLowerCase().includes(term)),
    );
  }, [members, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { members: members.length, admin: 0, moderator: 0, tester: 0 };
    for (const m of members) for (const r of m.roles) map[r.role] = (map[r.role] ?? 0) + 1;
    return map;
  }, [members]);

  return (
    <section className="rounded-xl border border-border bg-card p-5" data-vault-users>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" aria-hidden="true" /> Member directory
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" /> Refresh
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(['members', 'admin', 'moderator', 'tester'] as const).map((key) => (
          <div key={key} className="rounded-lg border border-border/70 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</p>
            <p className="text-lg font-semibold text-foreground">{counts[key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by username or id"
          aria-label="Filter members"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading directory…
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No members match that filter.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {filtered.map((member) => (
            <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.username ?? member.displayName ?? member.userId.slice(0, 8)}
                  {member.roles.some((r) => r.role === 'admin') && (
                    <ShieldCheck className="ml-2 inline h-3.5 w-3.5 text-primary" aria-label="sovereign" />
                  )}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {member.userId.slice(0, 8)}…
                  {member.createdAt ? ` · joined ${new Date(member.createdAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {member.roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => void revoke(r.id)}
                    aria-label={`Revoke ${r.role} from ${member.username ?? member.userId}`}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    {r.role}
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                ))}
                {ASSIGNABLE.filter((role) => !member.roles.some((r) => r.role === role)).map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={busy === `${member.userId}:${role}`}
                    onClick={() => void grant(member.userId, role)}
                    aria-label={`Grant ${role} to ${member.username ?? member.userId}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-foreground hover:border-primary"
                  >
                    <UserPlus className="h-3 w-3" aria-hidden="true" />
                    {role}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Moderator and tester grants apply instantly. The admin role is sealed to the sovereign
        account by a database trigger, so an admin grant to anyone else is refused server-side.
      </p>
    </section>
  );
};

export default VaultUserDirectory;
