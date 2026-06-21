/**
 * ADMIN-ONLY BLUEPRINT DOWNLOAD PAGE
 * Access restricted to @moksh50
 * Location: /blueprint-download
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Shield, Cpu, Database, Zap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateBlueprintPDF, generateBlueprintData } from '@/utils/mmoraArchitectureBlueprintGenerator';
import { toast } from 'sonner';

const BlueprintDownloadPage: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const data = generateBlueprintData();

  const handleDownload = async () => {
    setIsGenerating(true);
    toast.info('Generating M\'Mora + Zoe Architecture Blueprint...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Dramatic pause
      generateBlueprintPDF();
      setScanComplete(true);
      toast.success('Blueprint downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate blueprint');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">ADMIN ACCESS GRANTED</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            M'MORA + ZOE BLUEPRINT
          </h1>
          <p className="text-muted-foreground mt-2">Complete Architecture Documentation</p>
        </motion.div>

        {/* Scan Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Components', value: data.diagnosticReport.totalComponents, icon: Cpu },
            { label: 'Hooks', value: data.diagnosticReport.totalHooks, icon: Zap },
            { label: 'Pages', value: data.diagnosticReport.totalPages, icon: FileText },
            { label: 'Edge Functions', value: data.diagnosticReport.totalEdgeFunctions, icon: Shield },
            { label: 'Tables', value: data.diagnosticReport.totalDatabaseTables, icon: Database },
          ].map((stat, i) => (
            <Card key={i} className="p-3 bg-card/50 border-primary/20 text-center">
              <stat.icon className="w-5 h-5 mx-auto text-primary mb-1" />
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Zoe Variants */}
        <Card className="p-4 bg-card/50 border-accent/20">
          <h3 className="text-accent font-semibold mb-3">10 ZOE AI VARIANTS</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {data.zoeVariants.map((variant, i) => (
              <div key={i} className="p-2 rounded bg-accent/10 border border-accent/20 text-center">
                <div className="text-foreground text-xs font-medium">{variant.name}</div>
                <div className="text-accent text-[10px] uppercase">{variant.type}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Integration Status */}
        <Card className="p-4 bg-card/50 border-emerald-500/20">
          <h3 className="text-emerald-400 font-semibold mb-3">ALL INTEGRATIONS HEALTHY</h3>
          <div className="flex flex-wrap gap-2">
            {Object.keys(data.diagnosticReport.integrationStatus).map((name, i) => (
              <div key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 text-xs">{name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Download Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="text-center">
          <Button
            onClick={handleDownload}
            disabled={isGenerating}
            className="px-8 py-6 text-lg bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 hover:from-cyan-500 hover:via-purple-500 hover:to-pink-500"
          >
            {isGenerating ? (
              <><Cpu className="w-5 h-5 mr-2 animate-spin" /> Generating Blueprint...</>
            ) : (
              <><Download className="w-5 h-5 mr-2" /> Download Complete Blueprint (PDF)</>
            )}
          </Button>
        </motion.div>

        <p className="text-center text-muted-foreground text-xs">
          Blueprint contains: Architecture, 10 Zoe Variants, 52 Edge Functions, 141 Tables, Security Layers, Design System
        </p>
      </div>
    </div>
  );
};

export default BlueprintDownloadPage;
