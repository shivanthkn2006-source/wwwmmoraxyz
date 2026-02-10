import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Image as ImageIcon, ArrowDown, Play, Pause, Trash2, Ban, Reply, Forward, Copy, Pin, Smile, Check, CheckCheck, Edit2, CheckSquare, XCircle, UserCog } from 'lucide-react';
import { useRealTimeChat, Message } from '@/hooks/useRealTimeChat';
import ChatUserCard from '@/components/ChatUserCard';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { compressImage } from '@/utils/mediaCompression';
import ImageViewer from '@/components/ImageViewer';
import { toast } from 'sonner';
import { FeatureAnnouncementWrapper } from '@/components/FeatureAnnouncementWrapper';
import TypingIndicator from '@/components/TypingIndicator';
import StatusIconBadge from '@/components/StatusIconBadge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const ChatPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams();
  // Support both /chat?user=id and /chat/:userId formats
  const selectedUserId = searchParams.get('user') || params.userId;
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<any>(null);

  const {
    chatUsers,
    messages,
    loading,
    fetchMessages,
    sendMessage,
    markAsRead,
    deleteForMe,
    deleteForEveryone,
    addReaction,
    togglePinMessage,
    editMessage,
    bulkDeleteForMe,
    bulkDeleteForEveryone,
  } = useRealTimeChat();

  const selectedUser = chatUsers.find(u => u.user_id === selectedUserId);
  const currentMessages = selectedUserId ? messages[selectedUserId] || [] : [];

  // Hide bottom navigation when in chat view
  useEffect(() => {
    const bottomNav = document.querySelector('.bottom-navigation');
    if (selectedUserId && bottomNav) {
      bottomNav.classList.add('hidden');
    }
    return () => {
      if (bottomNav) {
        bottomNav.classList.remove('hidden');
      }
    };
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId && user?.id) {
      fetchMessages(selectedUserId);
      markAsRead(selectedUserId);
      
      // Clean up previous typing channel
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
      
      // Set up typing presence channel with proper unique ID
      const channelId = [user.id, selectedUserId].sort().join('-');
      typingChannelRef.current = supabase.channel(`typing:${channelId}`, {
        config: { presence: { key: user.id } }
      });
      
      typingChannelRef.current
        .on('presence', { event: 'sync' }, () => {
          const state = typingChannelRef.current.presenceState();
          // Check if the other user is typing
          const otherUserState = state[selectedUserId];
          setOtherUserTyping(!!otherUserState?.[0]?.typing);
        })
        .subscribe();
      
      return () => {
        if (typingChannelRef.current) {
          typingChannelRef.current.untrack();
          supabase.removeChannel(typingChannelRef.current);
          typingChannelRef.current = null;
        }
        setIsTyping(false);
        setOtherUserTyping(false);
      };
    }
  }, [selectedUserId, user?.id, fetchMessages, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);


  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    // Send typing indicator using existing channel
    if (typingChannelRef.current && selectedUserId && user?.id) {
      if (!isTyping) {
        setIsTyping(true);
        typingChannelRef.current.track({ typing: true });
      }
      
      // Clear typing after 2 seconds of no input
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (typingChannelRef.current) {
          typingChannelRef.current.untrack();
        }
      }, 2000);
    }
  }, [isTyping, selectedUserId, user?.id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleSend = async () => {
    if (!selectedUserId || (!messageText.trim() && !selectedImage)) return;

    let mediaUrl = null;
    let mediaType = null;

    if (selectedImage) {
      const compressionResult = await compressImage(selectedImage, 500);
      const fileToUpload = compressionResult.success && compressionResult.file 
        ? compressionResult.file 
        : selectedImage;
      const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('messages')
        .upload(fileName, fileToUpload);

      if (!uploadError) {
        // Generate signed URL (expires in 7 days)
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('messages')
          .createSignedUrl(fileName, 604800);
        
        if (!urlError && signedUrlData?.signedUrl) {
          mediaUrl = signedUrlData.signedUrl;
          mediaType = 'image';
        }
      }
    }

    const success = await sendMessage(
      selectedUserId, 
      messageText.trim() || null, 
      mediaUrl || undefined, 
      mediaType || undefined,
      replyToMessage?.id
    );
    
    if (success) {
      setMessageText('');
      setSelectedImage(null);
      setReplyToMessage(null);
      // Clear typing indicator
      setIsTyping(false);
      if (typingChannelRef.current) {
        typingChannelRef.current.untrack();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const toggleAudioPlayback = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingAudio(null);
      setPlayingAudio(audioUrl);
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    const success = await deleteForMe(messageId);
    if (success) {
      toast.success('Message deleted');
      // No need to fetchMessages - realtime subscription will handle it
    }
    setSelectedMessages(new Set());
  };

  const handleDeleteForEveryone = async (messageId: string, message: Message) => {
    if (message.sender_id !== user?.id) {
      toast.error('You can only remove your own messages');
      return;
    }
    const success = await deleteForEveryone(messageId);
    if (success) {
      toast.success('Message removed for everyone');
      // No need to fetchMessages - realtime subscription will handle it
    }
    setSelectedMessages(new Set());
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await addReaction(messageId, emoji);
    // No need to fetchMessages - realtime subscription will update automatically
  };

  const handlePinToggle = async (messageId: string, currentlyPinned: boolean) => {
    const success = await togglePinMessage(messageId, !currentlyPinned);
    if (success) {
      toast.success(currentlyPinned ? 'Message unpinned' : 'Message pinned');
      // No need to fetchMessages - realtime subscription will update automatically
    }
  };

  const handleReply = (message: Message) => {
    setReplyToMessage(message);
    setSelectedMessages(new Set());
  };

  const handleCopyText = (content: string) => {
    if (content) {
      navigator.clipboard.writeText(content);
      toast.success('Text copied to clipboard');
    }
    setSelectedMessages(new Set());
  };

  const handleEditMessage = async (message: Message) => {
    // Check if message is within 50 minutes
    const createdAt = new Date(message.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

    if (diffMinutes > 50) {
      toast.error('Messages can only be edited within 50 minutes');
      return;
    }

    if (message.sender_id !== user?.id) {
      toast.error('You can only edit your own messages');
      return;
    }

    setEditingMessage(message);
    setEditText(message.content || '');
    setSelectedMessages(new Set());
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;

    const success = await editMessage(editingMessage.id, editText.trim());
    if (success) {
      toast.success('Message edited');
      setEditingMessage(null);
      setEditText('');
    } else {
      toast.error('Failed to edit message');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleBulkDeleteForMe = async () => {
    if (selectedMessages.size === 0) return;

    const success = await bulkDeleteForMe(Array.from(selectedMessages));
    if (success) {
      toast.success(`${selectedMessages.size} message(s) deleted`);
      setSelectedMessages(new Set());
      setSelectMode(false);
    }
  };

  const handleBulkDeleteForEveryone = async () => {
    if (selectedMessages.size === 0) return;

    // Check if all selected messages are from current user
    const selectedMsgs = currentMessages.filter(m => selectedMessages.has(m.id));
    const allOwn = selectedMsgs.every(m => m.sender_id === user?.id);

    if (!allOwn) {
      toast.error('You can only delete your own messages for everyone');
      return;
    }

    const success = await bulkDeleteForEveryone(Array.from(selectedMessages));
    if (success) {
      toast.success(`${selectedMessages.size} message(s) removed for everyone`);
      setSelectedMessages(new Set());
      setSelectMode(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      setSelectedStatus(newStatus);
      toast.success(`Status changed to ${newStatus}`);
      setShowStatusModal(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-[hsl(142,76%,36%)]';
      case 'away': return 'bg-[hsl(45,93%,47%)]';
      case 'transit': return 'bg-[hsl(25,95%,53%)]';
      case 'driving': return 'bg-[hsl(210,90%,55%)]';
      case 'work': return 'bg-[hsl(0,84%,60%)]';
      case 'studying': return 'bg-[hsl(217,91%,60%)]';
      case 'cooking': return 'bg-[hsl(30,100%,50%)]';
      case 'dining': return 'bg-[hsl(15,85%,55%)]';
      case 'family_time': return 'bg-[hsl(280,65%,60%)]';
      case 'farming': return 'bg-[hsl(100,60%,45%)]';
      case 'fitness': return 'bg-[hsl(5,80%,55%)]';
      case 'gaming': return 'bg-[hsl(260,80%,60%)]';
      case 'library': return 'bg-[hsl(200,60%,50%)]';
      case 'meditation': return 'bg-[hsl(270,70%,60%)]';
      case 'movie': return 'bg-[hsl(340,75%,55%)]';
      case 'party': return 'bg-[hsl(320,85%,60%)]';
      case 'play': return 'bg-[hsl(180,70%,50%)]';
      case 'sleep': return 'bg-[hsl(190,80%,50%)]';
      case 'sports': return 'bg-[hsl(10,90%,55%)]';
      case 'traveling': return 'bg-[hsl(195,85%,50%)]';
      case 'tv': return 'bg-[hsl(240,70%,60%)]';
      case 'vacation': return 'bg-[hsl(170,80%,50%)]';
      case 'yoga': return 'bg-[hsl(290,70%,60%)]';
      case 'offline': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <p className="text-muted-foreground">Loading chats...</p>
      </div>
    );
  }

  if (!selectedUserId) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
            <div className="max-w-2xl mx-auto">
              <div className="p-4">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Messages
                </h1>
              </div>
            </div>
          </div>
          {/* Spacer for fixed header */}
          <div className="h-16"></div>
          <div className="p-4 space-y-2">
            {chatUsers.length === 0 ? (
              <div className="bg-muted rounded-lg p-6 text-center">
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-2">Add friends to start chatting</p>
              </div>
            ) : (
              chatUsers.map(chatUser => (
                <ChatUserCard
                  key={chatUser.user_id}
                  user={chatUser}
                  onClick={(userId) => setSearchParams({ user: userId })}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <FeatureAnnouncementWrapper featureId="direct-messages">
      <div className="min-h-screen bg-background flex flex-col pb-20">
        {/* Chat Header with Back Button */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center space-x-3 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectMode) {
                setSelectMode(false);
                setSelectedMessages(new Set());
              } else {
                setSearchParams({});
              }
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

        {!selectMode ? (
          <>
            <div className="relative">
              <Avatar 
                className="w-10 h-10 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => selectedUser?.profile_photo_url && setShowProfileViewer(true)}
              >
                <AvatarImage src={selectedUser?.profile_photo_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedUser?.display_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <StatusIconBadge status={selectedUser?.status} size="sm" />
            </div>

            <div className="flex-1">
              <p className="font-semibold text-foreground">{selectedUser?.display_name}</p>
              <p className="text-xs text-muted-foreground">
                @{selectedUser?.username}
              </p>
              {selectedUser?.status && selectedUser.status !== 'offline' && (
                <p className="text-[10px] text-primary/80 capitalize">
                  {selectedUser.status === 'online' && '🟢 Online'}
                  {selectedUser.status === 'away' && '⏰ Away'}
                  {selectedUser.status === 'cooking' && '🍳 Cooking'}
                  {selectedUser.status === 'dining' && '🍽️ Dining'}
                  {selectedUser.status === 'driving' && '🚗 Driving'}
                  {selectedUser.status === 'family_time' && '👨‍👩‍👧‍👦 Family Time'}
                  {selectedUser.status === 'farming' && '🌾 Farming'}
                  {selectedUser.status === 'fitness' && '💪 Fitness'}
                  {selectedUser.status === 'gaming' && '🎮 Gaming'}
                  {selectedUser.status === 'library' && '📚 Library'}
                  {selectedUser.status === 'meditation' && '🧘 Meditation'}
                  {selectedUser.status === 'movie' && '🎬 Movie'}
                  {selectedUser.status === 'party' && '🎉 Party'}
                  {selectedUser.status === 'play' && '▶️ Play'}
                  {selectedUser.status === 'sleep' && '😴 Sleep'}
                  {selectedUser.status === 'sports' && '🏆 Sports'}
                  {selectedUser.status === 'studying' && '📚 Studying'}
                  {selectedUser.status === 'transit' && '🚗 In transit'}
                  {selectedUser.status === 'traveling' && '✈️ Traveling'}
                  {selectedUser.status === 'tv' && '📺 Watching TV'}
                  {selectedUser.status === 'vacation' && '🏝️ Vacation'}
                  {selectedUser.status === 'work' && '💼 Working'}
                  {selectedUser.status === 'yoga' && '🧘 Yoga'}
                </p>
              )}
            </div>

            <Popover open={showStatusModal} onOpenChange={setShowStatusModal}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Change your status"
                >
                  <UserCog className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm mb-3">Change Status</h4>
                  {[
                    'away', 'cooking', 'dining', 'driving', 'family_time', 'farming', 
                    'fitness', 'gaming', 'library', 'meditation', 'movie', 'online', 
                    'party', 'play', 'sleep', 'sports', 'studying', 'transit', 
                    'traveling', 'tv', 'vacation', 'work', 'yoga', 'offline'
                  ].map((status) => (
                    <Button
                      key={status}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleStatusChange(status)}
                    >
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} mr-2`} />
                      {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectMode(true)}
              title="Select messages"
            >
              <CheckSquare className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{selectedMessages.size} selected</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDeleteForMe}
              disabled={selectedMessages.size === 0}
              title="Delete for me"
            >
              <Trash2 className="w-5 h-5 text-orange-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDeleteForEveryone}
              disabled={selectedMessages.size === 0}
              title="Delete for everyone"
            >
              <Ban className="w-5 h-5 text-red-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectMode(false);
                setSelectedMessages(new Set());
              }}
              title="Cancel"
            >
              <XCircle className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Pinned messages */}
        {currentMessages.filter(m => m.is_pinned).length > 0 && (
          <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-xl p-3 mb-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Pin className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-semibold text-foreground">Pinned Messages ({currentMessages.filter(m => m.is_pinned).length})</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {currentMessages.filter(m => m.is_pinned).map(msg => (
                <div 
                  key={msg.id} 
                  className="text-xs text-muted-foreground truncate bg-background/30 rounded px-2 py-1 hover:bg-background/50 transition-colors cursor-pointer"
                  onClick={() => {
                    const element = document.getElementById(`message-${msg.id}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  <span className="font-medium">{msg.sender_id === user?.id ? 'You' : selectedUser?.display_name}: </span>
                  {msg.content || '📎 Media message'}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {currentMessages.map((message: Message) => {
          const isOwn = message.sender_id === user?.id;
          const isSelected = selectedMessages.has(message.id);
          const reactionEmojis = ['❤️', '👍', '😂', '😮', '😢', '🙏'];
          const createdAt = new Date(message.created_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;
          const canEdit = isOwn && diffMinutes <= 50;
          
          return (
            <ContextMenu key={message.id}>
              <ContextMenuTrigger>
                <div 
                  id={`message-${message.id}`}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-center gap-2`}
                >
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectMessage(message.id)}
                      className="w-5 h-5 rounded border-2 border-border cursor-pointer"
                    />
                  )}
                  <div className={`max-w-[75%] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} ${isSelected ? 'ring-2 ring-blue-500' : ''} ${message.is_pinned ? 'ring-2 ring-yellow-500/50 shadow-lg' : ''} rounded-2xl px-4 py-2 break-words transition-all relative group`}>
                    {message.is_pinned && (
                      <Pin className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500 drop-shadow-lg" />
                    )}
                    {message.is_forwarded && (
                      <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                        <Forward className="w-3 h-3" />
                        Forwarded
                      </div>
                    )}
                    {message.reply_to_message_id && (
                      <div className="bg-background/20 rounded-lg px-2 py-1 mb-2 text-xs border-l-2 border-foreground/30">
                        <Reply className="w-3 h-3 inline mr-1" />
                        Replying to a message
                      </div>
                    )}
                    {message.media_type === 'audio' && message.media_url && (
                      <div className="flex items-center gap-2 min-w-[200px]">
                        <Button
                          size="sm"
                          variant={isOwn ? "secondary" : "ghost"}
                          className="rounded-full w-8 h-8 p-0"
                          onClick={() => toggleAudioPlayback(message.media_url!)}
                        >
                          {playingAudio === message.media_url ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="flex-1 h-1 bg-background/20 rounded-full">
                          <div className="h-full bg-background/40 rounded-full w-1/3" />
                        </div>
                      </div>
                    )}
                    {message.media_type === 'image' && message.media_url && (
                      <img
                        src={message.media_url}
                        alt="Message attachment"
                        className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setViewerImage(message.media_url)}
                      />
                    )}
                    {message.content && (
                      <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.is_edited && (
                      <p className="text-[10px] italic opacity-60 mt-1">(edited)</p>
                    )}
                    
                    {/* Reactions */}
                    {Object.keys(message.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(message.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id, emoji)}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-background/20 hover:bg-background/30 text-xs transition-colors"
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px]">{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 mt-1">
                      <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                      {isOwn && (
                        <>
                          {message.read ? (
                            <CheckCheck className="w-3 h-3 text-blue-500" />
                          ) : message.delivered ? (
                            <CheckCheck className="w-3 h-3 opacity-50" />
                          ) : (
                            <Check className="w-3 h-3 opacity-50" />
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Quick reaction button */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0 rounded-full bg-background/80 hover:bg-background"
                        >
                          <Smile className="w-3 h-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="flex gap-1">
                          {reactionEmojis.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(message.id, emoji)}
                              className="text-xl hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48 bg-card border-border">
                <ContextMenuItem onClick={() => handleReaction(message.id, '❤️')} className="gap-2 cursor-pointer">
                  <Smile className="w-4 h-4" />
                  <span>React</span>
                </ContextMenuItem>
                {canEdit && message.content && (
                  <ContextMenuItem onClick={() => handleEditMessage(message)} className="gap-2 cursor-pointer">
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </ContextMenuItem>
                )}
                <ContextMenuItem onClick={() => handlePinToggle(message.id, message.is_pinned)} className="gap-2 cursor-pointer">
                  <Pin className="w-4 h-4" />
                  <span>{message.is_pinned ? 'Unpin' : 'Pin'}</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDeleteForMe(message.id)} className="gap-2 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </ContextMenuItem>
                {isOwn && (
                  <ContextMenuItem onClick={() => handleDeleteForEveryone(message.id, message)} className="gap-2 cursor-pointer">
                    <Ban className="w-4 h-4" />
                    <span>Remove for Everyone</span>
                  </ContextMenuItem>
                )}
                <ContextMenuItem onClick={() => handleReply(message)} className="gap-2 cursor-pointer">
                  <Reply className="w-4 h-4" />
                  <span>Reply</span>
                </ContextMenuItem>
                {message.content && (
                  <ContextMenuItem onClick={() => handleCopyText(message.content!)} className="gap-2 cursor-pointer">
                    <Copy className="w-4 h-4" />
                    <span>Copy Text</span>
                  </ContextMenuItem>
                )}
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
        {otherUserTyping && selectedUser && (
          <div className="flex justify-start mb-3">
            <TypingIndicator userName={selectedUser.display_name} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-5 rounded-full w-10 h-10 shadow-lg bg-black/80 hover:bg-black/90 hover:scale-110 transition-all duration-300 text-white z-30"
          size="icon"
        >
          <ArrowDown className="w-5 h-5" />
        </Button>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-6 z-20">
        {editingMessage && (
          <div className="mb-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-blue-500 font-medium">Editing message</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                className="h-6 px-2"
              >
                Cancel
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && editText.trim()) {
                    handleSaveEdit();
                  }
                }}
                placeholder="Edit your message..."
                className="bg-background border-border"
                autoFocus
              />
              <Button onClick={handleSaveEdit} disabled={!editText.trim()} size="sm">
                Save
              </Button>
            </div>
          </div>
        )}
        {!editingMessage && replyToMessage && (
          <div className="mb-2 bg-muted/50 rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Replying to</p>
              <p className="text-sm truncate">{replyToMessage.content || 'Media message'}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReplyToMessage(null)}
              className="shrink-0"
            >
              ×
            </Button>
          </div>
        )}
        {!editingMessage && selectedImage && (
          <div className="mb-2 relative inline-block">
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Selected"
              className="h-20 rounded-lg"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </Button>
          </div>
        )}
        {!editingMessage && (
          <div className="flex space-x-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="chat-image"
            />
            <label htmlFor="chat-image">
              <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                <span>
                  <ImageIcon className="w-4 h-4" />
                </span>
              </Button>
            </label>
            <Input
              value={messageText}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="bg-background border-border"
            />
            <Button onClick={handleSend} disabled={!messageText.trim() && !selectedImage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {viewerImage && (
        <ImageViewer
          imageUrl={viewerImage}
          onClose={() => setViewerImage(null)}
        />
      )}

      {showProfileViewer && selectedUser?.profile_photo_url && (
        <ImageViewer
          imageUrl={selectedUser.profile_photo_url}
          onClose={() => setShowProfileViewer(false)}
        />
      )}
    </div>
    </FeatureAnnouncementWrapper>
  );
};

export default ChatPage;
