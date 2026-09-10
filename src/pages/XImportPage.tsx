/**
 * IMPORT FROM X — paste a link to a public post on X and save its words,
 * picture and original date into your Home feed.
 *
 * The reading happens on the server (no X account or key needed). Nothing is
 * saved until you have seen the preview and pressed save, and the saved post
 * always keeps a line crediting the original author and date.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface ImportedPost {
  id: string;
  url: string;
  text: string;
  author: string | null;
  handle: string | null;
  imageUrl: string | null;
  createdAt: string | null;
}

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function XImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<ImportedPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = async () => {
    setLoading(true);
    setError(null);
    setPost(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('x-post-import', { body: { url } });
      if (fnError) throw fnError;
      const body = data as { ok?: boolean; error?: string; post?: ImportedPost };
      if (!body?.ok || !body.post) throw new Error(body?.error || 'That post could not be read.');
      setPost(body.post);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That post could not be read.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!post || !user) return;
    setSaving(true);
    try {
      const credit = [post.author, post.handle].filter(Boolean).join(' ');
      const when = formatDate(post.createdAt);
      const content = [
        post.text,
        '',
        `From X${credit ? ` · ${credit}` : ''}${when ? ` · ${when}` : ''}`,
        post.url,
      ].join('\n');

      const { error: insertError } = await supabase.from('posts').insert({
        user_id: user.id,
        content,
        media_url: post.imageUrl,
        media_type: post.imageUrl ? 'image' : null,
        visibility: 'global',
      });
      if (insertError) throw insertError;

      toast({ title: 'Saved to Home', description: 'The post is now in your feed.' });
      navigate('/home');
    } catch (e) {
      toast({
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Save a post from X — M'Mora</title>
        <meta name="description" content="Paste a link to a public post on X and keep its words, picture and date in your M'Mora Home feed." />
      </Helmet>

      <main className="mx-auto max-w-2xl px-5 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-light">Save a post from X</h1>
          <p className="text-sm text-muted-foreground">
            Paste the link to a public post. You will see exactly what will be saved before anything goes to your Home.
          </p>
        </header>

        <section className="space-y-3">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) void read(); }}
            placeholder="https://x.com/someone/status/1234567890"
            aria-label="Link to a post on X"
            inputMode="url"
          />
          <div className="flex items-center gap-2">
            <Button onClick={() => void read()} disabled={loading || !url.trim()}>
              {loading ? 'Reading…' : 'Read the post'}
            </Button>
            <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
              Back to Home
            </Link>
          </div>
          {error && <p role="alert" className="text-sm text-muted-foreground border border-border p-3">{error}</p>}
        </section>

        {post && (
          <section className="space-y-4 border border-border p-5">
            <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Preview</h2>
            <p className="whitespace-pre-wrap text-sm">{post.text}</p>
            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt="Picture from the original post on X"
                loading="lazy"
                className="w-full border border-border grayscale"
              />
            )}
            <p className="text-xs text-muted-foreground">
              From X{[post.author, post.handle].filter(Boolean).length ? ` · ${[post.author, post.handle].filter(Boolean).join(' ')}` : ''}
              {formatDate(post.createdAt) ? ` · ${formatDate(post.createdAt)}` : ' · date not published'}
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={() => void save()} disabled={saving || !user}>
                {saving ? 'Saving…' : 'Save to Home'}
              </Button>
              <Button variant="outline" onClick={() => setPost(null)} disabled={saving}>Discard</Button>
            </div>
            {!user && <p className="text-xs text-muted-foreground">Sign in first to save this.</p>}
          </section>
        )}
      </main>
    </div>
  );
}
