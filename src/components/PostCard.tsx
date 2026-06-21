import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2, Trash2, Bookmark, MoreVertical, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import CommentSection from './CommentSection';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';
import ImageViewer from './ImageViewer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusIconBadge from '@/components/StatusIconBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivateTimelines } from '@/hooks/usePrivateTimelines';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  full_media_url?: string | null;
  has_deferred_media?: boolean;
  media_size?: number;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  private_timeline_id?: string | null;
  profile?: {
    display_name: string;
    username: string;
    profile_photo_url?: string;
    event_date?: string | null;
    event_recurring?: boolean;
    status?: string;
  };
  user_liked?: boolean;
}

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Guard against null/undefined post
  if (!post) return null;
  
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.user_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [starRating, setStarRating] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [revealHeavyMedia, setRevealHeavyMedia] = useState(false);
  const [loadedHeavyMediaUrl, setLoadedHeavyMediaUrl] = useState<string | null>(null);
  const [loadingHeavyMedia, setLoadingHeavyMedia] = useState(false);
  const [sharingToTimeline, setSharingToTimeline] = useState(false);

  const hasEvent = useEventGlow(post.profile?.event_date, post.profile?.event_recurring);
  const glowClass = getAvatarGlowClass(hasEvent, post.profile?.status);
  const { timelines, loading: timelinesLoading } = usePrivateTimelines();
  
  const isOwnPost = user?.id === post.user_id;
  const displayMediaUrl = post.media_url || loadedHeavyMediaUrl || (revealHeavyMedia ? post.full_media_url || null : null);
  const isDeferredHeavyMedia = !post.media_url && (post.has_deferred_media || !!post.full_media_url) && !displayMediaUrl;

  const revealDeferredMedia = async () => {
    if (loadingHeavyMedia) return;
    if (post.full_media_url) {
      setRevealHeavyMedia(true);
      return;
    }

    try {
      setLoadingHeavyMedia(true);
      const { data, error } = await supabase
        .from('posts')
        .select('media_url')
        .eq('id', post.id)
        .maybeSingle();

      if (error) throw error;
      setLoadedHeavyMediaUrl(data?.media_url || null);
      setRevealHeavyMedia(true);
    } catch (error) {
      toast({ title: 'Media unavailable', description: 'Could not load this large media file.', variant: 'destructive' });
    } finally {
      setLoadingHeavyMedia(false);
    }
  };

  // Sync state with post prop when it changes
  useEffect(() => {
    setLiked(post.user_liked || false);
    setLikesCount(post.likes_count);
    setCommentsCount(post.comments_count);
    
    // Check if post is saved
    const checkSaved = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', post.id)
        .maybeSingle();
      setIsSaved(!!data);
    };
    
    // Check if post is marked as not interested
    const checkPreference = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('post_preferences')
        .select('preference')
        .eq('user_id', user.id)
        .eq('post_id', post.id)
        .maybeSingle();
      if (data?.preference === 'not_interested') {
        setIsHidden(true);
      }
    };
    
    // Check user's rating for this post
    const checkUserRating = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('post_ratings')
        .select('rating')
        .eq('user_id', user.id)
        .eq('post_id', post.id)
        .maybeSingle();
      if (data) {
        setStarRating(data.rating);
      }
    };
    
    // Calculate average rating for display
    const calculateAverageRating = async () => {
      const { data } = await supabase
        .from('post_ratings')
        .select('rating')
        .eq('post_id', post.id);
      
      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    };
    
    checkSaved();
    checkPreference();
    checkUserRating();
    calculateAverageRating();
  }, [post.user_liked, post.likes_count, post.comments_count, user, post.id]);

  // Listen for post action commands
  useEffect(() => {
    const handlePostAction = (event: CustomEvent) => {
      const { postId, action } = event.detail;
      if (postId !== post.id) return;

      switch (action) {
        case 'like':
          handleLike();
          break;
        case 'comment':
          setShowComments(true);
          break;
        case 'share':
          handleShare();
          break;
        case 'save':
          handleSave();
          break;
        case 'not_interested':
          handlePreference('not_interested');
          break;
      }
    };

    window.addEventListener('post-action', handlePostAction as EventListener);
    return () => window.removeEventListener('post-action', handlePostAction as EventListener);
  }, [post.id]);

  // Set up real-time subscription for post updates and ratings
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`post_updates_${post.id}:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${post.id}`
        },
        (payload: any) => {
          if (payload.new.likes_count !== undefined) {
            setLikesCount(payload.new.likes_count);
          }
          if (payload.new.comments_count !== undefined) {
            setCommentsCount(payload.new.comments_count);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_ratings',
          filter: `post_id=eq.${post.id}`
        },
        () => {
          // Recalculate average when any rating changes
          const calculateAvg = async () => {
            const { data } = await supabase
              .from('post_ratings')
              .select('rating')
              .eq('post_id', post.id);
            
            if (data && data.length > 0) {
              const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
              setAverageRating(Math.round(avg * 10) / 10);
            }
          };
          calculateAvg();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, user]);

  const handleLike = async () => {
    if (!user) return;

    const wasLiked = liked;
    const previousCount = likesCount;

    try {
      // Optimistic update
      setLiked(!wasLiked);
      setLikesCount(wasLiked ? previousCount - 1 : previousCount + 1);

      if (wasLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) {
          // Revert on error
          setLiked(wasLiked);
          setLikesCount(previousCount);
        }
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) {
          // Revert on error
          setLiked(wasLiked);
          setLikesCount(previousCount);
        } else {
          // Show like animation
          setShowLikeAnimation(true);
          setTimeout(() => setShowLikeAnimation(false), 2000);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setLiked(wasLiked);
      setLikesCount(previousCount);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      if (isSaved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
        setIsSaved(false);
        toast({
          title: 'Post unsaved',
          description: 'Post removed from saved items',
        });
      } else {
        await supabase
          .from('saved_posts')
          .insert({ user_id: user.id, post_id: post.id });
        setIsSaved(true);
        toast({
          title: 'Post saved',
          description: 'Post added to saved items',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save post',
        variant: 'destructive',
      });
    }
  };

  const handlePreference = async (preference: 'interested' | 'not_interested') => {
    if (!user) return;

    try {
      await supabase
        .from('post_preferences')
        .upsert({ 
          user_id: user.id, 
          post_id: post.id, 
          preference 
        }, {
          onConflict: 'user_id,post_id'
        });

      if (preference === 'not_interested') {
        setIsHidden(true);
        toast({
          title: 'Post hidden',
          description: 'Similar content will appear less often',
        });
      } else {
        toast({
          title: 'Thanks for your feedback',
          description: 'You\'ll see more content like this',
        });
      }
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update preference',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    setShowShareDialog(true);
  };

  const handleShareToTimeline = async (timelineId: string) => {
    if (!user || sharingToTimeline) return;

    setSharingToTimeline(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: post.content,
          media_url: post.media_url,
          media_type: post.media_type,
          visibility: 'personal',
          private_timeline_id: timelineId,
        });

      if (error) throw error;

      toast({
        title: 'Post shared!',
        description: 'Post shared to private timeline successfully',
      });
      setShowShareDialog(false);
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({
        title: 'Error',
        description: 'Failed to share post to timeline',
        variant: 'destructive',
      });
    } finally {
      setSharingToTimeline(false);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'Post link copied to clipboard',
      });
      setShowShareDialog(false);
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!user || user.id !== post.user_id) return;
    
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: 'Post deleted',
        description: 'Your post has been deleted successfully',
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive',
      });
    }
  };

  if (isHidden) {
    return null;
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="relative">
            <Avatar 
              className={`w-10 h-10 cursor-pointer hover:opacity-90 transition-opacity ${glowClass}`}
              onClick={(e) => {
                e.stopPropagation();
                if (post.profile?.profile_photo_url) {
                  setShowProfileViewer(true);
                }
              }}
            >
              <AvatarImage src={post.profile?.profile_photo_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {post.profile?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <StatusIconBadge status={post.profile?.status} size="sm" />
            
            <AnimatePresence>
              {showLikeAnimation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 0 }}
                  animate={{ opacity: 1, scale: 1.5, y: 30 }}
                  exit={{ opacity: 0, scale: 0.8, y: 50 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute left-1/2 -translate-x-1/2 top-full pointer-events-none"
                  style={{ marginTop: '4px' }}
                >
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: [0.5, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="text-3xl"
                  >
                    💙
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1">
            <p 
              className="font-semibold text-foreground cursor-pointer hover:underline"
              onClick={() => navigate(`/profile/${post.user_id}`)}
            >
              {post.profile?.display_name}
            </p>
            <p className="text-xs text-muted-foreground">
              @{post.profile?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!isOwnPost && (
              <>
                {starRating && (
                  <span className="text-sm font-medium text-foreground mr-1">{starRating}</span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Star className={`w-4 h-4 ${starRating ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32 bg-background/95 backdrop-blur-sm">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <DropdownMenuItem 
                        key={rating}
                        onClick={async () => {
                          if (!user) return;
                          try {
                            await supabase
                              .from('post_ratings')
                              .upsert({
                                post_id: post.id,
                                user_id: user.id,
                                rating: rating
                              }, {
                                onConflict: 'post_id,user_id'
                              });
                            setStarRating(rating);
                            toast({
                              title: 'Rating submitted',
                              description: `You rated this post ${rating} stars`,
                            });
                          } catch (error) {
                            toast({
                              title: 'Error',
                              description: 'Failed to submit rating',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="justify-center"
                      >
                        {Array.from({ length: rating }, (_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400 inline" />
                        ))}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handlePreference('interested')}>
                  👍 Interested
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePreference('not_interested')}>
                  👎 Not Interested
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {user?.id === post.user_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive h-8 w-8 p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {post.content && (
          <p className="text-foreground mb-3">{post.content}</p>
        )}

        {(displayMediaUrl || isDeferredHeavyMedia) && (
          <div className="mb-3 rounded-lg overflow-hidden">
            {isDeferredHeavyMedia ? (
              <button
                type="button"
                onClick={revealDeferredMedia}
                className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-muted/70 p-4 text-center text-sm text-muted-foreground hover:bg-muted"
              >
                <span className="font-medium text-foreground">Large media</span>
                <span>{loadingHeavyMedia ? 'Opening…' : 'Tap to open without slowing the feed'}</span>
              </button>
            ) : post.media_type === 'image' || displayMediaUrl.startsWith('data:image/') ? (
              <img
                src={displayMediaUrl}
                alt="Post media"
                className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowImageViewer(true)}
              />
            ) : post.media_type === 'video' || displayMediaUrl.startsWith('data:video/') ? (
              <video
                src={displayMediaUrl}
                controls
                className="w-full h-auto"
              />
            ) : (
              <img
                src={displayMediaUrl}
                alt="Post media"
                className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowImageViewer(true)}
              />
            )}
          </div>
        )}

        {showImageViewer && displayMediaUrl && (
          <ImageViewer
            imageUrl={displayMediaUrl}
            onClose={() => setShowImageViewer(false)}
          />
        )}

        {showProfileViewer && post.profile?.profile_photo_url && (
          <ImageViewer
            imageUrl={post.profile.profile_photo_url}
            onClose={() => setShowProfileViewer(false)}
          />
        )}

        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full justify-start"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              
              {timelines.length > 0 && (
                <>
                  <div className="text-sm font-medium text-muted-foreground">
                    Share to Private Timeline
                  </div>
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {timelines.map((timeline) => (
                        <Button
                          key={timeline.id}
                          onClick={() => handleShareToTimeline(timeline.id)}
                          variant="ghost"
                          className="w-full justify-start"
                          disabled={sharingToTimeline}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {timeline.members.slice(0, 3).map((member) => (
                                <Avatar key={member.user_id} className="w-6 h-6 border-2 border-background">
                                  <AvatarImage src={member.profile_photo_url || ''} />
                                  <AvatarFallback className="text-xs">
                                    {member.display_name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium">
                                {timeline.members.map(m => m.display_name).join(', ')}
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex items-center space-x-4 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center space-x-1 ${
              post.private_timeline_id 
                ? liked ? 'text-blue-500' : 'text-muted-foreground'
                : liked ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Heart className={`w-5 h-5 ${
              post.private_timeline_id 
                ? liked ? 'fill-blue-500' : ''
                : liked ? 'fill-primary' : ''
            }`} />
            <span>{likesCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-1 text-muted-foreground"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentsCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="flex items-center space-x-1 text-muted-foreground"
          >
            <Share2 className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className={`flex items-center space-x-1 ${isSaved ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-primary' : ''}`} />
          </Button>
        </div>
      </div>

      {showComments && (
        <CommentSection postId={post.id} onUpdate={onUpdate} />
      )}
    </Card>
  );
};

export default PostCard;
