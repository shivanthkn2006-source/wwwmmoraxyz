import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, UserPlus, Calendar, Settings, LogOut, Award, BookOpen, Mic, Shield, Sparkles, Lock, FileText, Brain, Fingerprint, Dna, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import FriendCard from '@/components/FriendCard';
import PostsGrid from '@/components/PostsGrid';
import PostModal from '@/components/PostModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import UserSearchModal from '@/components/UserSearchModal';
import EventSetupModal from '@/components/EventSetupModal';
import DayPlannerDiary from '@/components/DayPlannerDiary';
import { RemindersManager } from '@/components/RemindersManager';
import { CalendarView } from '@/components/CalendarView';
import { EmotionTracker } from '@/components/EmotionTracker';
import { BriefingPreferences } from '@/components/BriefingPreferences';
import { VoiceMacroManager } from '@/components/VoiceMacroManager';
import StatusSelector from '@/components/StatusSelector';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';
import ImageViewer from '@/components/ImageViewer';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { FeatureAnalyticsDashboard } from '@/components/FeatureAnalyticsDashboard';
import { Leaderboard } from '@/components/Leaderboard';
import { BadgeChallenges } from '@/components/BadgeChallenges';
import { AchievementMilestones } from '@/components/AchievementMilestones';
import { BadgeCollectionsDisplay } from '@/components/BadgeCollectionsDisplay';
import { ChallengeSeasonDisplay } from '@/components/ChallengeSeasonDisplay';
import { BadgeComparisonModal } from '@/components/BadgeComparisonModal';
import { GodModePanel } from '@/components/GodModePanel';
import { useRealtimeBadgeNotifications } from '@/hooks/useRealtimeBadgeNotifications';
import { UniversalSymbolsGuide } from '@/components/UniversalSymbolsGuide';
import { ZoeIntelligenceDashboard } from '@/components/ZoeIntelligenceDashboard';
import { ZoeGoalCreator } from '@/components/ZoeGoalCreator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppArchitectureBlueprint from '@/components/AppArchitectureBlueprint';
import { UniversalDocumentHub } from '@/components/UniversalDocumentHub';
import { ComprehensiveDocumentationCenter } from '@/components/ComprehensiveDocumentationCenter';
import { Progress } from '@/components/ui/progress';
import { useVelvetRopeOptional } from '@/contexts/VelvetRopeContext';

const EmotionAnalytics = React.lazy(() =>
  import('@/components/EmotionAnalytics').then((module) => ({ default: module.EmotionAnalytics }))
);
const UserActivityDashboard = React.lazy(() =>
  import('@/components/UserActivityDashboard').then((module) => ({ default: module.UserActivityDashboard }))
);

interface Profile {
  display_name: string;
  username: string;
  bio?: string;
  profile_photo_url?: string;
  profession?: string;
  field_of_study?: string;
  gender?: string;
  hobbies?: string[];
  event_date?: string | null;
  event_type?: string | null;
  event_custom_details?: string | null;
  event_recurring?: boolean | null;
  status?: string;
  total_points?: number;
  current_tier?: string | null;
}

const ProfileContent = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Enable real-time badge notifications
  useRealtimeBadgeNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [showLisaManual, setShowLisaManual] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [currentTab, setCurrentTab] = useState<'my' | 'tagged'>('my');
  const [showStatsSection, setShowStatsSection] = useState<'posts' | 'friends' | 'tagged' | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showGodMode, setShowGodMode] = useState(false);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [showSymbolsGuide, setShowSymbolsGuide] = useState(false);
  const [showDocumentHub, setShowDocumentHub] = useState(false);
  const [showComprehensiveDocs, setShowComprehensiveDocs] = useState(false);
  const [showZoeIntelligence, setShowZoeIntelligence] = useState(false);

  const hasEvent = useEventGlow(profile?.event_date, profile?.event_recurring);
  const glowClass = getAvatarGlowClass(hasEvent, profile?.status);

  // ═══════════════════════════════════════════════════════════════════════════════
  // VELVET ROPE: Centralized Profile Completeness from Context
  // Uses useVelvetRopeOptional for graceful degradation outside provider
  // ═══════════════════════════════════════════════════════════════════════════════
  const velvetRope = useVelvetRopeOptional();
  const profileCompleteness = velvetRope ? {
    percentage: velvetRope.mvdScore.totalScore,
    missing: velvetRope.mvdScore.missingFields,
    isComplete: velvetRope.mvdScore.canAccessLifeCodex, // 80% threshold for Life Codex
  } : {
    percentage: 0,
    missing: ['Loading...'],
    isComplete: false,
  };

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[ProfileContent] fetchProfile error:', error);
      return;
    }

    if (data) {
      setProfile(data);
      setTotalPoints(data.total_points || 0);
      setCurrentTier(data.current_tier || null);
      return;
    }

    // No profile row yet — auto-create a minimal one so the page renders.
    const fallbackName =
      (user.user_metadata as any)?.display_name ||
      (user.user_metadata as any)?.full_name ||
      user.email?.split('@')[0] ||
      'New User';

    const fallbackUsername = (user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, display_name: fallbackName, username: fallbackUsername })
      .select('*')
      .maybeSingle();


    if (insertError) {
      console.error('[ProfileContent] auto-create profile failed:', insertError);
      return;
    }
    if (created) {
      setProfile(created);
      setTotalPoints(created.total_points || 0);
      setCurrentTier(created.current_tier || null);
    }
  };


  const handleStatusChange = async (newStatus: string) => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', user.id);

    setProfile(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const fetchUserPosts = async () => {
    if (!user) return;

    // Fetch user's own posts
    const { data: ownPosts } = await supabase
      .from('posts')
      .select(`
        *,
        profile:profiles!inner(display_name, username, profile_photo_url, event_date, event_recurring, status)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const ownPostsWithLikes = await Promise.all(
      (ownPosts || []).map(async (post: any) => {
        const { data: liked } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .maybeSingle();

        const profileData = Array.isArray(post.profile) ? post.profile[0] : post.profile;
        return { ...post, profile: profileData, user_liked: !!liked };
      })
    );

    setUserPosts(ownPostsWithLikes);

    // Fetch posts where user is tagged (separate from own posts)
    const { data: taggedPostIds } = await supabase
      .from('post_tags')
      .select('post_id')
      .eq('tagged_user_id', user.id);

    let taggedPostsData: any[] = [];
    if (taggedPostIds && taggedPostIds.length > 0) {
      const postIds = taggedPostIds.map(t => t.post_id);
      const { data } = await supabase
        .from('posts')
        .select(`
          *,
          profile:profiles!inner(display_name, username, profile_photo_url, event_date, event_recurring, status)
        `)
        .in('id', postIds)
        .order('created_at', { ascending: false });
      
      if (data) {
        taggedPostsData = await Promise.all(
          data.map(async (post: any) => {
            const { data: liked } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();

            const profileData = Array.isArray(post.profile) ? post.profile[0] : post.profile;
            return { ...post, profile: profileData, user_liked: !!liked };
          })
        );
      }
    }

    setTaggedPosts(taggedPostsData);
  };

  const fetchFriends = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friendships')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (!error && data) {
      const friendIds = data.map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      );

      if (friendIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url, event_date, event_recurring, status')
      .in('user_id', friendIds);

        setFriends(profiles || []);
      } else {
        setFriends([]);
      }
    }
  };

  const handlePostClick = (post: any, posts: any[], tab: 'my' | 'tagged') => {
    setSelectedPost(post);
    setCurrentPostIndex(posts.findIndex(p => p.id === post.id));
    setCurrentTab(tab);
  };

  const handleNextPost = () => {
    const posts = currentTab === 'my' ? userPosts : taggedPosts;
    if (currentPostIndex < posts.length - 1) {
      setCurrentPostIndex(currentPostIndex + 1);
      setSelectedPost(posts[currentPostIndex + 1]);
    }
  };

  const handlePreviousPost = () => {
    const posts = currentTab === 'my' ? userPosts : taggedPosts;
    if (currentPostIndex > 0) {
      setCurrentPostIndex(currentPostIndex - 1);
      setSelectedPost(posts[currentPostIndex - 1]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchUserPosts(), fetchFriends()]);
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Real-time subscription for points and tier updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile_points_${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          if (payload.new.total_points !== undefined) {
            setTotalPoints(payload.new.total_points);
          }
          if (payload.new.current_tier !== undefined) {
            const newTier = payload.new.current_tier;
            const oldTier = currentTier;
            setCurrentTier(newTier);
            
            // Show notification when tier changes
            if (newTier && oldTier !== newTier) {
              toast.success(`🎉 Congratulations! You've reached the ${newTier} Tier!`, {
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    // Listen for universal documents voice command
    const handleOpenDocuments = () => setShowDocumentHub(true);
    const handleOpenIntelligence = () => {
      setShowZoeIntelligence(true);
      // Scroll to the intelligence section
      setTimeout(() => {
        const element = document.querySelector('[data-zoe-intelligence]');
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    };

    window.addEventListener('open-universal-documents', handleOpenDocuments);
    window.addEventListener('open-zoe-intelligence', handleOpenIntelligence);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('open-universal-documents', handleOpenDocuments);
      window.removeEventListener('open-zoe-intelligence', handleOpenIntelligence);
    };
  }, [user, currentTier]);

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header with Background Wallpaper */}
      <div 
        className="relative h-screen bg-cover bg-center bg-muted"
        style={{
          backgroundImage: profile.profile_photo_url 
            ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${profile.profile_photo_url})` 
            : 'linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--accent)/0.3))',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex flex-col gap-2 justify-end items-end p-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <Settings className="w-5 h-5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Logout</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to logout? You'll need to sign in again to access your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Glassmorphic Stats Box - Compact Rectangular */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-[450px] bg-white/15 backdrop-blur-xl rounded-2xl border border-white/30 p-4 shadow-2xl">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-white">{profile.display_name}</h2>
            <p className="text-white/80 text-xs">@{profile.username}</p>

            {/* Stats Row */}
            <div className="flex justify-around pt-2 pb-1">
              <button
                onClick={() => setShowStatsSection('posts')}
                className="flex flex-col items-center hover:scale-105 transition-transform cursor-pointer"
              >
                <p className="text-xl font-bold text-white">{userPosts.length}</p>
                <p className="text-[10px] text-white/70">Posts</p>
              </button>
              <button
                onClick={() => setShowStatsSection('friends')}
                className="flex flex-col items-center hover:scale-105 transition-transform cursor-pointer"
              >
                <p className="text-xl font-bold text-white">{friends.length}</p>
                <p className="text-[10px] text-white/70">Friends</p>
              </button>
              <button
                onClick={() => setShowStatsSection('tagged')}
                className="flex flex-col items-center hover:scale-105 transition-transform cursor-pointer"
              >
                <p className="text-xl font-bold text-white">{taggedPosts.length}</p>
                <p className="text-[10px] text-white/70">Tagged</p>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="relative">
                <StatusSelector 
                  currentStatus={profile.status || 'none'} 
                  onStatusChange={handleStatusChange}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="bg-white/20 text-white hover:bg-white/30 rounded-full w-10 h-10"
                  >
                    <BookOpen className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
                  className="w-64 bg-background/95 backdrop-blur-xl border z-50"
                >
                  <div className="space-y-2 p-4">
                    <p className="text-xs text-muted-foreground text-center mb-2">Bio</p>
                    <p className="text-sm text-foreground text-center">
                      {profile.bio || 'No bio yet'}
                    </p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/20 text-white hover:bg-white/30 rounded-full w-10 h-10"
                onClick={() => setShowEditModal(true)}
              >
                <Edit className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-gradient-to-r from-purple-500/40 to-pink-500/40 text-white hover:from-purple-500/60 hover:to-pink-500/60 rounded-full w-10 h-10 border border-white/20"
                onClick={() => setShowSymbolsGuide(true)}
                title="Universal Symbols Guide"
              >
                <Sparkles className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-gradient-to-r from-primary/40 to-accent/40 text-white hover:from-primary/60 hover:to-accent/60 rounded-full w-10 h-10 border border-white/20"
                onClick={() => setShowGodMode(true)}
                title="God Mode (Platform Health)"
              >
                <Shield className="w-5 h-5" />
              </Button>
              
              {/* Omni-Sense Analytics Dashboard - Admin Only */}
              {profile?.username === 'moksh50' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-gradient-to-r from-cyan-500/40 to-blue-500/40 text-white hover:from-cyan-500/60 hover:to-blue-500/60 rounded-full w-10 h-10 border border-white/20"
                  onClick={() => navigate('/analytics-dashboard')}
                  title="Omni-Sense Analytics Dashboard (Admin)"
                >
                  <Brain className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profession Section */}
      {(profile.profession || profile.field_of_study) && (
        <div className="p-6 space-y-4">
          <div className="flex flex-col space-y-1 text-sm text-muted-foreground text-center">
            {profile.profession && (
              <p>💼 {profile.profession}</p>
            )}
            {profile.field_of_study && (
              <p>📚 {profile.field_of_study}</p>
            )}
          </div>
        </div>
      )}

      {/* Day Planner Diary Section */}
      <div className="p-4 space-y-4">
        <DayPlannerDiary />
        <RemindersManager />
        <CalendarView />
        <EmotionTracker />
        <React.Suspense fallback={<div className="py-4 text-center text-sm text-muted-foreground">Loading analytics…</div>}>
          <EmotionAnalytics />
        </React.Suspense>
        <BriefingPreferences />
        <VoiceMacroManager />
      </div>

      {/* Gamification & Analytics Section */}
      <div className="p-4 space-y-4">
        {/* Quick Access Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/security")}
            className="w-full backdrop-blur-sm bg-card/40 border-primary/30 hover:bg-primary/20 hover:border-primary"
          >
            <Lock className="h-4 w-4 mr-2" />
            Security Settings
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowZoeIntelligence(!showZoeIntelligence)}
            className="w-full backdrop-blur-sm bg-card/40 border-primary/30 hover:bg-primary/20 hover:border-primary"
          >
            <Brain className="h-4 w-4 mr-2" />
            Zoe Intelligence
          </Button>
          
          {/* ═══════════════════════════════════════════════════════════════════════════════
              VELVET ROPE: Life Codex / DHF Dashboard Button
              UNLOCKED at 80% profile completion (canAccessLifeCodex threshold)
              ═══════════════════════════════════════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
            {profileCompleteness.isComplete ? (
              <motion.div
                key="life-codex-unlocked"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full"
              >
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/dhf-dashboard")}
                  className="w-full relative overflow-hidden backdrop-blur-sm bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border-violet-500/30 hover:from-violet-500/30 hover:to-fuchsia-500/30 gpu-gold-glow"
                >
                  {/* Gold glow animation background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/20 to-amber-400/0 gpu-shimmer pointer-events-none" />
                  <Fingerprint className="h-4 w-4 mr-2" />
                  <span className="flex items-center gap-2">
                    Manage Life Codex
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  </span>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="life-codex-locked"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full"
              >
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-amber-500 font-medium">
                      80% profile needed to unlock Life Codex
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-primary font-medium">{profileCompleteness.percentage.toFixed(0)}% / 80%</span>
                    </div>
                    <Progress value={(profileCompleteness.percentage / 80) * 100} className="h-1.5" />
                  </div>
                  {profileCompleteness.missing.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Missing: {profileCompleteness.missing.slice(0, 3).join(', ')}
                      {profileCompleteness.missing.length > 3 && ` +${profileCompleteness.missing.length - 3} more`}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <Button 
            variant="outline" 
            onClick={() => navigate("/vitruvian")}
            className="w-full backdrop-blur-sm bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/30 hover:from-cyan-500/30 hover:to-blue-500/30"
          >
            <Dna className="h-4 w-4 mr-2" />
            Bio-Sync
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowDocumentHub(true)}
            className="w-full backdrop-blur-sm bg-card/40 border-accent/30 hover:bg-accent/20 hover:border-accent"
          >
            <FileText className="h-4 w-4 mr-2" />
            Quick Docs
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowComprehensiveDocs(true)}
            className="w-full col-span-2 backdrop-blur-sm bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/30 hover:from-cyan-500/30 hover:to-purple-500/30"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Full Documentation (PDF)
          </Button>
        </div>

        {/* Zoe Intelligence Dashboard */}
        {showZoeIntelligence && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 space-y-4"
            data-zoe-intelligence
          >
            <ZoeIntelligenceDashboard />
            <ZoeGoalCreator />
          </motion.div>
        )}

        <ChallengeSeasonDisplay />
        <AchievementMilestones />
        <BadgeComparisonModal />
        <BadgeCollectionsDisplay />
        <BadgeDisplay />
        <BadgeChallenges />
        <Leaderboard />
        <FeatureAnalyticsDashboard />
      </div>

      {/* App Architecture Blueprint Section - Only for specific users */}
      {(profile?.username === 'justmkbhd' || profile?.username === 'Moksh50') && (
        <div className="p-4">
          <AppArchitectureBlueprint />
        </div>
      )}

      {/* User Activity Dashboard - Only for Saraswati moksh */}
      {profile?.display_name === 'Saraswati moksh' && (
        <div className="p-4">
          <React.Suspense fallback={<div className="py-4 text-center text-sm text-muted-foreground">Loading activity…</div>}>
            <UserActivityDashboard />
          </React.Suspense>
        </div>
      )}

      {/* Stats Section Content with macOS Animation */}
      {showStatsSection && (
        <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={() => setShowStatsSection(null)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-in-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">
                {showStatsSection === 'posts' && 'My Posts'}
                {showStatsSection === 'friends' && 'Friends'}
                {showStatsSection === 'tagged' && 'Tagged Posts'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowStatsSection(null)}>
                ✕
              </Button>
            </div>

            <div className="p-4">
              {showStatsSection === 'posts' && (
                userPosts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No posts yet</p>
                ) : (
                  <PostsGrid 
                    posts={userPosts} 
                    onPostClick={(post) => handlePostClick(post, userPosts, 'my')} 
                  />
                )
              )}

              {showStatsSection === 'friends' && (
                <>
                  <div className="mb-4">
                    <Button 
                      onClick={() => setShowSearchModal(true)}
                      className="w-full"
                      variant="outline"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Find Friends
                    </Button>
                  </div>
                  {friends.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No friends yet</p>
                  ) : (
                    <div className="space-y-3">
                      {friends.map(friend => (
                        <FriendCard key={friend.user_id} friend={friend} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {showStatsSection === 'tagged' && (
                taggedPosts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No tagged posts yet</p>
                ) : (
                  <PostsGrid 
                    posts={taggedPosts} 
                    onPostClick={(post) => handlePostClick(post, taggedPosts, 'tagged')} 
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <PostModal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          post={selectedPost}
          onUpdate={fetchUserPosts}
          onNext={handleNextPost}
          onPrevious={handlePreviousPost}
          hasNext={currentPostIndex < (currentTab === 'my' ? userPosts : taggedPosts).length - 1}
          hasPrevious={currentPostIndex > 0}
        />
      )}


      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          fetchProfile();
          // Refresh Velvet Rope MVD score after profile edit
          velvetRope?.refreshMVD?.();
        }}
        profile={profile}
      />

      <UserSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />

      <EventSetupModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          fetchProfile();
        }}
        currentEventDate={profile.event_date}
        currentEventType={profile.event_type}
        currentEventCustomDetails={profile.event_custom_details}
        currentEventRecurring={profile.event_recurring}
      />

      {showProfileViewer && profile.profile_photo_url && (
        <ImageViewer
          imageUrl={profile.profile_photo_url}
          onClose={() => setShowProfileViewer(false)}
        />
      )}

      {/* God Mode Panel */}
      <GodModePanel isOpen={showGodMode} onClose={() => setShowGodMode(false)} />
      
      {/* Universal Symbols Guide */}
      <UniversalSymbolsGuide open={showSymbolsGuide} onClose={() => setShowSymbolsGuide(false)} />
      
      {/* Universal Document Hub */}
      <UniversalDocumentHub isOpen={showDocumentHub} onClose={() => setShowDocumentHub(false)} />
      
      {/* Comprehensive Documentation Center with PDF Export */}
      <ComprehensiveDocumentationCenter isOpen={showComprehensiveDocs} onClose={() => setShowComprehensiveDocs(false)} />
    </>
  );
};

export default ProfileContent;
