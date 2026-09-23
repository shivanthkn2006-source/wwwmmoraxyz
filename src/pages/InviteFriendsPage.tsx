/**
 * INVITE FRIENDS — a signed-in member mints personal invite links.
 *
 * Anyone who joins through the link is connected as a friend immediately, so
 * their birthday and shared planner events appear for both accounts.
 */
import { useCallback, useEffect, useState } from 'react';
import { Copy, Share2, UserPlus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { redeemInviteCode } from '@/lib/betaInvites';

interface MemberInvite {
  id: string;
  code: string;
  is_active?: boolean;
  expires_at: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  revoked_at?: string | null;
}

const inviteLink = (code: string) => `${window.location.origin}/beta?code=${encodeURIComponent(code)}`;

const InviteFriendsPage = () => {
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [acceptCode, setAcceptCode] = useState('');
  const [accepting, setAccepting] = useState(false);

  const acceptInvite = async () => {
    setAccepting(true);
    const result = await redeemInviteCode(acceptCode);
    setAccepting(false);
    if (!result.ok) { toast.error(result.error || 'That invite could not be accepted.'); return; }
    setAcceptCode('');
    toast.success('Invite accepted — you are now friends.');
  };

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('beta-invite', { body: { action: 'my-invites' } });
    setLoading(false);
    if (error || !data?.ok) {
      toast.error('Could not load your invites right now.');
      return;
    }
    setInvites((data.invites ?? []) as MemberInvite[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createInvite = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('beta-invite', {
      body: { action: 'invite-friend', label: label.trim() },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast.error(data?.error || 'Could not create an invite. Try again in a moment.');
      return;
    }
    setLabel('');
    toast.success('Invite ready — share the link with your friend.');
    void load();
  };

  const share = async (code: string) => {
    const link = inviteLink(code);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on M'mora", text: "Here's my invite to M'mora", url: link });
        return;
      } catch { /* user dismissed the share sheet */ }
    }
    await navigator.clipboard.writeText(link);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Invite link copied.');
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(inviteLink(code));
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Invite link copied.');
  };

  const pending = invites.filter((invite) => !invite.used_by && !invite.revoked_at);
  const joined = invites.filter((invite) => invite.used_by);

  return (
    <div className="profile-liquid-page min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Invite friends</h1>
          <p className="text-sm text-muted-foreground">
            Everyone who joins with your link becomes your friend straight away, so their birthday and
            shared plans show up in your Diary and Calendar.
          </p>
        </header>

        <Card className="space-y-3 p-4">
          <label className="text-sm font-medium text-foreground" htmlFor="invite-label">
            Who is this for? (optional)
          </label>
          <Input
            id="invite-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Priya"
            maxLength={120}
          />
          <Button onClick={createInvite} disabled={busy} className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            {busy ? 'Creating…' : 'Create invite link'}
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <label className="text-sm font-medium text-foreground" htmlFor="accept-code">
            Got an invite from someone? Enter the code
          </label>
          <div className="flex gap-2">
            <Input id="accept-code" value={acceptCode} onChange={(e) => setAcceptCode(e.target.value)} placeholder="MMORA-XXXX" maxLength={64} />
            <Button onClick={acceptInvite} disabled={accepting || !acceptCode.trim()}>
              {accepting ? 'Accepting…' : 'Accept'}
            </Button>
          </div>
        </Card>


        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">Ready to share ({pending.length})</h2>
          {loading && <p className="text-sm text-muted-foreground">Loading your invites…</p>}
          {!loading && pending.length === 0 && (
            <p className="text-sm text-muted-foreground">No unused invites yet — create one above.</p>
          )}
          {pending.map((invite) => (
            <Card key={invite.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-foreground">{invite.code}</p>
                <p className="text-xs text-muted-foreground">
                  {invite.expires_at ? `Expires ${new Date(invite.expires_at).toLocaleDateString()}` : 'No expiry'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(invite.code)}>
                  {copied === invite.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button size="sm" onClick={() => share(invite.code)}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>
            </Card>
          ))}
        </section>

        {joined.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">Joined ({joined.length})</h2>
            {joined.map((invite) => (
              <Card key={invite.id} className="flex items-center justify-between gap-3 p-4">
                <p className="truncate font-mono text-sm text-foreground">{invite.code}</p>
                <p className="text-xs text-muted-foreground">
                  {invite.used_at ? new Date(invite.used_at).toLocaleDateString() : 'Accepted'}
                </p>
              </Card>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default InviteFriendsPage;
