import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Lock, MessageCircle, Sparkles, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { getAvatarGlowClass } from '@/hooks/useEventGlow';
import ImageViewer from '@/components/ImageViewer';
import StatusIconBadge from '@/components/StatusIconBadge';

// Safe profile data - only non-sensitive fields exposed to other users
interface SafeProfileData {
  user_id: string;
  display_name: string;
  username: string;
  profile_photo_url?: string;
  bio?: string;
  hobbies?: string[];
  profile_visibility?: string;
  status?: string;
  total_points?: number;
  current_tier?: string;
}

const UserProfileView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<SafeProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [commonInterests, setCommonInterests] = useState<string[]>([]);

  // Use status for glow class - removed sensitive event date data
  const glowClass = getAvatarGlowClass(false, profile?.status);

  useEffect(() => {
    fetchProfile();
    checkFriendship();
    fetchCommonInterests();
  }, [userId]);

  // Phase 5: Listen for profile and friendship updates to refresh data
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      if (event.detail?.userId === userId || event.detail?.userId === user?.id) {
        console.log('[UserProfileView] Profile update detected, refreshing...');
        fetchProfile();
        fetchCommonInterests();
      }
    };

    const handleFriendshipUpdate = () => {
      console.log('[UserProfileView] Friendship update detected, refreshing...');
      checkFriendship();
    };

    window.addEventListener('profile-updated', handleProfileUpdate as EventListener);
    window.addEventListener('friendship-updated', handleFriendshipUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate as EventListener);
      window.removeEventListener('friendship-updated', handleFriendshipUpdate);
    };
  }, [userId, user?.id]);

  const fetchProfile = async () => {
    if (!userId) return;

    const isOwnProfile = user?.id === userId;

    if (isOwnProfile) {
      // Own profile - can access all fields from profiles table
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, profile_photo_url, bio, status, profile_visibility, hobbies, total_points, current_tier')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as SafeProfileData);
      }
    } else {
      // Other user's profile - use safe_public_profiles view (excludes PII)
      const { data } = await supabase
        .from('safe_public_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as SafeProfileData);
      }
    }
    setLoading(false);
  };

  const checkFriendship = async () => {
    if (!userId || !user) return;

    const { data } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
      .maybeSingle();

    setIsFriend(!!data);
  };

  const fetchCommonInterests = async () => {
    if (!userId || !user || userId === user.id) return;

    // Fetch current user's hobbies (own data - full access)
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('hobbies')
      .eq('user_id', user.id)
      .maybeSingle();

    // Fetch viewed user's hobbies using safe view
    const { data: viewedUserProfile } = await supabase
      .from('safe_public_profiles')
      .select('hobbies')
      .eq('user_id', userId)
      .maybeSingle();

    if (currentUserProfile?.hobbies && viewedUserProfile?.hobbies) {
      const common = (currentUserProfile.hobbies as string[]).filter((hobby: string) =>
        (viewedUserProfile.hobbies as string[]).includes(hobby)
      );
      setCommonInterests(common);
    }
  };

  const handleMessage = () => {
    navigate(`/chat?user=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <p className="text-center text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  const isPrivate = profile.profile_visibility === 'private' && !isFriend;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="p-6 bg-card border-border">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative">
              <Avatar 
                className={`w-24 h-24 mb-4 cursor-pointer hover:opacity-90 transition-opacity ${glowClass}`}
                onClick={() => profile.profile_photo_url && setShowProfileViewer(true)}
              >
                <AvatarImage src={profile.profile_photo_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {profile.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <StatusIconBadge status={profile.status} size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{profile.display_name}</h2>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>

          {isPrivate ? (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">This profile is private</p>
              <p className="text-sm text-muted-foreground mt-2">
                You need to be friends to view this profile
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Bio</h3>
                  <p className="text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {/* Note: Sensitive fields (profession, field_of_study, gender) removed for privacy */}

              {profile.hobbies && profile.hobbies.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Interests</h3>
                  <div className="flex flex-wrap gap-2 max-w-md">
                    {profile.hobbies.map((hobby) => {
                      const isCommon = commonInterests.includes(hobby);
                      return (
                        <Badge
                          key={hobby}
                          variant="secondary"
                          className={
                            isCommon
                              ? "bg-gradient-to-r from-blue-600/30 to-cyan-500/30 text-cyan-200 border-2 border-cyan-400/50 text-xs font-semibold animate-pulse shadow-lg"
                              : "bg-primary/10 text-primary border-0 text-xs"
                          }
                        >
                          {isCommon && <Award className="w-3 h-3 mr-1 inline text-cyan-300" />}
                          {hobby}
                        </Badge>
                      );
                    })}
                  </div>
                  {commonInterests.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      {commonInterests.length} common interest{commonInterests.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {isFriend && (
            <Button onClick={handleMessage} className="w-full mt-6">
              <MessageCircle className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          )}
        </Card>

        {showProfileViewer && profile.profile_photo_url && (
          <ImageViewer
            imageUrl={profile.profile_photo_url}
            onClose={() => setShowProfileViewer(false)}
          />
        )}
      </div>
    </div>
  );
};

export default UserProfileView;
