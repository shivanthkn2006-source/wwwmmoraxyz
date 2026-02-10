import { useState, useEffect, useRef } from 'react';
import { PenSquare, Image as ImageIcon, Loader2, Paperclip, FileText, Mic, MicOff, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
import DraftsModal from '@/components/DraftsModal';
import { useAuth } from '@/lib/auth';
import ZoeArchitect from '@/components/ZoeUniversalArchitect';
import ZoeInterpretiveAI from '@/components/ZoeInterpretiveAI';
import { ZoeOrbIcon } from '@/components/ZoeOrbIcon';
import { ExternalShareBridge } from '@/components/ExternalShareBridge';
import { 
  createSpeechRecognition, 
  stopSpeechRecognition, 
  isSpeechRecognitionSupported 
} from '@/utils/micPermissionManager';

interface DailyUsage {
  text: number;
  images: number;
  date: string;
}

const WebdropPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const privateTimelineId = location.state?.privateTimelineId;
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState<{ type: 'text' | 'image'; content: string } | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({ text: 0, images: 0, date: new Date().toDateString() });
  const [lastPrompt, setLastPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showZoeArchitect, setShowZoeArchitect] = useState(false);
  const [showInterpretiveAI, setShowInterpretiveAI] = useState(false);
  const [interpretiveAIEmbedded, setInterpretiveAIEmbedded] = useState(false);
  const [typeBarExpanded, setTypeBarExpanded] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const generatedContentRef = useRef(generatedContent);

  // Hide bottom navigation when Zoe Architect is active
  useEffect(() => {
    const bottomNav = document.querySelector('.bottom-navigation') as HTMLElement;
    if (bottomNav) {
      bottomNav.style.display = showZoeArchitect ? 'none' : '';
    }
    return () => {
      if (bottomNav) {
        bottomNav.style.display = '';
      }
    };
  }, [showZoeArchitect]);

  // Load user interests from profile
  useEffect(() => {
    const loadUserInterests = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('hobbies')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data?.hobbies) {
        setUserInterests(data.hobbies);
      }
    };
    
    loadUserInterests();
  }, [user]);

  // Handle Lisa-generated content
  useEffect(() => {
    if (location.state?.generatedContent) {
      setGeneratedContent(location.state.generatedContent);
      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Keep ref in sync with state
  useEffect(() => {
    generatedContentRef.current = generatedContent;
  }, [generatedContent]);

  useEffect(() => {
    const stored = localStorage.getItem('webdrop_usage');
    if (stored) {
      const usage = JSON.parse(stored) as DailyUsage;
      const today = new Date().toDateString();
      if (usage.date === today) {
        setDailyUsage(usage);
      } else {
        const newUsage = { text: 0, images: 0, date: today };
        setDailyUsage(newUsage);
        localStorage.setItem('webdrop_usage', JSON.stringify(newUsage));
      }
    }
  }, []);

  // Initialize speech recognition using centralized manager
  useEffect(() => {
    if (isSpeechRecognitionSupported()) {
      const recognition = createSpeechRecognition({
        continuous: false,
        interimResults: false,
        keepAlive: false, // Single-shot mode for webdrop
      });
      
      if (recognition) {
        recognition.onstart = () => {
          setIsListening(true);
          toast.success('Zoe is listening...', { description: 'Speak your prompt now' });
        };

        recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          
          // Check for editing commands first (if content exists)
          if (generatedContentRef.current) {
            const editKeywords = {
              longer: ['make it longer', 'expand', 'add more'],
              shorter: ['make it shorter', 'summarize', 'condense'],
              professional: ['make it professional', 'professional tone', 'formal'],
              casual: ['make it casual', 'casual tone', 'friendly'],
              detailed: ['add more details', 'more detailed', 'elaborate'],
              regenerate: ['regenerate', 'try again', 'redo']
            };

            let editType = null;
            for (const [type, keywords] of Object.entries(editKeywords)) {
              if (keywords.some(keyword => transcript.includes(keyword))) {
                editType = type;
                break;
              }
            }

            if (editType) {
              setIsGenerating(true);
              toast.success('Zoe is editing...', { description: `Making it ${editType}` });
              
              try {
                let editPrompt = '';
                const currentContent = generatedContentRef.current.content;
                
                switch (editType) {
                  case 'longer':
                    editPrompt = `Expand and make this longer while keeping the same style and tone:\n\n${currentContent}`;
                    break;
                  case 'shorter':
                    editPrompt = `Summarize and condense this to be shorter:\n\n${currentContent}`;
                    break;
                  case 'professional':
                    editPrompt = `Rewrite this in a professional and formal tone:\n\n${currentContent}`;
                    break;
                  case 'casual':
                    editPrompt = `Rewrite this in a casual and friendly tone:\n\n${currentContent}`;
                    break;
                  case 'detailed':
                    editPrompt = `Add more details and elaborate on this:\n\n${currentContent}`;
                    break;
                  case 'regenerate':
                    await handleRegenerate();
                    return;
                }

                if (generatedContentRef.current.type === 'text') {
                  if (!editPrompt || editPrompt.trim().length === 0) {
                    toast.error('Please enter a valid prompt');
                    return;
                  }

                  const { data, error } = await supabase.functions.invoke('generate-text', {
                    body: { prompt: editPrompt }
                  });
                  if (error) throw error;
                  setGeneratedContent({ type: 'text', content: data.text });
                  toast.success('Content edited!');
                } else {
                  const { data, error } = await supabase.functions.invoke('generate-image', {
                    body: { prompt: editPrompt }
                  });
                  if (error) throw error;
                  setGeneratedContent({ type: 'image', content: data.imageUrl });
                  toast.success('Image recreated!');
                }
              } catch (error) {
                console.error('Edit error:', error);
                toast.error('Failed to edit content');
              } finally {
                setIsGenerating(false);
              }
              return;
            }

            // Check for post commands
            const postGlobalKeywords = ['post this globally', 'post globally', 'share globally'];
            const postFriendsKeywords = ['post to friends', 'post for friends', 'share with friends'];
            
            if (postGlobalKeywords.some(keyword => transcript.includes(keyword))) {
              await handlePost('global');
              toast.success('Posted globally!');
              return;
            }
            if (postFriendsKeywords.some(keyword => transcript.includes(keyword))) {
              await handlePost('personal');
              toast.success('Posted to friends!');
              return;
            }
          }
          
          // Detect intent from voice command
          const imageKeywords = ['create image', 'generate image', 'make image', 'draw', 'picture of', 'photo of'];
          const textKeywords = ['create text', 'generate text', 'write', 'create post', 'make post'];
          
          const isImageIntent = imageKeywords.some(keyword => transcript.includes(keyword));
          const isTextIntent = textKeywords.some(keyword => transcript.includes(keyword));
          
          // Clean up the prompt by removing command keywords
          let cleanPrompt = transcript;
          [...imageKeywords, ...textKeywords].forEach(keyword => {
            cleanPrompt = cleanPrompt.replace(keyword, '').trim();
          });
          
          setPrompt(cleanPrompt);
          toast.success('Zoe is creating...', { description: cleanPrompt });
          
          // Automatically trigger generation based on detected intent
          if (isImageIntent) {
            setIsGenerating(true);
            setLastPrompt(cleanPrompt);
            try {
              const imageFiles = attachedFiles.filter(f => f.type.startsWith('image/'));
              
              if (imageFiles.length > 0) {
                const file = imageFiles[0];
                const reader = new FileReader();
                reader.onload = async (e) => {
                  const base64 = (e.target?.result as string)?.split(',')[1];
                  if (!base64) {
                    toast.error('Failed to read image file');
                    return;
                  }
                  
                  try {
                    const { data, error } = await supabase.functions.invoke('edit-image', {
                      body: { 
                        image: base64,
                        prompt: cleanPrompt
                      }
                    });

                    if (error) throw error;
                    setGeneratedContent({ type: 'image', content: data.imageUrl });
                    setImageCaption('');
                    updateUsage('images');
                    toast.success('Image edited successfully!');
                  } catch (error) {
                    console.error('Image edit error:', error);
                    toast.error('Failed to edit image');
                  } finally {
                    setIsGenerating(false);
                  }
                };
                reader.readAsDataURL(file);
              } else {
                if (!cleanPrompt || cleanPrompt.trim().length === 0) {
                  throw new Error('Cannot generate image without a prompt');
                }

                const { data, error } = await supabase.functions.invoke('generate-image', {
                  body: { prompt: cleanPrompt }
                });

                if (error) throw error;
                setGeneratedContent({ type: 'image', content: data.imageUrl });
                setImageCaption('');
                updateUsage('images');
                toast.success('Image generated successfully!');
              }
            } catch (error) {
              console.error('Image generation error:', error);
              toast.error('Failed to generate image');
            } finally {
              setIsGenerating(false);
            }
          } else if (isTextIntent) {
            setIsGenerating(true);
            setLastPrompt(cleanPrompt);
            try {
              let enhancedPrompt = cleanPrompt;
              if (attachedFiles.length > 0) {
                enhancedPrompt = `${cleanPrompt}\n\nContext: User has attached ${attachedFiles.length} file(s) as reference: ${attachedFiles.map(f => f.name).join(', ')}`;
              }

              if (!enhancedPrompt || enhancedPrompt.trim().length === 0) {
                throw new Error('Cannot generate content without a prompt');
              }

              const { data, error } = await supabase.functions.invoke('generate-text', {
                body: { 
                  prompt: enhancedPrompt,
                  hasAttachments: attachedFiles.length > 0
                }
              });

              if (error) throw error;
              setGeneratedContent({ type: 'text', content: data.text });
              updateUsage('text');
              toast.success('Text generated successfully!');
            } catch (error) {
              console.error('Text generation error:', error);
              toast.error('Failed to generate text');
            } finally {
              setIsGenerating(false);
            }
          } else {
            toast.info('Say "create image" or "create text" to generate content');
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          toast.error('Voice recognition failed', { description: 'Please try again' });
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        stopSpeechRecognition(recognitionRef.current);
      }
    };
  }, []);

  const toggleVoiceInput = async () => {
    if (!recognitionRef.current) {
      toast.error('Voice input not supported', { 
        description: 'Your browser does not support voice recognition' 
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        await recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        toast.error('Could not start voice input');
      }
    }
  };

  const updateUsage = (type: 'text' | 'images') => {
    const today = new Date().toDateString();
    const newUsage = {
      ...dailyUsage,
      [type]: dailyUsage[type] + 1,
      date: today
    };
    setDailyUsage(newUsage);
    localStorage.setItem('webdrop_usage', JSON.stringify(newUsage));
  };

  const handleTextGeneration = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (dailyUsage.text >= 10) {
      toast.error('Daily limit reached');
      return;
    }

    setIsGenerating(true);
    setLastPrompt(prompt);

    try {
      // Include attachment context if files are attached
      let enhancedPrompt = prompt;
      if (attachedFiles.length > 0) {
        enhancedPrompt = `${prompt}\n\nContext: User has attached ${attachedFiles.length} file(s) as reference: ${attachedFiles.map(f => f.name).join(', ')}`;
      }

      // Validate prompt before sending
      if (!enhancedPrompt || enhancedPrompt.trim().length === 0) {
        throw new Error('Cannot generate content without a prompt');
      }

      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: { 
          prompt: enhancedPrompt,
          hasAttachments: attachedFiles.length > 0
        }
      });

      if (error) throw error;

      setGeneratedContent({ type: 'text', content: data.text });
      updateUsage('text');
    } catch (error) {
      console.error('Text generation error:', error);
      toast.error('Failed to generate text');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageGeneration = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (dailyUsage.images >= 5) {
      toast.error('Daily limit reached');
      return;
    }

    setIsGenerating(true);
    setLastPrompt(prompt);

    try {
      // Check if we have image attachments to edit
      const imageFiles = attachedFiles.filter(f => f.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        // Use edit-image function for image editing (like Gemini)
        const file = imageFiles[0];
        const reader = new FileReader();
        
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        toast.info('Zoe is editing your image...', { description: prompt });

        const { data, error } = await supabase.functions.invoke('edit-image', {
          body: { 
            prompt: prompt,
            imageBase64: imageBase64
          }
        });

        if (error) {
          if (error.message?.includes('NO_CREDITS') || error.message?.includes('402')) {
            toast.error('AI service pending credit top-up', {
              description: 'Please add credits to continue editing images.',
              duration: 5000
            });
            return;
          }
          if (error.message?.includes('RATE_LIMIT') || error.message?.includes('429')) {
            toast.error('Rate limit reached', {
              description: 'Please wait a moment before editing more images.',
              duration: 4000
            });
            return;
          }
          throw error;
        }

        setGeneratedContent({ type: 'image', content: data.imageUrl });
        setImageCaption('');
        setAttachedFiles([]);
        updateUsage('images');
        toast.success('Image edited successfully!');
      } else {
        // Generate new image without attachments
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt: prompt }
        });

        if (error) {
          if (error.message?.includes('NO_CREDITS') || error.message?.includes('402')) {
            toast.error('AI service pending credit top-up', {
              description: 'Please add credits to continue generating images.',
              duration: 5000
            });
            return;
          }
          if (error.message?.includes('RATE_LIMIT') || error.message?.includes('429')) {
            toast.error('Rate limit reached', {
              description: 'Please wait a moment before generating more images.',
              duration: 4000
            });
            return;
          }
          throw error;
        }

        setGeneratedContent({ type: 'image', content: data.imageUrl });
        setImageCaption('');
        updateUsage('images');
        toast.success('Image generated successfully!');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error('Failed to generate/edit image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!lastPrompt || !generatedContent) return;

    if (generatedContentRef.current.type === 'text') {
      if (dailyUsage.text >= 10) {
        toast.error('Daily limit reached');
        return;
      }
      setPrompt(lastPrompt);
      await handleTextGeneration();
    } else {
      if (dailyUsage.images >= 5) {
        toast.error('Daily limit reached');
        return;
      }
      setPrompt(lastPrompt);
      await handleImageGeneration();
    }
  };

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(files);
    if (files.length > 0) {
      toast.success(`${files.length} file(s) attached`);
    }
  };

  const handleSaveDraft = () => {
    if (!generatedContent) return;

    const draft = {
      id: Date.now().toString(),
      type: generatedContent.type,
      content: generatedContent.content,
      caption: generatedContent.type === 'image' ? imageCaption : undefined,
      timestamp: Date.now()
    };

    const stored = localStorage.getItem('webdrop_drafts');
    const drafts = stored ? JSON.parse(stored) : [];
    drafts.push(draft);
    localStorage.setItem('webdrop_drafts', JSON.stringify(drafts));

    toast.success('Post saved as draft');
    setGeneratedContent(null);
    setImageCaption('');
    setPrompt('');
    setAttachedFiles([]);
  };

  const handlePost = async (visibility: 'global' | 'personal') => {
    if (!generatedContent) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use personal visibility for private timelines
      const actualVisibility = privateTimelineId ? 'personal' : visibility;

      // For images, explicitly set media_type to 'image' and media_url
      // For text, only set content
      const postData = generatedContent.type === 'image' 
        ? {
            user_id: user.id,
            content: imageCaption || null,
            media_url: generatedContent.content,
            media_type: 'image',
            visibility: actualVisibility,
            ...(privateTimelineId && { private_timeline_id: privateTimelineId }),
          }
        : {
            user_id: user.id,
            content: generatedContent.content,
            media_url: null,
            media_type: null,
            visibility: actualVisibility,
            ...(privateTimelineId && { private_timeline_id: privateTimelineId }),
          };

      const { error } = await supabase.from('posts').insert(postData);
      if (error) throw error;

      const successMessage = privateTimelineId 
        ? 'Posted to private timeline!'
        : `Posted to ${visibility === 'personal' ? 'friends' : 'global'} feed!`;
      
      toast.success(successMessage);
      setGeneratedContent(null);
      setImageCaption('');
      setPrompt('');
      setAttachedFiles([]);
    } catch (error) {
      console.error('Post error:', error);
      toast.error('Failed to post');
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Mode Toggle Buttons - Compact glassmorphic design */}
      <div className="fixed top-2 right-2 z-50 flex gap-1.5">
        <Button
          onClick={() => navigate('/universal-timeline')}
          size="sm"
          className="bg-white/10 hover:bg-white/20 text-white/90 px-2.5 py-1 h-8 text-xs rounded-lg shadow-lg backdrop-blur-xl border border-white/20"
        >
          <span className="hidden xs:inline">🌌</span> Timeline
        </Button>
        <Button
          onClick={() => setShowZoeArchitect(!showZoeArchitect)}
          size="sm"
          className="bg-white/10 hover:bg-white/20 text-white/90 px-2.5 py-1 h-8 text-xs rounded-lg shadow-lg backdrop-blur-xl border border-white/20"
        >
          {showZoeArchitect ? '←' : '✨'} <span className="hidden xs:inline">{showZoeArchitect ? 'Standard' : 'Architect'}</span>
        </Button>
      </div>

      {/* Conditional Rendering */}
      {showZoeArchitect ? (
        <ZoeArchitect userInterests={userInterests} />
      ) : (
        <div className="min-h-screen bg-black text-white flex flex-col">
          {/* Drafts Menu Button - Compact */}
          <button
            onClick={() => setIsDraftsOpen(true)}
            className="fixed top-2 left-2 z-50 bg-white/10 backdrop-blur-xl text-white border border-white/20 rounded-lg p-2 h-8 w-8 flex items-center justify-center hover:bg-white/20 transition-all shadow-lg"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto pb-36 xxs:pb-36 xs:pb-32 sm:pb-28">
        {/* Generation Window */}
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-foreground" />
              <p className="text-muted-foreground">Generating...</p>
            </div>
          ) : generatedContent ? (
            <div className="w-full max-w-2xl">
              {generatedContent.type === 'image' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={generatedContent.content}
                      alt="Generated"
                      className="w-full rounded-lg cursor-pointer"
                      onClick={() => setIsFullscreen(true)}
                    />
                    {/* Watermark */}
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white/80 font-medium">
                      Generated by Zoe
                    </div>
                  </div>
                  <Input
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handlePost('global')}
                      className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                    >
                      Global
                    </Button>
                    <Button
                      onClick={() => handlePost('personal')}
                      className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                    >
                      Friends
                    </Button>
                    <ExternalShareBridge
                      content={generatedContent.content}
                      contentType="post"
                      contentId={`webdrop-img-${Date.now()}`}
                      trigger={
                        <Button className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm">
                          <Share2 className="h-4 w-4 mr-1" /> Share
                        </Button>
                      }
                    />
                    <Button
                      onClick={handleSaveDraft}
                      className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                    >
                      Draft
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-background border border-border rounded-lg p-6 pb-8">
                    <p className="text-foreground whitespace-pre-wrap">{generatedContent.content}</p>
                    {/* Watermark */}
                    <div className="absolute bottom-2 right-2 text-[10px] text-white/50 font-medium">
                      Generated by Zoe
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePost('global')}
                      className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                    >
                      Global
                    </Button>
                    <Button
                      onClick={() => handlePost('personal')}
                      className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                    >
                      Friends
                    </Button>
                    <ExternalShareBridge
                      content={generatedContent.content}
                      contentType="post"
                      contentId={`webdrop-txt-${Date.now()}`}
                      trigger={
                        <Button className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm">
                          <Share2 className="h-4 w-4 mr-1" /> Share
                        </Button>
                      }
                    />
                    <Button
                      onClick={handleSaveDraft}
                      className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                    >
                      Draft
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center">Generate content to see it here</p>
          )}
        </div>

        {/* Regenerate Button */}
        {generatedContent && (
          <div className="px-4 py-4">
            <Button
              onClick={handleRegenerate}
              className="w-full bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
              disabled={isGenerating}
            >
              Regenerate
            </Button>
          </div>
        )}
        
        {/* Interpretive AI Multi-Agent System - Embedded View (takes full page area) */}
        {showInterpretiveAI && interpretiveAIEmbedded && (
          <div className="px-4 pb-32 xxs:pb-32 xs:pb-24 sm:pb-20 flex-1 overflow-y-auto min-h-[50vh]">
            <ZoeInterpretiveAI embedded={true} />
          </div>
        )}
      </div>

      {/* Fixed Prompt Bar - Collapsible from right to left */}
      <div 
        className={`fixed bottom-[76px] xxs:bottom-[76px] xs:bottom-20 sm:bottom-16 z-50 transition-all duration-300 ease-out ${
          typeBarExpanded ? 'left-0 right-0' : 'right-4 left-auto'
        }`}
      >
        {typeBarExpanded ? (
              // Expanded type bar
              <div className="bg-background/95 backdrop-blur-lg border-t border-border px-4 py-4 w-full">
                <div className="flex gap-3 items-end">
                  {/* Type Bar with Attachments */}
                  <div className="flex-1 relative flex gap-2">
                    <Input
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={isListening ? "Zoe is listening..." : "Describe your prompt or speak..."}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground pr-12 flex-1"
                      disabled={isListening}
                      autoFocus
                    />
                    <label className="absolute right-14 top-1/2 -translate-y-1/2 cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileAttachment}
                        className="hidden"
                      />
                      <Paperclip className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={toggleVoiceInput}
                            disabled={isGenerating || isTranscribing}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full ${
                              isListening 
                                ? 'bg-destructive/20 text-destructive animate-pulse border border-destructive/50' 
                                : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border'
                            }`}
                          >
                            {isListening ? (
                              <MicOff className="w-4 h-4" />
                            ) : (
                              <Mic className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isListening ? 'Stop Zoe voice input' : 'Start Zoe voice input'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Action Buttons */}
                  <TooltipProvider>
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleTextGeneration}
                            disabled={isGenerating || dailyUsage.text >= 10}
                            className="bg-black text-white border border-white/20 hover:bg-white/10 h-10 w-10 p-0 rounded-lg"
                          >
                            <PenSquare className="w-5 h-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Generate Text</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleImageGeneration}
                            disabled={isGenerating || dailyUsage.images >= 5}
                            className="bg-black text-white border border-white/20 hover:bg-white/10 h-10 w-10 p-0 rounded-lg"
                          >
                            <ImageIcon className="w-5 h-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Generate Image</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => {
                              if (!showInterpretiveAI) {
                                setShowInterpretiveAI(true);
                                setInterpretiveAIEmbedded(true);
                              } else {
                                setShowInterpretiveAI(false);
                                setInterpretiveAIEmbedded(false);
                              }
                            }}
                            className={`bg-white/10 backdrop-blur-md text-white/80 h-10 w-10 p-0 rounded-xl border border-white/20 shadow-lg hover:bg-white/20 hover:text-white transition-all ${showInterpretiveAI ? 'ring-2 ring-white/40' : ''}`}
                          >
                            <ZoeOrbIcon size="md" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Zoe Interpretive AI</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      {/* Collapse Button */}
                      <Button
                        onClick={() => setTypeBarExpanded(false)}
                        className="bg-background text-muted-foreground border border-border hover:bg-muted/50 h-10 w-10 p-0 rounded-lg"
                      >
                        <span className="text-lg">×</span>
                      </Button>
                    </div>
                  </TooltipProvider>
                </div>
                
                {/* Attached Files Display */}
                {attachedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="bg-white/10 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Collapsed - just show expand button on right
              <div className="p-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setTypeBarExpanded(true)}
                        className="bg-white/10 backdrop-blur-md text-white/80 h-10 w-10 p-0 rounded-xl border border-white/20 shadow-lg hover:bg-white/20 hover:text-white transition-all"
                      >
                        <PenSquare className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Click to type</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && generatedContent?.type === 'image' && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <img
            src={generatedContent.content}
            alt="Generated fullscreen"
            className="max-h-screen max-w-screen object-contain"
          />
        </div>
      )}

      {/* Drafts Modal */}
      <DraftsModal isOpen={isDraftsOpen} onClose={() => setIsDraftsOpen(false)} />
      
      {/* Interpretive AI Multi-Agent System - Floating View */}
      {showInterpretiveAI && !interpretiveAIEmbedded && <ZoeInterpretiveAI embedded={false} />}
        </div>
      )}
    </div>
  );
};

export default WebdropPage;
