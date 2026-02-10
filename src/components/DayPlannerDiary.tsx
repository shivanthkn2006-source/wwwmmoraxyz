import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Event {
  date: string;
  type: string;
  customDetails: string;
  isRecurring: boolean;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

const DayPlannerDiary = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (user) {
      loadEvents();
      loadNotes();
    }
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;

    try {
      // Fetch profile events
      const { data: profile } = await supabase
        .from('profiles')
        .select('event_type, event_date, event_custom_details, event_recurring')
        .eq('user_id', user.id)
        .single();

      const eventsArray: Event[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (profile && profile.event_type && profile.event_date) {
        const eventDate = new Date(profile.event_date);
        const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil >= 0) {
          const eventObj: Event = {
            date: profile.event_date,
            type: profile.event_type,
            customDetails: profile.event_custom_details || '',
            isRecurring: profile.event_recurring || false
          };
          eventsArray.push(eventObj);
          
          if (daysUntil <= 7) {
            setUpcomingEvents([eventObj]);
          }
        }
      }

      // Fetch friend birthdays
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f => f.user1_id === user.id ? f.user2_id : f.user1_id);
        
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, event_type, event_date')
          .in('user_id', friendIds)
          .eq('event_type', 'Birthday');

        if (friendProfiles) {
          friendProfiles.forEach(fp => {
            if (fp.event_date) {
              const eventDate = new Date(fp.event_date);
              const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
              const nextYear = new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
              const nextBirthday = thisYear >= today ? thisYear : nextYear;
              
              const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysUntil <= 7) {
                const birthdayEvent: Event = {
                  date: nextBirthday.toISOString().split('T')[0],
                  type: 'Birthday',
                  customDetails: `${fp.display_name}'s Birthday`,
                  isRecurring: true
                };
                setUpcomingEvents(prev => [...prev, birthdayEvent].sort((a, b) => {
                  const aDate = new Date(a.date);
                  const bDate = new Date(b.date);
                  return aDate.getTime() - bDate.getTime();
                }));
              }
            }
          });
        }
      }

      setEvents(eventsArray);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadNotes = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_companion_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'note')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading notes:', error);
      return;
    }

    if (data) {
      setNotes(data.map(d => ({
        id: d.id,
        content: d.content,
        created_at: d.created_at
      })));
    }
  };

  const saveNote = async () => {
    if (!user || !newNote.trim()) return;

    const { error } = await supabase
      .from('ai_companion_messages')
      .insert({
        user_id: user.id,
        role: 'note',
        content: newNote.trim()
      });

    if (error) {
      toast.error('Failed to save note');
      return;
    }

    toast.success('Note saved');
    setNewNote('');
    setIsNoteDialogOpen(false);
    loadNotes();
  };

  const getEventIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'birthday': '🎂',
      'fundraising': '💝',
      'talk': '🎤',
      'other': '🎉'
    };
    return icons[type] || '🎉';
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle>Event Planner Diary</CardTitle>
            </div>
            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Note</DialogTitle>
                  <DialogDescription>
                    Write a quick note for your day planner
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your note here..."
                  className="min-h-[120px]"
                />
                <Button onClick={saveNote} className="w-full">
                  Save Note
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Your daily events and notes in one place
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Today's Events */}
          {events.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Today's Events
              </h3>
              {events.map((event, idx) => {
                const eventDate = new Date(event.date);
                const isToday = isSameDay(eventDate, new Date());
                
                return isToday ? (
                  <div key={idx} className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getEventIcon(event.type)}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm capitalize">{event.type}</p>
                        {event.customDetails && (
                          <p className="text-sm text-muted-foreground mt-1">{event.customDetails}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(eventDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Upcoming Events
              </h3>
              {upcomingEvents.map((event, idx) => {
                const eventDate = new Date(event.date);
                const isToday = isSameDay(eventDate, new Date());
                
                return !isToday ? (
                  <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getEventIcon(event.type)}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm capitalize">{event.type}</p>
                        {event.customDetails && (
                          <p className="text-sm text-muted-foreground mt-1">{event.customDetails}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(eventDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Quick Notes */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Quick Notes
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 bg-accent/50 rounded-lg border border-border">
                    <p className="text-sm">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(note.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {events.length === 0 && notes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No events or notes yet</p>
              <p className="text-xs mt-1">Ask Zoe to help you plan your day!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DayPlannerDiary;
