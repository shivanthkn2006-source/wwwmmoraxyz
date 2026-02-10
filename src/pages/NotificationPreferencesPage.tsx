import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Bell, Heart, MessageCircle, UserPlus, MapPin, Star, Volume2, Play, Clock, Moon, Sun, Sunset, Music, Vibrate, History, Settings } from 'lucide-react';
import { previewNotificationSound, NotificationSoundType, getSoundDescription } from '@/utils/notificationSounds';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { CustomSoundUploader } from '@/components/CustomSoundUploader';
import { useNavigate } from 'react-router-dom';
import { NotificationThemes } from '@/utils/notificationThemes';

interface NotificationPreferences {
  post_likes: boolean;
  post_comments: boolean;
  comment_likes: boolean;
  comment_replies: boolean;
  friend_requests: boolean;
  friend_accepted: boolean;
  user_online: boolean;
  tier_upgrades: boolean;
  sound_enabled: boolean;
  desktop_push: boolean;
  lisa_announcements: boolean;
  // Individual sound preferences
  sound_post_likes: boolean;
  sound_post_comments: boolean;
  sound_comment_likes: boolean;
  sound_comment_replies: boolean;
  sound_friend_requests: boolean;
  sound_friend_accepted: boolean;
  sound_user_online: boolean;
  sound_tier_upgrades: boolean;
}

const NotificationPreferencesPage = () => {
  const navigate = useNavigate();
  const { settings, loading: settingsLoading, saveSettings } = useNotificationSettings();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    post_likes: true,
    post_comments: true,
    comment_likes: true,
    comment_replies: true,
    friend_requests: true,
    friend_accepted: true,
    user_online: true,
    tier_upgrades: true,
    sound_enabled: true,
    desktop_push: false,
    lisa_announcements: true,
    sound_post_likes: true,
    sound_post_comments: true,
    sound_comment_likes: true,
    sound_comment_replies: true,
    sound_friend_requests: true,
    sound_friend_accepted: true,
    sound_user_online: true,
    sound_tier_upgrades: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const stored = localStorage.getItem('notification_preferences');
    if (stored) {
      setPreferences(JSON.parse(stored));
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      localStorage.setItem('notification_preferences', JSON.stringify(preferences));
      
      // If desktop push is enabled, request permission
      if (preferences.desktop_push && 'Notification' in window) {
        await Notification.requestPermission();
      }

      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Notification Settings</h1>
            <p className="text-muted-foreground">Customize your notification experience</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/notification-history')}>
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
        </div>

        <Tabs defaultValue="preferences" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preferences">
              <Bell className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="sounds">
              <Music className="w-4 h-4 mr-2" />
              Sounds
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Clock className="w-4 h-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Settings className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4 mt-6">
            {/* Post Activity, Comment Activity, Social Activity cards from original code */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Post Activity
              </h2>
              {/* Keep existing switches */}
            </Card>
          </TabsContent>

          {/* Sounds Tab */}
          <TabsContent value="sounds" className="space-y-4 mt-6">
            {/* Sound Theme Selection */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Music className="w-5 h-5" />
                Sound Theme
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose a coordinated sound pack for all notifications
              </p>
              <Select 
                value={settings.sound_theme} 
                onValueChange={(value: any) => saveSettings({ sound_theme: value })}
                disabled={settingsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NotificationThemes).map(([key, theme]) => (
                    <SelectItem key={key} value={key}>
                      {theme.name} - {theme.description}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom (Upload your own)</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            {/* Custom Sound Uploads */}
            {settings.sound_theme === 'custom' && (
              <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Custom Sound Uploads</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your own audio files for each notification type
                </p>
                <div className="grid gap-4">
                  <CustomSoundUploader soundType="post_like" label="Post Likes" />
                  <CustomSoundUploader soundType="post_comment" label="Post Comments" />
                  <CustomSoundUploader soundType="comment_like" label="Comment Likes" />
                  <CustomSoundUploader soundType="friend_request" label="Friend Requests" />
                  <CustomSoundUploader soundType="tier_upgrade" label="Tier Upgrades" />
                </div>
              </Card>
            )}

            {/* Individual Sound Settings - existing code */}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4 mt-6">
            {/* Quiet Hours */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Moon className="w-5 h-5" />
                    Quiet Hours
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Mute all notifications during specific hours
                  </p>
                </div>
                <Switch
                  checked={settings.quiet_hours_enabled}
                  onCheckedChange={(checked) => saveSettings({ quiet_hours_enabled: checked })}
                />
              </div>
              
              {settings.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <Label>Start Time</Label>
                    <input
                      type="time"
                      value={settings.quiet_hours_start}
                      onChange={(e) => saveSettings({ quiet_hours_start: e.target.value })}
                      className="w-full mt-2 px-3 py-2 bg-background border rounded-md"
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <input
                      type="time"
                      value={settings.quiet_hours_end}
                      onChange={(e) => saveSettings({ quiet_hours_end: e.target.value })}
                      className="w-full mt-2 px-3 py-2 bg-background border rounded-md"
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Adaptive Volume */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Volume2 className="w-5 h-5" />
                    Adaptive Volume
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Automatically adjust volume based on time of day
                  </p>
                </div>
                <Switch
                  checked={settings.adaptive_volume_enabled}
                  onCheckedChange={(checked) => saveSettings({ adaptive_volume_enabled: checked })}
                />
              </div>

              {settings.adaptive_volume_enabled && (
                <div className="space-y-6 pt-4">
                  {/* Daytime Volume */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-yellow-500" />
                        Daytime Volume
                      </Label>
                      <span className="text-sm font-medium">{Math.round(settings.daytime_volume * 100)}%</span>
                    </div>
                    <Slider
                      value={[settings.daytime_volume]}
                      onValueChange={([value]) => saveSettings({ daytime_volume: value })}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                    <input
                      type="time"
                      value={settings.daytime_start}
                      onChange={(e) => saveSettings({ daytime_start: e.target.value })}
                      className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                    />
                  </div>

                  {/* Evening Volume */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Sunset className="w-4 h-4 text-orange-500" />
                        Evening Volume
                      </Label>
                      <span className="text-sm font-medium">{Math.round(settings.evening_volume * 100)}%</span>
                    </div>
                    <Slider
                      value={[settings.evening_volume]}
                      onValueChange={([value]) => saveSettings({ evening_volume: value })}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                    <input
                      type="time"
                      value={settings.evening_start}
                      onChange={(e) => saveSettings({ evening_start: e.target.value })}
                      className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                    />
                  </div>

                  {/* Night Volume */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-blue-500" />
                        Night Volume
                      </Label>
                      <span className="text-sm font-medium">{Math.round(settings.night_volume * 100)}%</span>
                    </div>
                    <Slider
                      value={[settings.night_volume]}
                      onValueChange={([value]) => saveSettings({ night_volume: value })}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                    <input
                      type="time"
                      value={settings.night_start}
                      onChange={(e) => saveSettings({ night_start: e.target.value })}
                      className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                    />
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-6">
            {/* Vibration Patterns */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Vibrate className="w-5 h-5" />
                    Vibration Patterns
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Enable haptic feedback for notifications (mobile devices)
                  </p>
                </div>
                <Switch
                  checked={settings.vibration_enabled}
                  onCheckedChange={(checked) => saveSettings({ vibration_enabled: checked })}
                />
              </div>
            </Card>

            {/* Notification Batching */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Notification Batching</h2>
                  <p className="text-sm text-muted-foreground">
                    Group similar notifications to reduce clutter
                  </p>
                </div>
                <Switch
                  checked={settings.batching_enabled}
                  onCheckedChange={(checked) => saveSettings({ batching_enabled: checked })}
                />
              </div>

              {settings.batching_enabled && (
                <div className="space-y-3 pt-4">
                  <Label>Batching Window (minutes)</Label>
                  <Select
                    value={String(settings.batching_window_minutes)}
                    onValueChange={(value) => saveSettings({ batching_window_minutes: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="3">3 minutes</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Notifications of the same type within this window will be grouped together
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <Button 
          onClick={savePreferences} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Saving...' : 'Save All Preferences'}
        </Button>
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
