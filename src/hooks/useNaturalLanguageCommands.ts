import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface NLPCommandResult {
  matched: boolean;
  command?: string;
  action?: () => Promise<void>;
}

export const useNaturalLanguageCommands = (userId: string | undefined) => {
  const navigate = useNavigate();

  const processNaturalLanguage = useCallback(async (text: string): Promise<NLPCommandResult> => {
    const lower = text.toLowerCase().trim();

    // Remove common prefixes
    const cleanText = lower
      .replace(/^(hey |ok |hi |hello )?zoe,?\s*/i, '')
      .replace(/^(can you |could you |please |would you )\s*/i, '')
      .trim();

    // Navigation patterns
    if (/show me (my )?friends|see (my )?friends|view friends/i.test(cleanText)) {
      navigate('/huddle');
      return { matched: true, command: 'show friends' };
    }

    if (/show me (my )?profile|see (my )?profile|view (my )?profile/i.test(cleanText)) {
      navigate('/profile');
      return { matched: true, command: 'show profile' };
    }

    if (/show me (my )?feed|see (my )?posts|view (my )?feed|go to home/i.test(cleanText)) {
      navigate('/home');
      return { matched: true, command: 'show feed' };
    }

    if (/show me (my )?messages|see (my )?messages|view (my )?chats?/i.test(cleanText)) {
      navigate('/chat');
      return { matched: true, command: 'show messages' };
    }

    // Content creation patterns
    if (/create a post (about |saying )?(.+)/i.test(cleanText)) {
      const match = cleanText.match(/create a post (about |saying )?(.+)/i);
      if (match && userId) {
        const content = match[2];
        await supabase.from('posts').insert({
          user_id: userId,
          content,
          visibility: 'global'
        });
        return { matched: true, command: `create post: ${content}` };
      }
    }

    // Friend interaction patterns
    if (/send (a )?message to (.+)/i.test(cleanText)) {
      const match = cleanText.match(/send (a )?message to (.+)/i);
      if (match) {
        const friendName = match[2];
        // Find friend by name
        const { data: friend } = await supabase
          .from('profiles')
          .select('user_id')
          .ilike('display_name', `%${friendName}%`)
          .single();
        
        if (friend) {
          navigate(`/chat/${friend.user_id}`);
          return { matched: true, command: `message ${friendName}` };
        }
      }
    }

    // Schedule patterns
    if (/schedule (a )?post for (tomorrow|next week|tonight)/i.test(cleanText)) {
      return { 
        matched: true, 
        command: 'schedule post',
        action: async () => {
          // This would integrate with a scheduling system
          console.log('Schedule post feature would be triggered');
        }
      };
    }

    // Status updates
    if (/(update|change|set) (my )?status to (.+)/i.test(cleanText)) {
      const match = cleanText.match(/(update|change|set) (my )?status to (.+)/i);
      if (match && userId) {
        const newStatus = match[3];
        await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('user_id', userId);
        return { matched: true, command: `set status: ${newStatus}` };
      }
    }

    // Bio updates
    if (/(update|change|set) (my )?bio to (.+)/i.test(cleanText)) {
      const match = cleanText.match(/(update|change|set) (my )?bio to (.+)/i);
      if (match && userId) {
        const newBio = match[3];
        await supabase
          .from('profiles')
          .update({ bio: newBio })
          .eq('user_id', userId);
        return { matched: true, command: `set bio: ${newBio}` };
      }
    }

    // Search patterns
    if (/(find|search for|look for|show me) posts (about |containing )?(.+)/i.test(cleanText)) {
      const match = cleanText.match(/(find|search for|look for|show me) posts (about |containing )?(.+)/i);
      if (match) {
        const query = match[3];
        navigate(`/home?search=${encodeURIComponent(query)}`);
        return { matched: true, command: `search posts: ${query}` };
      }
    }

    if (/(find|search for|look for|show me) users? (named |called )?(.+)/i.test(cleanText)) {
      const match = cleanText.match(/(find|search for|look for|show me) users? (named |called )?(.+)/i);
      if (match) {
        const query = match[3];
        navigate(`/huddle?search=${encodeURIComponent(query)}`);
        return { matched: true, command: `search users: ${query}` };
      }
    }

    // Help patterns
    if (/what can (you|I) do|help me|how do I|show me commands/i.test(cleanText)) {
      navigate('/voice-commands');
      return { matched: true, command: 'show help' };
    }

    return { matched: false };
  }, [navigate, userId]);

  return { processNaturalLanguage };
};