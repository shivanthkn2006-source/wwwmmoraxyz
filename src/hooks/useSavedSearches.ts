import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SavedSearch {
  id: string;
  search_name: string;
  search_query: string;
  filters: any;
  created_at: string;
  last_used_at: string | null;
}

export const useSavedSearches = () => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const saveSearch = async (name: string, query: string, filters: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          search_name: name,
          search_query: query,
          filters: filters
        });

      if (error) throw error;

      toast({
        title: 'Search saved',
        description: 'Your search has been saved successfully',
      });

      loadSavedSearches();
    } catch (error) {
      console.error('Error saving search:', error);
      toast({
        title: 'Error',
        description: 'Failed to save search',
        variant: 'destructive',
      });
    }
  };

  const updateLastUsed = async (searchId: string) => {
    try {
      await supabase
        .from('saved_searches')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', searchId);
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  };

  const deleteSearch = async (searchId: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;

      toast({
        title: 'Search deleted',
        description: 'Saved search has been removed',
      });

      loadSavedSearches();
    } catch (error) {
      console.error('Error deleting search:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete search',
        variant: 'destructive',
      });
    }
  };

  return {
    savedSearches,
    loading,
    saveSearch,
    updateLastUsed,
    deleteSearch,
    refresh: loadSavedSearches
  };
};
