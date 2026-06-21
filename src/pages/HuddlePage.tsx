import { useState } from 'react';
import Huddle from '@/components/Huddle';
import { ContextualHint } from '@/components/ContextualHint';
import { Users, Bot } from 'lucide-react';
import { FeatureAnnouncementWrapper } from '@/components/FeatureAnnouncementWrapper';
import ZoeHuddleAssistant from '@/components/ZoeHuddleAssistant';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const HuddlePage = () => {
  const [showZoeAssistant, setShowZoeAssistant] = useState(false);

  return (
    <FeatureAnnouncementWrapper featureId="huddle">
      <ContextualHint
        hintKey="huddle_intro"
        title="Welcome to Huddle!"
        content="Explore the world on an interactive map! Discover friends across continents, countries, and cities. Click on famous landmarks like the Great Wall of China, Colosseum, and natural wonders. Use filters to find people by location, interests, or online status. Click and zoom to explore!"
        voiceText="Welcome to Huddle! Explore the world on an interactive map where you can discover amazing people and famous landmarks. Click on colored markers to visit world heritage sites, mountains, waterfalls, and more. I'll keep you updated on friend activity!"
        icon={<Users className="w-5 h-5 text-primary" />}
        position="top"
        maxShowCount={1}
      />
      <Huddle />

      {/* Zoe AI Assistant Floating Icon - Draggable */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        dragConstraints={{
          left: 0,
          right: window.innerWidth - 80,
          top: 0,
          bottom: window.innerHeight - 80,
        }}
        initial={{ scale: 0, opacity: 0, x: window.innerWidth - 100, y: window.innerHeight - 200 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', damping: 15 }}
        className="fixed z-[1003] cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <Button
          onClick={() => setShowZoeAssistant(!showZoeAssistant)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
            boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.5), 0 0 20px -5px hsl(var(--accent) / 0.4)',
          }}
        >
          {/* Icon with CSS animation instead of framer-motion infinite */}
          <div className="animate-gpu-spin-3s">
            <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div
            className="absolute inset-0 rounded-full animate-gpu-ring-pulse"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
            }}
          />
        </Button>
      </motion.div>

      {/* Zoe AI Assistant Chat Window */}
      <AnimatePresence>
        {showZoeAssistant && (
          <ZoeHuddleAssistant onClose={() => setShowZoeAssistant(false)} />
        )}
      </AnimatePresence>
    </FeatureAnnouncementWrapper>
  );
};

export default HuddlePage;
