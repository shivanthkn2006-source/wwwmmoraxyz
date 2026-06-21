import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Heart, Frown, Meh, Smile, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EmotionLog {
  id: string;
  emotion: string;
  intensity: number;
  notes: string | null;
  context: string | null;
  created_at: string;
}

const EMOTIONS = [
  { name: 'happy', icon: Smile, color: 'text-green-500' },
  { name: 'sad', icon: Frown, color: 'text-blue-500' },
  { name: 'anxious', icon: Heart, color: 'text-yellow-500' },
  { name: 'calm', icon: Sparkles, color: 'text-purple-500' },
  { name: 'neutral', icon: Meh, color: 'text-gray-500' },
  { name: 'angry', icon: Frown, color: 'text-red-500' },
  { name: 'excited', icon: Sparkles, color: 'text-orange-500' },
  { name: 'tired', icon: Meh, color: 'text-slate-500' }
];

export const EmotionTracker = () => {
  const { user } = useAuth();
  const [emotionLogs, setEmotionLogs] = useState<EmotionLog[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [intensity, setIntensity] = useState([3]);
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user) {
      loadEmotionLogs();
    }
  }, [user]);

  const loadEmotionLogs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('emotion_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setEmotionLogs(data);
    }
  };

  const handleLogEmotion = async () => {
    if (!user || !selectedEmotion) {
      toast.error('Please select an emotion');
      return;
    }

    const { error } = await supabase
      .from('emotion_logs')
      .insert([{
        user_id: user.id,
        emotion: selectedEmotion,
        intensity: intensity[0],
        notes: notes || null,
        context: 'manual_entry'
      }]);

    if (error) {
      toast.error('Failed to log emotion');
    } else {
      toast.success('Emotion logged successfully');
      setSelectedEmotion('');
      setIntensity([3]);
      setNotes('');
      setShowForm(false);
      loadEmotionLogs();
    }
  };

  const getEmotionIcon = (emotionName: string) => {
    const emotion = EMOTIONS.find(e => e.name === emotionName);
    return emotion || EMOTIONS[4]; // Default to neutral
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Emotion Tracker
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Log Emotion'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium mb-2">How are you feeling?</p>
              <div className="grid grid-cols-4 gap-2">
                {EMOTIONS.map(emotion => {
                  const Icon = emotion.icon;
                  return (
                    <button
                      key={emotion.name}
                      onClick={() => setSelectedEmotion(emotion.name)}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedEmotion === emotion.name
                          ? 'border-primary bg-primary/10 scale-105'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto ${emotion.color}`} />
                      <p className="text-xs mt-1 capitalize">{emotion.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedEmotion && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">
                    Intensity: {intensity[0]}/5
                  </p>
                  <Slider
                    value={intensity}
                    onValueChange={setIntensity}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Notes (optional)</p>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What's on your mind?"
                    className="min-h-[80px]"
                  />
                </div>

                <Button onClick={handleLogEmotion} className="w-full">
                  Save Emotion Log
                </Button>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Recent Emotions</p>
          {emotionLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No emotions logged yet. Start tracking your feelings!
            </p>
          ) : (
            <div className="space-y-2">
              {emotionLogs.map((log) => {
                const emotionData = getEmotionIcon(log.emotion);
                const Icon = emotionData.icon;
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border bg-card/50 flex items-start gap-3"
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${emotionData.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium capitalize">{log.emotion}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i <= log.intensity ? 'bg-primary' : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Intensity: {log.intensity}/5
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
