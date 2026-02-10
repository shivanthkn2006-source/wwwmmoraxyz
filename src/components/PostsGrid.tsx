import React, { useState } from 'react';
import { Card } from '@/components/ui/card';

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
        <div
          key={post.id}
          className="aspect-square cursor-pointer hover:opacity-80 transition-opacity overflow-hidden bg-muted"
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
        </div>
      ))}
    </div>
  );
};

export default PostsGrid;
