import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';

interface BriefingPreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BriefingPreferencesModal: React.FC<BriefingPreferencesModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const [prefs, setPrefs] = React.useState(() => {
    if (!user) return {
      include_weather: true,
      include_events: true,
      include_trending_posts: true,
      include_news: false,
      enabled: true,
    };
    
    const stored = localStorage.getItem(`briefing_prefs_${user.id}`);
    return stored ? JSON.parse(stored) : {
      include_weather: true,
      include_events: true,
      include_trending_posts: true,
      include_news: false,
      enabled: true,
    };
  });

  const handleSave = () => {
    if (user) {
      localStorage.setItem(`briefing_prefs_${user.id}`, JSON.stringify(prefs));
      
      // Clear greeting cache to trigger new greeting on next load
      localStorage.removeItem(`greeting_shown_${user.id}`);
      
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="text-foreground">Daily Briefing Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize your morning greeting from Zoe
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled" className="text-foreground">Enable Daily Briefing</Label>
            <Switch
              id="enabled"
              checked={prefs.enabled}
              onCheckedChange={(checked) => setPrefs({ ...prefs, enabled: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="weather" className="text-foreground">Include Weather</Label>
            <Switch
              id="weather"
              checked={prefs.include_weather}
              onCheckedChange={(checked) => setPrefs({ ...prefs, include_weather: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="events" className="text-foreground">Include Events</Label>
            <Switch
              id="events"
              checked={prefs.include_events}
              onCheckedChange={(checked) => setPrefs({ ...prefs, include_events: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="posts" className="text-foreground">Include Trending Posts</Label>
            <Switch
              id="posts"
              checked={prefs.include_trending_posts}
              onCheckedChange={(checked) => setPrefs({ ...prefs, include_trending_posts: checked })}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Preferences</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};