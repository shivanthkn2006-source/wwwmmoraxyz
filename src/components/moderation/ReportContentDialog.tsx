/**
 * REPORT CONTENT DIALOG — the member-facing half of the moderation loop.
 *
 * Writes a row into `content_reports`, which is exactly what the admin
 * moderation queue reads. The table carries a unique constraint on
 * (reporter, target type, target id), so a double-tap is a no-op rather than
 * a duplicate row: we detect the 23505 and tell the member it is already filed.
 */
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type ReportTargetType = 'post' | 'comment' | 'profile' | 'message' | 'loop' | 'dhf_compass';

export const REPORT_REASONS = [
  'Spam or scam',
  'Harassment or bullying',
  'Hate speech',
  'Nudity or sexual content',
  'Violence or self-harm',
  'Misinformation',
  'Impersonation',
  'Something else',
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  /** Owner of the reported content, when known — helps admins triage. */
  targetOwnerId?: string | null;
}

export const ReportContentDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetOwnerId,
}) => {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        toast.error('Sign in to report content.');
        return;
      }
      const { error } = await supabase.from('content_reports').insert({
        reporter_id: auth.user.id,
        target_type: targetType,
        target_id: targetId,
        target_owner_id: targetOwnerId ?? null,
        reason,
        notes: notes.trim() ? notes.trim() : null,
      });
      if (error) {
        // 23505 = the unique (reporter, type, target) guard already holds a row.
        if (error.code === '23505') {
          toast.info('You already reported this. Our team is on it.');
          onOpenChange(false);
          return;
        }
        toast.error(`Could not file the report: ${error.message}`);
        return;
      }
      toast.success('Report filed. Thank you — our team will review it.');
      setNotes('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Report this {targetType}</DialogTitle>
          <DialogDescription>
            Tell us what is wrong. Reports go straight to the moderation queue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={reason === option ? 'default' : 'secondary'}
                onClick={() => setReason(option)}
                aria-pressed={reason === option}
                className="h-auto rounded-full px-3 py-1.5 text-xs"
              >
                {option}
              </Button>
            ))}
          </div>

          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add any detail that helps us review (optional)"
            rows={3}
            maxLength={500}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportContentDialog;
