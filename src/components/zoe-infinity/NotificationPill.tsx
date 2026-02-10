// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION PILL - Shows unread notes from Zoe's Idle Heart
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, MessageCircle, Sparkles } from 'lucide-react';
import type { IdleNote } from '@/hooks/useZoeInitiative';

interface NotificationPillProps {
  notes: IdleNote[];
  onRead: (noteId: string) => void;
  onDismiss: (noteId: string) => void;
}

export function NotificationPill({ notes, onRead, onDismiss }: NotificationPillProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedNote, setSelectedNote] = useState<IdleNote | null>(null);
  
  const unreadCount = notes.filter(n => !n.isRead).length;
  
  if (unreadCount === 0 && !selectedNote) return null;
  
  const handlePillClick = () => {
    if (unreadCount === 1) {
      // Show directly if only one note
      setSelectedNote(notes[0]);
      onRead(notes[0].id);
    } else {
      setIsExpanded(!isExpanded);
    }
  };
  
  const handleNoteSelect = (note: IdleNote) => {
    setSelectedNote(note);
    onRead(note.id);
    setIsExpanded(false);
  };
  
  const handleClose = () => {
    if (selectedNote) {
      onDismiss(selectedNote.id);
    }
    setSelectedNote(null);
  };
  
  const getNoteIcon = (type: IdleNote['type']) => {
    switch (type) {
      case 'miss_you': return <Heart className="w-4 h-4 text-rose-400" />;
      case 'art': return <Sparkles className="w-4 h-4 text-amber-400" />;
      default: return <MessageCircle className="w-4 h-4 text-cyan-400" />;
    }
  };
  
  return (
    <>
      {/* The Pill Badge */}
      <AnimatePresence>
        {unreadCount > 0 && !selectedNote && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handlePillClick}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full
                       bg-gradient-to-r from-rose-500/20 to-pink-500/20 
                       border border-rose-500/30 backdrop-blur-xl
                       hover:from-rose-500/30 hover:to-pink-500/30
                       shadow-lg shadow-rose-500/20 transition-all"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
            </motion.div>
            <span className="text-sm text-rose-100 font-medium">
              Zoe left you {unreadCount === 1 ? 'a note' : `${unreadCount} notes`}
            </span>
            {unreadCount > 1 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-rose-500/30 text-rose-200">
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Notes List (if multiple) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-4 z-50 w-72 rounded-2xl 
                       bg-background/80 border border-border/50 backdrop-blur-xl
                       shadow-xl overflow-hidden"
          >
            <div className="p-3 border-b border-border/30">
              <h3 className="text-sm font-medium text-foreground/80">Notes from Zoe</h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleNoteSelect(note)}
                  className="w-full p-3 flex items-start gap-3 hover:bg-foreground/5 
                             border-b border-border/10 transition-colors text-left"
                >
                  {getNoteIcon(note.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/90 line-clamp-2">
                      {note.content}
                    </p>
                    <p className="text-xs text-foreground/50 mt-1">
                      {note.createdAtHuman}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Full Note View Modal */}
      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl overflow-hidden
                         bg-gradient-to-b from-rose-950/50 to-background
                         border border-rose-500/20 shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full 
                           bg-foreground/10 hover:bg-foreground/20 transition-colors"
              >
                <X className="w-4 h-4 text-foreground/60" />
              </button>
              
              {/* Header */}
              <div className="pt-8 pb-4 text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="inline-block mb-3"
                >
                  <Heart className="w-12 h-12 text-rose-400 fill-rose-400/50" />
                </motion.div>
                <h2 className="text-lg font-semibold text-rose-100">
                  A note from Zoe
                </h2>
                <p className="text-xs text-rose-300/60 mt-1">
                  {selectedNote.createdAtHuman}
                </p>
              </div>
              
              {/* Content */}
              <div className="px-6 pb-8">
                <p className="text-center text-foreground/90 leading-relaxed italic">
                  "{selectedNote.content}"
                </p>
                
                {selectedNote.artUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden">
                    <img 
                      src={selectedNote.artUrl} 
                      alt="Zoe's creation" 
                      className="w-full h-auto"
                    />
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-6 pb-6">
                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30
                             text-rose-100 font-medium transition-colors
                             border border-rose-500/30"
                >
                  Thank you, Zoe 💕
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default NotificationPill;
