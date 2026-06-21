// ═══════════════════════════════════════════════════════════════════════════════
// DHF UPLOAD DASHBOARD - Digital Human Fingerprint Asset Management
// Provides file upload, ATLAS Sync Meter visualization, and verification flow
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Image, Music, Video, Archive, Shield, 
  AlertTriangle, CheckCircle2, Lock, Fingerprint, Brain,
  TrendingUp, Eye, EyeOff, Trash2, Download, RefreshCw, Cpu
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { ATLASSyncVerification, ATLASSyncDataPoint } from './ATLASSyncVerification';
import { useATLASSync } from '@/hooks/useATLASSync';
import { AdaptiveLearningMeter } from './AdaptiveLearningMeter';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { BehavioralQuestionnaire } from './BehavioralQuestionnaire';
import { DHFDeviceIntelligenceDashboard } from './DHFDeviceIntelligenceDashboard';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface DHFAsset {
  id: string;
  fileName: string;
  fileSize: number;
  dataType: string;
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
  uploadTimestamp: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  vetoKeywords: string[];
  contentSummary?: string;
  syncPercentage: number;
  isVerified: boolean;
}

interface SyncMeterData {
  percentage: number;
  ecnIntegration: number;
  cepsPrediction: number;
  vetoProtection: number;
  dhfRichness: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const getFileIcon = (dataType: string) => {
  switch (dataType) {
    case 'image': return Image;
    case 'audio': return Music;
    case 'video': return Video;
    case 'document': return FileText;
    case 'archive': return Archive;
    default: return FileText;
  }
};

const getSensitivityColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
    case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    case 'low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    default: return 'text-muted-foreground bg-muted';
  }
};

const detectDataType = (fileName: string, mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive';
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) return 'audio';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) return 'video';
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext || '')) return 'document';
  
  return 'unknown';
};

const determineSensitivity = (dataType: string, fileName: string): 'low' | 'medium' | 'high' | 'critical' => {
  const lowerName = fileName.toLowerCase();
  
  // Critical: Financial, medical, identity documents
  if (lowerName.includes('passport') || lowerName.includes('id_card') || lowerName.includes('ssn') ||
      lowerName.includes('medical') || lowerName.includes('health') || lowerName.includes('bank') ||
      lowerName.includes('financial') || lowerName.includes('tax') || lowerName.includes('credit')) {
    return 'critical';
  }
  
  // High: Personal photos, voice recordings
  if (lowerName.includes('selfie') || lowerName.includes('portrait') || lowerName.includes('voice') ||
      lowerName.includes('personal') || lowerName.includes('private') || dataType === 'audio') {
    return 'high';
  }
  
  // Medium: General documents
  if (dataType === 'document' || dataType === 'video') {
    return 'medium';
  }
  
  return 'low';
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ATLAS SYNC METER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ATLASSyncMeter: React.FC<{ data: SyncMeterData }> = ({ data }) => {
  const getColorByPercentage = (pct: number) => {
    if (pct < 20) return 'from-slate-500 to-slate-400';
    if (pct < 40) return 'from-blue-500 to-blue-400';
    if (pct < 60) return 'from-cyan-500 to-cyan-400';
    if (pct < 80) return 'from-emerald-500 to-emerald-400';
    return 'from-primary to-primary/80';
  };

  const getStatusText = (pct: number) => {
    if (pct < 20) return 'Initializing...';
    if (pct < 40) return 'Basic Sync';
    if (pct < 60) return 'Active Integration';
    if (pct < 80) return 'Deep Learning';
    return 'Full Autonomy';
  };

  return (
    <Card className="bg-gradient-to-br from-background to-secondary/20 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Fingerprint className="h-5 w-5 text-primary" />
          ATLAS Sync Meter
        </CardTitle>
        <CardDescription>DHF Autonomy Level & ECN Integration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Sync Gauge */}
        <div className="relative">
          <div className="h-4 bg-secondary/50 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${getColorByPercentage(data.percentage)} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${data.percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">0%</span>
            <span className="text-sm font-medium">{data.percentage}% - {getStatusText(data.percentage)}</span>
            <span className="text-xs text-muted-foreground">100%</span>
          </div>
          
          {/* Threshold Markers */}
          <div className="absolute top-0 left-0 w-full h-4 flex">
            {[20, 40, 60, 80].map((threshold) => (
              <div
                key={threshold}
                className="absolute top-0 bottom-0 w-0.5 bg-background/50"
                style={{ left: `${threshold}%` }}
              />
            ))}
          </div>
        </div>

        {/* Sub-metrics */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'ECN Integration', value: data.ecnIntegration, icon: Brain },
            { label: 'CEPS Prediction', value: data.cepsPrediction, icon: TrendingUp },
            { label: 'VETO Protection', value: data.vetoProtection, icon: Shield },
            { label: 'DHF Richness', value: data.dhfRichness, icon: Fingerprint },
          ].map((metric) => (
            <div key={metric.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <metric.icon className="h-3 w-3" />
                  {metric.label}
                </span>
                <span className="font-medium">{metric.value}%</span>
              </div>
              <Progress value={metric.value} className="h-1.5" />
            </div>
          ))}
        </div>

        {/* Authorization Notice */}
        {data.percentage >= 20 && (
          <Alert className="border-primary/30 bg-primary/5">
            <Lock className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs">
              Sync level ≥20% requires text-based verification for new data points. 
              Type "I AUTHORIZE" to confirm each addition to your DHF.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DHF ASSET CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const DHFAssetCard: React.FC<{
  asset: DHFAsset;
  onVerify: (asset: DHFAsset) => void;
  onDelete: (assetId: string) => void;
}> = ({ asset, onVerify, onDelete }) => {
  const FileIcon = getFileIcon(asset.dataType);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 bg-secondary/20 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${getSensitivityColor(asset.sensitivityLevel)}`}>
          <FileIcon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{asset.fileName}</span>
            {asset.isVerified && (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>{formatFileSize(asset.fileSize)}</span>
            <span>•</span>
            <Badge variant="outline" className={`text-xs ${getSensitivityColor(asset.sensitivityLevel)}`}>
              {asset.sensitivityLevel}
            </Badge>
            <span>•</span>
            <span>{asset.dataType}</span>
          </div>
          
          {asset.vetoKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {asset.vetoKeywords.slice(0, 3).map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {asset.vetoKeywords.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{asset.vetoKeywords.length - 3} more
                </Badge>
              )}
            </div>
          )}
          
          {asset.contentSummary && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {asset.contentSummary}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-1">
          {!asset.isVerified && asset.syncPercentage >= 20 && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onVerify(asset)}
              className="text-xs"
            >
              <Lock className="h-3 w-3 mr-1" />
              Verify
            </Button>
          )}
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => onDelete(asset.id)}
            className="h-7 w-7 text-destructive/70 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Processing Status */}
      {asset.processingStatus !== 'completed' && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {asset.processingStatus === 'processing' && (
            <>
              <RefreshCw className="h-3 w-3 animate-spin text-primary" />
              <span className="text-muted-foreground">Processing with AI...</span>
            </>
          )}
          {asset.processingStatus === 'pending' && (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-muted-foreground">Pending processing</span>
            </>
          )}
          {asset.processingStatus === 'failed' && (
            <>
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-destructive">Processing failed</span>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const DHFUploadDashboard: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { syncState, addDataPoint, markDataPointVerified, refreshFromDatabase } = useATLASSync();
  const { syncStatus, activityFreshness, trackNavigation } = useAdaptiveLearning();
  
  const [assets, setAssets] = useState<DHFAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedAssetForVerification, setSelectedAssetForVerification] = useState<DHFAsset | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeviceIntel, setShowDeviceIntel] = useState(false);
  
  // Track page navigation
  useEffect(() => {
    trackNavigation('dhf_dashboard');
  }, [trackNavigation]);

  // Check admin access for Device Intelligence
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        setIsAdmin(!!roleData);
      } catch (err) {
        console.error('[DHF] Admin check failed:', err);
      }
    };
    checkAdmin();
  }, [user]);

  // Calculate sync meter data - combine local assets with database sync status
  const syncMeterData: SyncMeterData = {
    percentage: Math.max(syncState.percentage, syncStatus.sync_percentage, Math.min(100, assets.filter(a => a.isVerified).length * 10)),
    ecnIntegration: Math.min(100, assets.filter(a => a.sensitivityLevel === 'high' || a.sensitivityLevel === 'critical').length * 15 + 20),
    cepsPrediction: Math.min(100, assets.filter(a => a.processingStatus === 'completed').length * 12 + 15),
    vetoProtection: Math.min(100, assets.reduce((acc, a) => acc + a.vetoKeywords.length, 0) * 5 + 25),
    dhfRichness: Math.min(100, assets.length * 8 + (syncStatus.event_count > 0 ? 30 : 0)),
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = useCallback(async (file: File): Promise<DHFAsset> => {
    const dataType = detectDataType(file.name, file.type);
    const sensitivity = determineSensitivity(dataType, file.name);
    
    // Calculate sync percentage based on sensitivity
    const syncPercentageMap = {
      'critical': 80,
      'high': 60,
      'medium': 40,
      'low': 20,
    };
    
    // Generate mock VETO keywords based on data type
    const vetoKeywords = [];
    if (sensitivity === 'critical') vetoKeywords.push('IDENTITY', 'FINANCIAL');
    if (sensitivity === 'high') vetoKeywords.push('PERSONAL', 'PRIVATE');
    if (dataType === 'audio') vetoKeywords.push('VOICE_BIOMETRIC');
    if (dataType === 'image') vetoKeywords.push('FACIAL_DATA');
    
    return {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      dataType,
      sensitivityLevel: sensitivity,
      uploadTimestamp: new Date().toISOString(),
      processingStatus: 'pending',
      vetoKeywords,
      syncPercentage: syncPercentageMap[sensitivity],
      isVerified: syncPercentageMap[sensitivity] < 20, // Auto-verified if below 20%
    };
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await handleFiles(files);
    }
  }, []);

  const handleFiles = async (files: File[]) => {
    if (!user) {
      toast.error('Please sign in to upload DHF assets');
      return;
    }
    
    setIsUploading(true);
    
    try {
      const newAssets = await Promise.all(files.map(processFile));
      
      setAssets(prev => [...prev, ...newAssets]);
      
      // Simulate processing
      for (const asset of newAssets) {
        setTimeout(() => {
          setAssets(prev => prev.map(a => 
            a.id === asset.id 
              ? { ...a, processingStatus: 'processing' as const }
              : a
          ));
        }, 500);
        
        setTimeout(() => {
          setAssets(prev => prev.map(a => 
            a.id === asset.id 
              ? { 
                  ...a, 
                  processingStatus: 'completed' as const,
                  contentSummary: `AI analysis complete. ${a.dataType === 'image' ? 'Visual features extracted.' : 'Content indexed.'} Sensitivity: ${a.sensitivityLevel}.`
                }
              : a
          ));
          
          // Add to ATLAS sync if needs verification
          if (asset.syncPercentage >= 20) {
            addDataPoint({
              key: asset.id,
              label: asset.fileName,
              value: asset.dataType,
              description: `${asset.dataType} file with ${asset.sensitivityLevel} sensitivity`,
              syncPercentage: asset.syncPercentage,
              category: asset.sensitivityLevel === 'critical' ? 'financial' : 
                       asset.sensitivityLevel === 'high' ? 'privacy' : 'behavioral',
            });
          }
        }, 2000);
      }
      
      toast.success(`${files.length} file(s) added to DHF stack`, {
        description: 'Processing with AI for entity extraction...',
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyAsset = (asset: DHFAsset) => {
    setSelectedAssetForVerification(asset);
    setShowVerificationDialog(true);
  };

  const handleVerificationComplete = (dataPoint: ATLASSyncDataPoint, authorizationId: string) => {
    if (selectedAssetForVerification) {
      setAssets(prev => prev.map(a => 
        a.id === selectedAssetForVerification.id 
          ? { ...a, isVerified: true }
          : a
      ));
      markDataPointVerified(dataPoint.key, authorizationId);
    }
    setSelectedAssetForVerification(null);
    setShowVerificationDialog(false);
  };

  const handleDeleteAsset = async (assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));
    toast.success('Asset removed from DHF stack');
  };

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fingerprint className="h-6 w-6 text-primary" />
            DHF Upload Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enrich your Digital Human Fingerprint with personal data assets
          </p>
        </div>
      </div>

      {/* Sync Meters Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* ATLAS Sync Meter */}
        <ATLASSyncMeter data={syncMeterData} />
        
        {/* Adaptive Learning Meter - shows real user data from database */}
        <AdaptiveLearningMeter 
          syncPercentage={syncStatus.sync_percentage}
          eventCount={syncStatus.event_count}
          finetuningReady={syncStatus.finetuning_ready}
          requiresContextRefresh={activityFreshness?.requires_context_refresh || false}
        />
      </div>

      {/* Behavioral Questionnaire - helps Zoe learn user preferences */}
      <BehavioralQuestionnaire 
        onComplete={(answers) => {
          console.log('[DHF] Questionnaire complete:', answers);
          toast.success('Profile enhanced! Zoe now understands you better.');
        }}
      />

      {/* Device Intelligence Dashboard - Admin Only */}
      {isAdmin && (
        <Collapsible open={showDeviceIntel} onOpenChange={setShowDeviceIntel}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between border-primary/30 bg-gradient-to-r from-primary/5 to-cyan-500/5 hover:from-primary/10 hover:to-cyan-500/10"
            >
              <span className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                Device Intelligence Dashboard
                <Badge variant="outline" className="ml-2 text-xs text-amber-400 border-amber-500/30">
                  Admin Only
                </Badge>
              </span>
              <motion.div
                animate={{ rotate: showDeviceIntel ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <TrendingUp className="h-4 w-4" />
              </motion.div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <DHFDeviceIntelligenceDashboard />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Upload Zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="py-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.md"
          />
          
          <motion.div
            animate={{ scale: dragActive ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <Upload className={`h-12 w-12 mx-auto mb-4 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </motion.div>
          
          <h3 className="text-lg font-medium mb-2">
            {dragActive ? 'Drop files here' : 'Upload DHF Assets'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag & drop files or click to browse. Supported: Images, Audio, Video, Documents
          </p>
          
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </>
            )}
          </Button>
          
          {/* Sensitivity Warning */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Files are processed locally. Critical data requires text-based verification.</span>
          </div>
        </CardContent>
      </Card>

      {/* Assets List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({assets.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({assets.filter(a => !a.isVerified && a.syncPercentage >= 20).length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({assets.filter(a => a.isVerified).length})
          </TabsTrigger>
          <TabsTrigger value="critical">
            Critical ({assets.filter(a => a.sensitivityLevel === 'critical').length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-[400px]">
            <AnimatePresence>
              <div className="space-y-3">
                {assets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Fingerprint className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No DHF assets uploaded yet</p>
                    <p className="text-sm">Upload files to build your Digital Human Fingerprint</p>
                  </div>
                ) : (
                  assets.map((asset) => (
                    <DHFAssetCard
                      key={asset.id}
                      asset={asset}
                      onVerify={handleVerifyAsset}
                      onDelete={handleDeleteAsset}
                    />
                  ))
                )}
              </div>
            </AnimatePresence>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="pending" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {assets.filter(a => !a.isVerified && a.syncPercentage >= 20).map((asset) => (
                <DHFAssetCard
                  key={asset.id}
                  asset={asset}
                  onVerify={handleVerifyAsset}
                  onDelete={handleDeleteAsset}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="verified" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {assets.filter(a => a.isVerified).map((asset) => (
                <DHFAssetCard
                  key={asset.id}
                  asset={asset}
                  onVerify={handleVerifyAsset}
                  onDelete={handleDeleteAsset}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="critical" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {assets.filter(a => a.sensitivityLevel === 'critical').map((asset) => (
                <DHFAssetCard
                  key={asset.id}
                  asset={asset}
                  onVerify={handleVerifyAsset}
                  onDelete={handleDeleteAsset}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* ATLAS Sync Verification Dialog */}
      {selectedAssetForVerification && (
        <ATLASSyncVerification
          isOpen={showVerificationDialog}
          onClose={() => {
            setShowVerificationDialog(false);
            setSelectedAssetForVerification(null);
          }}
          dataPoint={{
            key: selectedAssetForVerification.id,
            label: selectedAssetForVerification.fileName,
            value: selectedAssetForVerification.dataType,
            description: `${selectedAssetForVerification.dataType} file with ${selectedAssetForVerification.sensitivityLevel} sensitivity. Contains ${selectedAssetForVerification.vetoKeywords.length} VETO keywords.`,
            syncPercentage: selectedAssetForVerification.syncPercentage,
            category: selectedAssetForVerification.sensitivityLevel === 'critical' ? 'financial' : 
                     selectedAssetForVerification.sensitivityLevel === 'high' ? 'privacy' : 'behavioral',
          }}
          onVerified={handleVerificationComplete}
          verificationMethod="text_primary"
        />
      )}
    </div>
  );
};

export default DHFUploadDashboard;
