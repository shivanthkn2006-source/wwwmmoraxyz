import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import StatusIconBadge from '@/components/StatusIconBadge';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';

interface Profile {
  user_id: string;
  display_name: string;
  username: string;
  profile_photo_url?: string;
  bio?: string;
  profession?: string;
  field_of_study?: string;
  hobbies?: string[];
  profile_visibility?: string;
  is_friend?: boolean;
  status?: string;
  event_date?: string;
  event_recurring?: boolean;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSearchModal: React.FC<UserSearchModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { sendFriendRequest } = useFriendRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);

    // First, fetch current user's friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

    const friendIds = new Set(
      friendships?.map(f => f.user1_id === user?.id ? f.user2_id : f.user1_id) || []
    );

    // Then fetch profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url, bio, profession, field_of_study, hobbies, status, event_date, event_recurring')
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .neq('user_id', user?.id || '')
      .limit(10);

    if (!error && profiles) {
      const profilesWithFriendStatus = profiles.map(profile => ({
        ...profile,
        is_friend: friendIds.has(profile.user_id)
      }));
      setSearchResults(profilesWithFriendStatus);
    }
    setLoading(false);
  };

  const handleAddFriend = async (userId: string) => {
    await sendFriendRequest(userId);
    // Refresh search to update friend status
    await handleSearch();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Find Friends</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by username or name..."
              className="bg-background border-border text-foreground"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((profile) => {
              const isPrivate = false; // Simplified for now - will implement full privacy after fixing DB
              const hasEvent = useEventGlow(profile.event_date, profile.event_recurring);
              const glowClass = getAvatarGlowClass(hasEvent, profile.status);
              
              return (
                <div
                  key={profile.user_id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="relative">
                      <Avatar className={`w-12 h-12 ${glowClass}`}>
                        <AvatarImage src={profile.profile_photo_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {profile.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <StatusIconBadge status={profile.status} size="sm" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{profile.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                      {!isPrivate && (
                        <>
                          {profile.bio && (
                            <p className="text-xs text-muted-foreground mt-1">{profile.bio}</p>
                          )}
                          {profile.profession && (
                            <p className="text-xs text-muted-foreground">💼 {profile.profession}</p>
                          )}
                          {profile.field_of_study && (
                            <p className="text-xs text-muted-foreground">📚 {profile.field_of_study}</p>
                          )}
                          {profile.hobbies && profile.hobbies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {profile.hobbies.slice(0, 3).map(hobby => (
                                <Badge key={hobby} variant="outline" className="text-xs border-border">
                                  {hobby}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {isPrivate && (
                        <p className="text-xs text-muted-foreground italic mt-1">Private profile</p>
                      )}
                    </div>
                  </div>
                  {profile.is_friend ? (
                    <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                      Friends
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAddFriend(profile.user_id)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSearchModal;
