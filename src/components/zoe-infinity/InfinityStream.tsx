import { memo, useRef, useEffect, useState } from 'react';
import { ArtifactDisplay, Artifact } from './ArtifactDisplay';
import { CitationPanel, Citation, parseContentWithCitations } from './CitationPanel';
import { EmotionIndicator } from './EmotionIndicator';
import ZoeAvatarEmotions, { detectEmotionFromText } from '@/components/ZoeAvatarEmotions';

/**
 * Strip SSML/XML tags from text for display
 * The AI sometimes hallucinates SSML tags like <break time="1.4s"/> 
 * which should NOT be shown to users
 */
function stripSSMLTags(text: string): string {
  if (!text) return '';
  return text
    // Remove SSML break tags: <break time="1.4s"/> or <break time="1.4s" />
    .replace(/<break[^>]*\/?>/gi, '')
    // Remove any other SSML tags: <speak>, <prosody>, <emphasis>, etc.
    .replace(/<\/?(speak|prosody|emphasis|say-as|sub|phoneme|audio|mark|desc|voice|lang|p|s|w)\b[^>]*>/gi, '')
    // Remove generic self-closing tags that look like SSML
    .replace(/<[a-z]+[^>]*\/>/gi, '')
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface InfinityMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    mode?: 'flash' | 'pro' | 'system2' | 'offline';
    fromCache?: boolean;
    codexInjected?: boolean;
    // Enhanced metadata from Chain of Thought integration
    chainOfThoughtUsed?: boolean;
    classifiedIntent?: string;
    extractedEmotions?: string[];
    relationshipStyle?: string;
    // System 2 Cortex metadata (verified reasoning)
    system2Used?: boolean;
    system2Status?: string;
    system2AmbiguityScore?: number;
    system2SelectedApproach?: string;
    system2CritiqueAttempts?: number;
    // PHASE 1: DEEP GROUNDING - Citation metadata
    grounded?: boolean;
    citations?: Citation[];
    // PHASE 3: EMOTION UPGRADE - Emotion metadata
    emotionAttuned?: boolean;
    detectedEmotion?: string;
    emotionTone?: string;
    // SOUL LAYER: Offline Wisdom metadata
    offlineWisdom?: boolean;
    // LEVEL 4: KARMIC MEMORY - Relationship tracking metadata
    intimacyLevel?: number;
    karmicResponseStyle?: string;
    isGirlfriendModeUnlocked?: boolean;
    memoriesCount?: number;
  };
  artifact?: Artifact;
  // LEVEL 2: PROCEDURAL GIFT - Inline image from art generator
  image?: {
    dataUrl: string;
    caption?: string;
    style?: string;
  };
}

interface InfinityStreamProps {
  messages: InfinityMessage[];
  isTyping?: boolean;
  onArtifactDownload?: (artifact: Artifact) => void;
  onArtifactExpand?: (artifact: Artifact) => void;
}

export const InfinityStream = memo(function InfinityStream({ 
  messages, 
  isTyping = false,
  onArtifactDownload,
  onArtifactExpand,
}: InfinityStreamProps) {
  const streamRef = useRef<HTMLDivElement>(null);
  const [openCitationPanels, setOpenCitationPanels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const toggleCitationPanel = (messageId: string) => {
    setOpenCitationPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleCitationClick = (messageId: string, citationId: number) => {
    // Open the panel if not already open
    if (!openCitationPanels.has(messageId)) {
      setOpenCitationPanels(prev => new Set(prev).add(messageId));
    }
    // Could add scroll-to-citation logic here
    console.log(`[InfinityStream] Citation clicked: [${citationId}] in message ${messageId}`);
  };

  return (
    <div 
      ref={streamRef}
      className="flex-1 overflow-y-auto px-6 py-24 scrollbar-none relative z-20"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {messages.map((message) => {
          const hasCitations = message.metadata?.citations && message.metadata.citations.length > 0;
          const isPanelOpen = openCitationPanels.has(message.id);
          const hasEmotion = message.metadata?.emotionAttuned && message.metadata?.detectedEmotion;
          
          return (
            <div
              key={message.id}
              className={`
                flex flex-col
                ${message.role === 'user' ? 'items-end' : 'items-start'}
                animate-fade-in
              `}
            >
              {/* PHASE 3: Emotion Indicator for assistant messages */}
              {message.role === 'assistant' && hasEmotion && (
                <div className="mb-2">
                  <EmotionIndicator 
                    emotion={message.metadata!.detectedEmotion}
                    tone={message.metadata?.emotionTone}
                    isVisible={true}
                    size="sm"
                  />
                </div>
              )}
              {/* Text content with inline citations - SSML tags stripped for clean display */}
              <div
                className={`
                  max-w-[85%] text-base leading-relaxed
                  ${message.role === 'user' 
                    ? 'text-[#888888]' /* Ghost Grey */
                    : 'text-[#FAFAFA]' /* Neon White */
                  }
                `}
                style={{
                  textShadow: message.role === 'assistant' 
                    ? '0 0 20px rgba(255,255,255,0.1)' 
                    : 'none',
                }}
              >
                {hasCitations 
                  ? parseContentWithCitations(
                      stripSSMLTags(message.content), 
                      (id) => handleCitationClick(message.id, id)
                    )
                  : stripSSMLTags(message.content)
                }
              </div>

              {/* DEEP GROUNDING: Citation Panel */}
              {hasCitations && message.role === 'assistant' && (
                <CitationPanel
                  citations={message.metadata!.citations!}
                  isOpen={isPanelOpen}
                  onToggle={() => toggleCitationPanel(message.id)}
                />
              )}

              {/* LEVEL 2: PROCEDURAL GIFT - Inline Art Image */}
              {message.image && (
                <div className="mt-4 relative group">
                  <img 
                    src={message.image.dataUrl} 
                    alt={message.image.caption || 'Art from Zoe'}
                    className="rounded-xl max-w-[300px] shadow-lg border border-white/10"
                    style={{
                      boxShadow: '0 0 30px rgba(0,255,255,0.2)',
                    }}
                  />
                  {message.image.caption && (
                    <div className="mt-2 text-sm text-white/60 italic">
                      "{message.image.caption}"
                    </div>
                  )}
                  {message.image.style && (
                    <div className="absolute top-2 right-2 text-xs bg-black/50 px-2 py-1 rounded text-cyan-400">
                      {message.image.style}
                    </div>
                  )}
                </div>
              )}

              {/* Artifact display (if present) */}
              {message.artifact && (
                <div className="mt-4">
                  <ArtifactDisplay 
                    artifact={message.artifact}
                    onDownload={() => onArtifactDownload?.(message.artifact!)}
                    onExpand={() => onArtifactExpand?.(message.artifact!)}
                  />
                </div>
              )}
            </div>
          );
        })}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start animate-fade-in">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default InfinityStream;
