/**
 * ZOE EXTERNAL SYNC HOOK
 * Phase II: Viral & External Growth Engine
 * Handles platform sync and immediate insight delivery
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type ExternalPlatform = 
  | 'google_workspace' 
  | 'google_calendar' 
  | 'facebook' 
  | 'instagram' 
  | 'twitter' 
  | 'linkedin' 
  | 'spotify' 
  | 'github';

export interface SyncedInsight {
  platform: ExternalPlatform;
  insightType: string;
  summary: string;
  actionSuggestion: string;
  dataPoints: number;
  syncedAt: string;
}

export interface SyncResult {
  success: boolean;
  platform: ExternalPlatform;
  insight: SyncedInsight;
  zoeMessage: string;
  zsmtLogId: string;
}

export interface PlatformConnection {
  platform: ExternalPlatform;
  connected: boolean;
  lastSyncAt: string | null;
  dataPointCount: number;
}

const PLATFORM_DISPLAY_NAMES: Record<ExternalPlatform, string> = {
  google_workspace: 'Google Workspace',
  google_calendar: 'Google Calendar',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  spotify: 'Spotify',
  github: 'GitHub'
};

const PLATFORM_ICONS: Record<ExternalPlatform, string> = {
  google_workspace: '📄',
  google_calendar: '📅',
  facebook: '👤',
  instagram: '📸',
  twitter: '🐦',
  linkedin: '💼',
  spotify: '🎵',
  github: '🐙'
};

export const useZoeExternalSync = () => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncResult[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformConnection[]>([]);

  /**
   * Sync with external platform
   */
  const syncPlatform = useCallback(async (
    platform: ExternalPlatform,
    accessToken?: string
  ): Promise<SyncResult | null> => {
    if (!user) {
      toast.error('Please sign in to sync external platforms');
      return null;
    }

    setIsSyncing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('zoe-external-sync', {
        body: {
          platform,
          accessToken: accessToken || 'demo_token',
          syncScope: 'read_only'
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (error) {
        console.error('External sync error:', error);
        toast.error(`Failed to sync ${PLATFORM_DISPLAY_NAMES[platform]}`);
        return null;
      }

      const result = data as SyncResult;
      setSyncHistory(prev => [result, ...prev.slice(0, 9)]);

      // Show Zoe's insight message
      toast.success(result.zoeMessage, {
        icon: PLATFORM_ICONS[platform],
        duration: 5000,
        description: result.insight.actionSuggestion
      });

      // Update connected platforms
      setConnectedPlatforms(prev => {
        const existing = prev.findIndex(p => p.platform === platform);
        const newConnection: PlatformConnection = {
          platform,
          connected: true,
          lastSyncAt: result.insight.syncedAt,
          dataPointCount: result.insight.dataPoints
        };
        
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newConnection;
          return updated;
        }
        return [...prev, newConnection];
      });

      return result;
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('External sync failed');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  /**
   * Get available platforms
   */
  const getAvailablePlatforms = useCallback(() => {
    return Object.entries(PLATFORM_DISPLAY_NAMES).map(([key, name]) => ({
      id: key as ExternalPlatform,
      name,
      icon: PLATFORM_ICONS[key as ExternalPlatform],
      connected: connectedPlatforms.some(p => p.platform === key && p.connected)
    }));
  }, [connectedPlatforms]);

  /**
   * Get insights from all synced platforms
   */
  const getAllInsights = useCallback(() => {
    return syncHistory.map(result => ({
      ...result.insight,
      zoeMessage: result.zoeMessage
    }));
  }, [syncHistory]);

  /**
   * Disconnect platform (mark as disconnected locally)
   */
  const disconnectPlatform = useCallback((platform: ExternalPlatform) => {
    setConnectedPlatforms(prev => 
      prev.filter(p => p.platform !== platform)
    );
    toast.info(`Disconnected from ${PLATFORM_DISPLAY_NAMES[platform]}`);
  }, []);

  /**
   * Load sync history from ZSMT
   */
  const loadSyncHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('zoe_sovereign_memory')
        .select('zoe_state_json, content_text, created_at')
        .eq('user_id', user.id)
        .eq('event_type', 'dhf_external_sync')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const platforms: PlatformConnection[] = [];
        data.forEach((entry: any) => {
          const state = entry.zoe_state_json;
          if (state?.platform) {
            const existing = platforms.find(p => p.platform === state.platform);
            if (!existing) {
              platforms.push({
                platform: state.platform,
                connected: true,
                lastSyncAt: state.synced_at,
                dataPointCount: state.insight?.dataPoints || 0
              });
            }
          }
        });
        setConnectedPlatforms(platforms);
      }
    } catch (error) {
      console.error('Failed to load sync history:', error);
    }
  }, [user]);

  return {
    syncPlatform,
    getAvailablePlatforms,
    getAllInsights,
    disconnectPlatform,
    loadSyncHistory,
    isSyncing,
    syncHistory,
    connectedPlatforms,
    platformNames: PLATFORM_DISPLAY_NAMES,
    platformIcons: PLATFORM_ICONS
  };
};

export default useZoeExternalSync;
