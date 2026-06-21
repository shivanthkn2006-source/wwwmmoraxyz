import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Users, Lock, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TimelineShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (shareType: 'global' | 'friends' | 'private_timeline' | 'huddle') => void;
}

/**
 * Modal for sharing timeline content across different platform areas
 */
export const TimelineShareModal: React.FC<TimelineShareModalProps> = ({
  isOpen,
  onClose,
  onShare,
}) => {
  const shareOptions = [
    {
      type: 'global' as const,
      icon: <Globe className="w-6 h-6" />,
      title: 'Global Feed',
      description: 'Share with all platform users',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      type: 'friends' as const,
      icon: <Users className="w-6 h-6" />,
      title: 'Friends Feed',
      description: 'Share with your friends only',
      color: 'from-green-500 to-emerald-500',
    },
    {
      type: 'private_timeline' as const,
      icon: <Lock className="w-6 h-6" />,
      title: 'Private Timeline',
      description: 'Share to a specific private timeline',
      color: 'from-purple-500 to-pink-500',
    },
    {
      type: 'huddle' as const,
      icon: <MapPin className="w-6 h-6" />,
      title: 'Huddle Page',
      description: 'Share to Huddle community',
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <Card className="p-6 bg-card/95 backdrop-blur-sm border-2 border-primary/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Share Timeline Content</h3>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-3">
                {shareOptions.map((option) => (
                  <Button
                    key={option.type}
                    variant="outline"
                    className="w-full h-auto p-4 justify-start hover:scale-[1.02] transition-transform"
                    onClick={() => {
                      onShare(option.type);
                      onClose();
                    }}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${option.color} mr-3`}>
                      {option.icon}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{option.title}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
