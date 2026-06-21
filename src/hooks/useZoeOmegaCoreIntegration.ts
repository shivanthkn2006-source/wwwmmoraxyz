// ═══════════════════════════════════════════════════════════════════════════════
// ZOE OMEGA CORE INTEGRATION - Unified access to all OMEGA/VR/Bi-Cameral data
// Real-time DHF streaming with upload/download capabilities
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// Types for OMEGA Core data
export interface MemoryEngram {
  id: string;
  content: string;
  emotion: string;
  intensity: number;
  timestamp: Date;
  eventType: string;
}

export interface ECNSnapshot {
  id: string;
  primaryEmotion: string;
  stressLevel: number;
  valence: number;
  engagementScore: number;
  actionTendency: string;
  timestamp: Date;
}

export interface BiCameralState {
  logicHemisphere: {
    phase: 'OBSERVE' | 'ORIENT' | 'DECIDE' | 'ACT';
    content: string;
    timestamp: number;
  }[];
  emotionHemisphere: {
    emotion: string;
    intensity: number;
    content: string;
  };
  conflictActive: boolean;
  conflictData?: {
    logicSuggestion: string;
    emotionSuggestion: string;
  };
}

export interface VRInteraction {
  id: string;
  type: 'engram_select' | 'holo_wall_view' | 'bio_sync' | 'movement' | 'photo' | 'selfie';
  data: Record<string, any>;
  timestamp: Date;
}

export interface AvatarProfile {
  id: string;
  avatarName: string;
  avatarType: 'self' | 'family' | 'friend' | 'ai_companion' | 'custom';
  sourceUserId?: string;
  relationshipType?: string;
  avatarData: Record<string, any>;
  photos: string[];
  selfies: string[];
  vrInteractions: VRInteraction[];
  personalityTraits: Record<string, any>;
}

export interface OmegaCoreState {
  memoryEngrams: MemoryEngram[];
  ecnSnapshots: ECNSnapshot[];
  biCameralState: BiCameralState;
  vrInteractions: VRInteraction[];
  avatarProfiles: AvatarProfile[];
  integrityLevel: number;
  syncStatus: 'pending' | 'synced' | 'uploading' | 'downloading';
  lastSyncAt: Date | null;
}

export interface UploadProgress {
  total: number;
  completed: number;
  currentItem: string;
  status: 'idle' | 'uploading' | 'complete' | 'error';
}

export interface DownloadProgress {
  total: number;
  completed: number;
  currentItem: string;
  status: 'idle' | 'downloading' | 'complete' | 'error';
}

export const useZoeOmegaCoreIntegration = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [omegaCoreState, setOmegaCoreState] = useState<OmegaCoreState>({
    memoryEngrams: [],
    ecnSnapshots: [],
    biCameralState: {
      logicHemisphere: [],
      emotionHemisphere: { emotion: 'neutral', intensity: 0.5, content: '' },
      conflictActive: false
    },
    vrInteractions: [],
    avatarProfiles: [],
    integrityLevel: 100,
    syncStatus: 'pending',
    lastSyncAt: null
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    total: 0, completed: 0, currentItem: '', status: 'idle'
  });
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    total: 0, completed: 0, currentItem: '', status: 'idle'
  });

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Load all OMEGA Core data
  // ═══════════════════════════════════════════════════════════════════════════════
  const loadOmegaCoreData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Load memory engrams from ZSMT
      const { data: zsmtData } = await supabase
        .from('zoe_sovereign_memory')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const memoryEngrams: MemoryEngram[] = (zsmtData || []).map(item => {
        const zoeState = item.zoe_state_json as Record<string, any> | null;
        const ecn = zoeState?.ecn as Record<string, any> | null;
        return {
          id: item.id,
          content: item.content_text || '',
          emotion: ecn?.primary_emotion || 'neutral',
          intensity: item.system_stability_score || 0.5,
          timestamp: new Date(item.created_at),
          eventType: item.event_type
        };
      });

      // Load ECN history
      const { data: ecnData } = await supabase
        .from('ecn_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(30);

      const ecnSnapshots: ECNSnapshot[] = (ecnData || []).map(item => ({
        id: item.id,
        primaryEmotion: item.primary_emotion,
        stressLevel: item.stress_level,
        valence: item.valence,
        engagementScore: item.engagement_score,
        actionTendency: item.action_tendency,
        timestamp: new Date(item.recorded_at)
      }));

      // Load OMEGA core data
      const { data: omegaData } = await supabase
        .from('zoe_omega_core')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const vrInteractions: VRInteraction[] = (omegaData || [])
        .filter(item => item.core_type === 'vr_interaction')
        .map(item => ({
          id: item.id,
          type: (item.data_payload as any)?.type || 'movement',
          data: item.data_payload as Record<string, any>,
          timestamp: new Date(item.created_at)
        }));

      // Load avatar profiles
      const { data: avatarData } = await supabase
        .from('zoe_avatar_profiles')
        .select('*')
        .eq('user_id', user.id);

      const avatarProfiles: AvatarProfile[] = (avatarData || []).map(item => ({
        id: item.id,
        avatarName: item.avatar_name,
        avatarType: item.avatar_type as AvatarProfile['avatarType'],
        sourceUserId: item.source_user_id || undefined,
        relationshipType: item.relationship_type || undefined,
        avatarData: item.avatar_data as Record<string, any>,
        photos: (item.photos as unknown as string[]) || [],
        selfies: (item.selfies as unknown as string[]) || [],
        vrInteractions: (item.vr_interactions as unknown as VRInteraction[]) || [],
        personalityTraits: item.personality_traits as Record<string, any>
      }));

      // Get latest integrity level
      const latestOmega = omegaData?.find(d => d.integrity_level !== null);
      const integrityLevel = latestOmega?.integrity_level || 100;

      setOmegaCoreState(prev => ({
        ...prev,
        memoryEngrams,
        ecnSnapshots,
        vrInteractions,
        avatarProfiles,
        integrityLevel,
        syncStatus: 'synced',
        lastSyncAt: new Date()
      }));

    } catch (error) {
      console.error('[OMEGA Core] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Real-time DHF streaming subscription
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user) return;

    const channelName = `omega-core-realtime-${user.id}-${Date.now()}`;
    
    realtimeChannelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'zoe_sovereign_memory',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newItem = payload.new as any;
          const zoeState = newItem.zoe_state_json as Record<string, any> | null;
          const ecn = zoeState?.ecn as Record<string, any> | null;
          
          const newEngram: MemoryEngram = {
            id: newItem.id,
            content: newItem.content_text || '',
            emotion: ecn?.primary_emotion || 'neutral',
            intensity: newItem.system_stability_score || 0.5,
            timestamp: new Date(newItem.created_at),
            eventType: newItem.event_type
          };

          setOmegaCoreState(prev => ({
            ...prev,
            memoryEngrams: [newEngram, ...prev.memoryEngrams.slice(0, 49)]
          }));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ecn_history',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newItem = payload.new as any;
          const newSnapshot: ECNSnapshot = {
            id: newItem.id,
            primaryEmotion: newItem.primary_emotion,
            stressLevel: newItem.stress_level,
            valence: newItem.valence,
            engagementScore: newItem.engagement_score,
            actionTendency: newItem.action_tendency,
            timestamp: new Date(newItem.recorded_at)
          };

          setOmegaCoreState(prev => ({
            ...prev,
            ecnSnapshots: [newSnapshot, ...prev.ecnSnapshots.slice(0, 29)]
          }));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'zoe_omega_core',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newItem = payload.new as any;
          if (newItem.core_type === 'vr_interaction') {
            const newVR: VRInteraction = {
              id: newItem.id,
              type: (newItem.data_payload as any)?.type || 'movement',
              data: newItem.data_payload,
              timestamp: new Date(newItem.created_at)
            };
            setOmegaCoreState(prev => ({
              ...prev,
              vrInteractions: [newVR, ...prev.vrInteractions]
            }));
          }
        }
      })
      .subscribe();

    // Initial load
    loadOmegaCoreData();

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [user, loadOmegaCoreData]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Upload user data to OMEGA Core
  // ═══════════════════════════════════════════════════════════════════════════════
  const uploadToOmegaCore = useCallback(async () => {
    if (!user) return false;

    setUploadProgress({ total: 5, completed: 0, currentItem: 'Preparing data...', status: 'uploading' });
    setOmegaCoreState(prev => ({ ...prev, syncStatus: 'uploading' }));

    try {
      // Step 1: Gather all user behavioral events
      setUploadProgress(prev => ({ ...prev, currentItem: 'Uploading behavioral events...', completed: 1 }));
      const { data: behavioralData } = await supabase
        .from('behavioral_events')
        .select('*')
        .eq('user_id', user.id)
        .limit(500);

      await supabase.from('zoe_omega_core').insert({
        user_id: user.id,
        core_type: 'uploaded_intelligence',
        data_payload: { 
          type: 'behavioral_events', 
          count: behavioralData?.length || 0,
          snapshot: behavioralData?.slice(0, 100)
        },
        sync_status: 'synced',
        dhf_linked: true
      });

      // Step 2: Upload ECN history summary
      setUploadProgress(prev => ({ ...prev, currentItem: 'Uploading ECN history...', completed: 2 }));
      const { data: ecnData } = await supabase
        .from('ecn_history')
        .select('*')
        .eq('user_id', user.id)
        .limit(100);

      await supabase.from('zoe_omega_core').insert({
        user_id: user.id,
        core_type: 'ecn_snapshot',
        data_payload: { 
          type: 'ecn_history_snapshot',
          count: ecnData?.length || 0,
          data: ecnData
        },
        sync_status: 'synced',
        dhf_linked: true
      });

      // Step 3: Upload ZSMT data
      setUploadProgress(prev => ({ ...prev, currentItem: 'Uploading memory data...', completed: 3 }));
      const { data: zsmtData } = await supabase
        .from('zoe_sovereign_memory')
        .select('*')
        .eq('user_id', user.id)
        .limit(200);

      await supabase.from('zoe_omega_core').insert({
        user_id: user.id,
        core_type: 'memory_engram',
        data_payload: { 
          type: 'zsmt_snapshot',
          count: zsmtData?.length || 0,
          data: zsmtData
        },
        sync_status: 'synced',
        dhf_linked: true
      });

      // Step 4: Upload relationship data for avatar generation
      setUploadProgress(prev => ({ ...prev, currentItem: 'Uploading relationship data...', completed: 4 }));
      const { data: relationshipData } = await supabase
        .from('user_relationships')
        .select('*')
        .eq('requester_id', user.id);

      if (relationshipData && relationshipData.length > 0) {
        for (const rel of relationshipData) {
          // Get profile for related user
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, display_name, profile_photo_url')
            .eq('user_id', rel.recipient_id)
            .single();
            
          await supabase.from('zoe_avatar_profiles').upsert({
            user_id: user.id,
            avatar_name: profileData?.display_name || 'Unknown',
            avatar_type: 'family',
            source_user_id: rel.recipient_id,
            relationship_type: rel.recipient_label || rel.relationship_type,
            avatar_data: {
              username: profileData?.username,
              photo_url: profileData?.profile_photo_url,
              relationship_status: rel.status
            },
            personality_traits: {}
          }, { onConflict: 'id' });
        }
      }

      // Step 5: Finalize
      setUploadProgress(prev => ({ ...prev, currentItem: 'Finalizing upload...', completed: 5, status: 'complete' }));

      // Log to ZSMT
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'omega_core_upload',
        content_text: 'User data uploaded to OMEGA Core for adaptive learning',
        zoe_state_json: { 
          behavioral_events: behavioralData?.length || 0,
          ecn_snapshots: ecnData?.length || 0,
          memory_engrams: zsmtData?.length || 0,
          relationships: relationshipData?.length || 0
        }
      });

      setOmegaCoreState(prev => ({ ...prev, syncStatus: 'synced', lastSyncAt: new Date() }));
      toast.success('Data uploaded to OMEGA Core successfully!');
      
      // Refresh data
      await loadOmegaCoreData();
      return true;

    } catch (error) {
      console.error('[OMEGA Core] Upload error:', error);
      setUploadProgress(prev => ({ ...prev, status: 'error', currentItem: 'Upload failed' }));
      setOmegaCoreState(prev => ({ ...prev, syncStatus: 'pending' }));
      toast.error('Failed to upload data to OMEGA Core');
      return false;
    }
  }, [user, loadOmegaCoreData]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Download user data from OMEGA Core
  // ═══════════════════════════════════════════════════════════════════════════════
  const downloadFromOmegaCore = useCallback(async () => {
    if (!user) return null;

    setDownloadProgress({ total: 4, completed: 0, currentItem: 'Preparing download...', status: 'downloading' });
    setOmegaCoreState(prev => ({ ...prev, syncStatus: 'downloading' }));

    try {
      // Step 1: Download OMEGA Core data
      setDownloadProgress(prev => ({ ...prev, currentItem: 'Downloading OMEGA Core data...', completed: 1 }));
      const { data: omegaData } = await supabase
        .from('zoe_omega_core')
        .select('*')
        .eq('user_id', user.id);

      // Step 2: Download avatar profiles
      setDownloadProgress(prev => ({ ...prev, currentItem: 'Downloading avatar profiles...', completed: 2 }));
      const { data: avatarData } = await supabase
        .from('zoe_avatar_profiles')
        .select('*')
        .eq('user_id', user.id);

      // Step 3: Download memory engrams
      setDownloadProgress(prev => ({ ...prev, currentItem: 'Downloading memory engrams...', completed: 3 }));
      const { data: zsmtData } = await supabase
        .from('zoe_sovereign_memory')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);

      // Step 4: Package data
      setDownloadProgress(prev => ({ ...prev, currentItem: 'Packaging data...', completed: 4, status: 'complete' }));

      const downloadPackage = {
        exportedAt: new Date().toISOString(),
        userId: user.id,
        omegaCoreData: omegaData,
        avatarProfiles: avatarData,
        memoryEngrams: zsmtData,
        metadata: {
          totalRecords: (omegaData?.length || 0) + (avatarData?.length || 0) + (zsmtData?.length || 0),
          version: '1.0.0'
        }
      };

      // Create downloadable JSON
      const blob = new Blob([JSON.stringify(downloadPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zoe-omega-core-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setOmegaCoreState(prev => ({ ...prev, syncStatus: 'synced' }));
      toast.success('OMEGA Core data downloaded successfully!');

      return downloadPackage;

    } catch (error) {
      console.error('[OMEGA Core] Download error:', error);
      setDownloadProgress(prev => ({ ...prev, status: 'error', currentItem: 'Download failed' }));
      setOmegaCoreState(prev => ({ ...prev, syncStatus: 'pending' }));
      toast.error('Failed to download OMEGA Core data');
      return null;
    }
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Log VR interaction
  // ═══════════════════════════════════════════════════════════════════════════════
  const logVRInteraction = useCallback(async (
    type: VRInteraction['type'],
    data: Record<string, any>
  ) => {
    if (!user) return;

    try {
      await supabase.from('zoe_omega_core').insert({
        user_id: user.id,
        core_type: 'vr_interaction',
        data_payload: { type, ...data },
        integrity_level: omegaCoreState.integrityLevel,
        sync_status: 'synced',
        dhf_linked: true
      });
    } catch (error) {
      console.error('[OMEGA Core] VR interaction log error:', error);
    }
  }, [user, omegaCoreState.integrityLevel]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Update Bi-Cameral state
  // ═══════════════════════════════════════════════════════════════════════════════
  const updateBiCameralState = useCallback((update: Partial<BiCameralState>) => {
    setOmegaCoreState(prev => ({
      ...prev,
      biCameralState: { ...prev.biCameralState, ...update }
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Create avatar from relationship
  // ═══════════════════════════════════════════════════════════════════════════════
  const createAvatarFromRelationship = useCallback(async (
    relationshipUserId: string,
    relationshipType: string,
    avatarName: string
  ) => {
    if (!user) return null;

    try {
      // Get relationship user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', relationshipUserId)
        .single();

      const { data: avatar, error } = await supabase
        .from('zoe_avatar_profiles')
        .insert({
          user_id: user.id,
          avatar_name: avatarName,
          avatar_type: 'family',
          source_user_id: relationshipUserId,
          relationship_type: relationshipType,
          avatar_data: {
            source_profile: profileData
          },
          personality_traits: {},
          photos: [],
          selfies: [],
          vr_interactions: []
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Avatar "${avatarName}" created successfully!`);
      await loadOmegaCoreData();
      return avatar;

    } catch (error) {
      console.error('[OMEGA Core] Create avatar error:', error);
      toast.error('Failed to create avatar');
      return null;
    }
  }, [user, loadOmegaCoreData]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Get context summary for ZoeOrb chat
  // ═══════════════════════════════════════════════════════════════════════════════
  const getOmegaCoreContextForChat = useCallback(() => {
    const latestECN = omegaCoreState.ecnSnapshots[0];
    const recentEngrams = omegaCoreState.memoryEngrams.slice(0, 5);
    const avatarCount = omegaCoreState.avatarProfiles.length;

    return {
      hasOmegaData: omegaCoreState.memoryEngrams.length > 0,
      currentEmotion: latestECN?.primaryEmotion || 'neutral',
      stressLevel: latestECN?.stressLevel || 0,
      integrityLevel: omegaCoreState.integrityLevel,
      recentMemories: recentEngrams.map(e => e.content.slice(0, 50)).join('; '),
      avatarCount,
      biCameralConflictActive: omegaCoreState.biCameralState.conflictActive,
      syncStatus: omegaCoreState.syncStatus,
      lastSyncAt: omegaCoreState.lastSyncAt?.toISOString()
    };
  }, [omegaCoreState]);

  return {
    isLoading,
    omegaCoreState,
    uploadProgress,
    downloadProgress,
    
    // Core functions
    loadOmegaCoreData,
    uploadToOmegaCore,
    downloadFromOmegaCore,
    
    // VR/OMEGA functions
    logVRInteraction,
    updateBiCameralState,
    
    // Avatar functions
    createAvatarFromRelationship,
    
    // Chat integration
    getOmegaCoreContextForChat,
    
    // Convenience accessors
    memoryEngrams: omegaCoreState.memoryEngrams,
    ecnSnapshots: omegaCoreState.ecnSnapshots,
    avatarProfiles: omegaCoreState.avatarProfiles,
    integrityLevel: omegaCoreState.integrityLevel
  };
};
