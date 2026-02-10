import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Home, MessageSquare, Users, Camera, Search, Bell, 
  Settings, User, Heart, Trophy, Calendar, MapPin, 
  Mic, Brain, Zap, Clock, TrendingUp, Shield, 
  FileText, Image, Video, Music, Box, Sparkles,
  Rocket, Star, Target, Award, Gift, Activity, Download, X, Filter
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Restricted users who can download documentation
const RESTRICTED_ACCESS_USERS = ['justmkbhd', 'moksh50'];

const AppArchitectureBlueprint = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('features');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<Array<{
    fileName: string;
    matches: Array<{ line: string; lineNumber: number; context: string }>;
  }>>([]);

  // Fetch user profile to check username
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if user has download access
  const hasDownloadAccess = profile && RESTRICTED_ACCESS_USERS.includes(profile.username);

  // Search documentation files
  // Helper function to escape special regex characters
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const allDocFiles = [
      'MASTER_DOCUMENTATION.md',
      'TESTING_GUIDE.md',
      'LISA_USER_GUIDE.md',
      'DESIGN_DIAGRAMS.md',
      'PDF_EXPORT_GUIDE.md',
      'FEATURE_ANNOUNCEMENTS.md',
      'FEATURE_NAVIGATION_GUIDE.md',
      'SEARCH_FEATURES.md'
    ];

    // Filter files based on selection
    const docFiles = selectedFiles === 'all' 
      ? allDocFiles 
      : allDocFiles.filter(file => file === selectedFiles);

    const results: Array<{
      fileName: string;
      matches: Array<{ line: string; lineNumber: number; context: string }>;
    }> = [];

    const searchLower = query.toLowerCase();

    for (const fileName of docFiles) {
      try {
        const response = await fetch(`/${fileName}`);
        if (response.ok) {
          const content = await response.text();
          const lines = content.split('\n');
          const matches: Array<{ line: string; lineNumber: number; context: string }> = [];

          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(searchLower)) {
              // Get context (2 lines before and after)
              const contextStart = Math.max(0, index - 2);
              const contextEnd = Math.min(lines.length, index + 3);
              const context = lines.slice(contextStart, contextEnd).join('\n');
              
              matches.push({
                line: line.trim(),
                lineNumber: index + 1,
                context
              });
            }
          });

          if (matches.length > 0) {
            results.push({ fileName, matches });
          }
        }
      } catch (error) {
        console.error(`Failed to search ${fileName}:`, error);
      }
    }

    setSearchResults(results);
  };

  const handleDownloadAllDocs = async () => {
    try {
      // Fetch all documentation files from the project root
      const docFiles = [
        'MASTER_DOCUMENTATION.md',
        'TESTING_GUIDE.md',
        'LISA_USER_GUIDE.md',
        'DESIGN_DIAGRAMS.md',
        'PDF_EXPORT_GUIDE.md'
      ];

      const timestamp = new Date().toISOString().split('T')[0];
      
      // Create a combined documentation bundle
      let combinedContent = `
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║            COMPLETE PLATFORM DOCUMENTATION PACKAGE                     ║
║                                                                        ║
║  Generated: ${timestamp}                                         ║
║  Restricted Access: @justmkbhd, @moksh50                              ║
║  Confidential - Not for Public Distribution                           ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝


TABLE OF CONTENTS
═════════════════

1. MASTER_DOCUMENTATION.md
2. TESTING_GUIDE.md
3. LISA_USER_GUIDE.md
4. DESIGN_DIAGRAMS.md
5. PDF_EXPORT_GUIDE.md


`;

      // Fetch each file and add to bundle
      for (const fileName of docFiles) {
        try {
          const response = await fetch(`/${fileName}`);
          if (response.ok) {
            const content = await response.text();
            combinedContent += `\n\n${'═'.repeat(75)}\n`;
            combinedContent += `FILE: ${fileName}\n`;
            combinedContent += `${'═'.repeat(75)}\n\n`;
            combinedContent += content;
          }
        } catch (error) {
          console.error(`Failed to fetch ${fileName}:`, error);
        }
      }

      // Create and download the bundle
      const blob = new Blob([combinedContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Complete_Documentation_Package_${timestamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Complete documentation package downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download documentation');
    }
  };

  const features = [
    {
      category: 'Core Pages',
      icon: Home,
      items: [
        { name: 'Home Feed', path: '/home', description: 'Social feed with posts, likes, comments', status: 'live' },
        { name: 'Profile Page', path: '/profile', description: 'User profile, stats, achievements, documentation', status: 'live' },
        { name: 'Chat Page', path: '/chat', description: 'Real-time messaging with friends', status: 'live' },
        { name: 'Huddle Events', path: '/huddle', description: 'Event discovery and creation', status: 'live' },
        { name: 'Camera/Webdrop', path: '/camera', description: 'Media capture and file uploads', status: 'live' },
        { name: 'Zoe AI Companion', path: '/ai-companion', description: 'Conversational AI assistant', status: 'live' },
        { name: 'Search', path: '/search', description: 'User and content discovery', status: 'planned' }
      ]
    },
    {
      category: 'Social Features',
      icon: Users,
      items: [
        { name: 'Friend Requests', description: 'Send and manage friend requests', status: 'live' },
        { name: 'Friend Management', description: 'View and manage friendships', status: 'live' },
        { name: 'Post Creation', description: 'Create text, image, video posts', status: 'live' },
        { name: 'Post Interactions', description: 'Like, comment, share posts', status: 'live' },
        { name: 'User Tagging', description: 'Tag friends in posts', status: 'live' },
        { name: 'Saved Posts', description: 'Bookmark favorite posts', status: 'live' },
        { name: 'Status Updates', description: 'Set online/busy/away status', status: 'live' },
        { name: 'Stories', description: '24-hour ephemeral content', status: 'planned' }
      ]
    },
    {
      category: 'Gamification System',
      icon: Trophy,
      items: [
        { name: 'Badges & Achievements', description: '200+ badges across categories', status: 'live' },
        { name: 'Badge Challenges', description: 'Time-limited badge challenges', status: 'live' },
        { name: 'Badge Collections', description: 'Thematic badge sets with bonuses', status: 'live' },
        { name: 'Seasonal Challenges', description: 'Weekly/monthly challenge seasons', status: 'live' },
        { name: 'Leaderboard', description: 'Global ranking by points', status: 'live' },
        { name: 'Points System', description: 'Earn points for activities', status: 'live' },
        { name: 'Tier System', description: 'Bronze/Silver/Gold/Diamond tiers', status: 'live' },
        { name: 'Badge Sharing', description: 'Share achievements on feed', status: 'live' },
        { name: 'Achievement Milestones', description: 'Personalized milestone suggestions', status: 'live' }
      ]
    },
    {
      category: 'Zoe AI Features',
      icon: Brain,
      items: [
        { name: 'Voice Commands', description: '100+ voice commands', status: 'live' },
        { name: 'Natural Conversations', description: 'Context-aware AI chat', status: 'live' },
        { name: 'Proactive Notifications', description: 'Smart suggestions based on activity', status: 'live' },
        { name: 'Learning System', description: 'Adapts to user preferences', status: 'live' },
        { name: 'Voice Macros', description: 'Custom voice command sequences', status: 'live' },
        { name: 'Content Generation', description: 'AI-assisted post creation', status: 'live' },
        { name: 'Daily Briefings', description: 'Morning activity summaries', status: 'live' },
        { name: 'Friend Announcements', description: 'Voice announcements when friends come online', status: 'live' },
        { name: 'Command History', description: 'Track and analyze Zoe usage', status: 'live' },
        { name: 'Analytics Dashboard', description: 'Zoe interaction insights', status: 'live' },
        { name: 'Personality Customization', description: 'Adjust tone and conversation style', status: 'live' },
        { name: 'Multi-language Support', description: 'Auto-detect and switch languages', status: 'live' },
        { name: 'Offline Mode', description: 'Cached responses when offline', status: 'live' }
      ]
    },
    {
      category: 'Productivity Tools',
      icon: Calendar,
      items: [
        { name: 'Reminders', description: 'Voice and manual reminder creation', status: 'live' },
        { name: 'Day Planner', description: 'Daily schedule and diary', status: 'live' },
        { name: 'Calendar View', description: 'Visual calendar with events', status: 'live' },
        { name: 'Emotion Tracker', description: 'Log and track emotions', status: 'live' },
        { name: 'Emotion Analytics', description: 'Visualize emotional patterns', status: 'live' },
        { name: 'Task Management', description: 'To-do lists with Zoe integration', status: 'planned' }
      ]
    },
    {
      category: 'Search & Discovery',
      icon: Search,
      items: [
        { name: 'User Search', description: 'Find users by name, interests', status: 'live' },
        { name: 'Content Search', description: 'Search posts and media', status: 'live' },
        { name: 'Advanced Filters', description: 'Filter by date, location, type', status: 'live' },
        { name: 'Saved Searches', description: 'Save favorite search queries', status: 'live' },
        { name: 'Search Analytics', description: 'Personal search insights', status: 'live' },
        { name: 'Trending Searches', description: 'Popular searches across platform', status: 'live' },
        { name: 'Smart Recommendations', description: 'AI-suggested users and content', status: 'live' }
      ]
    },
    {
      category: 'Notifications System',
      icon: Bell,
      items: [
        { name: 'Real-time Notifications', description: 'Instant activity alerts', status: 'live' },
        { name: 'Voice Notifications', description: 'Zoe speaks notifications', status: 'live' },
        { name: 'Smart Suggestions', description: 'AI-powered activity suggestions', status: 'live' },
        { name: 'Badge Notifications', description: 'Real-time badge earnings', status: 'live' },
        { name: 'Friend Online Alerts', description: 'Notifications when friends come online', status: 'live' },
        { name: 'Notification Preferences', description: 'Granular control over alerts', status: 'live' },
        { name: 'Desktop Notifications', description: 'Browser push notifications', status: 'live' }
      ]
    },
    {
      category: 'Analytics & Insights',
      icon: TrendingUp,
      items: [
        { name: 'Feature Analytics', description: 'Track feature usage patterns', status: 'live' },
        { name: 'Zoe Analytics', description: 'Voice command insights', status: 'live' },
        { name: 'Search Analytics', description: 'Search behavior analysis', status: 'live' },
        { name: 'Emotion Analytics', description: 'Mood tracking over time', status: 'live' },
        { name: 'Activity Patterns', description: 'Personal usage statistics', status: 'live' }
      ]
    },
    {
      category: 'Settings & Customization',
      icon: Settings,
      items: [
        { name: 'Profile Settings', description: 'Edit profile information', status: 'live' },
        { name: 'Privacy Settings', description: 'Control profile visibility', status: 'live' },
        { name: 'Zoe Settings', description: 'Voice, personality, preferences', status: 'live' },
        { name: 'Notification Settings', description: 'Configure all notifications', status: 'live' },
        { name: 'Theme Settings', description: 'Light/dark mode', status: 'planned' },
        { name: 'Language Settings', description: 'Multi-language support', status: 'live' }
      ]
    }
  ];

  const futureFeatures = [
    {
      category: 'Phase 1 - Q1 2025',
      priority: 'high',
      items: [
        { name: 'Dark Mode', description: 'Complete dark theme implementation', icon: Sparkles },
        { name: 'Stories Feature', description: '24-hour ephemeral content', icon: Image },
        { name: 'Video Calls', description: 'One-on-one and group video chat', icon: Video },
        { name: 'Task Management', description: 'Advanced to-do lists', icon: FileText },
        { name: 'Advanced Search', description: 'Semantic search with AI', icon: Search }
      ]
    },
    {
      category: 'Phase 2 - Q2 2025',
      priority: 'medium',
      items: [
        { name: 'Group Chats', description: 'Multi-user messaging rooms', icon: Users },
        { name: 'Live Streaming', description: 'Broadcast live to followers', icon: Activity },
        { name: 'Marketplace', description: 'Buy/sell items in-app', icon: Box },
        { name: 'Music Sharing', description: 'Share and discover music', icon: Music },
        { name: 'Advanced Analytics', description: 'ML-powered insights', icon: TrendingUp }
      ]
    },
    {
      category: 'Phase 3 - Q3-Q4 2025',
      priority: 'future',
      items: [
        { name: 'AR Filters', description: 'Augmented reality camera filters', icon: Camera },
        { name: 'AI Content Moderation', description: 'Automated safety systems', icon: Shield },
        { name: 'Cross-platform Sync', description: 'Mobile app with sync', icon: Zap },
        { name: 'API Access', description: 'Developer API for integrations', icon: Target },
        { name: 'Premium Tiers', description: 'Subscription features', icon: Gift }
      ]
    }
  ];

  const architecture = {
    frontend: [
      { name: 'React 18', description: 'UI framework', status: 'live' },
      { name: 'TypeScript', description: 'Type safety', status: 'live' },
      { name: 'Vite', description: 'Build tool', status: 'live' },
      { name: 'TailwindCSS', description: 'Styling framework', status: 'live' },
      { name: 'Shadcn UI', description: 'Component library', status: 'live' },
      { name: 'React Router', description: 'Client-side routing', status: 'live' },
      { name: 'React Query', description: 'Server state management', status: 'live' },
      { name: 'Framer Motion', description: 'Animations', status: 'live' }
    ],
    backend: [
      { name: 'Supabase', description: 'Backend platform', status: 'live' },
      { name: 'PostgreSQL', description: 'Primary database', status: 'live' },
      { name: 'Row Level Security', description: 'Data access control', status: 'live' },
      { name: 'Edge Functions', description: 'Serverless functions', status: 'live' },
      { name: 'Realtime', description: 'WebSocket connections', status: 'live' },
      { name: 'Storage', description: 'File storage system', status: 'live' }
    ],
    ai: [
      { name: 'Neural Engine Pro', description: 'Primary AI model', status: 'live' },
      { name: 'Neural Engine Lite', description: 'Secondary AI model', status: 'live' },
      { name: 'Advanced Voice Synthesis', description: 'Voice synthesis', status: 'live' },
      { name: 'Browser Speech API', description: 'Voice recognition', status: 'live' },
      { name: 'Custom Learning System', description: 'Adaptive AI behavior', status: 'live' }
    ]
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      live: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
      planned: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
      beta: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30'
    };
    
    return (
      <Badge variant="outline" className={`text-xs ${colors[status] || colors.live}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-r-lg">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="w-6 h-6 text-primary" />
          Complete App Architecture Blueprint
        </h2>
        <p className="text-muted-foreground mt-2">
          Master sitemap showing all features, Zoe AI capabilities, technical architecture, and future roadmap
        </p>
      </div>

      {/* Documentation Search */}
      <Card className="p-6 bg-gradient-to-br from-muted/30 to-muted/10 border-border/50">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Search Documentation</h3>
            <Badge variant="secondary" className="ml-2">New</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Search across all documentation files including guides, features, and technical docs
          </p>
          <div className="flex gap-2 items-start">
            <div className="w-[240px]">
              <Select value={selectedFiles} onValueChange={setSelectedFiles}>
                <SelectTrigger className="w-full bg-background">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="All Files" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="all">All Files</SelectItem>
                  <SelectItem value="MASTER_DOCUMENTATION.md">Master Documentation</SelectItem>
                  <SelectItem value="TESTING_GUIDE.md">Testing Guide</SelectItem>
                  <SelectItem value="LISA_USER_GUIDE.md">ZOE User Guide</SelectItem>
                  <SelectItem value="DESIGN_DIAGRAMS.md">Design Diagrams</SelectItem>
                  <SelectItem value="PDF_EXPORT_GUIDE.md">PDF Export Guide</SelectItem>
                  <SelectItem value="FEATURE_ANNOUNCEMENTS.md">Feature Announcements</SelectItem>
                  <SelectItem value="FEATURE_NAVIGATION_GUIDE.md">Navigation Guide</SelectItem>
                  <SelectItem value="SEARCH_FEATURES.md">Search Features</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search for topics, features, or keywords..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {searchResults.length > 0 && (
            <ScrollArea className="h-[500px] rounded-md border border-border/50 bg-background/50 mt-4">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-3 sticky top-0 bg-background/95 backdrop-blur-sm py-2 px-2 -mx-2 border-b border-border/50">
                  <p className="text-sm font-medium text-foreground">
                    Found {searchResults.reduce((acc, r) => acc + r.matches.length, 0)} results in {searchResults.length} file{searchResults.length > 1 ? 's' : ''}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    Clear Results
                  </Button>
                </div>
                {searchResults.map((result, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center gap-2 sticky top-14 bg-background/95 backdrop-blur-sm py-2 px-2 -mx-2 border-b border-border/30">
                      <FileText className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-foreground">{result.fileName}</h4>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {result.matches.length} match{result.matches.length > 1 ? 'es' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-3 mt-2">
                      {result.matches.slice(0, 5).map((match, matchIdx) => (
                        <Card key={matchIdx} className="p-4 bg-muted/30 border-border/50 hover:border-primary/50 transition-all hover:shadow-md">
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="text-xs shrink-0 bg-background">
                                Line {match.lineNumber}
                              </Badge>
                              <p className="text-sm font-medium text-foreground break-words flex-1">
                                {match.line.split(new RegExp(`(${escapeRegex(searchQuery)})`, 'gi')).map((part, i) => 
                                  part.toLowerCase() === searchQuery.toLowerCase() ? (
                                    <mark key={i} className="bg-primary/30 text-primary-foreground font-semibold rounded px-1">
                                      {part}
                                    </mark>
                                  ) : part
                                )}
                              </p>
                            </div>
                            <pre className="text-xs text-muted-foreground bg-background/70 p-3 rounded border border-border/30 overflow-x-auto whitespace-pre-wrap break-words">
                              {match.context}
                            </pre>
                          </div>
                        </Card>
                      ))}
                      {result.matches.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          + {result.matches.length - 5} more matches in this file
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
              <Search className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">No results found</p>
              <p className="text-sm mt-1">Try different keywords or check spelling</p>
            </div>
          )}
        </div>
      </Card>

      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Features Map
          </TabsTrigger>
          <TabsTrigger value="architecture" className="flex items-center gap-2">
            <Box className="w-4 h-4" />
            Tech Stack
          </TabsTrigger>
          <TabsTrigger value="future" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Future Updates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {features.map((category, idx) => {
                const Icon = category.icon;
                return (
                  <Card key={idx} className="p-6 border-2 border-border/50 hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{category.category}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {category.items.length} items
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {category.items.map((item, itemIdx) => (
                        <div 
                          key={itemIdx} 
                          className="flex items-start justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground">{item.name}</span>
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            {item.path && (
                              <code className="text-xs text-primary mt-1 block">Route: {item.path}</code>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="architecture">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              <Card className="p-6 border-2 border-blue-500/30 bg-blue-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Box className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Frontend Stack</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {architecture.frontend.map((tech, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-background border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{tech.name}</span>
                        <StatusBadge status={tech.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{tech.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 border-2 border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Activity className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Backend Stack</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {architecture.backend.map((tech, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-background border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{tech.name}</span>
                        <StatusBadge status={tech.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{tech.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 border-2 border-purple-500/30 bg-purple-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Brain className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">AI & Voice Stack</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {architecture.ai.map((tech, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-background border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{tech.name}</span>
                        <StatusBadge status={tech.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{tech.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="future">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {futureFeatures.map((phase, idx) => {
                const priorityColors: Record<string, string> = {
                  high: 'border-red-500/30 bg-red-500/5',
                  medium: 'border-yellow-500/30 bg-yellow-500/5',
                  future: 'border-blue-500/30 bg-blue-500/5'
                };
                
                return (
                  <Card key={idx} className={`p-6 border-2 ${priorityColors[phase.priority]}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Rocket className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{phase.category}</h3>
                        <Badge variant="outline" className="mt-1">
                          Priority: {phase.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {phase.items.map((item, itemIdx) => {
                        const Icon = item.icon;
                        return (
                          <div 
                            key={itemIdx}
                            className="p-4 rounded-lg bg-background border border-border/50 hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground mb-1">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Card className="p-6 border-2 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-bold text-foreground">Complete Documentation Available</h3>
              {hasDownloadAccess && (
                <Button
                  onClick={handleDownloadAllDocs}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download All
                </Button>
              )}
            </div>
            <p className="text-muted-foreground mb-4">
              Access comprehensive documentation including testing guides, Zoe AI commands, 
              learning system details, search features, and architecture diagrams.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">MASTER_DOCUMENTATION.md</Badge>
              <Badge variant="secondary">TESTING_GUIDE.md</Badge>
              <Badge variant="secondary">ZOE_USER_GUIDE.md</Badge>
              <Badge variant="secondary">DESIGN_DIAGRAMS.md</Badge>
              <Badge variant="secondary">PDF_EXPORT_GUIDE.md</Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AppArchitectureBlueprint;
