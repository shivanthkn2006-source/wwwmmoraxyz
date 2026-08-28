import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ImageViewer from '@/components/ImageViewer';
import type { PostAttachment } from '@/pages/home/homeFeedUtils';

interface PostAttachmentGalleryProps {
  attachments: PostAttachment[];
  onVideoCompleted?: () => void;
}

export default function PostAttachmentGallery({ attachments, onVideoCompleted }: PostAttachmentGalleryProps) {
  const [openImage, setOpenImage] = useState<PostAttachment | null>(null);
  return (
    <>
      <Carousel opts={{ align: 'start', loop: false }} className="h-full w-full" aria-label="Post attachments">
        <CarouselContent className="ml-0 h-full">
          {attachments.map((attachment) => (
            <CarouselItem key={attachment.id} className="h-full basis-full pl-0">
              {attachment.media_type === 'image' ? (
                <button type="button" className="flex h-full w-full items-center justify-center bg-foreground" onClick={() => setOpenImage(attachment)} aria-label={`Open ${attachment.file_name}`}>
                  <img src={attachment.media_url} alt={attachment.file_name} className="block max-h-full max-w-full object-contain" />
                </button>
              ) : attachment.media_type === 'video' ? (
                <div className="flex h-full w-full items-center justify-center bg-foreground">
                  <video src={attachment.media_url} poster={attachment.media_preview_url ?? undefined} controls playsInline preload="metadata" className="block max-h-full max-w-full object-contain" onEnded={onVideoCompleted} />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted p-4 sm:p-8">
                  <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
                    <FileText className="h-14 w-14 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{attachment.file_name}</p>
                      <p className="text-xs text-muted-foreground">PDF · {(attachment.file_size / 1_000_000).toFixed(1)} MB</p>
                    </div>
                    <Button asChild>
                      <a href={attachment.media_url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="mr-2 h-4 w-4" /> Open PDF
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-3 z-20 border-border/60 bg-background/80" />
        <CarouselNext className="right-3 z-20 border-border/60 bg-background/80" />
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-background/80 px-2 py-1 text-xs text-foreground">
          {attachments.length} files
        </div>
      </Carousel>
      {openImage && <ImageViewer imageUrl={openImage.media_url} alt={openImage.file_name} onClose={() => setOpenImage(null)} />}
    </>
  );
}