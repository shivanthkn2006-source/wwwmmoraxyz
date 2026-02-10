import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface TimelineContent {
  id: string;
  user_id: string;
  threshold_id: number;
  content_type: 'text' | 'image' | 'note' | 'annotation';
  content_data: any;
  image_url?: string;
  expertise_level: 'beginner' | 'intermediate' | 'expert';
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for managing timeline content (CRUD operations)
 * Supports image uploads, text content, and annotations
 */
export const useTimelineContent = (thresholdId?: number) => {
  const { user } = useAuth();
  const [content, setContent] = useState<TimelineContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchContent = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('timeline_content')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (thresholdId !== undefined) {
        query = query.eq('threshold_id', thresholdId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setContent((data || []) as TimelineContent[]);
    } catch (error) {
      console.error('Failed to fetch timeline content:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, thresholdId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const addContent = useCallback(async (
    contentData: {
      thresholdId: number;
      contentType: 'text' | 'image' | 'note' | 'annotation';
      data: any;
      imageFile?: File;
      expertiseLevel?: 'beginner' | 'intermediate' | 'expert';
      isPublic?: boolean;
    }
  ) => {
    if (!user?.id) return null;

    setIsLoading(true);
    try {
      let imageUrl: string | undefined;

      // Upload image if provided
      if (contentData.imageFile) {
        const fileExt = contentData.imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('timeline-content')
          .upload(fileName, contentData.imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('timeline-content')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('timeline_content')
        .insert({
          user_id: user.id,
          threshold_id: contentData.thresholdId,
          content_type: contentData.contentType,
          content_data: contentData.data,
          image_url: imageUrl,
          expertise_level: contentData.expertiseLevel || 'intermediate',
          is_public: contentData.isPublic || false,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Content added to timeline');
      fetchContent();
      return data;
    } catch (error) {
      console.error('Failed to add content:', error);
      toast.error('Failed to add content');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchContent]);

  const updateContent = useCallback(async (
    contentId: string,
    updates: Partial<Pick<TimelineContent, 'content_data' | 'expertise_level' | 'is_public'>>
  ) => {
    if (!user?.id) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('timeline_content')
        .update(updates)
        .eq('id', contentId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Content updated');
      fetchContent();
      return true;
    } catch (error) {
      console.error('Failed to update content:', error);
      toast.error('Failed to update content');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchContent]);

  const deleteContent = useCallback(async (contentId: string) => {
    if (!user?.id) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('timeline_content')
        .delete()
        .eq('id', contentId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Content removed');
      fetchContent();
      return true;
    } catch (error) {
      console.error('Failed to delete content:', error);
      toast.error('Failed to delete content');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchContent]);

  const shareContent = useCallback(async (
    contentId: string,
    shareType: 'global' | 'friends' | 'private_timeline' | 'huddle',
    targetId?: string
  ) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('timeline_shares')
        .insert({
          content_id: contentId,
          user_id: user.id,
          share_type: shareType,
          target_id: targetId,
        });

      if (error) throw error;

      toast.success(`Content shared to ${shareType}`);
      return true;
    } catch (error) {
      console.error('Failed to share content:', error);
      toast.error('Failed to share content');
      return false;
    }
  }, [user?.id]);

  return {
    content,
    isLoading,
    addContent,
    updateContent,
    deleteContent,
    shareContent,
    refreshContent: fetchContent,
  };
};
