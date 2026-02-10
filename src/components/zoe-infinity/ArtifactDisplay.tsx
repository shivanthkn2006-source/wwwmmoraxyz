// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT DISPLAY - Cinematic Image Fade-in + Download Chip UI
// Part 5: The Visionary (Protocol Artifact)
// ═══════════════════════════════════════════════════════════════════════════════

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Image, FileText, BookOpen, Loader2, X, Maximize2 } from 'lucide-react';

export type ArtifactType = 'vision' | 'chronicle' | 'education';

export interface Artifact {
  id: string;
  type: ArtifactType;
  content: string; // Base64 image or PDF blob URL
  title: string;
  description?: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ArtifactDisplayProps {
  artifact: Artifact;
  onDownload?: () => void;
  onExpand?: () => void;
  onDismiss?: () => void;
}

export const ArtifactDisplay = memo(function ArtifactDisplay({
  artifact,
  onDownload,
  onExpand,
  onDismiss: _onDismiss, // Reserved for future dismiss button implementation
}: ArtifactDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const getIcon = () => {
    switch (artifact.type) {
      case 'vision': return <Image className="w-4 h-4" />;
      case 'chronicle': return <FileText className="w-4 h-4" />;
      case 'education': return <BookOpen className="w-4 h-4" />;
    }
  };

  const getGlowColor = () => {
    switch (artifact.type) {
      case 'vision': return 'rgba(0, 255, 255, 0.6)';      // Cyan
      case 'chronicle': return 'rgba(255, 215, 0, 0.6)';   // Gold
      case 'education': return 'rgba(138, 43, 226, 0.6)';  // Purple
    }
  };

  const getLabel = () => {
    switch (artifact.type) {
      case 'vision': return 'Vision';
      case 'chronicle': return 'Chronicle';
      case 'education': return 'Worksheet';
    }
  };

  // Loading state
  if (artifact.isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${getGlowColor()}40`,
          boxShadow: `0 0 20px ${getGlowColor()}20`,
        }}
      >
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: getGlowColor() }} />
        <span className="text-white/70 text-sm">
          {artifact.type === 'vision' && 'Manifesting vision...'}
          {artifact.type === 'chronicle' && 'Compiling chronicle...'}
          {artifact.type === 'education' && 'Crafting worksheet...'}
        </span>
      </motion.div>
    );
  }

  // Vision type - Image display with cinematic fade
  if (artifact.type === 'vision' || artifact.type === 'education') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative rounded-xl overflow-hidden max-w-md"
        style={{
          boxShadow: `0 0 40px ${getGlowColor()}30`,
        }}
      >
        {/* Image with cinematic fade-in */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="relative"
          >
            <img
              src={artifact.content}
              alt={artifact.title}
              className="w-full h-auto rounded-xl"
              onLoad={() => setImageLoaded(true)}
              style={{
                filter: imageLoaded ? 'none' : 'blur(10px)',
              }}
            />
            
            {/* Gradient overlay at bottom */}
            <div 
              className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
              style={{
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Controls overlay */}
        <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span 
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
              style={{
                background: `${getGlowColor()}20`,
                color: getGlowColor(),
                border: `1px solid ${getGlowColor()}40`,
              }}
            >
              {getIcon()}
              {getLabel()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {onExpand && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onExpand}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </motion.button>
            )}
            
            {onDownload && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onDownload}
                className="p-2 rounded-full transition-colors"
                style={{
                  background: `${getGlowColor()}30`,
                  boxShadow: `0 0 15px ${getGlowColor()}40`,
                }}
              >
                <Download className="w-4 h-4 text-white" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Loading shimmer before image loads */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: getGlowColor() }} />
          </div>
        )}
      </motion.div>
    );
  }

  // Chronicle type - Glowing download chip
  if (artifact.type === 'chronicle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="inline-block"
      >
        <motion.button
          onClick={onDownload}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 px-5 py-3 rounded-xl transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))',
            border: '1px solid rgba(255,215,0,0.4)',
            boxShadow: '0 0 30px rgba(255,215,0,0.3), inset 0 0 20px rgba(255,215,0,0.1)',
          }}
        >
          {/* Animated glow ring */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 10px rgba(255,215,0,0.5)',
                '0 0 20px rgba(255,215,0,0.8)',
                '0 0 10px rgba(255,215,0,0.5)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-2 rounded-lg bg-amber-500/20"
          >
            <FileText className="w-5 h-5 text-amber-400" />
          </motion.div>
          
          <div className="text-left">
            <p className="text-white font-medium text-sm">{artifact.title}</p>
            <p className="text-amber-400/70 text-xs">Tap to download PDF</p>
          </div>
          
          <Download className="w-5 h-5 text-amber-400 ml-2" />
        </motion.button>
      </motion.div>
    );
  }

  return null;
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULLSCREEN IMAGE VIEWER
// ═══════════════════════════════════════════════════════════════════════════════

interface FullscreenViewerProps {
  imageUrl: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FullscreenViewer = memo(function FullscreenViewer({
  imageUrl,
  title,
  isOpen,
  onClose,
}: FullscreenViewerProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
        onClick={onClose}
      >
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          onClick={onClose}
        >
          <X className="w-6 h-6 text-white" />
        </motion.button>
        
        <motion.img
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          src={imageUrl}
          alt={title}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          style={{
            boxShadow: '0 0 100px rgba(0,255,255,0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        />
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-8 text-white/50 text-sm"
        >
          {title}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND IMAGE EFFECT (Cinematic)
// ═══════════════════════════════════════════════════════════════════════════════

interface CinematicBackgroundProps {
  imageUrl: string | null;
  isVisible: boolean;
}

export const CinematicBackground = memo(function CinematicBackground({
  imageUrl,
  isVisible,
}: CinematicBackgroundProps) {
  if (!imageUrl || !isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.3 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2, ease: 'easeInOut' }}
      className="fixed inset-0 z-0 pointer-events-none"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imageUrl})`,
          filter: 'blur(20px) brightness(0.4)',
        }}
      />
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.8) 100%)',
        }}
      />
    </motion.div>
  );
});

export default ArtifactDisplay;
