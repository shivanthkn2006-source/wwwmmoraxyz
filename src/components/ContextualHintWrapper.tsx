import { ReactNode } from 'react';
import { ContextualHint } from '@/components/ContextualHint';
import { MessageSquare, Bot, Users } from 'lucide-react';

interface ContextualHintWrapperProps {
  children: ReactNode;
  hintType?: 'companion' | 'agent' | 'huddle';
}

export const ContextualHintWrapper = ({ children, hintType }: ContextualHintWrapperProps) => {
  const hints = {
    companion: {
      hintKey: 'companion_chat_intro',
      title: 'Meet Zoe - Your AI Companion',
      content: "I'm Zoe, your personal AI companion! Chat with me naturally, ask questions, or just have a conversation. I remember our previous chats and can help you with various tasks.",
      voiceText: "Hi! I'm Zoe, your AI companion. Feel free to chat with me about anything!",
      icon: <MessageSquare className="w-5 h-5 text-primary" />,
      position: 'top' as const,
      maxShowCount: 2,
    },
    agent: {
      hintKey: 'agent_mode_intro',
      title: 'Agent Mode Activated!',
      content: "I'm now in autonomous agent mode. I can perform complex tasks, manage content, and help moderate the platform. Just give me a goal and I'll work on it step by step!",
      voiceText: "Agent mode activated! I can now handle complex tasks autonomously. What would you like me to work on?",
      icon: <Bot className="w-5 h-5 text-primary" />,
      position: 'bottom' as const,
      maxShowCount: 2,
    },
    huddle: {
      hintKey: 'huddle_intro',
      title: 'Welcome to Huddle!',
      content: "Discover friends based on shared interests! Explore the map to find people nearby, or browse by interest categories. Zoe will announce when friends come online or when there's an interesting match!",
      voiceText: "Welcome to Huddle! This is where you discover amazing people who share your passions. I'll keep you updated on friend activity and interesting connections!",
      icon: <Users className="w-5 h-5 text-primary" />,
      position: 'top' as const,
      maxShowCount: 1,
    },
  };

  const hint = hintType ? hints[hintType] : null;

  return (
    <>
      {hint && <ContextualHint {...hint} />}
      {children}
    </>
  );
};
