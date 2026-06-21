import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, MessageCircle, Sparkles, Award } from 'lucide-react';
import StatusIconBadge from '@/components/StatusIconBadge';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';

interface UserRecommendationCardProps {
  user: {
    user_id: string;
    display_name: string;
    username: string;
    profile_photo_url?: string;
    commonInterests: string[];
    is_friend?: boolean;
    status?: string;
    event_date?: string;
    event_recurring?: boolean;
  };
  onProfileClick: (userId: string) => void;
  onAddFriend: (userId: string, e: React.MouseEvent) => void;
  onSendMessage: (userId: string, e: React.MouseEvent) => void;
}

const UserRecommendationCard: React.FC<UserRecommendationCardProps> = ({
  user,
  onProfileClick,
  onAddFriend,
  onSendMessage
}) => {
  const hasEvent = useEventGlow(user.event_date, user.event_recurring);
  const glowClass = getAvatarGlowClass(hasEvent, user.status);

  return (
    <div
      className="bg-black border border-white/10 rounded-2xl p-4 hover:border-white/30 transition-all cursor-pointer"
      onClick={() => onProfileClick(user.user_id)}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative">
            <Avatar className={`w-12 h-12 border-2 border-border/20 ${glowClass}`}>
              <AvatarImage src={user.profile_photo_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <StatusIconBadge status={user.status} size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{user.display_name}</p>
            <p className="text-sm text-white/60 truncate">@{user.username}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {user.is_friend ? (
            <Button
              size="sm"
              onClick={(e) => onSendMessage(user.user_id, e)}
              className="bg-white hover:bg-white/90 text-black rounded-xl h-9 px-3"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={(e) => onAddFriend(user.user_id, e)}
              className="bg-white hover:bg-white/90 text-black rounded-xl h-9 px-3"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Common Interests Section */}
      {user.commonInterests.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-xs text-white/80 font-medium">
              {user.commonInterests.length} Common Interest{user.commonInterests.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {user.commonInterests.map((interest) => (
              <Badge
                key={interest}
                className="bg-gradient-to-r from-blue-600/30 to-cyan-500/30 text-cyan-200 border-2 border-cyan-400/50 text-xs px-2.5 py-1 font-semibold hover:from-blue-600/40 hover:to-cyan-500/40 transition-all shadow-lg"
              >
                <Award className="w-3 h-3 mr-1 inline text-cyan-300" />
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRecommendationCard;
