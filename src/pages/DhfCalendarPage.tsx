/**
 * ZOE'S DHF CALENDAR — month view of delivered and upcoming daily cards.
 * Members mark the days they plan to read; plans persist per account.
 * Read-only on cards (single SELECT per month) — never triggers generation.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { COMPASS_SLOTS, normalizeSlotTime, slotMinutes } from '@/lib/dhfCompass';
import { deviceTimeZone, localDateIn, localHourMinute } from '@/lib/growthSlot';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CardRow { post_date: string; slot_time: string; category: string; headline: string }

const DhfCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const tz = deviceTimeZone();
  const today = localDateIn(new Date(), tz);
  const [ty, tm] = today.split('-').map(Number);
  const [view, setView] = useState({ y: ty, m: tm - 1 });
  const [selected, setSelected] = useState(today);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [plans, setPlans] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const monthStart = ymd(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const monthEnd = ymd(view.y, view.m, daysInMonth);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [cardRes, planRes] = await Promise.all([
        supabase.from('dhf_daily_posts').select('post_date, slot_time, category, headline')
          .eq('user_id', user.id).gte('post_date', monthStart).lte('post_date', monthEnd).limit(400),
        (supabase as any).from('dhf_reading_plans').select('plan_date')
          .eq('user_id', user.id).gte('plan_date', monthStart).lte('plan_date', monthEnd),
      ]);
      setCards((cardRes.data ?? []) as CardRow[]);
      setPlans(new Set(((planRes.data ?? []) as { plan_date: string }[]).map((p) => p.plan_date)));
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [user, monthStart, monthEnd]);

  useEffect(() => { void load(); }, [load]);

  const { hour, minute } = localHourMinute(new Date(), tz);
  const nowMinutes = hour * 60 + minute;

  /** Delivered = card exists and its slot has arrived. Future slots never leak content. */
  const deliveredByDay = useMemo(() => {
    const map = new Map<string, CardRow[]>();
    for (const c of cards) {
      if (c.post_date > today) continue;
      if (c.post_date === today && slotMinutes(c.slot_time) > nowMinutes) continue;
      const list = map.get(c.post_date) ?? [];
      list.push(c);
      map.set(c.post_date, list);
    }
    return map;
  }, [cards, today, nowMinutes]);

  const togglePlan = async (date: string) => {
    if (!user || saving) return;
    setSaving(true);
    const planned = plans.has(date);
    try {
      const table = (supabase as any).from('dhf_reading_plans');
      const { error } = planned
        ? await table.delete().eq('user_id', user.id).eq('plan_date', date)
        : await table.insert({ user_id: user.id, plan_date: date });
      if (error) throw error;
      setPlans((prev) => {
        const next = new Set(prev);
        if (planned) next.delete(date); else next.add(date);
        return next;
      });
      toast.success(planned ? 'Removed from your reading plan.' : 'Added to your reading plan.');
    } catch {
      toast.error('Could not update your reading plan.');
    } finally {
      setSaving(false);
    }
  };

  const shift = (delta: number) => setView(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ymd(view.y, view.m, i + 1)),
  ];
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const selDelivered = deliveredByDay.get(selected) ?? [];
  const isFuture = selected > today;
  const isToday = selected === today;
  const upcomingToday = isToday ? COMPASS_SLOTS.filter((s) => slotMinutes(s.time) > nowMinutes) : [];

  return (
    <div className="min-h-screen bg-background text-foreground" data-dhf-calendar>
      <PageSeo title="Zoe's DHF calendar" description="Plan which days you want to read Zoe's daily guidance." />
      <div className="mx-auto max-w-2xl px-4 pb-28 pt-6">
        <header className="mb-5 flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Zoe's DHF calendar</h1>
        </header>

        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft /></Button>
          <span className="font-medium" data-calendar-month>{monthLabel}</span>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => shift(1)}><ChevronRight /></Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const count = deliveredByDay.get(date)?.length ?? 0;
            const planned = plans.has(date);
            const active = date === selected;
            return (
              <button
                key={date}
                type="button"
                data-calendar-day={date}
                onClick={() => setSelected(date)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-card/40 hover:bg-accent'
                } ${date === today && !active ? 'ring-1 ring-primary' : ''}`}
              >
                <span>{Number(date.slice(8))}</span>
                <span className="mt-0.5 flex h-2 items-center gap-0.5">
                  {count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
                  {planned && <Check className="h-2.5 w-2.5" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Dot = cards delivered · Tick = planned to read</p>

        <section className="mt-6 rounded-xl bg-card/40 p-4" data-calendar-detail={selected}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-medium">
              {new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            {selected >= today && (
              <Button size="sm" variant={plans.has(selected) ? 'secondary' : 'default'} disabled={saving} onClick={() => void togglePlan(selected)}>
                {plans.has(selected) ? 'Planned ✓' : 'Plan to read'}
              </Button>
            )}
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!loading && selDelivered.length > 0 && (
            <ul className="mb-3 space-y-2">
              {[...selDelivered].sort((a, b) => slotMinutes(a.slot_time) - slotMinutes(b.slot_time)).map((c) => (
                <li key={c.slot_time} className="text-sm">
                  <span className="text-muted-foreground">{COMPASS_SLOTS.find((s) => s.time === normalizeSlotTime(c.slot_time))?.label ?? c.slot_time} · {c.category}</span>
                  <div>{c.headline}</div>
                </li>
              ))}
            </ul>
          )}

          {!loading && (isFuture || upcomingToday.length > 0) && (
            <>
              <p className="mb-2 text-xs text-muted-foreground">Upcoming cards (revealed at their local time)</p>
              <ul className="space-y-1.5" data-calendar-upcoming>
                {(isFuture ? COMPASS_SLOTS : upcomingToday).map((s) => (
                  <li key={s.time} className="flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="w-16 text-muted-foreground">{s.label}</span>
                    <span>{s.category}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!loading && !isFuture && selDelivered.length === 0 && upcomingToday.length === 0 && (
            <p className="text-sm text-muted-foreground">No cards on this day.</p>
          )}

          {selDelivered.length > 0 && (
            <Link to="/compass" className="mt-3 inline-block text-sm underline">Read these cards</Link>
          )}
        </section>
      </div>
    </div>
  );
};

export default DhfCalendarPage;
