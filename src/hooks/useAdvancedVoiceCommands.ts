import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZoeAgent } from './useZoeAgent';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { VR_COMMANDS } from './useVRVoiceCommands';
import { SCANNER_VOICE_COMMANDS } from './useFeatureScanner';

/**
 * ADVANCED VOICE COMMANDS SYSTEM
 * Extended voice command capabilities for enhanced user experience
 * Includes VR World voice control, Feature Scanner integration
 */

export const useAdvancedVoiceCommands = () => {
  const navigate = useNavigate();
  const { executeCommand } = useZoeAgent();

  const processVoiceCommand = useCallback(async (command: string) => {
    const lowerCommand = command.toLowerCase().trim();

    // Special triggers
    if (lowerCommand.includes('universal document')) {
      // Dispatch custom event to open Universal Document Hub
      window.dispatchEvent(new CustomEvent('open-universal-documents'));
      toast.success("Opening Universal Document Hub");
      return true;
    }

    // Zoe Intelligence commands
    if (lowerCommand.includes('zoe intelligence') || 
        lowerCommand.includes('intelligence dashboard') ||
        lowerCommand.includes('show intelligence') ||
        lowerCommand.includes('my intelligence')) {
      // Dispatch custom event to open Zoe Intelligence
      window.dispatchEvent(new CustomEvent('open-zoe-intelligence'));
      toast.success("Opening Zoe Intelligence Dashboard");
      speakAsZoe('Opening your Intelligence Dashboard. Here you can see what I have learned about you, track your goals, and view proactive suggestions.');
      return true;
    }

    // Navigation commands
    if (lowerCommand.includes('go to') || lowerCommand.includes('open') || lowerCommand.includes('navigate')) {
      if (lowerCommand.includes('home')) {
        navigate('/');
        speakAsZoe('Navigating to home');
      } else if (lowerCommand.includes('profile')) {
        navigate('/profile');
        speakAsZoe('Opening your profile');
      } else if (lowerCommand.includes('chat') || lowerCommand.includes('messages')) {
        navigate('/chat');
        speakAsZoe('Opening chat');
      } else if (lowerCommand.includes('huddle')) {
        navigate('/huddle');
        speakAsZoe('Opening huddle');
      } else if (lowerCommand.includes('timeline')) {
        navigate('/timeline');
        speakAsZoe('Opening universal timeline');
      } else if (lowerCommand.includes('webdrop') || lowerCommand.includes('architect')) {
        navigate('/webdrop');
        speakAsZoe('Opening Zoe AI Architect');
      } else if (lowerCommand.includes('camera')) {
        navigate('/camera');
        speakAsZoe('Opening camera');
      } else if (lowerCommand.includes('ai companion')) {
        navigate('/ai-companion');
        speakAsZoe('Opening AI companion');
      } else if (lowerCommand.includes('about') || lowerCommand.includes('terms')) {
        navigate('/about');
        speakAsZoe('Opening about page');
      } else if (lowerCommand.includes('security')) {
        navigate('/security');
        speakAsZoe('Opening security settings');
      }
      return true;
    }

    // SOLAR SYSTEM EXPLORER COMMANDS - Jarvis-like control
    if (lowerCommand.includes('heliosphere') || 
        lowerCommand.includes('solar system') || 
        lowerCommand.includes('explore space')) {
      // Dispatch to open Heliosphere from timeline
      window.dispatchEvent(new CustomEvent('timeline-open-heliosphere'));
      speakAsZoe('Activating 4K Heliosphere Explorer. Prepare for 360-degree cosmic navigation.');
      return true;
    }

    // Solar System specific commands
    if (lowerCommand.includes('zoom') || 
        lowerCommand.includes('enhance') || 
        lowerCommand.includes('reset view') ||
        lowerCommand.includes('show sun') ||
        lowerCommand.includes('show earth') ||
        lowerCommand.includes('show mars') ||
        lowerCommand.includes('show jupiter') ||
        lowerCommand.includes('show saturn') ||
        lowerCommand.includes('select') ||
        lowerCommand.includes('explore planet')) {
      // Forward command to Solar System component
      window.dispatchEvent(new CustomEvent('zoe-command', {
        detail: { command: lowerCommand }
      }));
      return true;
    }

    // ZOE DREAMS AI COMMANDS - Jarvis-like control
    if (lowerCommand.includes('dreams') || 
        lowerCommand.includes('dream analysis') || 
        lowerCommand.includes('analyze dream')) {
      // Dispatch to open Dreams AI from timeline
      window.dispatchEvent(new CustomEvent('timeline-open-dreams'));
      speakAsZoe('Opening Zoe Dreams AI. Your personal dream analysis and pattern recognition system.');
      return true;
    }

    // Dreams AI specific commands
    if (lowerCommand.includes('analyze my dream') ||
        lowerCommand.includes('save dream') ||
        lowerCommand.includes('show journal') ||
        lowerCommand.includes('show analysis') ||
        lowerCommand.includes('show patterns') ||
        lowerCommand.includes('show community')) {
      // Forward command to Dreams AI component
      window.dispatchEvent(new CustomEvent('zoe-command', {
        detail: { command: lowerCommand }
      }));
      return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ZOE FEATURE SCANNER COMMANDS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Check if command matches any scanner pattern
    for (const cmd of SCANNER_VOICE_COMMANDS) {
      if (cmd.pattern.test(lowerCommand)) {
        window.dispatchEvent(new CustomEvent('zoe-scanner-command', { 
          detail: { command: lowerCommand, action: cmd.action } 
        }));
        window.dispatchEvent(new CustomEvent('open-feature-scanner'));
        toast.success(`Scanner: ${cmd.description}`);
        return true;
      }
    }

    // Platform diagnostics commands (fallback)
    if (lowerCommand.includes('scan platform') || lowerCommand.includes('check health') || lowerCommand.includes('diagnose')) {
      window.dispatchEvent(new CustomEvent('open-feature-scanner'));
      window.dispatchEvent(new CustomEvent('zoe-scanner-command', { detail: { action: 'full_scan' } }));
      speakAsZoe('Running comprehensive platform diagnostics.');
      return true;
    }

    // Export commands
    if (lowerCommand.includes('export documentation') || lowerCommand.includes('download docs')) {
      speakAsZoe('Generating comprehensive platform documentation');
      toast.info('Preparing documentation export...');
      return true;
    }

    // Content creation commands
    if (lowerCommand.includes('create post') || lowerCommand.includes('new post')) {
      speakAsZoe('Opening post creation');
      // Trigger post modal
      return true;
    }

    // Search commands
    if (lowerCommand.includes('search for') || lowerCommand.includes('find')) {
      const searchQuery = lowerCommand.replace(/search for|find/gi, '').trim();
      speakAsZoe(`Searching for ${searchQuery}`);
      // Trigger search
      return true;
    }

    // System status commands
    if (lowerCommand.includes('what\'s my status') || lowerCommand.includes('how am i doing')) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_points, current_tier')
          .single();

        if (profile) {
          speakAsZoe(`You're in ${profile.current_tier || 'no'} tier with ${profile.total_points || 0} points`);
        }
      } catch (error) {
        speakAsZoe('Unable to fetch your status at the moment');
      }
      return true;
    }

    // Notifications commands
    if (lowerCommand.includes('read notifications') || lowerCommand.includes('what\'s new')) {
      speakAsZoe('Checking your notifications');
      try {
        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('read', false)
          .limit(5);

        if (notifications && notifications.length > 0) {
          speakAsZoe(`You have ${notifications.length} unread notifications`);
        } else {
          speakAsZoe('No new notifications');
        }
      } catch (error) {
        speakAsZoe('Unable to fetch notifications');
      }
      return true;
    }

    // Help commands
    if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
      speakAsZoe('I can help you navigate the platform, create content, check your status, run diagnostics, export documentation, explore the solar system, analyze your dreams, control VR world, and much more. Just ask me anything!');
      return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VR WORLD VOICE COMMANDS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // VR World Entry Commands
    if (lowerCommand.match(/(?:zoe\s+)?(?:open|enter|launch|activate|start)\s+(?:vr|vr\s+world|virtual\s+reality|omega\s+world)/i)) {
      navigate('/zoe-omega');
      speakAsZoe('Entering VR OMEGA World. Prepare for immersive experience.');
      toast.success('Opening VR OMEGA World');
      return true;
    }

    // VR Voice Controls Activation
    if (lowerCommand.match(/(?:zoe\s+)?(?:activate|enable|start)\s+(?:vr\s+)?voice\s+controls?/i)) {
      window.dispatchEvent(new CustomEvent('vr-voice-command', { detail: { action: 'activate_voice' } }));
      speakAsZoe('VR voice controls activated. I am listening for your commands.');
      toast.success('VR Voice Controls Activated');
      return true;
    }

    // VR Movement Commands - Forward to VR system
    if (lowerCommand.match(/(?:zoe\s+)?(?:walk|run|jump|fly|drive|sprint|jog|hover|land|glide)\s*/i)) {
      for (const cmd of VR_COMMANDS) {
        if (cmd.pattern.test(lowerCommand)) {
          window.dispatchEvent(new CustomEvent('vr-voice-command', { 
            detail: { action: cmd.action, command: lowerCommand, category: cmd.category } 
          }));
          speakAsZoe(cmd.voiceResponse);
          toast.success(`VR: ${cmd.description}`, { duration: 2000 });
          return true;
        }
      }
    }

    // VR Build/Create Commands
    if (lowerCommand.match(/(?:zoe\s+)?(?:build|create|spawn|plant)\s+/i)) {
      for (const cmd of VR_COMMANDS) {
        if (cmd.pattern.test(lowerCommand)) {
          window.dispatchEvent(new CustomEvent('vr-voice-command', { 
            detail: { action: cmd.action, command: lowerCommand, category: cmd.category } 
          }));
          speakAsZoe(cmd.voiceResponse);
          toast.success(`VR: ${cmd.description}`, { duration: 2000 });
          return true;
        }
      }
    }

    // VR Fix/Repair Commands
    if (lowerCommand.match(/(?:zoe\s+)?(?:fix|repair|restore)\s+/i)) {
      for (const cmd of VR_COMMANDS) {
        if (cmd.pattern.test(lowerCommand)) {
          window.dispatchEvent(new CustomEvent('vr-voice-command', { 
            detail: { action: cmd.action, command: lowerCommand, category: cmd.category } 
          }));
          speakAsZoe(cmd.voiceResponse);
          toast.success(`VR: ${cmd.description}`, { duration: 2000 });
          return true;
        }
      }
    }

    // VR Environment Commands
    if (lowerCommand.match(/(?:zoe\s+)?(?:set|change)\s+(?:time|weather)/i)) {
      for (const cmd of VR_COMMANDS) {
        if (cmd.pattern.test(lowerCommand)) {
          window.dispatchEvent(new CustomEvent('vr-voice-command', { 
            detail: { action: cmd.action, command: lowerCommand, category: cmd.category } 
          }));
          speakAsZoe(cmd.voiceResponse);
          toast.success(`VR: ${cmd.description}`, { duration: 2000 });
          return true;
        }
      }
    }

    // VR Control Commands (look, zoom, camera)
    if (lowerCommand.match(/(?:zoe\s+)?(?:look|zoom|reset\s+view|first\s+person|third\s+person)/i)) {
      for (const cmd of VR_COMMANDS) {
        if (cmd.pattern.test(lowerCommand)) {
          window.dispatchEvent(new CustomEvent('vr-voice-command', { 
            detail: { action: cmd.action, command: lowerCommand, category: cmd.category } 
          }));
          speakAsZoe(cmd.voiceResponse);
          toast.success(`VR: ${cmd.description}`, { duration: 2000 });
          return true;
        }
      }
    }

    // Show VR Commands
    if (lowerCommand.match(/(?:zoe\s+)?(?:show|display)\s+(?:vr\s+)?commands?/i)) {
      window.dispatchEvent(new CustomEvent('vr-voice-command', { detail: { action: 'show_commands' } }));
      speakAsZoe('Displaying VR voice commands panel.');
      return true;
    }

    // Heliosphere Explorer commands
    if (lowerCommand.includes('solar system') || 
        lowerCommand.includes('heliosphere') || 
        lowerCommand.includes('explore planets') ||
        lowerCommand.includes('show planets')) {
      navigate('/universal-timeline');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('timeline-open-heliosphere'));
        speakAsZoe('Opening 4K Heliosphere Explorer with interactive solar system visualization');
      }, 500);
      return true;
    }

    // Zoe Dreams AI commands
    if (lowerCommand.includes('zoe dreams') || 
        lowerCommand.includes('dream analysis') || 
        lowerCommand.includes('analyze my dreams') ||
        lowerCommand.includes('dream journal')) {
      navigate('/universal-timeline');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('timeline-open-dreams'));
        speakAsZoe('Opening Zoe Dreams AI for dream analysis and pattern recognition');
      }, 500);
      return true;
    }

    // Fallback to Zoe AI agent for complex queries
    try {
      await executeCommand(command);
      return true;
    } catch (error) {
      speakAsZoe('I\'m sorry, I didn\'t understand that command. Could you try rephrasing?');
      return false;
    }
  }, [navigate, executeCommand]);

  return { processVoiceCommand };
};
