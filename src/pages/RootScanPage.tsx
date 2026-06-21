/**
 * ZOE INFINITY ROOT SCAN PAGE
 * Auto-downloads comprehensive platform audit PDF on load
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, AlertTriangle, Clock, Wrench, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateZoeInfinityRootScanPDF } from '@/utils/zoeInfinityRootScanPdf';
import { toast } from 'sonner';

const RootScanPage: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoTriggered = useRef(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);
    setDownloadComplete(false);
    
    console.log('[RootScanPage] Starting PDF generation...');
    
    try {
      // Small delay to allow UI to update
      await new Promise((r) => setTimeout(r, 300));
      
      generateZoeInfinityRootScanPDF();
      
      setDownloadComplete(true);
      toast.success('Root Scan PDF downloaded successfully!');
      console.log('[RootScanPage] ✅ PDF download complete');
    } catch (err) {
      console.error('[RootScanPage] ❌ Error:', err);
      const message = err instanceof Error ? err.message : 'PDF generation failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-trigger on mount
  useEffect(() => {
    if (!hasAutoTriggered.current) {
      hasAutoTriggered.current = true;
      console.log('[RootScanPage] Page mounted - auto-triggering download');
      handleDownload();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            animate={isGenerating ? { rotate: 360 } : { rotate: 0 }}
            transition={isGenerating ? { repeat: Infinity, duration: 2, ease: 'linear' } : {}}
            className="inline-block mb-4"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 via-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/30">
              {isGenerating ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : downloadComplete ? (
                <CheckCircle className="w-10 h-10 text-white" />
              ) : (
                <FileText className="w-10 h-10 text-white" />
              )}
            </div>
          </motion.div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
            ZOE INFINITY
          </h1>
          <h2 className="text-xl text-slate-300 mt-1">Platform Root Scan</h2>
          <p className="text-slate-500 mt-2 text-sm">
            Comprehensive audit of all platform components
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-emerald-950/40 border-emerald-700/50 text-center">
            <CheckCircle className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
            <div className="text-xs text-slate-400">Working</div>
            <div className="text-lg text-white font-bold">100+</div>
          </Card>
          <Card className="p-4 bg-amber-950/40 border-amber-700/50 text-center">
            <Clock className="w-6 h-6 mx-auto text-amber-400 mb-2" />
            <div className="text-xs text-slate-400">Pending</div>
            <div className="text-lg text-white font-bold">4</div>
          </Card>
          <Card className="p-4 bg-orange-950/40 border-orange-700/50 text-center">
            <Wrench className="w-6 h-6 mx-auto text-orange-400 mb-2" />
            <div className="text-xs text-slate-400">Needs Fix</div>
            <div className="text-lg text-white font-bold">1</div>
          </Card>
          <Card className="p-4 bg-violet-950/40 border-violet-700/50 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-violet-400 mb-2" />
            <div className="text-xs text-slate-400">Partial</div>
            <div className="text-lg text-white font-bold">0</div>
          </Card>
        </div>

        {/* Categories Covered */}
        <Card className="p-5 bg-slate-900/50 border-purple-500/20">
          <h3 className="text-purple-400 font-semibold mb-3 text-sm uppercase tracking-wide">
            Scan Coverage
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
            {[
              'Zoe Infinity Pages',
              'Zoe Infinity Components',
              'Zoe Infinity Hooks',
              'Zoe Infinity Edge Functions',
              'Zoe Sovereign Core',
              'Zoe Omega Evolution',
              'Zoe God Mode',
              'Phoenix Protocol',
              'Nexus Economy',
              'Selfie City',
              'Security Systems',
              'Pending Integrations',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-purple-400 flex-shrink-0" />
                <span className="text-xs">{item}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="p-4 bg-red-950/40 border-red-700/50">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </Card>
        )}

        {/* Success Display */}
        {downloadComplete && !error && (
          <Card className="p-4 bg-emerald-950/40 border-emerald-700/50">
            <p className="text-emerald-400 text-sm text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              PDF downloaded successfully! Check your downloads folder.
            </p>
          </Card>
        )}

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:via-violet-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Root Scan...
            </>
          ) : downloadComplete ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Download Again
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Download Root Scan PDF
            </>
          )}
        </Button>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs">
          Zoe Infinity Platform Root Scan — M'Mora Infinity Systems
        </p>
      </motion.div>
    </div>
  );
};

export default RootScanPage;
