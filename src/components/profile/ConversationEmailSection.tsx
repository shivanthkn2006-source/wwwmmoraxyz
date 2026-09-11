/**
 * ConversationEmailSection
 * ------------------------
 * Where a member puts the address Zoe should write to, and decides whether she
 * sends a daily recap. Also lets them ask for the full transcript right now.
 *
 * Everything is owner-scoped: the address is stored on their own profile row
 * and the send function only ever reads that same member's messages.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const ConversationEmailSection: React.FC = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [digest, setDigest] = useState(false);
  const [hour, setHour] = useState(8);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('contact_email, email_digest_enabled, email_digest_hour')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setEmail(data?.contact_email ?? user.email ?? '');
      setDigest(Boolean(data?.email_digest_enabled));
      setHour(typeof data?.email_digest_hour === 'number' ? data.email_digest_hour : 8);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [user]);

  const save = useCallback(async (next?: { digest?: boolean; hour?: number }) => {
    if (!user) return;
    const address = email.trim();
    if (address && !EMAIL_RE.test(address)) {
      toast.error('That email address does not look right');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        contact_email: address || null,
        email_digest_enabled: next?.digest ?? digest,
        email_digest_hour: next?.hour ?? hour,
      })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error('Could not save your email settings');
    else toast.success('Email settings saved');
  }, [user, email, digest, hour]);

  const sendNow = useCallback(async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoe-conversation-mail', {
        body: { mode: 'now', days: 30 },
      });
      const result = data as { ok?: boolean; error?: string; messageCount?: number } | null;
      if (error || !result?.ok) {
        toast.error(result?.error || 'Zoe could not send your history right now');
      } else {
        toast.success(`Sent ${result.messageCount} messages to your inbox`);
      }
    } finally {
      setSending(false);
    }
  }, []);

  if (!user) return null;

  return (
    <section className="px-4 py-6 border-t border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Zoe by email</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zoe-contact-email" className="text-xs text-muted-foreground">
            Where Zoe should write to
          </Label>
          <div className="flex gap-2">
            <Input
              id="zoe-contact-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              disabled={loading}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={() => void save()} disabled={saving || loading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-foreground">Daily recap</p>
            <p className="text-xs text-muted-foreground">
              A summary of yesterday's conversations, once a day.
            </p>
          </div>
          <Switch
            checked={digest}
            disabled={loading}
            onCheckedChange={(checked) => {
              setDigest(checked);
              void save({ digest: checked });
            }}
          />
        </div>

        {digest && (
          <div className="space-y-2">
            <Label htmlFor="zoe-digest-hour" className="text-xs text-muted-foreground">
              Send at (UTC hour)
            </Label>
            <Input
              id="zoe-digest-hour"
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Math.min(23, Math.max(0, Number(e.target.value) || 0)))}
              onBlur={() => void save()}
              className="w-24"
            />
          </div>
        )}

        <Button variant="outline" size="sm" className="gap-2" onClick={() => void sendNow()} disabled={sending}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="text-xs">Email me my conversations</span>
        </Button>
      </div>
    </section>
  );
};

export default ConversationEmailSection;
