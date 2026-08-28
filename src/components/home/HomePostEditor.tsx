import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Hash, Image as ImageIcon, Upload, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface HomePostDraft {
  title: string;
  text: string;
  tags: string[];
  files: File[];
}

interface HomePostEditorProps {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: HomePostDraft) => Promise<void>;
}

export default function HomePostEditor({ open, busy, onOpenChange, onSubmit }: HomePostEditorProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  const reset = () => {
    setTitle('');
    setText('');
    setTags('');
    setFiles([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-h-[88svh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border-border/70 bg-background/90 p-5 backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a post</DialogTitle>
          <DialogDescription>Share images, videos, and PDFs together in one post.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="home-post-title">Title</Label>
            <Input id="home-post-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Short title" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="home-post-text">Text</Label>
            <Textarea id="home-post-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={1200} placeholder="Write about this short" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="home-post-tags">Tags</Label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="home-post-tags" value={tags} onChange={(event) => setTags(event.target.value)} className="pl-9" placeholder="travel, friends, music" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="home-post-media">Media (optional)</Label>
            <input
              ref={fileRef}
              id="home-post-media"
              type="file"
              multiple
              accept="video/mp4,video/webm,video/quicktime,video/ogg,image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="sr-only"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                setFiles((current) => [...current, ...selected].slice(0, 10));
                event.target.value = '';
              }}
            />
            <Button type="button" variant="outline" className="w-full justify-start overflow-hidden" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              <span className="truncate">{files.length ? `Add more · ${files.length}/10 selected` : 'Choose images, videos, or PDFs'}</span>
            </Button>
            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="home-upload-previews">
                {previews.map(({ file, url }, index) => (
                  <div key={`${file.name}-${file.lastModified}-${index}`} className="relative aspect-square min-w-0 overflow-hidden rounded-md border border-border bg-muted">
                    {file.type.startsWith('image/') ? (
                      <img src={url} alt={`Preview ${file.name}`} className="h-full w-full object-cover" />
                    ) : file.type.startsWith('video/') ? (
                      <video src={url} aria-label={`Preview ${file.name}`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
                        <FileText className="h-8 w-8 text-primary" />
                        <span className="line-clamp-2 text-xs text-muted-foreground">{file.name}</span>
                      </div>
                    )}
                    <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-background/85 p-1 text-foreground">
                      {file.type.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5" /> : file.type.startsWith('video/') ? <Video className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    </span>
                    <Button type="button" variant="secondary" size="icon" className="absolute right-1 top-1 h-7 w-7" aria-label={`Remove ${file.name}`} disabled={busy} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button
            type="button"
            disabled={busy || (!files.length && !title.trim() && !text.trim())}
            onClick={async () => {
              await onSubmit({
                title: title.trim(),
                text: text.trim(),
                tags: tags.split(/[#,\s]+/).map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 12),
                files,
              });
              reset();
              onOpenChange(false);
            }}
          >
            {busy ? 'Publishing…' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}