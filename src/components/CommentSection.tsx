import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Heart, MessageCircle, Sparkles, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';
import UserMentionInput from '@/components/UserMentionInput';
import ImageViewer from '@/components/ImageViewer';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string;
  likes_count: number;
  replies_count: number;
  user_liked?: boolean;
  profile?: {
    display_name: string;
    username: string;
    profile_photo_url?: string;
    event_date?: string;
    event_recurring?: boolean;
    status?: string;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
  onUpdate: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, onUpdate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const [profileViewerUrl, setProfileViewerUrl] = useState<string | null>(null);
  const [showCommentAnimation, setShowCommentAnimation] = useState(false);

  const fetchComments = async () => {
    if (!user) return;

    // Fetch top-level comments with like status
    const { data: topComments, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        profile:profiles!inner(display_name, username, profile_photo_url, event_date, event_recurring, status),
        user_liked:comment_likes!left(user_id)
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error || !topComments) return;

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      topComments.map(async (comment: any) => {
        const { data: replies } = await supabase
          .from('post_comments')
          .select(`
            *,
            profile:profiles!inner(display_name, username, profile_photo_url, event_date, event_recurring, status),
            user_liked:comment_likes!left(user_id)
          `)
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true });

        const profileData = Array.isArray(comment.profile) ? comment.profile[0] : comment.profile;
        const userLiked = Array.isArray(comment.user_liked) 
          ? comment.user_liked.some((like: any) => like.user_id === user.id)
          : false;

        const formattedReplies = replies?.map((reply: any) => {
          const replyProfile = Array.isArray(reply.profile) ? reply.profile[0] : reply.profile;
          const replyUserLiked = Array.isArray(reply.user_liked)
            ? reply.user_liked.some((like: any) => like.user_id === user.id)
            : false;
          return {
            ...reply,
            profile: replyProfile,
            user_liked: replyUserLiked,
            replies: []
          };
        }) || [];

        return {
          ...comment,
          profile: profileData,
          user_liked: userLiked,
          replies: formattedReplies
        };
      })
    );

    setComments(commentsWithReplies as any);
  };

  useEffect(() => {
    if (!user) return;

    fetchComments();

    const channel = supabase
      .channel(`comments_${postId}:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchComments();
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to comment",
        variant: "destructive"
      });
      return;
    }
    
    if (!newComment.trim()) {
      toast({
        title: "Comment cannot be empty",
        description: "Please write something before posting",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;

      // Upload image if present
      if (commentImage) {
        const fileExt = commentImage.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('posts')
          .upload(`comment-images/${fileName}`, commentImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(`comment-images/${fileName}`);

        imageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) {
        console.error('Comment insert error:', error);
        throw new Error(error.message || 'Failed to post comment');
      }
      
      // Create tags for mentioned users
      if (mentionedUsers.length > 0) {
        await Promise.all(
          mentionedUsers.map(userId =>
            supabase.from('post_tags').insert({
              post_id: postId,
              tagged_user_id: userId,
              tagged_by_user_id: user.id
            })
          )
        );
      }
      
      setNewComment('');
      setCommentImage(null);
      setCommentImagePreview(null);
      setMentionedUsers([]);
      
      // Show comment animation
      setShowCommentAnimation(true);
      setTimeout(() => setShowCommentAnimation(false), 2000);
      
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully"
      });
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: "Failed to post comment",
        description: error.message || "Check your connection and try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMentionUser = (userId: string) => {
    if (!mentionedUsers.includes(userId)) {
      setMentionedUsers([...mentionedUsers, userId]);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to reply",
        variant: "destructive"
      });
      return;
    }
    
    if (!replyContent.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: replyContent.trim(),
          parent_comment_id: parentId,
        })
        .select()
        .single();

      if (error) {
        console.error('Reply insert error:', error);
        throw new Error(error.message || 'Failed to post reply');
      }
      
      setReplyContent('');
      setReplyingTo(null);
      toast({
        title: "Reply posted",
        description: "Your reply has been added successfully"
      });
    } catch (error: any) {
      console.error('Error posting reply:', error);
      toast({
        title: "Failed to post reply",
        description: error.message || "Check your connection and try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (commentId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const hasEvent = useEventGlow(comment.profile?.event_date, comment.profile?.event_recurring);
    const glowClass = getAvatarGlowClass(hasEvent, comment.profile?.status);

    return (
      <div className={`flex space-x-2 ${isReply ? 'ml-10' : ''}`}>
        <Avatar 
          className={`w-8 h-8 cursor-pointer hover:opacity-90 transition-opacity ${glowClass}`}
          onClick={(e) => {
            e.stopPropagation();
            if (comment.profile?.profile_photo_url) {
              setProfileViewerUrl(comment.profile.profile_photo_url);
            }
          }}
        >
          <AvatarImage src={comment.profile?.profile_photo_url || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {comment.profile?.display_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-background rounded-lg p-2">
            <p 
              className="text-sm font-medium text-foreground cursor-pointer hover:underline"
              onClick={() => navigate(`/profile/${comment.user_id}`)}
            >
              {comment.profile?.display_name}
            </p>
            <p className="text-sm text-foreground break-words whitespace-pre-wrap">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-2">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={() => handleLike(comment.id, comment.user_liked || false)}
            >
              <Heart className={`w-3 h-3 ${comment.user_liked ? 'fill-red-500 text-red-500' : ''}`} />
              {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
            </Button>
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              >
                <MessageCircle className="w-3 h-3" />
                {comment.replies_count > 0 && <span>{comment.replies_count}</span>}
              </Button>
            )}
          </div>
          {replyingTo === comment.id && (
            <div className="flex space-x-2 mt-2">
              <UserMentionInput
                value={replyContent}
                onChange={setReplyContent}
                placeholder="Write a reply..."
                disabled={loading}
                className="bg-background border-border text-foreground text-sm h-8"
              />
              <Button 
                type="button" 
                size="sm" 
                disabled={loading || !replyContent.trim()}
                onClick={() => handleReply(comment.id)}
                className="h-8"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="border-t border-border bg-muted/30">
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border relative">
        {commentImagePreview && (
          <div className="mb-2 relative inline-block">
            <img src={commentImagePreview} alt="Comment attachment" className="h-20 rounded-lg" />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background"
              onClick={() => {
                setCommentImage(null);
                setCommentImagePreview(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div className="flex space-x-2">
          <UserMentionInput
            value={newComment}
            onChange={setNewComment}
            onMentionUser={handleMentionUser}
            placeholder="Add a comment... (use @ to mention)"
            disabled={loading}
            className="bg-background border-border text-foreground"
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="comment-image-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setCommentImage(file);
                setCommentImagePreview(URL.createObjectURL(file));
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => document.getElementById('comment-image-upload')?.click()}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button type="submit" size="sm" disabled={loading || !newComment.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <AnimatePresence>
          {showCommentAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ opacity: 1, scale: 1.2, y: -80 }}
              exit={{ opacity: 0, scale: 0.8, y: -100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none flex flex-col items-center z-10"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: [0.5, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <MessageCircle className="w-10 h-10 fill-primary text-primary drop-shadow-lg" />
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: [0, 1.5, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-lg" />
                </motion.div>
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-sm font-bold text-primary mt-2 whitespace-nowrap"
              >
                +5 Bonus Points
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

    {profileViewerUrl && (
      <ImageViewer
        imageUrl={profileViewerUrl}
        onClose={() => setProfileViewerUrl(null)}
      />
    )}
  </div>
  );
};

export default CommentSection;
