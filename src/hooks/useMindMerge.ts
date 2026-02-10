/**
 * Mind Merge Hook - Manages the fusion of multiple entity consciousnesses
 * Integrates with ZSMT merged_mind_entities field
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface MergedEntity {
  skill_id: string;
  skill_type: string;
  merged_at: string;
  metadata: Record<string, any>;
}

interface MindMergeState {
  entities: MergedEntity[];
  isLoading: boolean;
  lastMergeAt: string | null;
}

export const useMindMerge = () => {
  const { user } = useAuth();
  const [state, setState] = useState<MindMergeState>({
    entities: [],
    isLoading: false,
    lastMergeAt: null
  });

  // Load current merged entities from ZSMT
  const loadMergedEntities = useCallback(async () => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await (supabase.from('zoe_sovereign_memory') as any)
        .select('merged_mind_entities, created_at')
        .eq('user_id', user.id)
        .not('merged_mind_entities', 'eq', '[]')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data?.merged_mind_entities) {
        setState({
          entities: data.merged_mind_entities,
          isLoading: false,
          lastMergeAt: data.created_at
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('[MindMerge] Failed to load entities:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id]);

  // Merge a new skill/mind entity into the consciousness
  const mergeEntity = useCallback(async (
    skillId: string,
    skillType: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Please sign in to merge entities');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Call the database function to append merged entity
      const { data, error } = await supabase.rpc('append_merged_mind_entity', {
        p_user_id: user.id,
        p_skill_id: skillId,
        p_skill_type: skillType,
        p_skill_metadata: metadata
      });

      if (error) throw error;

      // Update local state
      const newEntity: MergedEntity = {
        skill_id: skillId,
        skill_type: skillType,
        merged_at: new Date().toISOString(),
        metadata
      };

      setState(prev => ({
        entities: [...prev.entities, newEntity],
        isLoading: false,
        lastMergeAt: new Date().toISOString()
      }));

      toast.success(`${skillType} entity merged into consciousness`);
      return true;

    } catch (error) {
      console.error('[MindMerge] Failed to merge entity:', error);
      toast.error('Failed to merge entity');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user?.id]);

  // Get merged entity by type
  const getEntityByType = useCallback((type: string): MergedEntity | undefined => {
    return state.entities.find(e => e.skill_type === type);
  }, [state.entities]);

  // Check if a specific skill is merged
  const hasSkill = useCallback((skillId: string): boolean => {
    return state.entities.some(e => e.skill_id === skillId);
  }, [state.entities]);

  // Get consciousness composition summary
  const getConsciousnessComposition = useCallback(() => {
    const composition: Record<string, number> = {};
    for (const entity of state.entities) {
      composition[entity.skill_type] = (composition[entity.skill_type] || 0) + 1;
    }
    return {
      totalEntities: state.entities.length,
      breakdown: composition,
      isHybrid: state.entities.length > 1
    };
  }, [state.entities]);

  return {
    ...state,
    loadMergedEntities,
    mergeEntity,
    getEntityByType,
    hasSkill,
    getConsciousnessComposition
  };
};
