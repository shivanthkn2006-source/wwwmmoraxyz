import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Trash2, RefreshCw, Mic, Navigation, Users, Brain, Clock, Settings, MessageSquare, Fingerprint, Volume2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HuddleVoiceCommands from './HuddleVoiceCommands';

interface VoiceShortcut {
  id: string;
  shortcut_name: string;
  trigger_phrase: string;
  enabled: boolean;
  execution_count: number;
}

// All Zoe Sovereign Voice Commands - organized by category
const SOVEREIGN_COMMANDS = {
  navigation: {
    icon: Navigation,
    label: 'Navigation',
    color: 'text-blue-500',
    commands: [
      { phrase: 'open home', description: 'Go to home feed' },
      { phrase: 'open profile', description: 'Open your profile' },
      { phrase: 'open chat', description: 'Open messages' },
      { phrase: 'open huddle', description: 'Discover people nearby' },
      { phrase: 'open webdrop', description: 'Zoe AI Architect' },
      { phrase: 'open camera', description: 'Open camera' },
      { phrase: 'open timeline', description: 'Universal Agentic Timeline' },
      { phrase: 'open dhf dashboard', description: 'DHF with ATLAS Sync' },
      { phrase: 'open soul engine', description: 'Zoe Soul Engine' },
      { phrase: 'open voice commands', description: 'Voice commands reference' },
      { phrase: 'go back', description: 'Previous page' },
    ]
  },
  ai: {
    icon: Brain,
    label: 'AI & Intelligence',
    color: 'text-purple-500',
    commands: [
      { phrase: 'zoe intelligence', description: 'Open Intelligence Dashboard' },
      { phrase: 'open dreams', description: 'Zoe Dreams AI analysis' },
      { phrase: 'explore solar system', description: '4K Heliosphere Explorer' },
      { phrase: 'what can you do', description: 'Show Zoe capabilities' },
      { phrase: 'check my status', description: 'Your tier and points' },
      { phrase: 'help', description: 'Get assistance' },
    ]
  },
  social: {
    icon: Users,
    label: 'Social & Content',
    color: 'text-green-500',
    commands: [
      { phrase: 'create post about [topic]', description: 'Create a new post' },
      { phrase: 'update bio to [text]', description: 'Update profile bio' },
      { phrase: 'set status to [status]', description: 'Update your status' },
      { phrase: 'add hobby [hobby]', description: 'Add a hobby' },
      { phrase: 'send friend request to [username]', description: 'Add a friend' },
      { phrase: 'search user [name]', description: 'Find users' },
      { phrase: 'search posts about [topic]', description: 'Find posts' },
    ]
  },
  huddle: {
    icon: Users,
    label: 'Huddle Controls',
    color: 'text-orange-500',
    commands: [
      { phrase: 'show online users', description: 'See who\'s online' },
      { phrase: 'zoom in', description: 'Zoom in on map' },
      { phrase: 'zoom out', description: 'Zoom out on map' },
      { phrase: 'zoom to [location]', description: 'Focus on location' },
      { phrase: 'show all users', description: 'Show everyone' },
      { phrase: 'show my matches', description: 'Interest-based matches' },
    ]
  },
  dhf: {
    icon: Fingerprint,
    label: 'DHF & ATLAS',
    color: 'text-cyan-500',
    commands: [
      { phrase: 'check atlas sync', description: 'ATLAS synchronization status' },
      { phrase: 'upload to dhf', description: 'Enrich your fingerprint' },
      { phrase: 'verify [data point]', description: 'Verify DHF data' },
    ]
  },
  timeline: {
    icon: Clock,
    label: 'Timeline',
    color: 'text-amber-500',
    commands: [
      { phrase: 'explore the big bang', description: '13.8 billion years ago' },
      { phrase: 'show today', description: 'Present day' },
      { phrase: 'explore the future', description: 'Post-human future' },
    ]
  },
  system: {
    icon: Settings,
    label: 'System',
    color: 'text-gray-500',
    commands: [
      { phrase: 'check notifications', description: 'Unread notifications' },
      { phrase: 'run diagnostics', description: 'Platform health check' },
      { phrase: 'refresh', description: 'Reload page' },
      { phrase: 'sign out', description: 'Log out' },
    ]
  },
  voice: {
    icon: Volume2,
    label: 'Voice Control',
    color: 'text-pink-500',
    commands: [
      { phrase: 'stop', description: 'Stop Zoe speaking' },
      { phrase: 'set speed slow/normal/fast', description: 'Voice speed' },
      { phrase: 'set volume [0-100]', description: 'Voice volume' },
      { phrase: 'mute', description: 'Silence Zoe' },
    ]
  },
};

const VoiceCommandsSettings = () => {
  const { user } = useAuth();
  const [shortcuts, setShortcuts] = useState<VoiceShortcut[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user?.id) {
      loadShortcuts();
    }
  }, [user?.id]);

  const loadShortcuts = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('voice_shortcuts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setShortcuts(data as VoiceShortcut[]);
    }
    setLoading(false);
  };

  const deleteShortcut = async (id: string, name: string) => {
    const { error } = await supabase
      .from('voice_shortcuts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete voice command');
      return;
    }

    toast.success(`Deleted: ${name}`);
    loadShortcuts();
  };

  const totalCommands = useMemo(() => {
    return Object.values(SOVEREIGN_COMMANDS).reduce((acc, cat) => acc + cat.commands.length, 0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary animate-pulse" />
            Zoe Sovereign Voice Commands
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="text-xs">{totalCommands}+ Commands</Badge>
            <span>Say "Hey Zoe" followed by any command</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(SOVEREIGN_COMMANDS).map(([key, category]) => (
              <div 
                key={key}
                className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/50"
              >
                <category.icon className={`w-4 h-4 ${category.color}`} />
                <span className="text-xs font-medium">{category.label}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {category.commands.length}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Command Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="all" className="text-xs">All Commands</TabsTrigger>
          {Object.entries(SOVEREIGN_COMMANDS).map(([key, category]) => (
            <TabsTrigger key={key} value={key} className="text-xs gap-1">
              <category.icon className={`w-3 h-3 ${category.color}`} />
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {Object.entries(SOVEREIGN_COMMANDS).map(([key, category]) => (
            <Card key={key} className="overflow-hidden">
              <CardHeader className="py-3 bg-muted/30">
                <CardTitle className="text-sm flex items-center gap-2">
                  <category.icon className={`w-4 h-4 ${category.color}`} />
                  {category.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid gap-2">
                  {category.commands.map((cmd, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <code className="text-xs font-mono text-primary">"{cmd.phrase}"</code>
                      <span className="text-xs text-muted-foreground">{cmd.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {Object.entries(SOVEREIGN_COMMANDS).map(([key, category]) => (
          <TabsContent key={key} value={key} className="mt-4">
            <Card>
              <CardHeader className="py-3 bg-muted/30">
                <CardTitle className="text-sm flex items-center gap-2">
                  <category.icon className={`w-4 h-4 ${category.color}`} />
                  {category.label} Commands
                </CardTitle>
                <CardDescription className="text-xs">
                  {category.commands.length} voice commands available
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid gap-2">
                  {category.commands.map((cmd, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors border border-border/30"
                    >
                      <div>
                        <code className="text-sm font-mono text-primary">"{cmd.phrase}"</code>
                        <p className="text-xs text-muted-foreground mt-1">{cmd.description}</p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${category.color}`}>
                        {category.label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Custom Voice Commands */}
      <Card className="bg-gradient-to-br from-secondary/5 to-accent/5 border-secondary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Your Custom Commands</CardTitle>
              <CardDescription>
                {shortcuts.length} custom voice shortcuts • Say "add [feature]" to create
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadShortcuts}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {shortcuts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No custom voice commands yet</p>
              <p className="text-xs mt-2">Say "Hey Zoe, add [feature]" to create your first one!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{shortcut.shortcut_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Trigger: <span className="font-mono text-primary">"{shortcut.trigger_phrase}"</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Used {shortcut.execution_count} times
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteShortcut(shortcut.id, shortcut.shortcut_name)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Huddle-specific commands */}
      <HuddleVoiceCommands />
    </div>
  );
};

export default VoiceCommandsSettings;
