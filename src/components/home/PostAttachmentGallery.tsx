import React, { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ImageViewer from '@/components/ImageViewer';
import { cn } from '@/lib/utils';
import type { PostAttachment } from '@/pages/home/homeFeedUtils';

interface PostAttachmentGalleryProps {
  attachments: PostAttachment[];
  onVideoCompleted?: () => void;
}

/**
 * Shorts/Reels-style attachment gallery: every slide fills the whole media
 * frame, horizontal swipe between files, dots pinned above the caption so the
 * header logo and the bottom-right control rail stay clear.
 */
export default function PostAttachmentGallery({ attachments, onVideoCompleted }: PostAttachmentGalleryProps) {
  const [openImage, setOpenImage] = useState<PostAttachment | null>(null);
  const [selected, setSelected] = useState(0);
  const [emblaRef, embla] = useEmblaCarousel({ align: 'start', loop: false, containScroll: 'trimSnaps' });
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    onSelect();
    embla.on('select', onSelect);
    embla.on('reInit', onSelect);
    return () => {
      embla.off('select', onSelect);
      embla.off('reInit', onSelect);
    };
  }, [embla]);

  // Only the visible slide may play — matches single-video-at-a-time feed rule.
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index !== selected) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [selected]);

  const scrollTo = useCallback((index: number) => embla?.scrollTo(index), [embla]);

  return (
    <>
      <div className="relative h-full w-full overflow-hidden bg-black" data-testid="post-attachment-gallery">
        <div ref={emblaRef} className="h-full w-full overflow-hidden">
          <div className="flex h-full w-full">
            {attachments.map((attachment, index) => (
              <div
                key={attachment.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${attachments.length}`}
                className="relative h-full w-full min-w-0 shrink-0 grow-0 basis-full"
              >
                {attachment.media_type === 'image' ? (
                  <button
                    type="button"
                    className="absolute inset-0 flex h-full w-full items-center justify-center"
                    onClick={() => setOpenImage(attachment)}
                    aria-label={`Open ${attachment.file_name}`}
                  >
                    <img
                      src={attachment.media_url}
                      alt={attachment.file_name}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </button>
                ) : attachment.media_type === 'video' ? (
                  <div className="absolute inset-0 flex h-full w-full items-center justify-center">
                    <video
                      ref={(node) => { videoRefs.current[index] = node; }}
                      src={attachment.media_url}
                      poster={attachment.media_preview_url ?? undefined}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                      onEnded={onVideoCompleted}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted p-4 sm:p-8">
                    <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
                      <FileText className="h-14 w-14 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          PDF · {(attachment.file_size / 1_000_000).toFixed(1)} MB
                        </p>
                      </div>
                      <Button asChild>
                        <a href={attachment.media_url} target="_blank" rel="noopener noreferrer" download>
                          <Download className="mr-2 h-4 w-4" /> Open PDF
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {attachments.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center">
            <div
              className="flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1.5 backdrop-blur"
              role="tablist"
              aria-label={`Attachment ${selected + 1} of ${attachments.length}`}
            >
              {attachments.map((attachment, index) => (
                <button
                  key={attachment.id}
                  type="button"
                  role="tab"
                  aria-selected={index === selected}
                  aria-label={`Go to file ${index + 1}`}
                  onClick={() => scrollTo(index)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === selected ? 'w-5 bg-foreground' : 'w-1.5 bg-foreground/40',
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {openImage && (
        <ImageViewer imageUrl={openImage.media_url} alt={openImage.file_name} onClose={() => setOpenImage(null)} />
      )}
    </>
  );
}
