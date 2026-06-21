import { memo, useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArtifactDisplay, Artifact } from './ArtifactDisplay';
import type { Citation } from './CitationPanel';
import { EmotionIndicator } from './EmotionIndicator';
import { ChevronDown, Download } from 'lucide-react';

const messageTimeFormatter = new Intl.DateTimeFormat([], {
  hour: 'numeric',
  minute: '2-digit',
});

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
  // LEVEL 5: VIDEO GIFT - Inline video from video generator
  video?: {
    videoUrl: string;
    caption?: string;
    provider?: string;
    isImageFallback?: boolean;
  };
}

interface InfinityStreamProps {
  messages: InfinityMessage[];
  isTyping?: boolean;
  onArtifactDownload?: (artifact: Artifact) => void;
  onArtifactExpand?: (artifact: Artifact) => void;
  onRepeatMessage?: (message: InfinityMessage) => void;
  onMediaDownload?: (media: { url: string; filename: string; type: 'image' | 'video' }) => void;
}

/** Render user messages — inline custom emoji data URLs as <img> */
function UserMessageContent({ text }: { text: string }) {
  if (!text.includes('data:image/')) {
    return <>{text}</>;
  }
  const parts = text.split(/(data:image\/[^;\s]+;base64,[A-Za-z0-9+/=]+)/);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('data:image/') ? (
          <img key={i} src={part} alt="emoji" className="inline-block align-text-bottom" style={{ width: 22, height: 22, objectFit: 'contain' }} />
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export const InfinityStream = memo(function InfinityStream({ 
  messages, 
  isTyping = false,
  onArtifactDownload,
  onArtifactExpand,
  onRepeatMessage,
  onMediaDownload,
}: InfinityStreamProps) {
  const streamRef = useRef<HTMLDivElement>(null);
  const [openCitationPanels, setOpenCitationPanels] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Auto-scroll on new messages
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Track scroll position to show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!streamRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = streamRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

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

  const handleCopyMessage = async (message: InfinityMessage) => {
    try {
      await navigator.clipboard.writeText(stripSSMLTags(message.content));
      setCopiedMessageId(message.id);
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === message.id ? null : current));
      }, 1400);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative h-full">
    <div 
      ref={streamRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto px-6 pt-24 scrollbar-none relative z-20"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        scrollBehavior: 'smooth',
        paddingBottom: 'max(300px, calc(env(safe-area-inset-bottom) + 240px))',
      }}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {messages.map((message) => {
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
              {/* Text content - SSML tags stripped, citations stripped for clean display */}
              <div
                className={`
                  max-w-[85%] text-base leading-relaxed
                  ${message.role === 'user' 
                    ? 'text-white font-medium'
                    : 'text-[#FAFAFA]'
                  }
                `}
                style={{
                  textShadow: message.role === 'assistant' 
                    ? '0 0 20px rgba(255,255,255,0.1)' 
                    : '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({children}) => (
                          <p style={{margin: '0 0 8px 0', lineHeight: '1.6'}}>{children}</p>
                        ),
                        strong: ({children}) => (
                          <strong style={{fontWeight: 600, color: 'inherit'}}>{children}</strong>
                        ),
                        h1: ({children}) => (
                          <p style={{fontWeight: 600, fontSize: '1.1em', margin: '8px 0'}}>{children}</p>
                        ),
                        h2: ({children}) => (
                          <p style={{fontWeight: 600, margin: '8px 0'}}>{children}</p>
                        ),
                        h3: ({children}) => (
                          <p style={{fontWeight: 600, margin: '6px 0'}}>{children}</p>
                        ),
                        ul: ({children}) => (
                          <ul style={{paddingLeft: '16px', margin: '6px 0'}}>{children}</ul>
                        ),
                        li: ({children}) => (
                          <li style={{marginBottom: '4px'}}>{children}</li>
                        ),
                      }}
                    >
                      {stripSSMLTags(message.content).replace(/\[\d+\]/g, '')}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <UserMessageContent text={stripSSMLTags(message.content)} />
                )}
              </div>

              {/* LEVEL 2: PROCEDURAL GIFT - Inline Art Image */}
              {message.image && (
                <div className="mt-4 w-full max-w-[300px]">
                  <div className="relative group overflow-hidden rounded-xl">
                    <img 
                      src={message.image.dataUrl} 
                      alt={message.image.caption || 'Art from Zoe'}
                      className="block w-full rounded-xl shadow-lg border border-white/10"
                      style={{
                        boxShadow: '0 0 30px rgba(0,255,255,0.2)',
                      }}
                    />
                    {onMediaDownload && (
                      <button
                        type="button"
                        onClick={() => onMediaDownload({ url: message.image!.dataUrl, filename: `zoe-image-${message.id}.png`, type: 'image' })}
                        className="absolute bottom-2 right-2 z-10 inline-flex items-center justify-center rounded-full bg-black/55 p-2 text-white/80 transition hover:bg-black/70 hover:text-white"
                        aria-label="Download image"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {message.image.style && (
                      <div className="absolute top-2 right-2 text-xs bg-black/50 px-2 py-1 rounded text-cyan-400">
                        {message.image.style}
                      </div>
                    )}
                  </div>
                  {message.image.caption && (
                    <div className="mt-2 text-sm text-white/60 italic">
                      "{message.image.caption}"
                    </div>
                  )}
                </div>
              )}

              {/* LEVEL 5: VIDEO GIFT - Inline Video */}
              {message.video && (
                <div className="mt-4 w-full max-w-[320px]">
                  <div className="relative group overflow-hidden rounded-xl">
                    {message.video.isImageFallback ? (
                      <img
                        src={message.video.videoUrl}
                        alt={message.video.caption || 'Video from Zoe'}
                        className="block w-full rounded-xl shadow-lg border border-white/10 animate-pulse"
                        style={{ boxShadow: '0 0 30px rgba(138,43,226,0.2)' }}
                      />
                    ) : (
                      <video
                        src={message.video.videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="block w-full rounded-xl shadow-lg border border-white/10"
                        style={{ boxShadow: '0 0 30px rgba(138,43,226,0.2)' }}
                      />
                    )}
                    {message.video.provider && (
                      <div className="absolute top-2 right-2 text-xs bg-black/50 px-2 py-1 rounded text-purple-400">
                        {message.video.provider}
                      </div>
                    )}
                    {onMediaDownload && (
                      <button
                        type="button"
                        onClick={() => onMediaDownload({
                          url: message.video!.videoUrl,
                          filename: `zoe-video-${message.id}.${message.video?.isImageFallback ? 'png' : 'mp4'}`,
                          type: message.video?.isImageFallback ? 'image' : 'video',
                        })}
                        className="absolute bottom-2 right-2 z-10 inline-flex items-center justify-center rounded-full bg-black/55 p-2 text-white/80 transition hover:bg-black/70 hover:text-white"
                        aria-label="Download video"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {message.video.caption && (
                    <div className="mt-2 text-sm text-white/60 italic">
                      🎬 "{message.video.caption}"
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

              <div
                className={`mt-1.5 flex items-center gap-3 text-[11px] ${message.role === 'user' ? 'justify-end' : 'justify-start'} text-white/50`}
              >
                {message.role === 'assistant' && onRepeatMessage && (
                  <button
                    type="button"
                    onClick={() => onRepeatMessage(message)}
                    className="transition-colors hover:text-white/75"
                  >
                    Repeat
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleCopyMessage(message)}
                  className="transition-colors hover:text-white/75"
                >
                  {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                </button>
                <span>{messageTimeFormatter.format(message.timestamp)}</span>
              </div>
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

    {/* Scroll to bottom button */}
    {showScrollBtn && (
      <button
        type="button"
        onClick={scrollToBottom}
        className="absolute bottom-36 right-3 z-30 w-7 h-7 rounded-full bg-foreground/10 backdrop-blur-sm border border-border/20 flex items-center justify-center text-foreground/50 hover:text-foreground/80 hover:bg-foreground/20 transition-all"
        aria-label="Scroll to latest"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    )}
    </div>
  );
});

export default InfinityStream;
