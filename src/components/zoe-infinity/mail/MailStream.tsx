/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - STREAM OF CONSCIOUSNESS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The "Stream" - Messages flow like consciousness, not rows in a table.
 * Each email is a floating entity in the void with Gatekeeper status.
 * 
 * Architecture: Standalone module for future migration
 * Cost: $0.00 (All processing via Lovable AI)
 */

import { memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Mail, Calendar, FileText, AlertTriangle, Sparkles } from 'lucide-react';
import { MailMessage, GatekeeperVerdict } from './types';

interface MailStreamProps {
  messages: MailMessage[];
  isLoading?: boolean;
  onMessageSelect?: (message: MailMessage) => void;
  onApproveAction?: (messageId: string, action: string) => void;
}

const getVerdictIcon = (verdict: GatekeeperVerdict) => {
  switch (verdict) {
    case 'approved':
      return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    case 'spam':
      return <ShieldAlert className="w-4 h-4 text-red-400" />;
    case 'suspicious':
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'newsletter':
      return <FileText className="w-4 h-4 text-cyan-400" />;
    case 'meeting':
      return <Calendar className="w-4 h-4 text-violet-400" />;
    case 'pending':
    default:
      return <Shield className="w-4 h-4 text-white/40" />;
  }
};

const getVerdictGlow = (verdict: GatekeeperVerdict) => {
  switch (verdict) {
    case 'approved':
      return 'rgba(52, 211, 153, 0.2)';
    case 'spam':
      return 'rgba(248, 113, 113, 0.2)';
    case 'suspicious':
      return 'rgba(251, 191, 36, 0.2)';
    case 'newsletter':
      return 'rgba(34, 211, 238, 0.2)';
    case 'meeting':
      return 'rgba(167, 139, 250, 0.2)';
    default:
      return 'rgba(255, 255, 255, 0.05)';
  }
};

const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const MailStream = memo(function MailStream({
  messages,
  isLoading = false,
  onMessageSelect,
  onApproveAction,
}: MailStreamProps) {
  const streamRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest
  useEffect(() => {
    if (streamRef.current && messages.length > 0) {
      streamRef.current.scrollTop = 0; // Newest at top
    }
  }, [messages.length]);

  return (
    <div 
      ref={streamRef}
      className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Loading state */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center justify-center gap-3 py-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Shield className="w-6 h-6 text-cyan-400" />
              </motion.div>
              <span className="text-white/60 text-sm">Gatekeeper scanning inbox...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative mb-4">
              <Mail className="w-12 h-12 text-white/20" />
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </motion.div>
            </div>
            <p className="text-white/40 text-sm">The void is clear.</p>
            <p className="text-white/20 text-xs mt-1">No messages require your attention.</p>
          </motion.div>
        )}

        {/* Message stream */}
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onMessageSelect?.(message)}
              className="group cursor-pointer"
            >
              <div
                className={`
                  relative rounded-xl p-4 transition-all duration-300
                  border border-white/5 hover:border-white/20
                  ${message.isRead ? 'opacity-60' : 'opacity-100'}
                `}
                style={{
                  background: getVerdictGlow(message.gatekeeperVerdict),
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Gatekeeper verdict badge */}
                <div className="absolute -top-2 -right-2 flex items-center gap-1 
                               px-2 py-0.5 rounded-full bg-black/80 border border-white/10">
                  {getVerdictIcon(message.gatekeeperVerdict)}
                  <span className="text-[10px] text-white/60 uppercase tracking-wider">
                    {message.gatekeeperVerdict}
                  </span>
                </div>

                {/* Priority indicator */}
                {message.priority === 'urgent' && (
                  <motion.div
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 
                               rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                {/* Header: Sender + Time */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`
                        text-sm font-medium truncate
                        ${message.isRead ? 'text-white/50' : 'text-white'}
                      `}>
                        {message.senderName}
                      </span>
                      {message.senderVerified && (
                        <ShieldCheck className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-white/30 truncate">{message.senderEmail}</p>
                  </div>
                  <span className="text-xs text-white/40 flex-shrink-0">
                    {formatRelativeTime(message.timestamp)}
                  </span>
                </div>

                {/* Subject */}
                <h3 className={`
                  text-sm mb-2 line-clamp-1
                  ${message.isRead ? 'text-white/60' : 'text-white font-medium'}
                `}>
                  {message.subject}
                </h3>

                {/* Preview / Gatekeeper Summary */}
                <p className="text-xs text-white/40 line-clamp-2">
                  {message.gatekeeperSummary || message.preview}
                </p>

                {/* Gatekeeper action suggestion */}
                {message.gatekeeperAction && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 pt-3 border-t border-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-cyan-300 flex-1">
                        {message.gatekeeperAction.description}
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onApproveAction?.(message.id, message.gatekeeperAction!.type);
                        }}
                        className="px-3 py-1 rounded-full text-xs font-medium
                                   bg-cyan-500/20 text-cyan-300 border border-cyan-500/30
                                   hover:bg-cyan-500/30 transition-colors"
                      >
                        Approve
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default MailStream;
