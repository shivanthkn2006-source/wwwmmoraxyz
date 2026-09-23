import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Clock, Pencil, Plus, StickyNote, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { notifyPlanningChanged, PLANNING_SYNC_EVENT } from '@/lib/planningSync';
import { loadFriendBirthdayEvents } from '@/lib/friendBirthdays';

interface Event {
  id: string;
  date: string;
  type: string;
  title: string;
  customDetails: string;
  isRecurring: boolean;
  isLegacy?: boolean;
}

interface Note { id: string; content: string; created_at: string; }

const EMPTY_EVENT = { title: '', date: '', type: 'event', customDetails: '', isRecurring: false };

const DayPlannerDiary = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState(EMPTY_EVENT);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    const [{ data: planned }, { data: profile }, friendBirthdays] = await Promise.all([
      supabase.from('important_dates').select('id, title, description, date_type, date_value, is_recurring').eq('user_id', user.id).order('date_value'),
      supabase.from('profiles').select('display_name, event_type, event_date, event_custom_details, event_recurring').eq('user_id', user.id).maybeSingle(),
      loadFriendBirthdayEvents(user.id),
    ]);
    const shared: Event[] = (planned || []).map((item) => ({
      id: item.id, date: item.date_value, type: item.date_type, title: item.title,
      customDetails: item.description || '', isRecurring: Boolean(item.is_recurring),
    }));
    if (profile?.event_date && profile.event_type) {
      shared.push({ id: `profile-${user.id}`, date: profile.event_date, type: profile.event_type,
        title: profile.event_custom_details || profile.display_name, customDetails: profile.event_custom_details || '',
        isRecurring: Boolean(profile.event_recurring), isLegacy: true });
    }
    shared.push(...friendBirthdays.map((birthday) => ({
      id: birthday.id,
      date: birthday.date_value,
      type: birthday.date_type,
      title: birthday.title,
      customDetails: birthday.description || '',
      isRecurring: birthday.is_recurring,
      isLegacy: true,
    })));
    setEvents(shared.sort((a, b) => a.date.localeCompare(b.date)));
  }, [user]);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('ai_companion_messages').select('id, content, created_at')
      .eq('user_id', user.id).eq('role', 'note').order('created_at', { ascending: false }).limit(10);
    if (error) return console.error('Error loading notes:', error);
    setNotes(data || []);
  }, [user]);

  useEffect(() => { if (user) { void loadEvents(); void loadNotes(); } }, [user, loadEvents, loadNotes]);
  useEffect(() => {
    if (!user) return;
    const refresh = () => void loadEvents();
    window.addEventListener(PLANNING_SYNC_EVENT, refresh);
    const channel = supabase
      .channel(`planning-diary-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'important_dates', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener(PLANNING_SYNC_EVENT, refresh);
      void supabase.removeChannel(channel);
    };
  }, [user, loadEvents]);


  const saveEvent = async () => {
    if (!user || !eventDraft.title.trim() || !eventDraft.date) return toast.error('Add a title and date');
    const row = { user_id: user.id, title: eventDraft.title.trim(), date_value: eventDraft.date,
      date_type: eventDraft.type, description: eventDraft.customDetails.trim() || null, is_recurring: eventDraft.isRecurring };
    const { error } = editingId
      ? await supabase.from('important_dates').update(row).eq('id', editingId).eq('user_id', user.id)
      : await supabase.from('important_dates').insert(row);
    if (error) return toast.error('Failed to save event');
    toast.success(editingId ? 'Event updated everywhere' : 'Event added to Calendar');
    setEventDraft(EMPTY_EVENT); setEditingId(null); setIsEventDialogOpen(false);
    notifyPlanningChanged('planner'); void loadEvents();
  };

  const editEvent = (event: Event) => {
    setEditingId(event.id);
    setEventDraft({ title: event.title, date: event.date, type: event.type, customDetails: event.customDetails, isRecurring: event.isRecurring });
    setIsEventDialogOpen(true);
  };

  const deleteEvent = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('important_dates').delete().eq('id', id).eq('user_id', user.id);
    if (error) return toast.error('Failed to delete event');
    notifyPlanningChanged('planner'); void loadEvents(); toast.success('Event removed from Calendar');
  };

  const saveNote = async () => {
    if (!user || !newNote.trim()) return;
    const { error } = await supabase.from('ai_companion_messages').insert({ user_id: user.id, role: 'note', content: newNote.trim() });
    if (error) return toast.error('Failed to save note');
    toast.success('Note saved'); setNewNote(''); setIsNoteDialogOpen(false); void loadNotes();
  };

  const getEventIcon = (type: string) => ({ birthday: '🎂', fundraising: '💝', talk: '🎤', event: '🎉' }[type.toLowerCase()] || '🎉');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcomingEvents = events.filter((event) => new Date(`${event.date}T00:00:00`) >= today);

  return (
    <div className="planning-liquid-section space-y-4" data-planning-surface="diary">
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /><CardTitle>Event Planner Diary</CardTitle></div>
            <div className="flex gap-2">
              <Dialog open={isEventDialogOpen} onOpenChange={(open) => { setIsEventDialogOpen(open); if (!open) { setEditingId(null); setEventDraft(EMPTY_EVENT); } }}>
                <DialogTrigger asChild><Button size="sm" onClick={() => setEventDraft(EMPTY_EVENT)}><Plus className="w-4 h-4" /> Event</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingId ? 'Edit Event' : 'Add Event'}</DialogTitle><DialogDescription>Changes appear in Planner and Calendar automatically.</DialogDescription></DialogHeader>
                  <div className="space-y-3">
                    <div><Label htmlFor="planner-title">Title</Label><Input id="planner-title" value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} /></div>
                    <div><Label htmlFor="planner-date">Date</Label><Input id="planner-date" type="date" value={eventDraft.date} onChange={(e) => setEventDraft({ ...eventDraft, date: e.target.value })} /></div>
                    <div><Label>Type</Label><Select value={eventDraft.type} onValueChange={(type) => setEventDraft({ ...eventDraft, type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="event">Event</SelectItem><SelectItem value="birthday">Birthday</SelectItem><SelectItem value="talk">Talk</SelectItem><SelectItem value="fundraising">Fundraising</SelectItem><SelectItem value="task">Task</SelectItem></SelectContent></Select></div>
                    <div><Label htmlFor="planner-details">Details</Label><Textarea id="planner-details" value={eventDraft.customDetails} onChange={(e) => setEventDraft({ ...eventDraft, customDetails: e.target.value })} /></div>
                    <div className="flex items-center justify-between"><Label htmlFor="planner-recurring">Repeat yearly</Label><Switch id="planner-recurring" checked={eventDraft.isRecurring} onCheckedChange={(isRecurring) => setEventDraft({ ...eventDraft, isRecurring })} /></div>
                    <Button className="w-full" onClick={() => void saveEvent()}>Save Event</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogTrigger asChild><Button variant="outline" size="sm"><StickyNote className="w-4 h-4" /> Note</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Add Note</DialogTitle><DialogDescription>Write a quick note for your day planner</DialogDescription></DialogHeader><Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} className="min-h-[120px]" /><Button onClick={() => void saveNote()}>Save Note</Button></DialogContent>
              </Dialog>
            </div>
          </div>
          <CardDescription>Your daily events and notes in one place</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingEvents.length > 0 && <div className="space-y-2"><h3 className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4" />Upcoming Events</h3>{upcomingEvents.map((event) => <div key={event.id} className="p-3 bg-muted/50 rounded-lg border border-border"><div className="flex items-start gap-3"><span className="text-2xl">{getEventIcon(event.type)}</span><div className="min-w-0 flex-1"><p className="font-medium text-sm">{event.title}</p>{event.customDetails && <p className="text-sm text-muted-foreground mt-1">{event.customDetails}</p>}<p className="text-xs text-muted-foreground mt-1">{format(new Date(`${event.date}T00:00:00`), 'MMM d, yyyy')}{isSameDay(new Date(`${event.date}T00:00:00`), new Date()) ? ' · Today' : ''}</p></div>{!event.isLegacy && <div className="flex"><Button size="icon" variant="ghost" aria-label="Edit event" onClick={() => editEvent(event)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete event" onClick={() => void deleteEvent(event.id)}><Trash2 className="h-4 w-4" /></Button></div>}</div></div>)}</div>}
          {notes.length > 0 && <div className="space-y-2"><h3 className="text-sm font-medium flex items-center gap-2"><StickyNote className="w-4 h-4" />Quick Notes</h3>{notes.map((note) => <div key={note.id} className="p-3 bg-accent/50 rounded-lg border border-border"><p className="text-sm">{note.content}</p><p className="text-xs text-muted-foreground mt-1">{format(new Date(note.created_at), 'MMM d, h:mm a')}</p></div>)}</div>}
          {events.length === 0 && notes.length === 0 && <div className="text-center py-8 text-muted-foreground"><Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" /><p className="text-sm">No events or notes yet</p></div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default DayPlannerDiary;