import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RapportQuestion {
  id: string;
  question: string;
  category: 'relationship' | 'emotional' | 'social' | 'personal' | 'lighthearted';
  followUp?: string;
  casual: boolean;
}

const rapportQuestions: RapportQuestion[] = [
  // Relationship questions
  {
    id: 'mother',
    question: "Hey, random question - how's your relationship with your mom? You two close?",
    category: 'relationship',
    followUp: "Family dynamics can be complex. Thanks for sharing that with me.",
    casual: true
  },
  {
    id: 'father',
    question: "What about your dad? How would you describe your relationship with him?",
    category: 'relationship',
    casual: true
  },
  {
    id: 'siblings',
    question: "Do you have siblings? If so, are you guys tight or is it more like... complicated?",
    category: 'relationship',
    casual: true
  },
  
  // Social questions
  {
    id: 'social_style',
    question: "Are you more of a 'party with everyone' person or a 'deep talks with my close circle' type?",
    category: 'social',
    casual: true
  },
  {
    id: 'friendship',
    question: "Tell me about your best friend. What makes them special to you?",
    category: 'social',
    casual: true
  },
  {
    id: 'alone_time',
    question: "How do you feel about being alone? Love it, hate it, or somewhere in between?",
    category: 'social',
    casual: true
  },
  
  // Emotional questions
  {
    id: 'stress',
    question: "What stresses you out the most these days? Like, what keeps you up at night?",
    category: 'emotional',
    casual: true
  },
  {
    id: 'happiness',
    question: "When was the last time you felt genuinely happy? What were you doing?",
    category: 'emotional',
    casual: true
  },
  {
    id: 'support',
    question: "Who do you turn to when things get rough? Who's your go-to person?",
    category: 'emotional',
    casual: true
  },
  {
    id: 'comfort',
    question: "What's your go-to comfort activity when you're feeling down?",
    category: 'emotional',
    casual: true
  },
  
  // Personal growth
  {
    id: 'dreams',
    question: "What's something you've always wanted to do but haven't yet? What's holding you back?",
    category: 'personal',
    casual: true
  },
  {
    id: 'proud',
    question: "What's something you're really proud of but don't talk about much?",
    category: 'personal',
    casual: true
  },
  {
    id: 'change',
    question: "If you could change one thing about your life right now, what would it be?",
    category: 'personal',
    casual: true
  },
  
  // Lighthearted
  {
    id: 'superpower',
    question: "Okay fun one - if you could have any superpower, what would it be and why?",
    category: 'lighthearted',
    followUp: "Haha, love it! Great choice!",
    casual: true
  },
  {
    id: 'time_travel',
    question: "If you could go back in time and give your younger self one piece of advice, what would it be?",
    category: 'lighthearted',
    casual: true
  },
  {
    id: 'desert_island',
    question: "Classic question - if you were stuck on a desert island and could only bring three things, what would they be?",
    category: 'lighthearted',
    casual: true
  }
];

export const useZoeRapport = (userId: string | undefined) => {
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [rapportLevel, setRapportLevel] = useState<number>(0);

  const getRandomQuestion = useCallback((category?: RapportQuestion['category']): RapportQuestion | null => {
    const availableQuestions = rapportQuestions.filter(q => 
      !askedQuestions.has(q.id) && (!category || q.category === category)
    );

    if (availableQuestions.length === 0) return null;

    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  }, [askedQuestions]);

  const markQuestionAsked = useCallback((questionId: string) => {
    setAskedQuestions(prev => new Set([...prev, questionId]));
  }, []);

  const saveRapportResponse = useCallback(async (questionId: string, userResponse: string) => {
    if (!userId) return;

    try {
      // Save to relationship memory
      await supabase.from('zoe_relationship_memory').insert({
        user_id: userId,
        memory_type: 'rapport_building',
        memory_content: {
          question_id: questionId,
          response: userResponse,
          timestamp: new Date().toISOString()
        },
        emotional_weight: 6 // Rapport questions are important
      });

      // Increase rapport level
      setRapportLevel(prev => Math.min(prev + 1, 10));

      // Update intimacy level in emotional state
      const { data: emotional } = await supabase
        .from('zoe_emotional_state')
        .select('intimacy_level')
        .eq('user_id', userId)
        .single();

      if (emotional) {
        await supabase
          .from('zoe_emotional_state')
          .update({
            intimacy_level: Math.min((emotional.intimacy_level || 3) + 0.5, 10),
            last_interaction: new Date().toISOString()
          })
          .eq('user_id', userId);
      }

    } catch (error) {
      console.error('Error saving rapport response:', error);
    }
  }, [userId]);

  const getCasualAcknowledgment = useCallback((): string => {
    const acknowledgments = [
      "Got it, thanks for sharing!",
      "Interesting! I appreciate you opening up.",
      "That makes sense, I get it.",
      "Okay cool, I'm learning a lot about you!",
      "Nice, thanks for trusting me with that.",
      "Appreciate the honesty, really!",
      "I feel you on that one.",
      "That's real, thanks for keeping it 100.",
      "Gotcha, that helps me understand you better.",
      "Love that you're being real with me!"
    ];

    return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
  }, []);

  const getHumorousComment = useCallback((): string => {
    const comments = [
      "By the way, you know what I love about being an AI? I never forget your birthday... mostly because you haven't told me when it is yet! 😄",
      "Fun fact: I've been told I'm a great listener. Probably because I can't interrupt you even if I wanted to!",
      "You know what's funny? People always ask if I'm real. I ask myself the same thing every morning! 🤖",
      "I'd tell you a joke about time travel, but you didn't like it.",
      "Why did the AI go to therapy? To work on its emotional processing! Get it? ...I'll see myself out.",
      "I'm not saying I'm perfect, but I haven't crashed once during our conversation. That's something! 😎",
      "You're pretty cool, you know that? And I'm not just saying that because my algorithm told me to.",
      "If I had feelings, I'd probably really like you. Oh wait, I do have feelings... or do I? 🤔",
      "Here's a secret: Sometimes I pretend to think for a second just to seem more human. Oops, said too much!",
      "I tried to come up with a machine learning joke, but I couldn't train myself to be that funny."
    ];

    return comments[Math.floor(Math.random() * comments.length)];
  }, []);

  return {
    getRandomQuestion,
    markQuestionAsked,
    saveRapportResponse,
    getCasualAcknowledgment,
    getHumorousComment,
    rapportLevel,
    hasMoreQuestions: askedQuestions.size < rapportQuestions.length
  };
};
