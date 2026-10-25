import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChatUser } from '@/hooks/useRealTimeChat';
import { formatDistanceToNow } from 'date-fns';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';
import StatusIconBadge from '@/components/StatusIconBadge';

interface ChatUserCardProps {
  user: ChatUser;
  onClick: (userId: string) => void;
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'online': return 'border-status-online';
    case 'away': return 'border-status-away';
    case 'transit': return 'border-status-transit';
    case 'offline': return 'border-status-offline';
    default: return 'border-muted';
  }
};

const getStatusDot = (status?: string) => {
  switch (status) {
    case 'online': return 'bg-status-online';
    case 'away': return 'bg-status-away';
    case 'transit': return 'bg-status-transit';
    case 'offline': return 'bg-status-offline';
    default: return 'bg-muted';
  }
};

const ChatUserCard: React.FC<ChatUserCardProps> = ({ user, onClick }) => {
  const hasEvent = useEventGlow(user.event_date, user.event_recurring);
  const glowClass = getAvatarGlowClass(hasEvent, user.status);

  return (
    <Card
      className="relative p-3 md:p-4 chat-warm-surface border-0 shadow-none rounded-none"
    >
      <Button variant="ghost" className="absolute inset-0 h-full w-full rounded-none hover:bg-foreground/5" aria-label={`Open conversation with ${user.display_name}`} onClick={() => onClick(user.user_id)} />
      <div className="pointer-events-none relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Button asChild variant="ghost" className="pointer-events-auto relative z-10 h-auto min-h-11 min-w-11 p-0 rounded-full">
              <Link to={`/profile/${user.user_id}`} aria-label={`View ${user.display_name}’s profile`}>
            <Avatar 
              className={`w-10 h-10 md:w-12 md:h-12 ${glowClass} ring-2 ring-[hsl(var(--oni-cyan))]/30`}
            >
              <AvatarImage
                src={user.profile_photo_url || ''}
                alt={user.display_name}
              />
              <AvatarFallback className="bg-transparent text-white text-[10px] font-medium">
                M'Mora
              </AvatarFallback>
            </Avatar>
              </Link>
            </Button>
            <StatusIconBadge status={user.status} size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="font-medium text-foreground truncate text-sm md:text-base" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {user.display_name}
              </p>
              {user.unread_count && user.unread_count > 0 && (
                <Badge className="text-xs bg-[hsl(var(--oni-pink))] text-white shadow-[0_0_8px_hsl(var(--oni-pink)/0.5)]">
                  {user.unread_count}
                </Badge>
              )}
            </div>
            <p className="text-xs md:text-sm text-[hsl(var(--oni-cyan))]/70 truncate" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              @{user.username}
            </p>
            {user.last_message && (
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1 line-clamp-2 break-words" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {(user.last_message.content || '› Media').substring(0, 50)}
                {(user.last_message.content?.length || 0) > 50 ? '...' : ''} • {' '}
                {formatDistanceToNow(new Date(user.last_message.created_at), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ChatUserCard;
