// ═══════════════════════════════════════════════════════════════════════════════
// CALL CONTROL PANEL - Quantum Call UI for Zoe Infinity
// Audio/Video call buttons with user selection and online status
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, PhoneOff, VideoOff, Users, User, Search, X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  profile_photo_url: string | null;
}

export interface CallControlPanelProps {
  currentUserId: string;
  onStartCall: (userId: string, displayName?: string, avatarUrl?: string, withVideo?: boolean) => void;
  onEndCall: () => void;
  isInCall: boolean;
  callState: string;
  videoEnabled: boolean;
}

export const CallControlPanel: React.FC<CallControlPanelProps> = ({
  currentUserId,
  onStartCall,
  onEndCall,
  isInCall,
  callState,
  videoEnabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [recentContacts, setRecentContacts] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  const { isUserOnline, getOnlineUsersList } = useOnlinePresence();

  // Load recent contacts
  const loadRecentContacts = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      // Get users we've had messages with recently
      const { data: messageData } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!messageData) return;
      
      // Get unique user IDs
      const userIds = new Set<string>();
      (messageData as any[]).forEach((msg: { sender_id: string; receiver_id: string }) => {
        if (msg.sender_id !== currentUserId) userIds.add(msg.sender_id);
        if (msg.receiver_id !== currentUserId) userIds.add(msg.receiver_id);
      });
      
      if (userIds.size === 0) return;
      
      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, profile_photo_url')
        .in('user_id', Array.from(userIds))
        .limit(10);
      
      if (profiles) {
        setRecentContacts(profiles);
      }
    } catch (error) {
      console.error('[CallControlPanel] Failed to load recent contacts:', error);
    }
  }, [currentUserId]);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, profile_photo_url')
        .neq('user_id', currentUserId)
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);
      
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('[CallControlPanel] Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentUserId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Load recent contacts when panel opens
  useEffect(() => {
    if (isOpen) {
      loadRecentContacts();
    }
  }, [isOpen, loadRecentContacts]);

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleStartAudioCall = () => {
    if (selectedUser) {
      onStartCall(
        selectedUser.user_id,
        selectedUser.display_name || undefined,
        selectedUser.profile_photo_url || undefined,
        false
      );
      setIsOpen(false);
    }
  };

  const handleStartVideoCall = () => {
    if (selectedUser) {
      onStartCall(
        selectedUser.user_id,
        selectedUser.display_name || undefined,
        selectedUser.profile_photo_url || undefined,
        true
      );
      setIsOpen(false);
    }
  };

  const displayList = searchQuery ? searchResults : recentContacts;

  return (
    <>
      {/* Floating Call Button - phone icon only, no outer circle */}
      <motion.div
        className="fixed bottom-20 right-4 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {isInCall ? (
          <button
            className="p-1.5 flex items-center justify-center"
            onClick={onEndCall}
          >
            <PhoneOff className="w-5 h-5 text-red-400 drop-shadow-lg" />
          </button>
        ) : (
          <button
            className="p-1.5 flex items-center justify-center"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5 text-white/60" /> : <Phone className="w-5 h-5 text-white/50 drop-shadow-lg" />}
          </button>
        )}
      </motion.div>

      {/* Call Panel */}
      <AnimatePresence>
        {isOpen && !isInCall && (
          <motion.div
            className="fixed bottom-40 right-4 w-80 max-h-[60vh] z-40 rounded-2xl bg-background/95 backdrop-blur-xl border border-foreground/10 shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-foreground/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Quantum Call
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select a user to start a call
              </p>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-foreground/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50 border-foreground/10"
                />
              </div>
            </div>

            {/* Selected User */}
            {selectedUser && (
              <div className="p-3 border-b border-foreground/5 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedUser.profile_photo_url || ''} />
                        <AvatarFallback className="bg-cyan-500/20 text-cyan-400">
                          {selectedUser.display_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {isUserOnline(selectedUser.user_id) && (
                        <Circle className="absolute bottom-0 right-0 w-3 h-3 fill-emerald-500 text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedUser.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isUserOnline(selectedUser.user_id) ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedUser(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Call Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    onClick={handleStartAudioCall}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Audio Call
                  </Button>
                  <Button
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                    onClick={handleStartVideoCall}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Video Call
                  </Button>
                </div>
              </div>
            )}

            {/* User List */}
            <ScrollArea className="max-h-64">
              <div className="p-2">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : displayList.length > 0 ? (
                  <div className="space-y-1">
                    {displayList.map((user) => (
                      <button
                        key={user.user_id}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-lg transition-all",
                          selectedUser?.user_id === user.user_id
                            ? "bg-primary/20"
                            : "hover:bg-foreground/5"
                        )}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="relative">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={user.profile_photo_url || ''} />
                            <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-sm">
                              {user.display_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {isUserOnline(user.user_id) && (
                            <Circle className="absolute bottom-0 right-0 w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium truncate">
                            {user.display_name || user.username || 'Unknown'}
                          </p>
                          {user.username && (
                            <p className="text-xs text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          )}
                        </div>
                        {isUserOnline(user.user_id) && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            Online
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {searchQuery ? 'No users found' : 'No recent contacts'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CallControlPanel;
