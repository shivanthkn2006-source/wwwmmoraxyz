/**
 * ZOE EAR-LINK BLUEPRINT DOWNLOAD PAGE
 * Direct access to hardware specification PDF
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Cpu, Wifi, Volume2, Battery, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateEarLinkBlueprintPDF } from '@/utils/earLinkBlueprintPdfGenerator';
import { toast } from 'sonner';
import PageSeo from '@/components/seo/PageSeo';
import { ROUTE_SEO } from '@/config/routeSeo';

const EarLinkBlueprintPage: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  // Test log to verify page is loading
  useEffect(() => {
    console.log('[EarLinkPage] Component mounted successfully');
  }, []);

  useEffect(() => {
    // Auto-download on page load
    if (!autoDownloaded) {
      console.log('[EarLinkPage] Auto-download triggered');
      handleDownload();
      setAutoDownloaded(true);
    }
  }, [autoDownloaded]);

  const handleDownload = async () => {
    console.log('[EarLinkPage] Starting download...');
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log('[EarLinkPage] Calling PDF generator...');
      generateEarLinkBlueprintPDF();
      console.log('[EarLinkPage] PDF generator completed');
      toast.success('Zoe Ear-Link Blueprint downloaded!');
    } catch (error) {
      console.error('[EarLinkPage] Download error:', error);
      toast.error('Download failed. Click to retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const specs = [
    { icon: Cpu, label: 'ESP32-S3', value: 'XIAO Module' },
    { icon: Wifi, label: 'Streaming', value: '16kHz WebSocket' },
    { icon: Volume2, label: 'Output', value: 'Bone Conduction' },
    { icon: Battery, label: 'Battery', value: '8hr / 400mAh' },
  ];

return (
    <>
      <PageSeo title={ROUTE_SEO['/ear-link-blueprint'].title} description={ROUTE_SEO['/ear-link-blueprint'].description} path="/ear-link-blueprint" />
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="inline-block mb-4"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <Cpu className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            ZOE EAR-LINK
          </h1>
          <p className="text-slate-400 mt-2">$35 Thin Client Hardware Blueprint</p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3">
          {specs.map((spec, i) => (
            <Card key={i} className="p-3 bg-slate-800/50 border-slate-700 text-center">
              <spec.icon className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
              <div className="text-xs text-slate-500">{spec.label}</div>
              <div className="text-sm text-white font-medium">{spec.value}</div>
            </Card>
          ))}
        </div>

        {/* Features */}
        <Card className="p-4 bg-slate-800/30 border-cyan-500/20">
          <h3 className="text-cyan-400 font-semibold mb-3">Blueprint Includes:</h3>
          <div className="space-y-2">
            {[
              'Complete Bill of Materials ($34.99)',
              'Wiring Diagram & Pinout',
              'Full Arduino C++ Firmware',
              '3D Printing Specifications',
              'Assembly Guide',
              'Troubleshooting Section',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </Card>

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          className="w-full py-6 text-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
        >
          {isGenerating ? (
            <><Cpu className="w-5 h-5 mr-2 animate-spin" /> Generating PDF...</>
          ) : (
            <><Download className="w-5 h-5 mr-2" /> Download Blueprint (PDF)</>
          )}
        </Button>

        <p className="text-center text-slate-500 text-xs">
          "Her, but in your ear." — M'Mora Infinity Systems
        </p>
      </motion.div>
    </div>
    </>
  );
};

export default EarLinkBlueprintPage;
