// ═══════════════════════════════════════════════════════════════════════════════
// CALL CONTROL PANEL - Quantum Call UI for Zoe Infinity
// Audio/Video call buttons with user selection and online status
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, PhoneOff, VideoOff, Users, User, Search, X, Circle, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useActivityStatuses } from '@/features/calls/useActivityStatuses';
import ActivityStatusPicker from '@/components/quantum/ActivityStatusPicker';

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

  // Activity statuses for me and everyone shown in this panel, live from profiles.
  const peerIds = useMemo(
    () => [
      ...(selectedUser ? [selectedUser.user_id] : []),
      ...searchResults.map(entry => entry.user_id),
      ...recentContacts.map(entry => entry.user_id),
    ],
    [selectedUser, searchResults, recentContacts],
  );
  const { ownStatus, ownMessage, setOwnStatus, setOwnMessage, statusFor, messageFor } = useActivityStatuses(currentUserId, peerIds);

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

  const navigate = useNavigate();

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
          <Button
            variant="ghost"
            size="icon"
            aria-label="End call"
            className="h-11 w-11 rounded-full bg-white/[0.08] text-white backdrop-blur-2xl hover:bg-white/15 hover:text-white"
            onClick={onEndCall}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label={isOpen ? 'Close calls' : 'Open calls'}
            aria-expanded={isOpen}
            className="h-11 w-11 rounded-full bg-white/[0.08] text-white backdrop-blur-2xl hover:bg-white/15 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          </Button>
        )}
      </motion.div>

      {/* Call Panel */}
      <AnimatePresence>
        {isOpen && !isInCall && (
          <motion.div
            className="fixed bottom-36 right-3 w-[min(20rem,calc(100vw-1.5rem))] max-h-[min(60vh,32rem)] z-40 rounded-lg bg-white/[0.08] text-white backdrop-blur-2xl shadow-2xl shadow-black/20 overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-white" />
                  Calls
                </h3>
                <ActivityStatusPicker
                  status={ownStatus}
                  customMessage={ownMessage}
                  onChange={(value) => void setOwnStatus(value)}
                  onCustomMessageChange={setOwnMessage}
                  showLabel
                />
              </div>
              <p className="text-xs text-white/60 mt-1">
                Select a user to start a call
              </p>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-foreground/5">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/[0.06] border-white/10 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            {/* Selected User */}
            {selectedUser && (
              <div className="p-3 border-b border-white/10 bg-white/[0.04]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedUser.profile_photo_url || ''} />
                        <AvatarFallback className="bg-white/10 text-white">
                          {selectedUser.display_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {isUserOnline(selectedUser.user_id) && (
                         <Circle className="absolute bottom-0 right-0 w-3 h-3 fill-white text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedUser.display_name}</p>
                       <p className="flex items-center gap-1.5 text-xs text-white/60">
                        {(() => {
                          const SelectedIcon = statusFor(selectedUser.user_id).Icon;
                          return <SelectedIcon className="h-3 w-3 shrink-0" aria-hidden />;
                        })()}
                         <span>{messageFor(selectedUser.user_id) || statusFor(selectedUser.user_id).label}</span>
                        <span className="text-white/40">·</span>
                        <span>{isUserOnline(selectedUser.user_id) ? 'Online' : 'Offline'}</span>
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
                    variant="ghost"
                    className="flex-1 bg-white/[0.08] text-white hover:bg-white/15 hover:text-white"
                    onClick={handleStartAudioCall}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Audio Call
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 bg-white/[0.08] text-white hover:bg-white/15 hover:text-white"
                    onClick={handleStartVideoCall}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Video Call
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 bg-white/[0.08] text-white hover:bg-white/15 hover:text-white"
                    onClick={() => navigate(`/chat/${selectedUser.user_id}`)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            )}

            {/* User List */}
            <ScrollArea className="max-h-64">
              <div className="p-2">
                {isSearching ? (
                   <div className="flex items-center justify-center py-8 text-white/60">
                     <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : displayList.length > 0 ? (
                  <div className="space-y-1">
                    {displayList.map((user) => (
                      <button
                        key={user.user_id}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-lg transition-all",
                          selectedUser?.user_id === user.user_id
                            ? "bg-white/15"
                            : "hover:bg-white/[0.08]"
                        )}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="relative">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={user.profile_photo_url || ''} />
                             <AvatarFallback className="bg-white/10 text-white text-sm">
                              {user.display_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {isUserOnline(user.user_id) && (
                             <Circle className="absolute bottom-0 right-0 w-2.5 h-2.5 fill-white text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium truncate">
                            {user.display_name || user.username || 'Unknown'}
                          </p>
                          {user.username && (
                             <p className="text-xs text-white/60 truncate">
                              @{user.username}
                            </p>
                          )}
                        </div>
                        <span
                          className="flex shrink-0 items-center gap-1 text-[10px] text-white/70"
                           aria-label={`Activity: ${messageFor(user.user_id) || statusFor(user.user_id).label}`}
                        >
                          {(() => {
                            const RowIcon = statusFor(user.user_id).Icon;
                            return <RowIcon className="h-3 w-3" aria-hidden />;
                          })()}
                           {messageFor(user.user_id) || statusFor(user.user_id).label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                   <div className="text-center py-8 text-white/60 text-sm">
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
