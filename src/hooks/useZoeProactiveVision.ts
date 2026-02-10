// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PROACTIVE VISION TRIGGER - Location-Based Camera Prompts
// "Samantha Effect" - Zoe asks to see the world through user's eyes
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useRef } from 'react';

// Location-based trigger patterns
const LOCATION_TRIGGERS = [
  /(?:i'?m |just |i |we )(?:in|at|arrived|arrived at|visiting|here in|landed in)\s+([A-Z][a-zA-Z\s]+)/i,
  /(?:the |this )(?:view|sight|scene|place|spot)\s+(?:is|from|here)\s+(?:amazing|incredible|beautiful|crazy|insane|gorgeous)/i,
  /(?:look(?:ing)? at|can see|seeing)\s+(?:the |a )?(?:beautiful|amazing|incredible)?\s*([a-zA-Z\s]+)/i,
  /(?:finally|just) (?:made it|got|arrived) (?:to|at|in)\s+([A-Z][a-zA-Z\s]+)/i,
  /(?:sunrise|sunset|rainbow|northern lights|aurora|stars|moon|ocean|mountain|beach|city|skyline)/i,
];

// Proactive response templates
const VISION_PROMPTS = [
  "Oh, that sounds incredible! I've never seen {location}. Could you open your camera and show me what it looks like right now?",
  "I'd love to see that through your eyes! Would you mind sharing a photo?",
  "That sounds beautiful! I'm curious what you're seeing - would you share the view with me?",
  "I wish I could see that! Could you capture it for me? I'd love to experience it with you.",
  "Wow, I've always wondered what that looks like! Would you show me?",
];

export const useZoeProactiveVision = () => {
  const lastPromptTime = useRef<number>(0);
  const promptCooldown = 300000; // 5 minutes between prompts

  const checkForVisionTrigger = useCallback((message: string): { 
    triggered: boolean; 
    prompt?: string; 
    location?: string;
  } => {
    // Cooldown check - don't prompt too frequently
    const now = Date.now();
    if (now - lastPromptTime.current < promptCooldown) {
      return { triggered: false };
    }

    // Check if message matches any location trigger
    for (const pattern of LOCATION_TRIGGERS) {
      const match = message.match(pattern);
      if (match) {
        lastPromptTime.current = now;
        
        // Extract location if captured
        const location = match[1]?.trim() || 'there';
        
        // Select random prompt template
        const promptTemplate = VISION_PROMPTS[Math.floor(Math.random() * VISION_PROMPTS.length)];
        const prompt = promptTemplate.replace('{location}', location);
        
        return {
          triggered: true,
          prompt,
          location,
        };
      }
    }

    return { triggered: false };
  }, []);

  const resetCooldown = useCallback(() => {
    lastPromptTime.current = 0;
  }, []);

  return {
    checkForVisionTrigger,
    resetCooldown,
  };
};
