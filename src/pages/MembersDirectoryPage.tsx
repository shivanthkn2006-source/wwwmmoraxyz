/**
 * MEMBER DIRECTORY — any signed-in member can find people by name or @handle,
 * send a friend request, and answer incoming requests. Only name, handle and
 * photo are shown; personal details stay friends-only.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { searchDirectory, type DirectoryProfile } from '@/lib/friendDirectory';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const Avatar = ({ p }: { p: Pick<DirectoryProfile, 'profile_photo_url' | 'display_name'> }) =>
  p.profile_photo_url
    ? <img src={p.profile_photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
    : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm text-foreground">{(p.display_name || '?').slice(0, 1)}</div>;

const MembersDirectoryPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const fr = useFriendRequests();

  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      setResults(await searchDirectory(q, me, 20));
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, me]);

  const add = async (id: string) => {
    await fr.sendFriendRequest(id);
    setSent((s) => new Set(s).add(id));
  };

  const incoming = fr.receivedRequests as any[];

  return (
    <div className="profile-liquid-page min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Members</h1>
          <p className="text-sm text-muted-foreground">
            Find people by name or @handle and send a friend request. Have an invite code?{' '}
            <Link to="/invite-friends" className="underline">Accept or send invites</Link>.
          </p>
        </header>

        {incoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">Friend requests ({incoming.length})</h2>
            {incoming.map((r) => (
              <Card key={r.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar p={{ profile_photo_url: r.sender_profile?.profile_photo_url ?? null, display_name: r.sender_profile?.display_name ?? null }} />
                  <p className="truncate text-sm text-foreground">{r.sender_profile?.display_name || r.sender_profile?.username || 'Member'}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => fr.acceptFriendRequest(r.id)} aria-label="Accept"><Check className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => fr.rejectFriendRequest(r.id)} aria-label="Decline"><X className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </section>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or @handle" className="pl-9" />
        </div>

        <section className="space-y-3">
          {searching && <p className="text-sm text-muted-foreground">Searching…</p>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground">No members found.</p>
          )}
          {results.map((p) => (
            <Card key={p.user_id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar p={p} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{p.display_name || p.username}</p>
                  {p.username && <p className="truncate text-xs text-muted-foreground">@{p.username}</p>}
                </div>
              </div>
              <Button size="sm" onClick={() => add(p.user_id)} disabled={sent.has(p.user_id)}>
                <UserPlus className="mr-2 h-4 w-4" />{sent.has(p.user_id) ? 'Sent' : 'Add'}
              </Button>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
};

export default MembersDirectoryPage;
