import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import { Bell, Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_time: string;
  reminder_type: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  is_completed: boolean;
  category: string;
}

const CATEGORY_COLORS = {
  work: 'bg-blue-500/20 text-blue-500 border-blue-500',
  personal: 'bg-green-500/20 text-green-500 border-green-500',
  health: 'bg-red-500/20 text-red-500 border-red-500',
  social: 'bg-purple-500/20 text-purple-500 border-purple-500',
  finance: 'bg-yellow-500/20 text-yellow-500 border-yellow-500',
  other: 'bg-gray-500/20 text-gray-500 border-gray-500'
};

export const RemindersManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    reminder_time: '',
    reminder_type: 'custom',
    is_recurring: false,
    recurrence_pattern: 'daily',
    category: 'personal',
  });

  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user]);

  const loadReminders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .order('reminder_time', { ascending: true });

    if (error) {
      console.error('Error loading reminders:', error);
      return;
    }

    setReminders(data || []);
  };

  const addReminder = async () => {
    if (!user || !newReminder.title || !newReminder.reminder_time) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('reminders').insert({
      user_id: user.id,
      title: newReminder.title,
      description: newReminder.description || null,
      reminder_time: newReminder.reminder_time,
      reminder_type: newReminder.reminder_type,
      is_recurring: newReminder.is_recurring,
      recurrence_pattern: newReminder.is_recurring ? newReminder.recurrence_pattern : null,
      category: newReminder.category,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create reminder',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Reminder created successfully',
    });

    setNewReminder({
      title: '',
      description: '',
      reminder_time: '',
      reminder_type: 'custom',
      is_recurring: false,
      recurrence_pattern: 'daily',
      category: 'personal',
    });
    setIsAddingReminder(false);
    loadReminders();
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete reminder',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Reminder deleted',
    });
    loadReminders();
  };

  const markComplete = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ is_completed: true })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update reminder',
        variant: 'destructive',
      });
      return;
    }

    loadReminders();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Smart Reminders</CardTitle>
          </div>
          <Button
            onClick={() => setIsAddingReminder(!isAddingReminder)}
            size="sm"
            variant={isAddingReminder ? 'secondary' : 'default'}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isAddingReminder ? 'Cancel' : 'Add Reminder'}
          </Button>
        </div>
        <CardDescription>
          Get notified about events, birthdays, and tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingReminder && (
          <Card className="bg-muted/50 border-border">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newReminder.title}
                  onChange={(e) =>
                    setNewReminder({ ...newReminder, title: e.target.value })
                  }
                  placeholder="e.g., Call mom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newReminder.description}
                  onChange={(e) =>
                    setNewReminder({ ...newReminder, description: e.target.value })
                  }
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder_time">Reminder Time *</Label>
                <Input
                  id="reminder_time"
                  type="datetime-local"
                  value={newReminder.reminder_time}
                  onChange={(e) =>
                    setNewReminder({ ...newReminder, reminder_time: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder_type">Type</Label>
                <Select
                  value={newReminder.reminder_type}
                  onValueChange={(value) =>
                    setNewReminder({ ...newReminder, reminder_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newReminder.category}
                  onValueChange={(value) =>
                    setNewReminder({ ...newReminder, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">💼 Work</SelectItem>
                    <SelectItem value="personal">👤 Personal</SelectItem>
                    <SelectItem value="health">❤️ Health</SelectItem>
                    <SelectItem value="social">👥 Social</SelectItem>
                    <SelectItem value="finance">💰 Finance</SelectItem>
                    <SelectItem value="other">📌 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="recurring">Recurring</Label>
                  <p className="text-xs text-muted-foreground">
                    Repeat this reminder
                  </p>
                </div>
                <Switch
                  id="recurring"
                  checked={newReminder.is_recurring}
                  onCheckedChange={(checked) =>
                    setNewReminder({ ...newReminder, is_recurring: checked })
                  }
                />
              </div>

              {newReminder.is_recurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence">Repeat Pattern</Label>
                  <Select
                    value={newReminder.recurrence_pattern}
                    onValueChange={(value) =>
                      setNewReminder({ ...newReminder, recurrence_pattern: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={addReminder} className="w-full">
                Create Reminder
              </Button>
            </CardContent>
          </Card>
        )}

        {reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No active reminders</p>
            <p className="text-sm">Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map((reminder) => (
              <Card key={reminder.id} className="bg-muted/30 border-border">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {reminder.title}
                      </h4>
                      {reminder.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {reminder.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className={`px-2 py-0.5 rounded border text-xs font-medium ${CATEGORY_COLORS[reminder.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other}`}>
                          {reminder.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(reminder.reminder_time), 'MMM d, yyyy h:mm a')}
                        </span>
                        {reminder.is_recurring && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                            {reminder.recurrence_pattern}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-muted rounded">
                          {reminder.reminder_type}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markComplete(reminder.id)}
                      >
                        Done
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteReminder(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};