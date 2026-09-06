/**
 * Digital Vault — a private scrapbook for the things a member wants to keep or
 * leave behind. Masonry grid, dictation-to-memory, sealed-until dates.
 * Isolated route (`/legacy`): Home, Loops, feed and dock are untouched.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Lock, LockOpen, Plus, Trash2, Archive, Mic, Square, Loader2 } from 'lucide-react';
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
import { DictationSession } from '@/features/legacy/dictation';
import { useAgeCohort } from '@/hooks/useAgeCohort';
import { cohortStyle } from '@/features/intimacy/cohortStyle';

const LegacyVaultPage: React.FC = () => {
  const [memories, setMemories] = useState<LegacyMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState('');
  const [unlockAt, setUnlockAt] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const dictation = useRef<DictationSession | null>(null);

  const { cohort } = useAgeCohort();
  const style = cohortStyle(cohort);

  const load = useCallback(async () => {
    setLoading(true);
    setMemories(await listLegacyMemories());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    return () => dictation.current?.cancel();
  }, [load]);

  const toggleDictation = async () => {
    if (recording) {
      setRecording(false);
      setTranscribing(true);
      try {
        const result = await dictation.current!.stopAndTranscribe();
        if (result.unavailable) {
          toast.error('Transcription is not available right now — type it instead.');
        } else if (!result.text) {
          toast.message('Nothing was picked up. Try again a little closer to the mic.');
        } else {
          setBody((prev) => (prev ? `${prev.trim()}\n\n${result.text}` : result.text));
          if (!title.trim()) setTitle(result.text.split(/[.!?\n]/)[0].slice(0, 80));
          toast.success('Added what you said');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not transcribe that');
      } finally {
        dictation.current = null;
        setTranscribing(false);
      }
      return;
    }

    try {
      dictation.current = new DictationSession();
      await dictation.current.start();
      setRecording(true);
      toast.message('Listening — speak your memory, then press stop.');
    } catch (err) {
      dictation.current = null;
      toast.error(err instanceof Error ? err.message : 'Microphone is blocked for this site.');
    }
  };

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
        <title>Digital Vault | M'Mora</title>
        <meta
          name="description"
          content="A private scrapbook for messages, memories and media — dictate or type, and seal them until the moment you choose."
        />
        <link rel="canonical" href="/legacy" />
      </Helmet>

      <header className="max-w-6xl mx-auto mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
          <Archive className="h-6 w-6 text-primary" aria-hidden="true" />
          Digital Vault
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Private by design. Only you can open this vault — entries stay sealed until the date you set.
        </p>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
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
            placeholder="What do you want them to know? Type it, or press the mic and just talk."
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={recording ? 'destructive' : 'secondary'}
              onClick={toggleDictation}
              disabled={transcribing}
              className="gap-2"
              aria-pressed={recording}
              aria-label={recording ? 'Stop dictation' : 'Dictate this memory'}
            >
              {transcribing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : recording ? (
                <Square className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Mic className="h-4 w-4" aria-hidden="true" />
              )}
              {transcribing ? 'Writing it down…' : recording ? 'Stop and save words' : 'Speak a memory'}
            </Button>
            <Button onClick={save} disabled={saving || !title.trim()} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Saving…' : 'Add to vault'}
            </Button>
            <span className="text-xs text-muted-foreground ml-auto" aria-live="polite">
              {recording ? 'Listening…' : `Layout: ${style.label}`}
            </span>
          </div>
        </Card>

        <section aria-label="Vault entries">
          {loading && <p className="text-sm text-muted-foreground">Opening your vault…</p>}
          {!loading && memories.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing here yet. Your first entry starts the vault.</p>
          )}

          <div className={`${style.columnsClass} ${style.gapClass} [column-fill:_balance]`}>
            {memories.map((m) => {
              const open = isUnlocked(m);
              return (
                <Card
                  key={m.id}
                  className={`${style.cardClass} mb-4 break-inside-avoid bg-card/60 backdrop-blur border-border/60 transition-colors hover:border-primary/40`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {open ? (
                          <LockOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                        <h2 className={`${style.titleClass} truncate`}>{m.title}</h2>
                      </div>
                      {open ? (
                        m.body && (
                          <p className={`${style.bodyClass} text-muted-foreground mt-2 whitespace-pre-wrap`}>{m.body}</p>
                        )
                      ) : (
                        <p className={`${style.bodyClass} text-muted-foreground mt-2`}>
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
                      <p className="text-[11px] text-muted-foreground/70 mt-3">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </p>
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
          </div>
        </section>
      </main>
    </div>
  );
};

export default LegacyVaultPage;
