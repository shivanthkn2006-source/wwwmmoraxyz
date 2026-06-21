/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - PRIORITY STREAM (INFINITY GLASS)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE LIVING INBOX - No list of emails. A Priority Stream.
 * 
 * Design Philosophy:
 * - Glass Cards floating in the void
 * - Sorted by RELEVANCE (AI Logic), not time
 * - Quantum Call button for verified contacts
 * - Summarize button (Brain icon) for long threads
 * 
 * Architecture: Standalone module for future migration
 * Cost: $0.00 (All processing via Lovable AI)
 */

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  Sparkles,
  Phone,
  Video,
  Brain,
  Reply,
  Archive,
  Trash2,
  Star,
  MoreHorizontal,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { MailMessage, GatekeeperVerdict } from './types';

interface PriorityStreamProps {
  messages: MailMessage[];
  isLoading?: boolean;
  onMessageSelect?: (message: MailMessage) => void;
  onApproveAction?: (messageId: string, action: string) => void;
  onQuantumCall?: (message: MailMessage, type: 'video' | 'audio') => void;
  onSummarize?: (message: MailMessage) => void;
  onQuickReply?: (message: MailMessage) => void;
  onArchive?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onStar?: (messageId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY SCORING (AI Relevance Logic)
// ═══════════════════════════════════════════════════════════════════════════════

const calculatePriorityScore = (message: MailMessage): number => {
  let score = 0;
  
  // Urgency weighting
  if (message.priority === 'urgent') score += 100;
  else if (message.priority === 'high') score += 75;
  else if (message.priority === 'normal') score += 50;
  else score += 25;
  
  // Sender verification bonus
  if (message.senderVerified) score += 30;
  
  // Unread bonus
  if (!message.isRead) score += 40;
  
  // Starred bonus
  if (message.isStarred) score += 20;
  
  // Action pending bonus
  if (message.gatekeeperAction) score += 35;
  
  // Recency (decay over time) - FIX: Ensure timestamp is a Date object
  const timestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
  const hoursSinceReceived = (Date.now() - timestamp.getTime()) / 3600000;
  score += Math.max(0, 50 - hoursSinceReceived * 2);
  
  // Emotional urgency from DHF
  if (message.emotionalContext) {
    score += message.emotionalContext.urgency * 30;
    score += message.emotionalContext.importance * 20;
  }
  
  // Verdict-based adjustments
  switch (message.gatekeeperVerdict) {
    case 'meeting': score += 25; break;
    case 'financial': score += 20; break;
    case 'personal': score += 15; break;
    case 'work': score += 15; break;
    case 'newsletter': score -= 10; break;
    case 'spam': score -= 100; break;
  }
  
  return score;
};

// ═══════════════════════════════════════════════════════════════════════════════
// GLASS CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface GlassCardProps {
  message: MailMessage;
  index: number;
  priorityScore: number;
  onSelect?: () => void;
  onQuantumCall?: (type: 'video' | 'audio') => void;
  onSummarize?: () => void;
  onQuickReply?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onStar?: () => void;
  onApproveAction?: (action: string) => void;
}

const GlassCard = memo(function GlassCard({
  message,
  index,
  priorityScore,
  onSelect,
  onQuantumCall,
  onSummarize,
  onQuickReply,
  onArchive,
  onDelete,
  onStar,
  onApproveAction,
}: GlassCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Parallax effect on hover
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [5, -5]);
  const rotateY = useTransform(x, [-100, 100], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  // Returns actual CSS gradient value for inline styles
  const getVerdictGradient = (verdict: GatekeeperVerdict) => {
    switch (verdict) {
      case 'approved': return 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)';
      case 'spam': return 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)';
      case 'suspicious': return 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%)';
      case 'newsletter': return 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(34, 211, 238, 0.05) 100%)';
      case 'meeting': return 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.05) 100%)';
      case 'financial': return 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.05) 100%)';
      case 'personal': return 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.05) 100%)';
      case 'work': return 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)';
      default: return 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)';
    }
  };

  const getVerdictIcon = (verdict: GatekeeperVerdict) => {
    switch (verdict) {
      case 'approved': return <ShieldCheck className="w-3 h-3 text-emerald-400" />;
      case 'spam': return <ShieldAlert className="w-3 h-3 text-red-400" />;
      case 'suspicious': return <AlertTriangle className="w-3 h-3 text-amber-400" />;
      case 'newsletter': return <FileText className="w-3 h-3 text-cyan-400" />;
      case 'meeting': return <Calendar className="w-3 h-3 text-violet-400" />;
      case 'financial': return <Zap className="w-3 h-3 text-yellow-400" />;
      case 'personal': return <MessageSquare className="w-3 h-3 text-pink-400" />;
      default: return <Shield className="w-3 h-3 text-white/40" />;
    }
  };

  // FIX: Handle both Date objects and date strings
  const formatRelativeTime = (date: Date | string) => {
    const parsedDate = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSummarizing(true);
    onSummarize?.();
    // Simulate AI processing
    await new Promise(r => setTimeout(r, 1500));
    setIsSummarizing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -100 }}
      transition={{ 
        delay: index * 0.08,
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
      className="relative cursor-pointer"
    >
      {/* Priority Score Indicator */}
      <motion.div
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 rounded-full"
        style={{
          height: `${Math.min(80, priorityScore * 0.4)}%`,
          background: priorityScore > 150 
            ? 'linear-gradient(to bottom, #f87171, #ef4444)' 
            : priorityScore > 100 
              ? 'linear-gradient(to bottom, #fbbf24, #f59e0b)'
              : 'linear-gradient(to bottom, #22d3ee, #06b6d4)',
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* The Glass Card */}
      <div
        className={`
          relative overflow-hidden rounded-2xl p-5
          border transition-all duration-300
          ${message.isRead ? 'opacity-70' : 'opacity-100'}
          ${isHovered ? 'border-white/30' : 'border-white/10'}
        `}
        style={{
          background: getVerdictGradient(message.gatekeeperVerdict),
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isHovered 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(34, 211, 238, 0.1)' 
            : '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Glass Reflection Effect */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, transparent 100%)',
          }}
        />

        {/* Verdict Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 
                       px-2 py-1 rounded-full bg-black/60 border border-white/10">
          {getVerdictIcon(message.gatekeeperVerdict)}
          <span className="text-[10px] text-white/70 uppercase tracking-wide font-medium">
            {message.gatekeeperVerdict}
          </span>
        </div>

        {/* Urgent Badge */}
        {message.priority === 'urgent' && (
          <motion.div
            className="absolute top-3 left-3 flex items-center gap-1 
                       px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Zap className="w-3 h-3 text-red-400" />
            <span className="text-[10px] text-red-300 uppercase tracking-wide font-medium">
              Urgent
            </span>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="mt-8">
          {/* Sender Row */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 
                               flex items-center justify-center text-white font-medium text-sm">
                  {message.senderName.charAt(0).toUpperCase()}
                </div>
                {message.senderVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full 
                                 bg-cyan-500 flex items-center justify-center border-2 border-black">
                    <ShieldCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              
              {/* Name & Email */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold truncate ${
                    message.isRead ? 'text-white/60' : 'text-white'
                  }`}>
                    {message.senderName}
                  </span>
                  {message.isStarred && (
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-white/40 truncate">{message.senderEmail}</p>
              </div>
            </div>
            
            {/* Time */}
            <span className="text-xs text-white/50 flex-shrink-0 font-medium">
              {formatRelativeTime(message.timestamp)}
            </span>
          </div>

          {/* Subject */}
          <h3 className={`text-base mb-2 line-clamp-1 ${
            message.isRead ? 'text-white/70' : 'text-white font-semibold'
          }`}>
            {message.subject}
          </h3>

          {/* Preview / AI Summary */}
          <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">
            {message.gatekeeperSummary || message.preview}
          </p>

          {/* ═══════════════════════════════════════════════════════════════════
              QUANTUM ACTIONS BAR (Visible on hover or always for verified)
              ═══════════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {(isHovered || message.senderVerified) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-2"
              >
                {/* Left: Quantum Actions */}
                <div className="flex items-center gap-2">
                  {/* Quantum Call - Only for verified contacts */}
                  {message.senderVerified && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuantumCall?.('video');
                        }}
                        className="p-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                                   border border-cyan-500/30 text-cyan-400
                                   hover:from-cyan-500/30 hover:to-blue-500/30 transition-all"
                        title="Quantum Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuantumCall?.('audio');
                        }}
                        className="p-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 
                                   border border-emerald-500/30 text-emerald-400
                                   hover:from-emerald-500/30 hover:to-cyan-500/30 transition-all"
                        title="Quantum Audio Call"
                      >
                        <Phone className="w-4 h-4" />
                      </motion.button>
                    </>
                  )}

                  {/* Summarize (Brain Icon) */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className={`p-2 rounded-xl border transition-all ${
                      isSummarizing
                        ? 'bg-violet-500/30 border-violet-500/50 text-violet-300'
                        : 'bg-violet-500/20 border-violet-500/30 text-violet-400 hover:bg-violet-500/30'
                    }`}
                    title="AI Summarize Thread"
                  >
                    {isSummarizing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Brain className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <Brain className="w-4 h-4" />
                    )}
                  </motion.button>

                  {/* Quick Reply */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickReply?.();
                    }}
                    className="p-2 rounded-xl bg-white/10 border border-white/20 text-white/70
                               hover:bg-white/20 transition-all"
                    title="Quick Reply"
                  >
                    <Reply className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Right: Secondary Actions */}
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStar?.();
                    }}
                    className={`p-1.5 rounded-lg transition-all ${
                      message.isStarred 
                        ? 'text-yellow-400' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${message.isStarred ? 'fill-yellow-400' : ''}`} />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive?.();
                    }}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white/70 transition-all"
                  >
                    <Archive className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                    }}
                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gatekeeper Action Suggestion */}
          {message.gatekeeperAction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl
                             bg-gradient-to-r from-cyan-500/10 to-blue-500/10 
                             border border-cyan-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <p className="text-xs text-cyan-300">
                    {message.gatekeeperAction.description}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApproveAction?.(message.gatekeeperAction!.type);
                  }}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold
                             bg-gradient-to-r from-cyan-500 to-blue-500 text-white
                             hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
                >
                  Approve
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY STREAM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const PriorityStream = memo(function PriorityStream({
  messages,
  isLoading = false,
  onMessageSelect,
  onApproveAction,
  onQuantumCall,
  onSummarize,
  onQuickReply,
  onArchive,
  onDelete,
  onStar,
}: PriorityStreamProps) {
  const streamRef = useRef<HTMLDivElement>(null);

  // Sort messages by AI-calculated priority (not time)
  const prioritizedMessages = [...messages]
    .filter(m => !m.isDeleted && m.gatekeeperVerdict !== 'spam')
    .map(m => ({ message: m, score: calculatePriorityScore(m) }))
    .sort((a, b) => b.score - a.score);

  return (
    <div 
      ref={streamRef}
      className="flex-1 overflow-y-auto px-6 py-8 scrollbar-none"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white/80 text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Priority Stream
            </h2>
            <p className="text-white/30 text-xs mt-0.5">
              Sorted by relevance • {prioritizedMessages.length} messages
            </p>
          </div>
        </div>

        {/* Loading state */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center gap-4 py-16"
            >
              <motion.div
                className="relative w-16 h-16"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400" />
              </motion.div>
              <span className="text-white/50 text-sm">Analyzing priority...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!isLoading && prioritizedMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 
                             flex items-center justify-center border border-cyan-500/20">
                <Mail className="w-8 h-8 text-white/30" />
              </div>
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </motion.div>
            </div>
            <p className="text-white/50 text-base font-medium">The void is clear</p>
            <p className="text-white/30 text-sm mt-1">No messages require your attention</p>
          </motion.div>
        )}

        {/* Priority Stream */}
        <AnimatePresence mode="popLayout">
          {prioritizedMessages.map(({ message, score }, index) => (
            <GlassCard
              key={message.id}
              message={message}
              index={index}
              priorityScore={score}
              onSelect={() => onMessageSelect?.(message)}
              onQuantumCall={(type) => onQuantumCall?.(message, type)}
              onSummarize={() => onSummarize?.(message)}
              onQuickReply={() => onQuickReply?.(message)}
              onArchive={() => onArchive?.(message.id)}
              onDelete={() => onDelete?.(message.id)}
              onStar={() => onStar?.(message.id)}
              onApproveAction={(action) => onApproveAction?.(message.id, action)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default PriorityStream;
