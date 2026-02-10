import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';
import ImageViewer from '@/components/ImageViewer';
import StatusIconBadge from '@/components/StatusIconBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Sparkles, Award } from 'lucide-react';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';

interface FriendCardProps {
  friend: {
    user_id: string;
    display_name: string;
    username: string;
    profile_photo_url?: string;
    event_date?: string;
    event_recurring?: boolean;
    status?: string;
  };
}

const FriendCard = ({ friend }: FriendCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isUserOnline } = useOnlinePresence();
  const hasEvent = useEventGlow(friend.event_date, friend.event_recurring);
  const glowClass = getAvatarGlowClass(hasEvent, friend.status);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [commonInterestsCount, setCommonInterestsCount] = useState(0);
  const isOnline = isUserOnline(friend.user_id);

  useEffect(() => {
    fetchCommonInterests();
  }, [friend.user_id, user]);

  const fetchCommonInterests = async () => {
    if (!user) return;

    // Fetch current user's hobbies
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('hobbies')
      .eq('user_id', user.id)
      .single();

    // Fetch friend's hobbies
    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('hobbies')
      .eq('user_id', friend.user_id)
      .single();

    if (currentUserProfile?.hobbies && friendProfile?.hobbies) {
      const common = currentUserProfile.hobbies.filter((hobby: string) =>
        friendProfile.hobbies.includes(hobby)
      );
      setCommonInterestsCount(common.length);
    }
  };

  return (
    <>
      <Card 
        className="p-4 flex items-center justify-between hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={() => navigate(`/profile/${friend.user_id}`)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar 
              className={`w-12 h-12 cursor-pointer hover:opacity-90 transition-opacity ${glowClass}`}
              onClick={(e) => {
                e.stopPropagation();
                if (friend.profile_photo_url) {
                  setShowProfileViewer(true);
                }
              }}
            >
              <AvatarImage src={friend.profile_photo_url} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {friend.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div 
                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background"
                title="Online now"
              />
            )}
            <StatusIconBadge status={friend.status} size="sm" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{friend.display_name}</h3>
            <p className="text-sm text-muted-foreground">@{friend.username}</p>
            {commonInterestsCount > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Award className="w-3.5 h-3.5 text-cyan-400" />
                <p className="text-xs text-muted-foreground font-medium">
                  {commonInterestsCount} common interest{commonInterestsCount !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {showProfileViewer && friend.profile_photo_url && (
        <ImageViewer
          imageUrl={friend.profile_photo_url}
          onClose={() => setShowProfileViewer(false)}
        />
      )}
    </>
  );
};

export default FriendCard;
