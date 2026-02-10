/**
 * PLATFORM AUDIT PAGE
 * Direct download of comprehensive platform status PDF
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, AlertTriangle, Clock, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generatePlatformAuditPDF } from '@/utils/platformAuditPdfGenerator';
import { toast } from 'sonner';

const PlatformAuditPage: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  useEffect(() => {
    console.log('[PlatformAudit] Page mounted');
    if (!autoDownloaded) {
      handleDownload();
      setAutoDownloaded(true);
    }
  }, [autoDownloaded]);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      generatePlatformAuditPDF();
      toast.success('Platform Audit PDF downloaded!');
    } catch (err) {
      console.error('[PlatformAudit] Error:', err);
      toast.error('PDF generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="inline-block mb-4"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            PLATFORM AUDIT
          </h1>
          <p className="text-slate-400 mt-2">Comprehensive Component Status Report</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 bg-emerald-900/30 border-emerald-700 text-center">
            <CheckCircle className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
            <div className="text-xs text-slate-500">Working</div>
            <div className="text-sm text-white font-medium">50+</div>
          </Card>
          <Card className="p-3 bg-yellow-900/30 border-yellow-700 text-center">
            <Clock className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
            <div className="text-xs text-slate-500">Pending</div>
            <div className="text-sm text-white font-medium">4</div>
          </Card>
          <Card className="p-3 bg-orange-900/30 border-orange-700 text-center">
            <Wrench className="w-5 h-5 mx-auto text-orange-400 mb-1" />
            <div className="text-xs text-slate-500">Needs Fix</div>
            <div className="text-sm text-white font-medium">1</div>
          </Card>
          <Card className="p-3 bg-cyan-900/30 border-cyan-700 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
            <div className="text-xs text-slate-500">Partial</div>
            <div className="text-sm text-white font-medium">1</div>
          </Card>
        </div>

        <Card className="p-4 bg-slate-800/30 border-emerald-500/20">
          <h3 className="text-emerald-400 font-semibold mb-3">Report Includes:</h3>
          <div className="space-y-2 text-sm text-slate-300">
            {[
              'Core Pages Status',
              'Zoe AI System Components',
              'Phoenix Protocol (Digital Immortality)',
              'Nexus Economy (Agentic Workforce)',
              'Security Systems',
              'Database Tables',
              'Edge Functions',
              'Pending Integrations',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          className="w-full py-6 text-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500"
        >
          {isGenerating ? (
            <>
              <FileText className="w-5 h-5 mr-2 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" /> Download Audit PDF
            </>
          )}
        </Button>

        <p className="text-center text-slate-500 text-xs">
          Zoe Platform Root Scan — M'Mora Infinity Systems
        </p>
      </motion.div>
    </div>
  );
};

export default PlatformAuditPage;
