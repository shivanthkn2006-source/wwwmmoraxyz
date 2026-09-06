/**
 * Legacy Vault — a private, sealed place for the things a member wants to
 * leave behind. Isolated route (`/legacy`): Home, Loops, feed and dock are
 * untouched.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Lock, LockOpen, Plus, Trash2, Archive } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  listLegacyMemories,
  createLegacyMemory,
  deleteLegacyMemory,
  isUnlocked,
  type LegacyMemory,
} from '@/features/legacy/legacyVault';

const LegacyVaultPage: React.FC = () => {
  const [memories, setMemories] = useState<LegacyMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState('');
  const [unlockAt, setUnlockAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMemories(await listLegacyMemories());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const created = await createLegacyMemory({
        title,
        body,
        recipients: recipients.split(',').map((r) => r.trim()).filter(Boolean),
        unlockAt: unlockAt ? new Date(unlockAt).toISOString() : null,
        isSealed: !!unlockAt,
      });
      if (created) {
        setMemories((prev) => [created, ...prev]);
        setTitle('');
        setBody('');
        setRecipients('');
        setUnlockAt('');
        toast.success('Saved to your vault');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save that');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (await deleteLegacyMemory(id)) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } else {
      toast.error('Could not remove that entry');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 md:px-8">
      <Helmet>
        <title>Legacy Vault | M'Mora</title>
        <meta
          name="description"
          content="Keep private messages, memories and media for the people who matter, sealed until the moment you choose."
        />
        <link rel="canonical" href="/legacy" />
      </Helmet>

      <header className="max-w-3xl mx-auto mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
          <Archive className="h-6 w-6 text-primary" aria-hidden="true" />
          Legacy Vault
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Private by design. Only you can open this vault — entries stay sealed until the date you set.
        </p>
      </header>

      <main className="max-w-3xl mx-auto space-y-8">
        <Card className="p-5 bg-card/60 backdrop-blur border-border/60 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. For Maya, on her graduation"
            maxLength={200}
            aria-label="Memory title"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What do you want them to know?"
            rows={5}
            aria-label="Memory message"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Recipients, comma separated"
              aria-label="Recipients"
            />
            <Input
              type="datetime-local"
              value={unlockAt}
              onChange={(e) => setUnlockAt(e.target.value)}
              aria-label="Unlock date"
            />
          </div>
          <Button onClick={save} disabled={saving || !title.trim()} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving…' : 'Add to vault'}
          </Button>
        </Card>

        <section aria-label="Vault entries" className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Opening your vault…</p>}
          {!loading && memories.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing here yet. Your first entry starts the vault.</p>
          )}
          {memories.map((m) => {
            const open = isUnlocked(m);
            return (
              <Card key={m.id} className="p-4 bg-card/60 backdrop-blur border-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {open ? (
                        <LockOpen className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Lock className="h-4 w-4 text-amber-400" aria-hidden="true" />
                      )}
                      <h2 className="font-medium truncate">{m.title}</h2>
                    </div>
                    {open ? (
                      m.body && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{m.body}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">
                        Sealed until {new Date(m.unlockAt as string).toLocaleString()}.
                      </p>
                    )}
                    {m.recipients.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {m.recipients.map((r) => (
                          <Badge key={r} variant="outline" className="text-xs">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(m.id)}
                    aria-label={`Remove ${m.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
};

export default LegacyVaultPage;
