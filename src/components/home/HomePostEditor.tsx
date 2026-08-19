import React, { useRef, useState } from 'react';
import { Hash, Upload, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface HomePostDraft {
  title: string;
  text: string;
  tags: string[];
  file: File;
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
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle('');
    setText('');
    setTags('');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-h-[88svh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border-border/70 bg-background/90 p-5 backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a short</DialogTitle>
          <DialogDescription>Publish a 9:16 video with searchable title, text and tags.</DialogDescription>
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
            <Label htmlFor="home-post-video">9:16 video</Label>
            <input
              ref={fileRef}
              id="home-post-video"
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/ogg"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" className="w-full justify-start overflow-hidden" onClick={() => fileRef.current?.click()}>
              {file ? <Video className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              <span className="truncate">{file?.name ?? 'Choose video'}</span>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button
            type="button"
            disabled={busy || !file || (!title.trim() && !text.trim())}
            onClick={async () => {
              if (!file) return;
              await onSubmit({
                title: title.trim(),
                text: text.trim(),
                tags: tags.split(/[#,\s]+/).map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 12),
                file,
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