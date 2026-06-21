/**
 * VR OMEGA WORLD - STANDALONE AUDIT PAGE
 * Route: /vr-audit
 * Auto-downloads VR-only deep root scan PDF
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, AlertTriangle, Clock, RefreshCw, Loader2, Gamepad2, Monitor, Smartphone, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateVRWorldAuditPDF } from '@/utils/vrWorldAuditPdf';
import { toast } from 'sonner';

const VRWorldAuditPage: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoTriggered = useRef(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);
    setDownloadComplete(false);

    try {
      await new Promise((r) => setTimeout(r, 300));
      generateVRWorldAuditPDF();
      setDownloadComplete(true);
      toast.success('VR World Audit PDF downloaded!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF generation failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!hasAutoTriggered.current) {
      hasAutoTriggered.current = true;
      handleDownload();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-950 flex items-center justify-center p-4">
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
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/30">
              {isGenerating ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : downloadComplete ? (
                <CheckCircle className="w-10 h-10 text-white" />
              ) : (
                <Gamepad2 className="w-10 h-10 text-white" />
              )}
            </div>
          </motion.div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            VR OMEGA WORLD
          </h1>
          <h2 className="text-xl text-slate-300 mt-1">Deep Root Scan Audit</h2>
          <p className="text-slate-500 mt-2 text-sm">
            Standalone VR platform audit — voice prompts, controls, performance, overlays
          </p>
        </div>

        {/* Scan Coverage */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-cyan-950/40 border-cyan-700/50 text-center">
            <Gamepad2 className="w-6 h-6 mx-auto text-cyan-400 mb-2" />
            <div className="text-xs text-slate-400">Voice Commands</div>
            <div className="text-lg text-white font-bold">160+</div>
          </Card>
          <Card className="p-4 bg-blue-950/40 border-blue-700/50 text-center">
            <Monitor className="w-6 h-6 mx-auto text-blue-400 mb-2" />
            <div className="text-xs text-slate-400">Components</div>
            <div className="text-lg text-white font-bold">50+</div>
          </Card>
          <Card className="p-4 bg-indigo-950/40 border-indigo-700/50 text-center">
            <Smartphone className="w-6 h-6 mx-auto text-indigo-400 mb-2" />
            <div className="text-xs text-slate-400">Platforms</div>
            <div className="text-lg text-white font-bold">11</div>
          </Card>
          <Card className="p-4 bg-violet-950/40 border-violet-700/50 text-center">
            <Tv className="w-6 h-6 mx-auto text-violet-400 mb-2" />
            <div className="text-xs text-slate-400">Screen Sizes</div>
            <div className="text-lg text-white font-bold">4.1"-95"</div>
          </Card>
        </div>

        {/* Categories */}
        <Card className="p-5 bg-slate-900/50 border-cyan-500/20">
          <h3 className="text-cyan-400 font-semibold mb-3 text-sm uppercase tracking-wide">
            Audit Sections
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
            {[
              'VR Component Registry',
              'Voice Prompt Coverage',
              'Performance & Memory',
              'Cross-Platform Design',
              'UI Overlay & Z-Index',
              'On-Screen Controls',
              'Design Aesthetics',
              'Audio System',
              'Database Integration',
              'Known Issues & Fixes',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <span className="text-xs">{item}</span>
              </div>
            ))}
          </div>
        </Card>

        {error && (
          <Card className="p-4 bg-red-950/40 border-red-700/50">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </Card>
        )}

        {downloadComplete && !error && (
          <Card className="p-4 bg-emerald-950/40 border-emerald-700/50">
            <p className="text-emerald-400 text-sm text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              VR Audit PDF downloaded! Check your downloads folder.
            </p>
          </Card>
        )}

        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          className="w-full py-6 text-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 shadow-lg shadow-cyan-500/20"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating VR Audit...
            </>
          ) : downloadComplete ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Download Again
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Download VR Audit PDF
            </>
          )}
        </Button>

        <p className="text-center text-slate-600 text-xs">
          VR OMEGA World Deep Root Scan — M'Mora Infinity Systems
        </p>
      </motion.div>
    </div>
  );
};

export default VRWorldAuditPage;
