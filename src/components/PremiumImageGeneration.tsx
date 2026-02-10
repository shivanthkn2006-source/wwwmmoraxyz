import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image, X, Upload, Wand2, Download, Loader2, 
  Sparkles, Eye, Trash2, Copy, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PremiumImageGenerationProps {
  isOpen: boolean;
  onClose: () => void;
}

const PremiumImageGeneration = ({ isOpen, onClose }: PremiumImageGenerationProps) => {
  const [prompt, setPrompt] = useState('');
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setAttachedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMode('edit');
    }
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setMode('generate');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      if (mode === 'edit' && attachedImage) {
        // Convert image to base64
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          
          const { data, error } = await supabase.functions.invoke('edit-image', {
            body: { 
              prompt: prompt.trim(),
              image: base64
            }
          });

          if (error) throw error;

          if (data?.imageUrl) {
            setGeneratedImage(data.imageUrl);
            toast.success('Image edited successfully!');
          } else if (data?.error) {
            toast.error(data.error);
          }
          setIsGenerating(false);
        };
        reader.readAsDataURL(attachedImage);
      } else {
        // Generate new image
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt: prompt.trim() }
        });

        if (error) throw error;

        if (data?.imageUrl) {
          setGeneratedImage(data.imageUrl);
          toast.success('Image generated successfully!');
        } else if (data?.error) {
          toast.error(data.error);
        }
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate image');
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Image downloaded');
    }
  };

  const handleCopyUrl = () => {
    if (generatedImage) {
      navigator.clipboard.writeText(generatedImage);
      toast.success('Image URL copied');
    }
  };

  const presetPrompts = [
    'A futuristic cityscape at sunset with flying cars',
    'An ethereal forest with bioluminescent plants',
    'A cosmic space station orbiting a purple planet',
    'A cyberpunk street market with neon lights',
    'An underwater palace with coral architecture'
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="bg-background/95 backdrop-blur-xl border-2 border-pink-500/30 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500">
                    <Wand2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      Premium Image Generation
                      <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-xs">
                        Multi-Agent
                      </Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground">Create or edit images with AI</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4">
              {/* Left Panel - Input */}
              <div className="p-4 space-y-4">
                {/* Mode Selector */}
                <div className="flex gap-2">
                  <Button
                    variant={mode === 'generate' ? 'default' : 'outline'}
                    onClick={() => { setMode('generate'); handleRemoveImage(); }}
                    className={mode === 'generate' ? 'bg-gradient-to-r from-pink-500 to-purple-500' : ''}
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                  <Button
                    variant={mode === 'edit' ? 'default' : 'outline'}
                    onClick={() => setMode('edit')}
                    className={mode === 'edit' ? 'bg-gradient-to-r from-pink-500 to-purple-500' : ''}
                    size="sm"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Edit Image
                  </Button>
                </div>

                {/* Image Upload (Edit Mode) */}
                {mode === 'edit' && (
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Upload className="w-4 h-4 text-pink-400" />
                      Upload Image to Edit
                    </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {previewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-white/10">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-full h-40 object-cover"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 w-8 h-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 border-dashed border-2 border-white/20 hover:border-pink-500/50"
                      >
                        <div className="text-center">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Click to upload image</span>
                        </div>
                      </Button>
                    )}
                  </div>
                )}

                {/* Prompt Input */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-pink-400" />
                    {mode === 'edit' ? 'Edit Instructions' : 'Image Prompt'}
                  </Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={mode === 'edit' 
                      ? 'Describe how you want to edit the image...' 
                      : 'Describe the image you want to create...'}
                    className="bg-white/5 border-white/10 min-h-[100px]"
                  />
                </div>

                {/* Preset Prompts */}
                {mode === 'generate' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Quick Prompts</Label>
                    <ScrollArea className="h-24">
                      <div className="flex flex-wrap gap-2">
                        {presetPrompts.map((preset, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="cursor-pointer hover:bg-white/10 text-[10px] transition-all"
                            onClick={() => setPrompt(preset)}
                          >
                            {preset.substring(0, 30)}...
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || (mode === 'edit' && !attachedImage)}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {mode === 'edit' ? 'Editing...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      {mode === 'edit' ? 'Edit Image' : 'Generate Image'}
                    </>
                  )}
                </Button>
              </div>

              {/* Right Panel - Output */}
              <div className="p-4 border-t md:border-t-0 md:border-l border-white/10">
                <Label className="text-sm flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-pink-400" />
                  Generated Result
                </Label>
                
                {generatedImage ? (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-white/10">
                      <img 
                        src={generatedImage} 
                        alt="Generated" 
                        className="w-full h-64 object-contain bg-black/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownload}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyUrl}
                        className="flex-1"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy URL
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Generated image will appear here</p>
                      <p className="text-xs mt-1 opacity-75">
                        {mode === 'edit' ? 'Upload an image and describe your edits' : 'Enter a prompt to generate'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PremiumImageGeneration;
