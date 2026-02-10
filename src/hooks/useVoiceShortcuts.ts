import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface VoiceShortcut {
  id: string;
  shortcut_name: string;
  trigger_phrase: string;
  actions: any[];
  enabled: boolean;
  execution_count: number;
}

export const useVoiceShortcuts = () => {
  const { user } = useAuth();
  const [shortcuts, setShortcuts] = useState<VoiceShortcut[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchShortcuts();
    }
  }, [user?.id]);

  const fetchShortcuts = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('voice_shortcuts')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (!error && data) {
      setShortcuts(data as VoiceShortcut[]);
    }
  };

  const executeShortcut = useCallback(async (shortcutId: string, actions: any[]) => {
    // Execute each action in the shortcut
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'navigate':
            // Navigate to the specified route
            if (action.route) {
              window.location.href = action.route;
            }
            break;
          case 'create_post':
            await supabase.from('posts').insert({
              user_id: user!.id,
              content: action.content,
              visibility: action.visibility || 'global'
            });
            break;
          case 'send_message':
            await supabase.from('messages').insert({
              sender_id: user!.id,
              receiver_id: action.receiver_id,
              content: action.content
            });
            break;
          case 'update_profile':
            await supabase
              .from('profiles')
              .update(action.updates)
              .eq('user_id', user!.id);
            break;
          case 'wait':
            await new Promise(resolve => setTimeout(resolve, action.duration || 1000));
            break;
        }
      } catch (error) {
        console.error('Error executing shortcut action:', error);
      }
    }

    // Increment execution count
    await supabase.rpc('increment_shortcut_execution', { 
      shortcut_uuid: shortcutId 
    });
  }, [user]);

  const matchShortcut = useCallback((text: string): VoiceShortcut | null => {
    const lower = text.toLowerCase().trim();
    
    for (const shortcut of shortcuts) {
      if (lower.includes(shortcut.trigger_phrase.toLowerCase())) {
        return shortcut;
      }
    }
    
    return null;
  }, [shortcuts]);

  const createShortcut = useCallback(async (
    name: string,
    trigger: string,
    actions: any[]
  ) => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('voice_shortcuts')
      .insert({
        user_id: user.id,
        shortcut_name: name,
        trigger_phrase: trigger,
        actions
      })
      .select()
      .single();

    if (!error && data) {
      setShortcuts(prev => [...prev, data as VoiceShortcut]);
      return data;
    }

    return null;
  }, [user]);

  return {
    shortcuts,
    matchShortcut,
    executeShortcut,
    createShortcut,
    refreshShortcuts: fetchShortcuts,
  };
};