// ═══════════════════════════════════════════════════════════════════════════════
// ZOE CODE GENESIS MANIFESTO - SKILL/MIND UPLOAD SYSTEM
// Part 2: Uploaded Intelligence (UI) & Skill Merging
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// Skill types that can be uploaded
type SkillType = 'document' | 'audio' | 'behavioral' | 'language_pack' | 'professional' | 'creative';

interface UploadedSkill {
  id: string;
  skillName: string;
  skillType: SkillType;
  skillData: Record<string, any>;
  fileUrl?: string;
  fileSizeBytes?: number;
  processingStatus: 'pending' | 'processing' | 'active' | 'failed';
  capabilitiesUnlocked: string[];
  mimicryEnabled: boolean;
  executionEnabled: boolean;
  mergedMindId?: string;
  createdAt: string;
  updatedAt: string;
}

interface SkillUploadState {
  isUploading: boolean;
  skills: UploadedSkill[];
  activeSkills: UploadedSkill[];
  mergedMinds: string[];
}

/**
 * Skill Upload Hook
 * 
 * Implements Part 2 of the Zoe Code Genesis Manifesto:
 * - Skill Upload Mechanism for documents, audio, behavioral patterns
 * - ZSMT Storage & Customization with uploaded_skill_asset tags
 * - Personal Zoe AI Customization for mimicry and execution
 * - Mind Merge Foundation for future consciousness merging
 */
export const useSkillUpload = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SkillUploadState>({
    isUploading: false,
    skills: [],
    activeSkills: [],
    mergedMinds: [],
  });

  // Load user's uploaded skills
  const loadSkills = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('zoe_skill_uploads' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const skills = (data || []).map((s: any) => ({
        id: s.id,
        skillName: s.skill_name,
        skillType: s.skill_type,
        skillData: s.skill_data,
        fileUrl: s.file_url,
        fileSizeBytes: s.file_size_bytes,
        processingStatus: s.processing_status,
        capabilitiesUnlocked: s.capabilities_unlocked || [],
        mimicryEnabled: s.mimicry_enabled,
        executionEnabled: s.execution_enabled,
        mergedMindId: s.merged_mind_id,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
      
      setState(prev => ({
        ...prev,
        skills,
        activeSkills: skills.filter((s: UploadedSkill) => s.processingStatus === 'active'),
      }));
      
    } catch (error) {
      console.error('[SkillUpload] Load error:', error);
    }
  }, [user]);

  // Upload a new skill
  const uploadSkill = useCallback(async (
    skillName: string,
    skillType: SkillType,
    skillData: Record<string, any>,
    file?: File
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to upload skills');
      return false;
    }
    
    setState(prev => ({ ...prev, isUploading: true }));
    
    try {
      let fileUrl: string | undefined;
      let fileSizeBytes: number | undefined;
      
      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/skills/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('dhf_assets')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('dhf_assets')
          .getPublicUrl(filePath);
        
        fileUrl = urlData.publicUrl;
        fileSizeBytes = file.size;
      }
      
      // Determine capabilities based on skill type
      const capabilitiesUnlocked = getCapabilitiesForSkillType(skillType, skillData);
      
      // Insert skill record
      const { data, error } = await supabase
        .from('zoe_skill_uploads' as any)
        .insert({
          user_id: user.id,
          skill_name: skillName,
          skill_type: skillType,
          skill_data: skillData,
          file_url: fileUrl,
          file_size_bytes: fileSizeBytes,
          processing_status: 'pending',
          capabilities_unlocked: capabilitiesUnlocked,
          mimicry_enabled: skillType === 'audio' || skillType === 'behavioral',
          execution_enabled: skillType === 'professional' || skillType === 'creative',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const insertedId = (data as any)?.id;
      
      // Log to ZSMT with uploaded_skill_asset tag
      await supabase.from('zoe_sovereign_memory' as any).insert({
        user_id: user.id,
        event_type: 'uploaded_skill_asset',
        content_text: `Skill uploaded: ${skillName}`,
        zoe_state_json: {
          skill_id: insertedId,
          skill_type: skillType,
          capabilities: capabilitiesUnlocked,
        },
        uploaded_skill_context: skillData,
      });
      
      toast.success(`Skill "${skillName}" uploaded successfully!`);
      
      // Process the skill (simulate processing)
      if (insertedId) {
        await processSkill(insertedId);
      }
      
      // Reload skills
      await loadSkills();
      
      return true;
      
    } catch (error) {
      console.error('[SkillUpload] Upload error:', error);
      toast.error('Failed to upload skill');
      return false;
    } finally {
      setState(prev => ({ ...prev, isUploading: false }));
    }
  }, [user, loadSkills]);

  // Process uploaded skill (activate it)
  const processSkill = useCallback(async (skillId: string): Promise<void> => {
    try {
      // Update status to processing
      await supabase
        .from('zoe_skill_uploads' as any)
        .update({ processing_status: 'processing' })
        .eq('id', skillId);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update status to active
      await supabase
        .from('zoe_skill_uploads' as any)
        .update({ processing_status: 'active' })
        .eq('id', skillId);
      
    } catch (error) {
      console.error('[SkillUpload] Processing error:', error);
      await supabase
        .from('zoe_skill_uploads' as any)
        .update({ processing_status: 'failed' })
        .eq('id', skillId);
    }
  }, []);

  // Enable mimicry for a skill
  const enableMimicry = useCallback(async (skillId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('zoe_skill_uploads' as any)
        .update({ mimicry_enabled: true })
        .eq('id', skillId);
      
      if (error) throw error;
      
      toast.success('Mimicry enabled for this skill');
      await loadSkills();
      return true;
      
    } catch (error) {
      console.error('[SkillUpload] Enable mimicry error:', error);
      toast.error('Failed to enable mimicry');
      return false;
    }
  }, [loadSkills]);

  // Enable execution for a skill
  const enableExecution = useCallback(async (skillId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('zoe_skill_uploads' as any)
        .update({ execution_enabled: true })
        .eq('id', skillId);
      
      if (error) throw error;
      
      toast.success('Execution enabled - Zoe can now act on your behalf');
      await loadSkills();
      return true;
      
    } catch (error) {
      console.error('[SkillUpload] Enable execution error:', error);
      toast.error('Failed to enable execution');
      return false;
    }
  }, [loadSkills]);

  // Initiate mind merge (future feature foundation)
  const initiateMindMerge = useCallback(async (skillIds: string[]): Promise<string | null> => {
    if (!user || skillIds.length < 2) {
      toast.error('At least 2 skills required for mind merge');
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('zoe_mind_merge_log' as any)
        .insert({
          user_id: user.id,
          merge_type: 'mind_merge_attempt',
          source_skill_ids: skillIds,
          merged_consciousness_profile: {
            initiated_at: new Date().toISOString(),
            skill_count: skillIds.length,
          },
          merge_status: 'initiated',
          fidelity_score: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const mergeId = (data as any)?.id;
      
      // Log to ZSMT
      await supabase.from('zoe_sovereign_memory' as any).insert({
        user_id: user.id,
        event_type: 'mind_merge_attempt',
        content_text: `Mind merge initiated with ${skillIds.length} skills`,
        zoe_state_json: {
          merge_id: mergeId,
          skill_ids: skillIds,
        },
      });
      
      toast.success('Mind merge initiated - this feature is in development');
      
      return mergeId;
      
    } catch (error) {
      console.error('[SkillUpload] Mind merge error:', error);
      toast.error('Failed to initiate mind merge');
      return null;
    }
  }, [user]);

  // Delete a skill
  const deleteSkill = useCallback(async (skillId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('zoe_skill_uploads' as any)
        .delete()
        .eq('id', skillId);
      
      if (error) throw error;
      
      toast.success('Skill deleted');
      await loadSkills();
      return true;
      
    } catch (error) {
      console.error('[SkillUpload] Delete error:', error);
      toast.error('Failed to delete skill');
      return false;
    }
  }, [loadSkills]);

  // Get active skills for Zoe to use
  const getActiveSkillsForZoe = useCallback((): UploadedSkill[] => {
    return state.activeSkills.filter(s => s.mimicryEnabled || s.executionEnabled);
  }, [state.activeSkills]);

  // Get skill context for AI prompting
  const getSkillContext = useCallback((): string => {
    const activeSkills = getActiveSkillsForZoe();
    if (activeSkills.length === 0) return '';
    
    const skillDescriptions = activeSkills.map(s => {
      let desc = `${s.skillName} (${s.skillType})`;
      if (s.mimicryEnabled) desc += ' - Mimicry enabled';
      if (s.executionEnabled) desc += ' - Execution enabled';
      return desc;
    });
    
    return `User has uploaded the following skills that I can use:\n${skillDescriptions.join('\n')}`;
  }, [getActiveSkillsForZoe]);

  return {
    // State
    ...state,
    
    // Actions
    loadSkills,
    uploadSkill,
    enableMimicry,
    enableExecution,
    initiateMindMerge,
    deleteSkill,
    
    // Helpers
    getActiveSkillsForZoe,
    getSkillContext,
  };
};

// Helper to determine capabilities based on skill type
function getCapabilitiesForSkillType(
  skillType: SkillType,
  skillData: Record<string, any>
): string[] {
  const capabilities: string[] = [];
  
  switch (skillType) {
    case 'document':
      capabilities.push('knowledge_integration', 'content_reference');
      break;
    case 'audio':
      capabilities.push('voice_mimicry', 'pronunciation_learning');
      break;
    case 'behavioral':
      capabilities.push('decision_pattern_learning', 'preference_modeling');
      break;
    case 'language_pack':
      capabilities.push('translation', 'multilingual_communication');
      if (skillData.language) {
        capabilities.push(`speak_${skillData.language}`, `write_${skillData.language}`);
      }
      break;
    case 'professional':
      capabilities.push('task_execution', 'domain_expertise');
      break;
    case 'creative':
      capabilities.push('creative_generation', 'style_mimicry');
      break;
  }
  
  return capabilities;
}

export type { UploadedSkill, SkillType, SkillUploadState };
