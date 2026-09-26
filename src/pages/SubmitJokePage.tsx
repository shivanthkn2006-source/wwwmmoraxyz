import { useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { HUMOR_CATEGORIES, HUMOR_CATEGORY_LABELS, type HumorCategory } from '@/lib/humor';
import { supabase } from '@/integrations/supabase/client';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function SubmitJokePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<HumorCategory>('relatable');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    const headline = title.trim();
    const body = text.trim();
    if (!user || !headline || !body || busy) return;
    setBusy(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image smaller than 5 MB.');
        const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${user.id}/humor/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('posts').upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        imageUrl = supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
      } else {
        const { data, error } = await supabase.functions.invoke('generate-humor-image', { body: { title: headline, text: body } });
        if (error) throw new Error('The matching image could not be created. Please try again.');
        imageUrl = typeof data?.image_url === 'string' ? data.image_url : null;
        if (!imageUrl) throw new Error('The matching image could not be created. Please try again.');
      }
      const now = new Date();
      const lines = body.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 8).map((line, index) => ({ speaker: index % 2 ? 'B' : 'A', text: line.slice(0, 500) }));
      const safeLines = lines.length ? lines : [{ speaker: 'A', text: body.slice(0, 500) }];
      const { error } = await supabase.from('humor_drops').insert({
        author_id: user.id,
        category,
        drop_date: now.toISOString().slice(0, 10),
        headline,
        image_url: imageUrl,
        is_published: true,
        lines: safeLines,
        metal: 'quicksilver',
        origin: 'member',
        scheduled_for: now.toISOString(),
        slot: 99,
        source: 'member',
      });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('mmora:humor-refresh'));
      toast.success('Your joke is live in the Global feed.');
      navigate('/zoe-lol');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish your joke.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full bg-transparent px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-foreground" data-submit-joke>
      <PageSeo title="Share a joke" description="Share a joke with members in the Global feed." />
      <div className="mx-auto max-w-xl">
        <header className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-xl font-bold">Zoe's LOL · Share a joke</h1><p className="text-sm text-muted-foreground">It will appear in Zoe’s LOL and the Global feed.</p></div>
        </header>
        <div className="space-y-5 rounded-lg border border-border/40 bg-card/20 p-5 backdrop-blur-xl">
          <div className="space-y-2"><Label htmlFor="joke-title">Title</Label><Input id="joke-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="Give it a short title" /></div>
          <div className="space-y-2"><Label htmlFor="joke-text">Joke</Label><Textarea id="joke-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={1200} rows={7} placeholder="Write each speaker on a new line" /></div>
          <div className="space-y-2">
            <Label htmlFor="joke-category">Humor type</Label>
            <select id="joke-category" value={category} onChange={(event) => setCategory(event.target.value as HumorCategory)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {HUMOR_CATEGORIES.map((item) => <option key={item} value={item}>{HUMOR_CATEGORY_LABELS[item]}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" />{file?.name ?? 'Choose an image'}</Button>
            {file && <img src={URL.createObjectURL(file)} alt="Selected joke image" className="aspect-square w-full rounded-lg object-cover" />}
            {!file && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />A matching image will be created from your joke if you leave this empty.</p>}
          </div>
          <Button className="w-full" disabled={busy || !title.trim() || !text.trim()} onClick={() => void publish()}>{busy ? 'Publishing…' : 'Publish joke'}</Button>
        </div>
      </div>
    </main>
  );
}