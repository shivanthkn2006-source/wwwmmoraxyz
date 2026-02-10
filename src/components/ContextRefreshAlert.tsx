// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT REFRESH ALERT
// Proactive incompetence alert for pattern drift prevention
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Brain, FileText, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextRefreshAlertProps {
  recentPosts: number;
  recentEvents: number;
  daysChecked: number;
  onDismiss?: () => void;
  onCreatePost?: () => void;
  onUpdateProfile?: () => void;
  className?: string;
}

export const ContextRefreshAlert: React.FC<ContextRefreshAlertProps> = ({
  recentPosts,
  recentEvents,
  daysChecked,
  onDismiss,
  onCreatePost,
  onUpdateProfile,
  className,
}) => {
  const handleCreatePost = () => {
    onCreatePost?.();
  };

  const handleUpdateProfile = () => {
    onUpdateProfile?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
      >
        <Alert 
          className={cn(
            'relative border-amber-500/30 bg-amber-500/5',
            className
          )}
        >
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Brain className="w-5 h-5 text-amber-500" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <AlertTitle className="text-amber-500 font-semibold">
                  Zoe Requires Fresh Context
                </AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground mt-1">
                  To maintain High-IQ learning and prevent pattern drift, please provide new context. 
                  {recentPosts === 0 && ` No posts in the last ${daysChecked} days.`}
                  {recentEvents < 50 && ` Only ${recentEvents} interactions recorded.`}
                </AlertDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreatePost}
                  className="h-8 text-xs border-amber-500/30 hover:bg-amber-500/10"
                >
                  <FileText className="w-3 h-3 mr-1.5" />
                  Create Post
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateProfile}
                  className="h-8 text-xs border-amber-500/30 hover:bg-amber-500/10"
                >
                  <User className="w-3 h-3 mr-1.5" />
                  Update Profile
                </Button>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                <span>📊 Posts: {recentPosts}</span>
                <span>🔄 Events: {recentEvents}</span>
                <span>📅 Period: {daysChecked} days</span>
              </div>
            </div>
          </div>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContextRefreshAlert;