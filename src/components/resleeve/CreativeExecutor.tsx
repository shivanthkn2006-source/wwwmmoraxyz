/**
 * CREATIVE EXECUTOR - Phase 3: "The Execution"
 * User sketches rough → Zoe renders 4K → Auto-sell
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pencil, Wand2, Sparkles, ShoppingCart, 
  Send, DollarSign, Check, Loader2, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreativeExecutorProps {
  sleeveId: string;
  onComplete?: (result: ExecutionResult) => void;
}

interface ExecutionResult {
  originalSketch: string;
  enhancedArt: string;
  listed: boolean;
  price: number;
  description: string;
}

export const CreativeExecutor = ({ sleeveId, onComplete }: CreativeExecutorProps) => {
  const [step, setStep] = useState<'sketch' | 'enhance' | 'sell' | 'complete'>('sketch');
  const [sketchDescription, setSketchDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<string | null>(null);
  const [listingPrice, setListingPrice] = useState('50');
  const [listingDescription, setListingDescription] = useState('');

  const handleSketchSubmit = useCallback(async () => {
    if (!sketchDescription.trim()) {
      toast.error('Please describe your creation');
      return;
    }

    setIsProcessing(true);
    
    // Dispatch to Zoe Core DHF
    window.dispatchEvent(new CustomEvent('zoe-creative-execution', {
      detail: { step: 'sketch', description: sketchDescription, sleeveId }
    }));

    // Simulate AI enhancement
    await new Promise(r => setTimeout(r, 2000));
    
    // Generate "enhanced" result
    setEnhancedResult(`✨ Enhanced version of: "${sketchDescription}" - Rendered in 4K with professional artistic style`);
    setListingDescription(`Original artwork: ${sketchDescription}. Created with Zoe-Painter AI enhancement.`);
    setIsProcessing(false);
    setStep('enhance');
    
    toast.success('Sketch Enhanced!', {
      description: 'Your rough idea has been transformed into professional art'
    });
  }, [sketchDescription, sleeveId]);

  const handleListForSale = useCallback(async () => {
    setIsProcessing(true);
    
    // Dispatch to Zoe Core DHF
    window.dispatchEvent(new CustomEvent('zoe-creative-execution', {
      detail: { step: 'list', price: listingPrice, description: listingDescription, sleeveId }
    }));

    // Simulate marketplace listing
    await new Promise(r => setTimeout(r, 1500));
    
    setIsProcessing(false);
    setStep('complete');
    
    toast.success('Listed on Marketplace!', {
      description: `Your art is now available for $${listingPrice}`
    });

    // Callback with result
    onComplete?.({
      originalSketch: sketchDescription,
      enhancedArt: enhancedResult || '',
      listed: true,
      price: parseFloat(listingPrice),
      description: listingDescription
    });
  }, [listingPrice, listingDescription, enhancedResult, sketchDescription, sleeveId, onComplete]);

  return (
    <Card className="bg-background/60 backdrop-blur-xl border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Wand2 className="w-5 h-5 text-primary" />
          Creative Execution Engine
          <Badge variant="outline" className="ml-auto">
            Step {step === 'sketch' ? '1' : step === 'enhance' ? '2' : step === 'sell' ? '3' : '✓'}/3
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Sketch Input */}
        <AnimatePresence mode="wait">
          {step === 'sketch' && (
            <motion.div
              key="sketch"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                <div className="flex items-center gap-2 mb-3">
                  <Pencil className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">Your Rough Idea</span>
                </div>
                <Textarea
                  placeholder="Describe what you want to create... (e.g., 'A sunset over mountains with a lone tree')"
                  value={sketchDescription}
                  onChange={(e) => setSketchDescription(e.target.value)}
                  className="min-h-24 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Zoe will transform your description into professional 4K artwork
                </p>
              </div>

              <Button
                onClick={handleSketchSubmit}
                disabled={!sketchDescription.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enhancing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Transform to 4K Art
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Step 2: Enhanced Result */}
          {step === 'enhance' && (
            <motion.div
              key="enhance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 p-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mb-4">
                    <Image className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-medium">{enhancedResult}</p>
                  <Badge className="mt-3" variant="secondary">
                    <Sparkles className="w-3 h-3 mr-1" />
                    4K Enhanced
                  </Badge>
                </motion.div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('sketch')}
                  className="flex-1"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Sketch
                </Button>
                <Button
                  onClick={() => setStep('sell')}
                  className="flex-1"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Sell It
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: List for Sale */}
          {step === 'sell' && (
            <motion.div
              key="sell"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Set Your Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(e.target.value)}
                      className="pl-9"
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    value={listingDescription}
                    onChange={(e) => setListingDescription(e.target.value)}
                    className="min-h-16 resize-none"
                    placeholder="Describe your artwork for buyers..."
                  />
                </div>
              </div>

              <Button
                onClick={handleListForSale}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Listing on Marketplace...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    List for ${listingPrice}
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Step Complete */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-lg bg-green-500/10 border border-green-500/20 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4"
              >
                <Check className="w-8 h-8 text-green-500" />
              </motion.div>
              <h3 className="text-lg font-bold text-green-700 mb-2">
                You're Now a Professional Artist!
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Zoe handled the professional part. Your art is live and ready for buyers.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('sketch');
                  setSketchDescription('');
                  setEnhancedResult(null);
                }}
              >
                Create Another Masterpiece
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default CreativeExecutor;
