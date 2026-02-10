import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getImportantDayForDate } from '@/data/worldImportantDays';

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_time: string;
  reminder_type: string;
  is_recurring: boolean;
  category: string;
}

const CATEGORY_COLORS = {
  work: 'bg-blue-500/20 text-blue-500',
  personal: 'bg-green-500/20 text-green-500',
  health: 'bg-red-500/20 text-red-500',
  social: 'bg-purple-500/20 text-purple-500',
  finance: 'bg-yellow-500/20 text-yellow-500',
  other: 'bg-gray-500/20 text-gray-500'
};

interface Event {
  display_name: string;
  event_type: string | null;
  event_date: string | null;
  event_recurring: boolean | null;
}

export const CalendarView = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState<'month' | 'week'>('month');

  useEffect(() => {
    if (user) {
      loadReminders();
      loadEvents();
    }
  }, [user, currentDate]);

  const loadReminders = async () => {
    if (!user) return;

    const start = view === 'month' ? startOfMonth(currentDate) : startOfWeek(currentDate);
    const end = view === 'month' ? endOfMonth(currentDate) : endOfWeek(currentDate);

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .gte('reminder_time', start.toISOString())
      .lte('reminder_time', end.toISOString())
      .order('reminder_time');

    if (!error && data) {
      setReminders(data);
    }
  };

  const loadEvents = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, event_type, event_date, event_recurring')
      .not('event_date', 'is', null);

    if (!error && data) {
      setEvents(data);
    }
  };

  const getDaysInView = () => {
    if (view === 'month') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    }
  };

  const getItemsForDay = (day: Date) => {
    const dayReminders = reminders.filter(r => 
      isSameDay(new Date(r.reminder_time), day)
    );

    const dayEvents = events.filter(e => {
      if (!e.event_date) return false;
      const eventDate = new Date(e.event_date);
      
      if (e.event_recurring) {
        return eventDate.getMonth() === day.getMonth() && 
               eventDate.getDate() === day.getDate();
      } else {
        return isSameDay(eventDate, day);
      }
    });

    // Get world important day for this date
    const worldDay = getImportantDayForDate(day);

    return { reminders: dayReminders, events: dayEvents, worldDay };
  };

  const days = getDaysInView();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Calendar View
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>

          <TabsContent value={view} className="mt-0">
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
              
              {days.map((day, index) => {
                const { reminders: dayReminders, events: dayEvents, worldDay } = getItemsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 rounded border ${
                      isToday
                        ? 'bg-primary/10 border-primary'
                        : isCurrentMonth
                        ? 'bg-card border-border'
                        : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="space-y-1">
                      {worldDay && (
                        <div
                          className="text-xs p-1 rounded bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300 truncate font-medium"
                          title={`${worldDay.name}: ${worldDay.description}`}
                        >
                          {worldDay.icon} {worldDay.name}
                        </div>
                      )}
                      
                      {dayReminders.map(reminder => (
                        <div
                          key={reminder.id}
                          className={`text-xs p-1 rounded truncate ${CATEGORY_COLORS[reminder.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other}`}
                          title={`${reminder.title} (${reminder.category})`}
                        >
                          🔔 {reminder.title}
                        </div>
                      ))}
                      
                      {dayEvents.map((event, idx) => (
                        <div
                          key={idx}
                          className="text-xs p-1 rounded bg-accent/20 text-accent-foreground truncate"
                          title={event.display_name}
                        >
                          {event.event_type === 'birthday' ? '🎂' : '🎉'} {event.display_name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
