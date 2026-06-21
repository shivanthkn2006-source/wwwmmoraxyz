import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Eye, EyeOff, Mic, MessageSquare, User, Home, Search, Settings, LogOut, Volume2, Gauge } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface VoiceCommand {
  command: string;
  action: string;
}

const ZoeSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [zoeVisible, setZoeVisible] = useState(true);
  const [zoeCommands, setZoeCommands] = useState<VoiceCommand[]>([]);
  const [newZoeCommand, setNewZoeCommand] = useState({ command: '', action: '' });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('voice_assistant_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setZoeVisible(data.zoe_visible);
        setZoeCommands((data.zoe_custom_commands as unknown as VoiceCommand[]) || []);
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('voice_assistant_settings')
        .upsert({
          user_id: user.id,
          zoe_visible: zoeVisible,
          zoe_custom_commands: zoeCommands as any,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Zoe visibility settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error saving settings',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addZoeCommand = async () => {
    if (newZoeCommand.command && newZoeCommand.action) {
      const updatedCommands = [...zoeCommands, newZoeCommand];
      setZoeCommands(updatedCommands);
      setNewZoeCommand({ command: '', action: '' });
      
      // Auto-save after adding
      await saveCommandsToDb(updatedCommands);
    }
  };

  const saveCommandsToDb = async (commands: VoiceCommand[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('voice_assistant_settings')
        .upsert({
          user_id: user.id,
          zoe_visible: zoeVisible,
          zoe_custom_commands: commands as any,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: 'Command saved',
        description: 'Custom command added successfully',
      });
    } catch (error: any) {
      console.error('Error saving command:', error);
      toast({
        title: 'Error saving command',
        description: error.message || 'Failed to save custom command',
        variant: 'destructive',
      });
    }
  };

  const removeZoeCommand = async (index: number) => {
    const updatedCommands = zoeCommands.filter((_, i) => i !== index);
    setZoeCommands(updatedCommands);
    
    // Auto-save after removing
    await saveCommandsToDb(updatedCommands);
  };

  // Built-in platform commands
  const platformCommands = [
    { icon: Home, command: 'open home', description: 'Go to home feed' },
    { icon: User, command: 'open profile', description: 'Open your profile' },
    { icon: MessageSquare, command: 'open chat', description: 'Open chat page' },
    { icon: Search, command: 'open huddle', description: 'Open discover page' },
    { icon: Mic, command: 'open zoe', description: 'Talk to Zoe AI' },
    { icon: Search, command: 'find users [topic]', description: 'Search for users by interests' },
    { icon: Search, command: 'find posts [topic]', description: 'Search for posts' },
    { icon: Search, command: 'search/tell me about [anything]', description: 'Universal search' },
    { icon: MessageSquare, command: 'post [message]', description: 'Create a quick post' },
    { icon: User, command: 'bio [text]', description: 'Update your bio' },
    { icon: User, command: 'status [text]', description: 'Update your status' },
    { icon: Plus, command: 'add hobby [name]', description: 'Add a hobby' },
    { icon: User, command: 'friend [username]', description: 'Send friend request' },
    { icon: Search, command: 'show all users', description: 'Show all platform users in Huddle' },
    { icon: Search, command: 'show matches', description: 'Show interest-based recommendations' },
    { icon: Search, command: 'zoom in / zoom out', description: 'Control map zoom in Huddle' },
    { icon: Search, command: 'zoom to [location]', description: 'Zoom to specific location' },
    { icon: Search, command: 'show online', description: 'Show online users in Huddle' },
    { icon: Search, command: 'search online user [name]', description: 'Find specific online user' },
    { icon: Volume2, command: 'speed slow/normal/fast', description: 'Change voice speed' },
    { icon: Volume2, command: 'volume [0-100]', description: 'Set voice volume' },
    { icon: Gauge, command: 'pitch low/normal/high', description: 'Adjust voice pitch' },
    { icon: Volume2, command: 'mute', description: 'Silence voice output' },
    { icon: Settings, command: 'settings', description: 'Open settings' },
    { icon: LogOut, command: 'logout', description: 'Sign out' },
    { icon: Mic, command: 'help', description: 'Show all commands' },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Reference - Platform Commands */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Zoe Voice Commands - Quick Reference
          </CardTitle>
          <CardDescription>
            Say these commands anywhere in the app. Commands are short and easy to pronounce.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {platformCommands.map((cmd, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 bg-background/60 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="p-2 bg-primary/10 rounded-md">
                  <cmd.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <code className="text-sm font-mono text-primary block truncate">
                    {cmd.command}
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cmd.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <Separator className="my-4" />
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Tips for Best Results
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Speak clearly and at normal pace</li>
              <li>Zoe auto-activates on page load - say "Hey Zoe" or "OK Zoe" anytime</li>
              <li>Use natural conversational language (e.g., "Zoe, show me my friends")</li>
              <li>Get weather updates, important day reminders & contextual tips</li>
              <li>Try: "What's the weather?" or "Tell me about today"</li>
              <li>Commands work with slight variations & accents (fuzzy matching)</li>
              <li>Confirmation requested for critical actions - say "yes" or "no"</li>
              <li>View command history to see success rates & frequently used commands</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Custom Commands */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Custom Zoe Commands</CardTitle>
              <CardDescription>Add your own voice shortcuts for frequently used actions</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="zoe-visible" className="text-sm">
                {zoeVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Label>
              <Switch
                id="zoe-visible"
                checked={zoeVisible}
                onCheckedChange={setZoeVisible}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {zoeCommands.length > 0 ? (
              <div className="space-y-2">
                {zoeCommands.map((cmd, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex-1">
                      <p className="text-sm font-medium font-mono text-primary">{cmd.command}</p>
                      <p className="text-xs text-muted-foreground mt-1">{cmd.action}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeZoeCommand(index)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No custom commands yet</p>
                <p className="text-xs">Add shortcuts for your most used actions</p>
              </div>
            )}
            
            <Separator className="my-4" />
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Add New Custom Command</Label>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="voice-command" className="text-xs text-muted-foreground">
                    Voice Trigger (e.g., "my shortcut")
                  </Label>
                  <Input
                    id="voice-command"
                    placeholder="Short and easy phrase"
                    value={newZoeCommand.command}
                    onChange={(e) => setNewZoeCommand({ ...newZoeCommand, command: e.target.value })}
                    className="bg-background mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="action" className="text-xs text-muted-foreground">
                    What it does (description)
                  </Label>
                  <Input
                    id="action"
                    placeholder="Action description"
                    value={newZoeCommand.action}
                    onChange={(e) => setNewZoeCommand({ ...newZoeCommand, action: e.target.value })}
                    className="bg-background mt-1"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addZoeCommand}
                className="w-full"
                disabled={!newZoeCommand.command || !newZoeCommand.action}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Command
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={saveSettings} 
        disabled={loading} 
        className="w-full"
        size="lg"
      >
        {loading ? 'Saving...' : 'Save Visibility Settings'}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center">
        Note: Custom commands are saved automatically when added or removed
      </p>
    </div>
  );
};

export default ZoeSettings;
