/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ZOE VISION SEARCH — upload a photo, get it back from visual memory.
 *
 * Flow (all real, no mocks):
 *   1. The photo is analysed by the `zoe-infinity-vision` backend.
 *   2. The analysis is persisted as a private `vision_*` memory, which the
 *      search indexer picks up as a `visual_memory` entity.
 *   3. The description's strongest terms are used to pull matching visual
 *      memories back out of the RLS-scoped index and the user's own memory
 *      rows, so "where was this restaurant?" resolves against real history.
 *
 * Mounted on the DHF dashboard only — Home, dock, feed and navigation are
 * untouched.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, Search, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useMultiModalVision } from '@/hooks/useMultiModalVision';
import { toast } from 'sonner';

interface VisualMatch {
  id: string;
  title: string;
  excerpt: string;
  source: 'index' | 'memory';
  createdAt: string | null;
}

const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'there', 'their', 'which', 'about',
  'image', 'photo', 'picture', 'shows', 'appears', 'looks', 'these', 'those',
  'into', 'over', 'under', 'some', 'they', 'been', 'were', 'also', 'very',
]);

/** Pull the most distinctive words out of a vision description. */
function keywordsFrom(text: string, limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const raw of (text || '').toLowerCase().match(/[a-z]{4,}/g) ?? []) {
    if (STOPWORDS.has(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

export default function ZoeVisionSearchPanel() {
  const { user } = useAuth();
  const { analyzeImage, isAnalyzing } = useMultiModalVision();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [matches, setMatches] = useState<VisualMatch[]>([]);
  const [searching, setSearching] = useState(false);

  const searchVisualMemory = useCallback(async (words: string[]) => {
    if (!words.length) return;
    setSearching(true);
    try {
      const query = words.slice(0, 4).join(' ');
      const orFilter = words.slice(0, 4).map((w) => `value.ilike.%${w}%,context.ilike.%${w}%`).join(',');

      const [indexRes, memoryRes] = await Promise.all([
        supabase.rpc('zoe_prefix_search', { query_text: query, match_count: 24 }),
        user?.id
          ? supabase
              .from('zoe_infinity_memories')
              .select('id, key, value, context, created_at')
              .eq('user_id', user.id)
              .like('key', 'vision_%')
              .or(orFilter)
              .order('created_at', { ascending: false })
              .limit(12)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const found: VisualMatch[] = [];
      const seen = new Set<string>();

      for (const row of (indexRes.data ?? []) as any[]) {
        if (row.entity_type !== 'visual_memory') continue;
        if (seen.has(row.entity_id)) continue;
        seen.add(row.entity_id);
        found.push({
          id: row.entity_id,
          title: 'Visual memory',
          excerpt: String(row.content_synthesis || '').slice(0, 240),
          source: 'index',
          createdAt: row.created_at ?? null,
        });
      }

      for (const row of ((memoryRes as any).data ?? []) as any[]) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        found.push({
          id: row.id,
          title: String(row.key || 'vision').replace('vision_', 'Seen: '),
          excerpt: `${row.value || ''} ${row.context || ''}`.trim().slice(0, 240),
          source: 'memory',
          createdAt: row.created_at ?? null,
        });
      }

      setMatches(found.slice(0, 12));
      if (!found.length) toast.info('No earlier visual memory matches this photo yet.');
    } catch (error) {
      console.warn('[vision-search] lookup failed', error);
      toast.error('Visual memory lookup failed');
    } finally {
      setSearching(false);
    }
  }, [user?.id]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    setPreview(dataUrl);
    setMatches([]);
    setDescription(null);

    const analysis = await analyzeImage({ imageData: dataUrl, inputType: 'image', includeOCR: true });
    if (!analysis) return;

    const text = `${analysis.description} ${analysis.detailedAnalysis ?? ''} ${(analysis.detectedObjects ?? []).join(' ')}`;
    const words = keywordsFrom(text);
    setDescription(analysis.description);
    setTerms(words);
    await searchVisualMemory(words);
  }, [analyzeImage, searchVisualMemory]);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Vision search</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">visual memory</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Upload a photo of a place, restaurant or city. Zoe reads it, stores it in your private visual
        memory and pulls back every earlier moment that matches.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={isAnalyzing}>
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          <span className="ml-2">Upload photo</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isAnalyzing || searching || !terms.length}
          onClick={() => void searchVisualMemory(terms)}
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-2">Search again</span>
        </Button>
      </div>

      {preview && (
        <div className="flex gap-3">
          <img
            src={preview}
            alt="Photo submitted to Zoe's vision search"
            loading="lazy"
            className="h-24 w-24 rounded-lg object-cover border border-border"
          />
          <div className="flex-1 space-y-2">
            {isAnalyzing && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Camera className="h-3 w-3" /> Zoe is looking at it…
              </p>
            )}
            {description && <p className="text-xs leading-relaxed">{description}</p>}
            {terms.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {terms.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {matches.length} matching visual {matches.length === 1 ? 'memory' : 'memories'}
          </p>
          {matches.map((m) => (
            <div key={`${m.source}-${m.id}`} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{m.title}</span>
                <span className="text-[10px] text-muted-foreground">
                  {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{m.excerpt}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
