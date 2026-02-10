import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { CloudSun, Calendar, TrendingUp, Newspaper } from 'lucide-react';

interface BriefingSettings {
  include_weather: boolean;
  include_events: boolean;
  include_trending_posts: boolean;
  include_news: boolean;
  enabled: boolean;
}

export const BriefingPreferences = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BriefingSettings>({
    include_weather: true,
    include_events: true,
    include_trending_posts: true,
    include_news: false,
    enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const savedSettings = localStorage.getItem(`briefing_prefs_${user.id}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading briefing preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof BriefingSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      localStorage.setItem(`briefing_prefs_${user.id}`, JSON.stringify(settings));
      
      // Clear today's briefing cache so it can be regenerated with new preferences
      localStorage.removeItem(`zoe_briefing_${user.id}`);
      
      toast.success('Briefing preferences saved!', {
        description: 'Your daily briefing will reflect these changes.'
      });
    } catch (error) {
      console.error('Error saving briefing preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading preferences...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Briefing Preferences</CardTitle>
        <CardDescription>
          Customize what information Zoe includes in your daily morning briefing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CloudSun className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="enable-briefing" className="text-base font-medium">
                Enable Daily Briefing
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive a morning briefing on your first interaction
              </p>
            </div>
          </div>
          <Switch
            id="enable-briefing"
            checked={settings.enabled}
            onCheckedChange={() => handleToggle('enabled')}
          />
        </div>

        <div className="space-y-4 opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CloudSun className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <Label htmlFor="include-weather" className="text-base">
                  Weather Forecast
                </Label>
                <p className="text-sm text-muted-foreground">
                  Current conditions and temperature
                </p>
              </div>
            </div>
            <Switch
              id="include-weather"
              checked={settings.include_weather}
              onCheckedChange={() => handleToggle('include_weather')}
              disabled={!settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <Label htmlFor="include-events" className="text-base">
                  Friend Events
                </Label>
                <p className="text-sm text-muted-foreground">
                  Birthdays and special occasions
                </p>
              </div>
            </div>
            <Switch
              id="include-events"
              checked={settings.include_events}
              onCheckedChange={() => handleToggle('include_events')}
              disabled={!settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <Label htmlFor="include-trending" className="text-base">
                  Trending Posts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Popular content from your network
                </p>
              </div>
            </div>
            <Switch
              id="include-trending"
              checked={settings.include_trending_posts}
              onCheckedChange={() => handleToggle('include_trending_posts')}
              disabled={!settings.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Newspaper className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <Label htmlFor="include-news" className="text-base">
                  News Headlines
                </Label>
                <p className="text-sm text-muted-foreground">
                  Top stories (coming soon)
                </p>
              </div>
            </div>
            <Switch
              id="include-news"
              checked={settings.include_news}
              onCheckedChange={() => handleToggle('include_news')}
              disabled={true}
            />
          </div>
        </div>

        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
};
