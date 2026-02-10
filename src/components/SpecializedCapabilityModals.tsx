import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Eye, Search, BookOpen, Zap, Shield, Globe,
  Camera, FileText, Database, Brain, Loader2
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
import { useAuth } from '@/lib/auth';

interface CapabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  capability: string;
}

// Visual Analysis Modal
export const VisualAnalysisModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!imageUrl.trim()) {
      toast.error('Please enter an image URL');
      return;
    }

    if (!user) {
      toast.error('Please sign in to use this feature');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoe-multiagent', {
        body: {
          command: `Analyze this image and provide detailed insights: ${imageUrl}`,
          userId: user.id,
          mode: 'collaborative',
          context: { imageUrl }
        }
      });

      if (error) throw error;
      setAnalysis(data?.message || 'Analysis complete');
      toast.success('Image analyzed successfully');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Visual Analysis" icon={<Eye className="w-5 h-5 text-white" />} color="purple">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-2 text-[hsl(var(--oni-cyan))]">
            <Camera className="w-4 h-4 text-[hsl(var(--oni-purple))]" />
            Image URL
          </Label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-purple))]/30 focus:border-[hsl(var(--oni-purple))]/70 focus:shadow-[0_0_10px_hsl(var(--oni-purple)/0.3)]"
          />
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !imageUrl.trim()}
          className="w-full bg-gradient-to-r from-[hsl(var(--oni-purple))] to-[hsl(var(--oni-pink))] hover:shadow-[0_0_20px_hsl(var(--oni-purple)/0.5)]"
        >
          {isAnalyzing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
          ) : (
            <><Eye className="w-4 h-4 mr-2" /> Analyze Image</>
          )}
        </Button>

        {analysis && (
          <div className="p-4 rounded-lg oni-waterfall-message border border-[hsl(var(--oni-cyan))]/20">
            <Label className="text-xs text-[hsl(var(--oni-cyan))]/70 mb-2 block">Analysis Result</Label>
            <p className="text-sm text-foreground whitespace-pre-wrap">{analysis}</p>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};

// Universal Search Modal
export const UniversalSearchModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    if (!user) {
      toast.error('Please sign in to use this feature');
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoe-multiagent', {
        body: {
          command: `Search across all platform data for: ${query}`,
          userId: user.id,
          mode: 'collaborative',
          context: { searchQuery: query }
        }
      });

      if (error) throw error;
      setResults(data?.message || 'Search complete');
      toast.success('Search completed');
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Universal Search" icon={<Search className="w-5 h-5 text-white" />} color="cyan">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-2 text-[hsl(var(--oni-cyan))]">
            <Search className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
            Search Query
          </Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all platform data..."
            className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 focus:border-[hsl(var(--oni-cyan))]/70 focus:shadow-[0_0_10px_hsl(var(--oni-cyan)/0.3)]"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="w-full bg-gradient-to-r from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))] hover:shadow-[0_0_20px_hsl(var(--oni-cyan)/0.5)]"
        >
          {isSearching ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</>
          ) : (
            <><Search className="w-4 h-4 mr-2" /> Search Platform</>
          )}
        </Button>

        {results && (
          <ScrollArea className="h-48">
            <div className="p-4 rounded-lg oni-waterfall-message border border-[hsl(var(--oni-cyan))]/20">
              <p className="text-sm text-foreground whitespace-pre-wrap">{results}</p>
            </div>
          </ScrollArea>
        )}
      </div>
    </ModalWrapper>
  );
};

// Knowledge Management Modal
export const KnowledgeManagementModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    if (!content.trim()) {
      toast.error('Please enter content to process');
      return;
    }

    if (!user) {
      toast.error('Please sign in to use this feature');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoe-multiagent', {
        body: {
          command: `Organize and tag this knowledge content: ${content}`,
          userId: user.id,
          mode: 'adaptive',
          context: { contentToOrganize: content }
        }
      });

      if (error) throw error;
      setResult(data?.message || 'Content organized');
      toast.success('Knowledge organized successfully');
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process content');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Knowledge Management" icon={<BookOpen className="w-5 h-5 text-white" />} color="green">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-2 text-[hsl(var(--oni-cyan))]">
            <FileText className="w-4 h-4 text-emerald-400" />
            Content to Organize
          </Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste content to organize, tag, and categorize..."
            className="bg-[hsl(var(--oni-void))]/80 border-emerald-500/30 focus:border-emerald-500/70 focus:shadow-[0_0_10px_hsla(160,100%,50%,0.3)] min-h-[120px]"
          />
        </div>

        <Button
          onClick={handleProcess}
          disabled={isProcessing || !content.trim()}
          className="w-full bg-gradient-to-r from-emerald-500 to-[hsl(var(--oni-cyan))] hover:shadow-[0_0_20px_hsla(160,100%,50%,0.5)]"
        >
          {isProcessing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
          ) : (
            <><Database className="w-4 h-4 mr-2" /> Organize Knowledge</>
          )}
        </Button>

        {result && (
          <ScrollArea className="h-48">
            <div className="p-4 rounded-lg oni-waterfall-message border border-emerald-500/20">
              <p className="text-sm text-foreground whitespace-pre-wrap">{result}</p>
            </div>
          </ScrollArea>
        )}
      </div>
    </ModalWrapper>
  );
};

// Error Prediction Modal
export const ErrorPredictionModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    if (!user) {
      toast.error('Please sign in to use this feature');
      return;
    }

    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoe-multiagent', {
        body: {
          command: 'Perform proactive system health scan and predict potential errors',
          userId: user.id,
          mode: 'predictive',
          context: { scanType: 'proactive_health' }
        }
      });

      if (error) throw error;
      setScanResult(data?.message || 'System scan complete. No critical issues detected.');
      toast.success('System scan completed');
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan system');
    } finally {
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Error Prediction" icon={<Shield className="w-5 h-5 text-white" />} color="orange">
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-[hsl(var(--oni-gold))]/15 to-[hsl(var(--oni-pink))]/10 border border-[hsl(var(--oni-gold))]/30">
          <h4 className="text-sm font-medium text-[hsl(var(--oni-gold))] mb-2 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            <Shield className="w-4 h-4 text-[hsl(var(--oni-gold))]" />
            Proactive Health Monitoring
          </h4>
          <p className="text-xs text-muted-foreground">
            AI-powered system scanning to detect and predict potential errors before they occur.
          </p>
        </div>

        <Button
          onClick={handleScan}
          disabled={isScanning}
          className="w-full bg-gradient-to-r from-[hsl(var(--oni-gold))] to-[hsl(var(--oni-pink))] hover:shadow-[0_0_20px_hsl(var(--oni-gold)/0.5)]"
        >
          {isScanning ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning System...</>
          ) : (
            <><Shield className="w-4 h-4 mr-2" /> Run Health Scan</>
          )}
        </Button>

        {scanResult && (
          <ScrollArea className="h-48">
            <div className="p-4 rounded-lg oni-waterfall-message border border-[hsl(var(--oni-gold))]/20">
              <p className="text-sm text-foreground whitespace-pre-wrap">{scanResult}</p>
            </div>
          </ScrollArea>
        )}
      </div>
    </ModalWrapper>
  );
};

// Knowledge Synthesis Modal
export const KnowledgeSynthesisModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const [domains, setDomains] = useState('');
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const handleSynthesize = async () => {
    if (!domains.trim()) {
      toast.error('Please enter domains to synthesize');
      return;
    }

    if (!user) {
      toast.error('Please sign in to use this feature');
      return;
    }

    setIsSynthesizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoe-multiagent', {
        body: {
          command: `Synthesize knowledge across these domains and provide integrated insights: ${domains}`,
          userId: user.id,
          mode: 'collaborative',
          context: { domains: domains.split(',').map(d => d.trim()) }
        }
      });

      if (error) throw error;
      setSynthesis(data?.message || 'Knowledge synthesized');
      toast.success('Knowledge synthesis complete');
    } catch (error) {
      console.error('Synthesis error:', error);
      toast.error('Failed to synthesize knowledge');
    } finally {
      setIsSynthesizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Knowledge Synthesis" icon={<Globe className="w-5 h-5 text-white" />} color="blue">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-2 text-[hsl(var(--oni-cyan))]">
            <Brain className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
            Domains to Synthesize
          </Label>
          <Textarea
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="Enter domains separated by commas (e.g., AI, Healthcare, Finance)"
            className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 focus:border-[hsl(var(--oni-cyan))]/70 focus:shadow-[0_0_10px_hsl(var(--oni-cyan)/0.3)] min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleSynthesize}
          disabled={isSynthesizing || !domains.trim()}
          className="w-full bg-gradient-to-r from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))] hover:shadow-[0_0_20px_hsl(var(--oni-cyan)/0.5)]"
        >
          {isSynthesizing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Synthesizing...</>
          ) : (
            <><Globe className="w-4 h-4 mr-2" /> Synthesize Knowledge</>
          )}
        </Button>

        {synthesis && (
          <ScrollArea className="h-48">
            <div className="p-4 rounded-lg oni-waterfall-message border border-[hsl(var(--oni-cyan))]/20">
              <p className="text-sm text-foreground whitespace-pre-wrap">{synthesis}</p>
            </div>
          </ScrollArea>
        )}
      </div>
    </ModalWrapper>
  );
};

// Modal Wrapper Component - ONI Aesthetic
const ModalWrapper = ({ 
  children, 
  onClose, 
  title, 
  icon, 
  color 
}: { 
  children: React.ReactNode; 
  onClose: () => void; 
  title: string; 
  icon: React.ReactNode;
  color: string;
}) => {
  // ONI-themed gradients
  const gradients: Record<string, string> = {
    purple: 'from-[hsl(var(--oni-purple))]/15 to-[hsl(var(--oni-pink))]/10',
    cyan: 'from-[hsl(var(--oni-cyan))]/15 to-[hsl(var(--oni-purple))]/10',
    green: 'from-emerald-500/15 to-[hsl(var(--oni-cyan))]/10',
    orange: 'from-[hsl(var(--oni-gold))]/15 to-[hsl(var(--oni-pink))]/10',
    blue: 'from-[hsl(var(--oni-cyan))]/15 to-[hsl(var(--oni-purple))]/10'
  };

  const borderColors: Record<string, string> = {
    purple: 'border-[hsl(var(--oni-purple))]/40',
    cyan: 'border-[hsl(var(--oni-cyan))]/40',
    green: 'border-emerald-500/40',
    orange: 'border-[hsl(var(--oni-gold))]/40',
    blue: 'border-[hsl(var(--oni-cyan))]/40'
  };

  const bgGradients: Record<string, string> = {
    purple: 'from-[hsl(var(--oni-purple))] to-[hsl(var(--oni-pink))]',
    cyan: 'from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))]',
    green: 'from-emerald-500 to-[hsl(var(--oni-cyan))]',
    orange: 'from-[hsl(var(--oni-gold))] to-[hsl(var(--oni-pink))]',
    blue: 'from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))]'
  };

  const glowColors: Record<string, string> = {
    purple: 'shadow-[0_0_30px_hsl(var(--oni-purple)/0.4)]',
    cyan: 'shadow-[0_0_30px_hsl(var(--oni-cyan)/0.4)]',
    green: 'shadow-[0_0_30px_hsla(160,100%,50%,0.4)]',
    orange: 'shadow-[0_0_30px_hsl(var(--oni-gold)/0.4)]',
    blue: 'shadow-[0_0_30px_hsl(var(--oni-cyan)/0.4)]'
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[hsl(var(--oni-void))]/90 backdrop-blur-md z-[300] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-md oni-decode-text"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className={`oni-neuro-glass bg-[hsl(var(--oni-void))]/95 border-2 ${borderColors[color]} ${glowColors[color]} overflow-hidden`}>
            {/* Header - ONI Holographic Style */}
            <div className={`p-4 border-b border-[hsl(var(--oni-cyan))]/20 bg-gradient-to-r ${gradients[color]}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`relative p-2 rounded-lg bg-gradient-to-br ${bgGradients[color]} shadow-[0_0_15px_hsl(var(--oni-cyan)/0.5)]`}>
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
                    {icon}
                  </div>
                  <h2 className="text-lg font-bold text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 10px hsl(var(--oni-cyan))' }}>
                    {title}
                  </h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="hover:bg-[hsl(var(--oni-cyan))]/10 hover:text-[hsl(var(--oni-cyan))] transition-all"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {/* Content Area */}
            <div className="p-4 space-y-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              {children}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModalWrapper;
