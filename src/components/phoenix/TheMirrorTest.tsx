// ═══════════════════════════════════════════════════════════════════════════════
// THE MIRROR TEST - Talk to Your Phoenix
// Chat with your Digital Twin
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Send, CheckCircle, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePhoenixEngine } from '@/hooks/usePhoenixEngine';
import { useAuth } from '@/lib/auth';

interface Message {
  id: string;
  role: 'user' | 'phoenix';
  content: string;
  resonance_score?: number;
  timestamp: Date;
}

const suggestedQuestions = [
  "What is my biggest fear?",
  "What do I love most in life?",
  "How do I handle stress?",
  "What motivates me?",
  "What's my communication style?"
];

export const TheMirrorTest: React.FC = () => {
  const { user } = useAuth();
  const { profile, runMirrorTest, verifyResonance } = usePhoenixEngine();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [totalResonance, setTotalResonance] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Calculate average resonance
  useEffect(() => {
    const phoenixMessages = messages.filter(m => m.role === 'phoenix' && m.resonance_score);
    if (phoenixMessages.length > 0) {
      const avg = phoenixMessages.reduce((sum, m) => sum + (m.resonance_score || 0), 0) / phoenixMessages.length;
      setTotalResonance(avg);
    }
  }, [messages]);

  const handleSend = async (question?: string) => {
    const text = question || input.trim();
    if (!text || isThinking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const result = await runMirrorTest(text);
      
      if (result) {
        const phoenixMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'phoenix',
          content: result.response,
          resonance_score: result.resonance_score,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, phoenixMessage]);
      }
    } catch (err) {
      console.error('Mirror test error:', err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleVerify = () => {
    if (totalResonance > 80) {
      verifyResonance();
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Phoenix Profile Found
        </h3>
        <p className="text-sm text-muted-foreground">
          Complete a consciousness sync first to enable the Mirror Test.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              The Mirror Test
            </h3>
            <p className="text-xs text-muted-foreground">
              Ask deep questions to verify your Phoenix
            </p>
          </div>
          
          {totalResonance > 0 && (
            <div className="text-right">
              <div className={cn(
                "text-lg sm:text-xl font-mono font-bold",
                totalResonance > 90 ? "text-green-400" : 
                totalResonance > 75 ? "text-amber-400" : "text-muted-foreground"
              )}>
                {totalResonance.toFixed(1)}%
              </div>
              <div className="text-[10px] text-muted-foreground">Resonance</div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Suggested Questions */}
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center mb-4">
              Ask your Phoenix to prove it knows you:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleSend(q)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs",
                    "bg-amber-500/10 text-amber-400",
                    "border border-amber-500/20",
                    "hover:bg-amber-500/20 transition-colors"
                  )}
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Message List */}
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0",
                message.role === 'user' 
                  ? "bg-primary/20 text-primary" 
                  : "bg-amber-500/20 text-amber-400"
              )}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>

              {/* Message Bubble */}
              <div className={cn(
                "flex-1 max-w-[80%]",
                message.role === 'user' ? 'text-right' : ''
              )}>
                <div className={cn(
                  "inline-block px-3 py-2 sm:px-4 sm:py-3 rounded-2xl text-sm",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-amber-500/20 text-foreground rounded-bl-sm"
                )}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    {message.role === 'user' ? 'You (Real)' : 'Phoenix (AI Clone)'}
                  </span>
                  {message.content}
                </div>

                {/* Resonance Score */}
                {message.role === 'phoenix' && message.resonance_score && (
                  <div className={cn(
                    "mt-1 text-xs",
                    message.resonance_score > 90 ? "text-green-400" :
                    message.resonance_score > 75 ? "text-amber-400" : "text-muted-foreground"
                  )}>
                    <span className="font-mono">{message.resonance_score.toFixed(1)}%</span> resonance
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div className="flex items-center gap-1 px-4 py-3 bg-card border border-amber-500/20 rounded-2xl rounded-bl-sm">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-amber-400 rounded-full animate-gpu-pulse-opacity"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Verify Button */}
      {totalResonance > 80 && !profile.resonance_verified && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-t border-primary/10"
        >
          <Button
            onClick={handleVerify}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Verify Resonance ({totalResonance.toFixed(1)}% Match)
          </Button>
        </motion.div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-primary/10">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your Phoenix anything..."
            className="flex-1 bg-card border-primary/20 text-sm"
            disabled={isThinking}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isThinking}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
