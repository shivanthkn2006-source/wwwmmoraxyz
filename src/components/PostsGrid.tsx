import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profile?: any;
  user_liked?: boolean;
}

interface PostsGridProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

const PostsGrid: React.FC<PostsGridProps> = ({ posts, onPostClick }) => {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
      {posts.map((post) => (
        <Button
          variant="ghost"
          aria-label={`Open post ${post.content?.slice(0, 80) || post.id}`}
          key={post.id}
          className="h-auto w-full aspect-square rounded-none p-0 hover:opacity-80 transition-opacity overflow-hidden bg-muted"
          onClick={() => onPostClick(post)}
        >
          {post.media_url && (post.media_type === 'image' || post.media_url.startsWith('data:image/')) ? (
            <img
              src={post.media_url}
              alt="Post"
              className="w-full h-full object-cover"
            />
          ) : post.media_url && (post.media_type === 'video' || post.media_url.startsWith('data:video/')) ? (
            <video
              src={post.media_url}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-primary/80 to-primary/60">
              <p className="text-primary-foreground text-xs text-center line-clamp-4 font-medium">
                {post.content?.slice(0, 100)}
              </p>
            </div>
          )}
        </Button>
      ))}
    </div>
  );
};

export default PostsGrid;
