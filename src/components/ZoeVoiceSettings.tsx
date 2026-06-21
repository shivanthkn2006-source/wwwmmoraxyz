import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Volume2, Mic, Bell, ChevronDown, Sparkles, Check, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { speakAs, findBestVoice, getCurrentAssistant } from '@/utils/assistantVoice';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceNotificationsEnabled: boolean;
  notificationVoiceStyle: string;
  zoePersonalityTone: string;
  zoeConversationStyle: string;
  zoeProactiveSuggestions: boolean;
}

export default function ZoeVoiceSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testPlaying, setTestPlaying] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('voice');
  
  const [settings, setSettings] = useState<VoiceSettings>({
    rate: 0.9,
    pitch: 1.1,
    volume: 0.85,
    voiceNotificationsEnabled: true,
    notificationVoiceStyle: 'friendly',
    zoePersonalityTone: 'empathetic',
    zoeConversationStyle: 'balanced',
    zoeProactiveSuggestions: true,
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('voice_notifications_enabled, notification_voice_style, zoe_personality_tone, zoe_conversation_style, zoe_proactive_suggestions')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings(prev => ({
        ...prev,
        voiceNotificationsEnabled: data.voice_notifications_enabled ?? true,
        notificationVoiceStyle: data.notification_voice_style || 'friendly',
        zoePersonalityTone: data.zoe_personality_tone || 'empathetic',
        zoeConversationStyle: data.zoe_conversation_style || 'balanced',
        zoeProactiveSuggestions: data.zoe_proactive_suggestions ?? true,
      }));
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          voice_notifications_enabled: settings.voiceNotificationsEnabled,
          notification_voice_style: settings.notificationVoiceStyle,
          zoe_personality_tone: settings.zoePersonalityTone,
          zoe_conversation_style: settings.zoeConversationStyle,
          zoe_proactive_suggestions: settings.zoeProactiveSuggestions,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Voice settings saved successfully');
    } catch (error) {
      console.error('Error saving voice settings:', error);
      toast.error('Failed to save voice settings');
    } finally {
      setLoading(false);
    }
  };

  const testVoice = () => {
    setTestPlaying(true);
    const testMessage = "Hello! I'm Zoe, your AI companion. This is how I sound with your current voice settings.";
    
    speakAs(
      testMessage,
      undefined, // use current assistant
      () => setTestPlaying(true),
      () => setTestPlaying(false),
      () => setTestPlaying(false)
    );
  };

  const getVoiceInfo = () => {
    const assistant = getCurrentAssistant();
    const voice = findBestVoice(assistant);
    return voice ? `${assistant}: ${voice.name}` : `${assistant}: Default Browser Voice`;
  };

  return (
    <div className="space-y-4">
      {/* Voice Quality Section */}
      <Collapsible open={openSection === 'voice'} onOpenChange={(open) => setOpenSection(open ? 'voice' : null)}>
        <CollapsibleTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="p-4 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 backdrop-blur-xl border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Volume2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Voice Quality</h3>
                    <p className="text-xs text-muted-foreground">Customize Zoe's calm, soothing voice</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: openSection === 'voice' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-6 bg-card/50 backdrop-blur-xl rounded-lg border border-border/50 space-y-6"
            >
              {/* Voice Info */}
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Current Voice: <span className="text-foreground font-medium">{getVoiceInfo()}</span>
                </p>
              </div>

              {/* Rate Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Speech Rate</Label>
                  <span className="text-xs text-primary font-bold">{settings.rate.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[settings.rate]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, rate: value }))}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Adjust speaking speed (slower = more calming)</p>
              </div>

              {/* Pitch Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Voice Pitch</Label>
                  <span className="text-xs text-primary font-bold">{settings.pitch.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[settings.pitch]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, pitch: value }))}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Adjust voice pitch (higher = warmer tone)</p>
              </div>

              {/* Volume Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Volume</Label>
                  <span className="text-xs text-primary font-bold">{Math.round(settings.volume * 100)}%</span>
                </div>
                <Slider
                  value={[settings.volume]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, volume: value }))}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Adjust voice volume level</p>
              </div>

              {/* Test Voice Button */}
              <Button
                onClick={testVoice}
                disabled={testPlaying}
                variant="outline"
                className="w-full bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border-primary/20"
              >
                <Play className={`w-4 h-4 mr-2 ${testPlaying ? 'animate-pulse' : ''}`} />
                {testPlaying ? 'Playing...' : 'Test Voice'}
              </Button>
            </motion.div>
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>

      {/* Notification Settings */}
      <Collapsible open={openSection === 'notifications'} onOpenChange={(open) => setOpenSection(open ? 'notifications' : null)}>
        <CollapsibleTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="p-4 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 backdrop-blur-xl border-accent/20 hover:border-accent/40 transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Bell className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Voice Notifications</h3>
                    <p className="text-xs text-muted-foreground">Configure notification announcements</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: openSection === 'notifications' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-6 bg-card/50 backdrop-blur-xl rounded-lg border border-border/50 space-y-6"
            >
              {/* Enable/Disable Voice Notifications */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/5 to-transparent rounded-lg border border-accent/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Voice Announcements</Label>
                  <p className="text-xs text-muted-foreground">Hear notifications read aloud</p>
                </div>
                <Switch
                  checked={settings.voiceNotificationsEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, voiceNotificationsEnabled: checked }))}
                />
              </div>

              {settings.voiceNotificationsEnabled && (
                <>
                  {/* Notification Voice Style */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Announcement Style</Label>
                    <Select
                      value={settings.notificationVoiceStyle}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, notificationVoiceStyle: value }))}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">
                          <div className="flex items-center gap-2">
                            <span>😊</span>
                            <span>Friendly</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="professional">
                          <div className="flex items-center gap-2">
                            <span>💼</span>
                            <span>Professional</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="enthusiastic">
                          <div className="flex items-center gap-2">
                            <span>🎉</span>
                            <span>Enthusiastic</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Choose how Zoe announces notifications</p>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>

      {/* Personality Settings */}
      <Collapsible open={openSection === 'personality'} onOpenChange={(open) => setOpenSection(open ? 'personality' : null)}>
        <CollapsibleTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="p-4 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 backdrop-blur-xl border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Personality & Behavior</h3>
                    <p className="text-xs text-muted-foreground">Customize Zoe's interaction style</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: openSection === 'personality' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-6 bg-card/50 backdrop-blur-xl rounded-lg border border-border/50 space-y-6"
            >
              {/* Personality Tone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Personality Tone</Label>
                <Select
                  value={settings.zoePersonalityTone}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, zoePersonalityTone: value }))}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empathetic">Empathetic & Caring</SelectItem>
                    <SelectItem value="professional">Professional & Formal</SelectItem>
                    <SelectItem value="playful">Playful & Fun</SelectItem>
                    <SelectItem value="wise">Wise & Thoughtful</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Define Zoe's emotional tone</p>
              </div>

              {/* Conversation Style */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Conversation Style</Label>
                <Select
                  value={settings.zoeConversationStyle}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, zoeConversationStyle: value }))}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise & Direct</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="detailed">Detailed & Explanatory</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Choose response length preference</p>
              </div>

              {/* Proactive Suggestions */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Proactive Suggestions</Label>
                  <p className="text-xs text-muted-foreground">Let Zoe offer helpful suggestions</p>
                </div>
                <Switch
                  checked={settings.zoeProactiveSuggestions}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, zoeProactiveSuggestions: checked }))}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>

      {/* Save Button */}
      <Button
        onClick={saveSettings}
        disabled={loading}
        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg"
      >
        {loading ? (
          <div className="animate-gpu-spin">
            <Sparkles className="w-4 h-4" />
          </div>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Save Voice Settings
          </>
        )}
      </Button>
    </div>
  );
}
