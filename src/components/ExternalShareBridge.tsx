// ═══════════════════════════════════════════════════════════════════════════════
// EXTERNAL SHARE BRIDGE - One-Click Social Sharing with Platform Optimization
// Growth Layer 2: Viral Content Distribution
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, X, Copy, Check, ExternalLink, 
  Sparkles, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useViralContentEngine, ContentType, SocialPlatform, ViralContentStrategy } from '@/hooks/useViralContentEngine';

// Platform icons (using text for simplicity)
const PlatformIcons: Record<SocialPlatform, { icon: string; color: string; bgColor: string }> = {
  tiktok: { icon: '▶', color: 'text-white', bgColor: 'bg-black' },
  youtube: { icon: '▷', color: 'text-white', bgColor: 'bg-red-600' },
  instagram: { icon: '◇', color: 'text-white', bgColor: 'bg-gradient-to-br from-purple-600 to-pink-500' },
  twitter: { icon: '𝕏', color: 'text-white', bgColor: 'bg-black' },
  linkedin: { icon: 'in', color: 'text-white', bgColor: 'bg-blue-700' },
  whatsapp: { icon: '✆', color: 'text-white', bgColor: 'bg-green-500' },
  other: { icon: '⋮', color: 'text-white', bgColor: 'bg-gray-600' }
};

interface ExternalShareBridgeProps {
  isOpen?: boolean;
  onClose?: () => void;
  contentType: ContentType;
  contentId: string;
  contentTitle?: string;
  contentDescription?: string;
  content?: string; // Raw content for simpler use
  contentUrl?: string;
  keywords?: string[];
  trigger?: React.ReactNode; // Optional trigger button for inline use
}

export const ExternalShareBridge = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  contentType,
  contentId,
  contentTitle,
  contentDescription,
  content,
  contentUrl,
  keywords,
  trigger
}: ExternalShareBridgeProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const onClose = controlledOnClose || (() => setInternalOpen(false));
  const onOpen = () => setInternalOpen(true);
  
  // Use content as fallback for title/description
  const title = contentTitle || content?.substring(0, 100) || 'Shared content';
  const description = contentDescription || content?.substring(0, 200) || '';
  const { 
    isGenerating, 
    generateViralStrategy, 
    trackShare, 
    copyForPlatform,
    getShareLinks 
  } = useViralContentEngine();
  
  const [viralStrategy, setViralStrategy] = useState<ViralContentStrategy | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<SocialPlatform | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    const strategy = await generateViralStrategy(
      contentType,
      title,
      description,
      keywords
    );
    setViralStrategy(strategy);
    setIsOptimizing(false);
  };

  const handleShare = async (platform: SocialPlatform) => {
    const optimizedContent = platform === 'tiktok' ? viralStrategy?.tiktok 
      : platform === 'youtube' ? viralStrategy?.youtube 
      : viralStrategy?.twitter;
    
    await trackShare(contentType, contentId, platform, optimizedContent);
    
    // Get share link
    const shareLinks = getShareLinks(
      optimizedContent?.caption || contentTitle,
      contentUrl
    );
    
    const link = shareLinks[platform as keyof typeof shareLinks];
    if (link && !link.includes('://create') && !link.includes('://story')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopy = async (platform: SocialPlatform) => {
    const optimizedContent = platform === 'tiktok' ? viralStrategy?.tiktok 
      : platform === 'youtube' ? viralStrategy?.youtube 
      : viralStrategy?.twitter;
    
    if (optimizedContent) {
      const success = await copyForPlatform(platform, optimizedContent);
      if (success) {
        setCopiedPlatform(platform);
        setTimeout(() => setCopiedPlatform(null), 2000);
      }
    }
  };

  const platforms: SocialPlatform[] = ['tiktok', 'youtube', 'twitter', 'instagram', 'linkedin', 'whatsapp'];

  return (
    <>
      {/* Trigger button for inline usage */}
      {trigger && (
        <span onClick={onOpen} className="cursor-pointer">
          {trigger}
        </span>
      )}
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-xl"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="relative overflow-hidden bg-card/95 border-border/50 backdrop-blur-xl">
                {/* Header */}
                <div className="p-4 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Share Externally</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Content preview */}
                <div className="p-4 bg-white/5">
                  <p className="font-medium text-sm line-clamp-1">{title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {description}
                  </p>
                </div>
              
              {/* AI Optimization */}
              {!viralStrategy && (
                <div className="p-4 border-b border-border/50">
                  <Button
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Optimizing for virality...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        AI-Optimize for Each Platform
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Optimized content preview */}
              {viralStrategy && (
                <div className="p-4 border-b border-border/50 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <Check className="w-4 h-4" />
                    <span>AI-optimized for maximum reach</span>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-3 text-xs space-y-2">
                    <div>
                      <span className="text-muted-foreground">TikTok Hook:</span>
                      <p className="text-foreground">{viralStrategy.tiktok.hook}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hashtags:</span>
                      <p className="text-purple-400">{viralStrategy.tiktok.hashtags.join(' ')}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Platform grid */}
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  {platforms.map((platform) => {
                    const { icon, bgColor } = PlatformIcons[platform];
                    const isCopied = copiedPlatform === platform;
                    
                    return (
                      <div key={platform} className="space-y-2">
                        <button
                          onClick={() => handleShare(platform)}
                          className={`w-full aspect-square rounded-xl ${bgColor} flex items-center justify-center text-2xl font-bold hover:scale-105 transition-transform`}
                        >
                          {icon}
                        </button>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCopy(platform)}
                            className="flex-1 py-1 text-xs bg-white/10 rounded hover:bg-white/20 transition-colors flex items-center justify-center gap-1"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => handleShare(platform)}
                            className="flex-1 py-1 text-xs bg-white/10 rounded hover:bg-white/20 transition-colors flex items-center justify-center"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-center text-muted-foreground capitalize">
                          {platform}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-border/50 text-center">
                <p className="text-xs text-muted-foreground">
                  Share to grow your reach • Powered by Zoe Viral Engine
                </p>
              </div>
            </Card>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
