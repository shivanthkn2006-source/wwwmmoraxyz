/** One post opened from a notification (like, comment, tag). */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PostCard from '@/components/PostCard';

export default function PostViewPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');

  const load = useCallback(async () => {
    if (!postId) return setState('missing');
    const { data: p } = await supabase.from('posts').select('*').eq('id', postId).maybeSingle();
    if (!p) return setState('missing');
    const { data: prof } = await supabase.from('profiles').select('display_name, username, profile_photo_url, status').eq('user_id', (p as any).user_id).maybeSingle();
    setPost({ ...p, profile: prof ?? undefined });
    setState('ok');
  }, [postId]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl p-4 space-y-4">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back</button>
        {state === 'loading' && <p className="text-sm text-muted-foreground">Opening post…</p>}
        {state === 'missing' && <p className="text-sm text-muted-foreground">This post was removed or isn't visible to you.</p>}
        {state === 'ok' && post && <PostCard post={post} onUpdate={load} />}
      </div>
    </div>
  );
}
