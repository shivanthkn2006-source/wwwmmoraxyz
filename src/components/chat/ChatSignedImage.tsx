import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const MARKER = '/storage/v1/object/sign/messages/';

/** Chat image links expire; re-sign the stored file path so old images keep loading for both members. */
export const useFreshMessageUrl = (url: string | null | undefined) => {
  const [fresh, setFresh] = useState<string | null>(url ?? null);
  useEffect(() => {
    if (!url) { setFresh(null); return; }
    const at = url.indexOf(MARKER);
    if (at === -1) { setFresh(url); return; }
    const path = decodeURIComponent(url.slice(at + MARKER.length).split('?')[0]);
    let alive = true;
    void supabase.storage.from('messages').createSignedUrl(path, 3600).then(({ data }) => {
      if (alive) setFresh(data?.signedUrl ?? url);
    });
    return () => { alive = false; };
  }, [url]);
  return fresh;
};

export const ChatSignedImage = ({ url, onOpen }: { url: string; onOpen: (fresh: string) => void }) => {
  const fresh = useFreshMessageUrl(url);
  if (!fresh) return null;
  return (
    <Button variant="ghost" className="h-auto max-w-full p-0" aria-label="Open message attachment" onClick={() => onOpen(fresh)}>
    <img
      src={fresh}
      alt="Message attachment"
      loading="lazy"
      className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
    />
    </Button>
  );
};
