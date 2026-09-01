/**
 * ADMIN — PER-USER DHF ESSAY SCHEDULING.
 *
 * Pick a member, see the Daily Compass cards written for them, and schedule
 * the long-form essay behind any card for a specific moment. Writes go to
 * `dhf_essay_schedules`; a bounded 5-minute database sweep delivers each due
 * essay as an in-app notification and marks it delivered exactly once.
 *
 * Admin reads here rely on the admin-scoped policies on `dhf_daily_posts` and
 * `dhf_essay_schedules` — a non-admin simply sees empty tables.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { slotLabel } from '@/lib/dhfCompass';
import {
  cancelEssaySchedule,
  defaultEssayTime,
  scheduleEssay,
  toLocalInputValue,
  type EssaySchedule,
} from '@/lib/dhfEssaySchedule';

interface MemberOption {
  userId: string;
  username: string;
}

interface CompassRow {
  id: string;
  post_date: string;
  slot_time: string;
  category: string;
  headline: string;
  full_story_content: string | null;
}

const statusTone: Record<string, string> = {
  scheduled: 'bg-sky-500/15 text-sky-400',
  delivered: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-muted text-muted-foreground',
};

interface Props {
  members: MemberOption[];
  adminId: string | null;
}

export const EssaySchedulerPanel: React.FC<Props> = ({ members, adminId }) => {
  const [selected, setSelected] = useState<string>('');
  const [cards, setCards] = useState<CompassRow[]>([]);
  const [schedules, setSchedules] = useState<EssaySchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [when, setWhen] = useState(() => toLocalInputValue(defaultEssayTime()));

  useEffect(() => {
    if (!selected && members.length) setSelected(members[0].userId);
  }, [members, selected]);

  const load = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const [cardsRes, schedRes] = await Promise.all([
        supabase
          .from('dhf_daily_posts')
          .select('id, post_date, slot_time, category, headline, full_story_content')
          .eq('user_id', selected)
          .order('post_date', { ascending: false })
          .order('slot_time', { ascending: false })
          .limit(60),
        supabase
          .from('dhf_essay_schedules')
          .select('id, user_id, post_id, scheduled_for, status, delivered_at, note, created_at')
          .eq('user_id', selected)
          .order('scheduled_for', { ascending: false })
          .limit(60),
      ]);
      setCards((cardsRes.data as CompassRow[]) ?? []);
      setSchedules((schedRes.data as EssaySchedule[]) ?? []);
    } catch (error) {
      console.error('[EssayScheduler] load failed', error);
      toast.error('Could not load compass cards for this member.');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  const scheduleByPost = useMemo(() => {
    const map = new Map<string, EssaySchedule>();
    schedules.forEach((row) => map.set(row.post_id, row));
    return map;
  }, [schedules]);

  const onSchedule = async (postId: string) => {
    if (!selected) return;
    setBusy(postId);
    const { error } = await scheduleEssay({
      userId: selected,
      postId,
      scheduledFor: when,
      createdBy: adminId,
    });
    setBusy(null);
    if (error) {
      toast.error(`Schedule failed: ${error}`);
      return;
    }
    toast.success(`Essay scheduled for ${new Date(when).toLocaleString()}.`);
    void load();
  };

  const onCancel = async (id: string) => {
    setBusy(id);
    const { error } = await cancelEssaySchedule(id);
    setBusy(null);
    if (error) {
      toast.error(`Cancel failed: ${error}`);
      return;
    }
    void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-sm">Per-user essay scheduling</CardTitle>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Reload
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            aria-label="Member"
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.username} · {member.userId.slice(0, 8)}
              </option>
            ))}
            {!members.length && <option value="">No members visible</option>}
          </select>

          <Input
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            aria-label="Delivery time for scheduled essays"
            className="h-9 w-auto min-w-[15rem] text-xs"
          />
          <span className="text-[11px] text-muted-foreground">
            Delivery sweep runs every 5 minutes.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="p-2">Card</th>
                <th className="p-2">Slot</th>
                <th className="p-2">Essay</th>
                <th className="p-2">Schedule</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => {
                const existing = scheduleByPost.get(card.id);
                const hasEssay = Boolean(card.full_story_content?.trim());
                return (
                  <tr key={card.id} className="border-t border-border/50 align-top">
                    <td className="p-2">
                      <p className="font-medium">{card.headline}</p>
                      <p className="text-muted-foreground">{card.category}</p>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {card.post_date}
                      <br />
                      <span className="text-muted-foreground">{slotLabel(card.slot_time)}</span>
                    </td>
                    <td className="p-2">
                      {hasEssay ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400">
                          {card.full_story_content!.trim().length} chars
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">none</Badge>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {existing ? (
                        <>
                          <Badge className={statusTone[existing.status] ?? ''}>{existing.status}</Badge>
                          <span className="ml-2 text-muted-foreground">
                            {new Date(existing.scheduled_for).toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!hasEssay || busy === card.id}
                        onClick={() => void onSchedule(card.id)}
                      >
                        {busy === card.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <CalendarClock className="mr-1 h-3 w-3" />
                        )}
                        {existing?.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
                      </Button>
                      {existing?.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === existing.id}
                          onClick={() => void onCancel(existing.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!cards.length && !loading && (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={5}>
                    No compass cards for this member yet. Generate them from the DHF generation
                    dashboard first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EssaySchedulerPanel;
