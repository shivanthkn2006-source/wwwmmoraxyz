import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';
import { FriendRequest } from '@/hooks/useFriendRequests';
import StatusIconBadge from '@/components/StatusIconBadge';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  onAccept,
  onReject,
}) => {
  const hasEvent = useEventGlow(request.sender_profile?.event_date, request.sender_profile?.event_recurring);
  const glowClass = getAvatarGlowClass(hasEvent, request.sender_profile?.status);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className={`w-12 h-12 ${glowClass}`}>
              <AvatarImage
                src={request.sender_profile?.profile_photo_url || ''}
                alt={request.sender_profile?.display_name || 'User'}
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {request.sender_profile?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <StatusIconBadge status={request.sender_profile?.status} size="sm" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {request.sender_profile?.display_name || 'Unknown User'}
            </p>
            <p className="text-sm text-muted-foreground">
              @{request.sender_profile?.username || 'unknown'}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onAccept(request.id)}
            className="bg-primary hover:bg-primary/90"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(request.id)}
            className="border-border hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default FriendRequestCard;
