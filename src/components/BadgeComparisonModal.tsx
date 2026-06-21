import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search, Trophy, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useGamification } from '@/hooks/useGamification';
import { BADGES } from '@/data/badges';

interface Friend {
  user_id: string;
  username: string;
  display_name: string;
  profile_photo_url: string | null;
}

export const BadgeComparisonModal = () => {
  const { user } = useAuth();
  const { userBadges } = useGamification();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendBadges, setFriendBadges] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open]);

  const loadFriends = async () => {
    if (!user) return;

    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const friendIds = friendships?.map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      ) || [];

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, profile_photo_url')
          .in('user_id', friendIds);

        setFriends(profiles || []);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendBadges = async (friendId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', friendId)
        .order('earned_at', { ascending: false });

      setFriendBadges(data || []);
    } catch (error) {
      console.error('Error loading friend badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    loadFriendBadges(friend.user_id);
  };

  const filteredFriends = friends.filter(f =>
    f.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userBadgeIds = new Set(userBadges.map(b => b.badge_id));
  const friendBadgeIds = new Set(friendBadges.map(b => b.badge_id));

  const getBadgeComparison = () => {
    return BADGES.map(badge => ({
      badge,
      userHas: userBadgeIds.has(badge.id),
      friendHas: friendBadgeIds.has(badge.id),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Users className="w-4 h-4 mr-2" />
          Compare Badges with Friends
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Compare Badge Progress
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFriend ? (
            <>
              {/* Friend Selection */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-2">
                {filteredFriends.map((friend) => (
                  <Button
                    key={friend.user_id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => selectFriend(friend)}
                  >
                    <Avatar className="w-8 h-8 mr-3">
                      <AvatarImage src={friend.profile_photo_url || undefined} />
                      <AvatarFallback>{friend.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium">{friend.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{friend.username}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Comparison View */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedFriend.profile_photo_url || undefined} />
                    <AvatarFallback>{selectedFriend.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedFriend.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{selectedFriend.username}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFriend(null)}>
                  Back to Friends
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm font-medium py-2 border-b">
                <div>Badge</div>
                <div>You</div>
                <div>{selectedFriend.display_name.split(' ')[0]}</div>
              </div>

              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading badges...</p>
              ) : (
                <div className="space-y-2">
                  {getBadgeComparison().map(({ badge, userHas, friendHas }) => (
                    <div key={badge.id} className="grid grid-cols-3 gap-2 items-center p-2 rounded-lg hover:bg-secondary/50">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{badge.icon}</span>
                        <div className="text-left">
                          <p className="text-sm font-medium">{badge.name}</p>
                          <p className="text-xs text-muted-foreground">{badge.category}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        {userHas ? (
                          <Badge variant="default" className="bg-green-500">✓</Badge>
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </div>
                      <div className="text-center">
                        {friendHas ? (
                          <Badge variant="default" className="bg-green-500">✓</Badge>
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{userBadges.length}</p>
                  <p className="text-sm text-muted-foreground">Your Badges</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{friendBadges.length}</p>
                  <p className="text-sm text-muted-foreground">Friend's Badges</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
