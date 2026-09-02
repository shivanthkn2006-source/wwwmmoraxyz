/**
 * DHF SHARE SHEET — one sheet that actually shares a DHF card or video to
 * every supported destination.
 *
 * Web-intent platforms (X, Facebook, LinkedIn, WhatsApp, Telegram, Reddit,
 * Email) open their real dialog. App-only platforms (YouTube, TikTok,
 * Instagram) have no web share intent, so the caption + link are copied to the
 * clipboard first and the composer is opened — the share still works, it just
 * needs a paste. The native OS sheet is offered first when the browser has it.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Check, Copy, Link2, Share2, X as CloseIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  SHARE_TARGET_LABELS,
  WEB_SHARE_TARGETS,
  buildShareUrl,
  isOpenableShareUrl,
  openShare,
  type ShareTarget,
  type SharePayload,
} from '@/lib/shareTargets';

/** Platforms with no web intent: caption is copied, composer is opened. */
export const CLIPBOARD_SHARE_TARGETS: ShareTarget[] = ['youtube', 'tiktok', 'instagram'];

/** The exact text handed to the clipboard / native sheet. Pure, so it is testable. */
export const buildShareCaption = (payload: SharePayload): string => {
  const tags = (payload.hashtags ?? [])
    .map((tag) => `#${tag.replace(/^#/, '').replace(/[^A-Za-z0-9_]/g, '')}`)
    .filter((tag) => tag.length > 1);
  return [payload.text.trim(), payload.url?.trim(), tags.join(' ')]
    .filter(Boolean)
    .join('\n\n');
};

const copyText = async (value: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: SharePayload;
  title?: string;
}

const DhfShareSheet: React.FC<Props> = ({ open, onOpenChange, payload, title = 'Share' }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const caption = useMemo(() => buildShareCaption(payload), [payload]);

  const flash = useCallback((key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
  }, []);

  const shareNative = useCallback(async () => {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (!nav.share) return false;
    try {
      await nav.share({ title: payload.text, text: payload.text, url: payload.url });
      return true;
    } catch {
      return false;
    }
  }, [payload]);

  const handleTarget = useCallback(
    async (target: ShareTarget) => {
      if (CLIPBOARD_SHARE_TARGETS.includes(target)) {
        const ok = await copyText(caption);
        toast[ok ? 'success' : 'error'](
          ok
            ? `Caption copied — paste it into ${SHARE_TARGET_LABELS[target]}`
            : 'Could not copy the caption',
        );
        const url = buildShareUrl(target, payload);
        if (isOpenableShareUrl(url)) window.open(url as string, '_blank', 'noopener,noreferrer');
        flash(target);
        return;
      }
      const used = openShare(target, payload);
      if (!used) toast.error(`${SHARE_TARGET_LABELS[target]} needs a link to share`);
    },
    [caption, payload, flash],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Share2 className="h-4 w-4 text-primary" aria-hidden="true" /> {title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{payload.text}</p>
          </div>
          <button
            type="button"
            aria-label="Close share sheet"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <CloseIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {[...WEB_SHARE_TARGETS, ...CLIPBOARD_SHARE_TARGETS].map((target) => (
            <button
              key={target}
              type="button"
              data-share-target={target}
              onClick={() => void handleTarget(target)}
              className="flex flex-col items-center gap-1 rounded-xl border border-border px-2 py-3 text-xs font-medium text-foreground transition hover:border-primary hover:bg-muted/60"
            >
              <span aria-hidden="true">
                {copied === target ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              {SHARE_TARGET_LABELS[target]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-share-action="copy"
            onClick={async () => {
              const ok = await copyText(caption);
              toast[ok ? 'success' : 'error'](ok ? 'Caption copied' : 'Could not copy');
              if (ok) flash('copy');
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/60"
          >
            {copied === 'copy' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy caption
          </button>
          {payload.url && (
            <button
              type="button"
              data-share-action="copy-link"
              onClick={async () => {
                const ok = await copyText(payload.url as string);
                toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy');
                if (ok) flash('copy-link');
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/60"
            >
              {copied === 'copy-link' ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              Copy link
            </button>
          )}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              data-share-action="native"
              onClick={() => void shareNative()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> More
            </button>
          )}
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          YouTube, TikTok and Instagram have no web share dialog — the caption is copied so you can
          paste it straight into their composer.
        </p>
      </div>
    </div>
  );
};

export default DhfShareSheet;
