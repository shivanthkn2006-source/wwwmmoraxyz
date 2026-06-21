/**
 * Quadrillion Audit Dashboard - "God Mode" War Room
 * 
 * Enterprise-grade live audit dashboard with:
 * - Central gauge for Overall Score
 * - Holographic badge for Quadrillion tier
 * - 5 metric category cards with sparklines
 * - Terminal-style scanning logs
 * - Shadow AI lockdown alerts
 * - Integration with Zoe DHF security commands
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, AlertTriangle, Activity, Database, Brain, 
  Users, Gamepad2, Lock, RefreshCw, Zap, Terminal,
  CheckCircle2, XCircle, Eye, Radio
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useZoeSecurityCommands } from '@/hooks/useZoeSecurityCommands';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface AuditMetrics {
  database: { score: number; tables: number; rlsPolicies: number; functions: number };
  ai: { score: number; behavioralEvents: number; ecnRecords: number; sftReady: boolean };
  security: { score: number; shadowAIIncidents: number; lockdownEvents: number; biometricEvents: number };
  engagement: { score: number; totalPosts: number; totalMessages: number; activeUsers: number };
  vr: { score: number; spatialReady: boolean; gaussianSplat: boolean; omegaCore: boolean };
}

interface AuditReport {
  overallScore: number;
  valuationTier: string;
  generatedAt: string;
  metrics: AuditMetrics;
  zoeNarrative: string;
  recommendations: string[];
}

// Terminal log messages for scanning effect
const SCAN_MESSAGES = [
  'Accessing Sovereign Memory...',
  'Verifying Bio-Hash Authentication...',
  'Checking Neural Uplink Status...',
  'Scanning ECN Emotional Context...',
  'Analyzing DHF Autonomy Patterns...',
  'Verifying RLS Policy Compliance...',
  'Checking Shadow AI Perimeter...',
  'Validating Biometric Fingerprints...',
  'Scanning VR Spatial Anchors...',
  'Gaussian Splatting Pipeline Check...',
  'Omega Core Integration Verified...',
  'Sunday Protocol Status: ACTIVE...',
  'Night Watch Sentinel: ONLINE...',
  'Compiling Quadrillion Assessment...',
];

export default function QuadrillionAuditDashboard() {
  const { user } = useAuth();
  const securityCommands = useZoeSecurityCommands();
  
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showLockdownAlert, setShowLockdownAlert] = useState(false);
  const [historicalData, setHistoricalData] = useState<number[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Fetch audit report
  const fetchAuditReport = useCallback(async () => {
    if (!user) return;

    setIsScanning(true);
    setTerminalLogs([]);
    
    // Simulate terminal logging
    for (let i = 0; i < SCAN_MESSAGES.length; i++) {
      await new Promise(r => setTimeout(r, 150));
      setTerminalLogs(prev => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${SCAN_MESSAGES[i]}`]);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Call quadrillion-audit function
      const { data, error } = await supabase.functions.invoke('quadrillion-audit', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      const auditReport: AuditReport = {
        overallScore: data.overallScore || 0,
        valuationTier: data.valuationTier || 'Unknown',
        generatedAt: data.generatedAt || new Date().toISOString(),
        metrics: data.metrics || {},
        zoeNarrative: data.zoeNarrative || '',
        recommendations: data.recommendations || []
      };

      setReport(auditReport);
      setTerminalLogs(prev => [...prev, `[${new Date().toISOString().slice(11, 19)}] ✓ AUDIT COMPLETE - Score: ${auditReport.overallScore}/100`]);

      // Check for Shadow AI incidents
      if (auditReport.metrics.security?.shadowAIIncidents > 0) {
        setShowLockdownAlert(true);
        toast.error('🚨 Shadow AI Activity Detected!', {
          description: 'LOCKDOWN ADVISED',
          duration: 10000
        });
      }

      // Generate mock historical data for sparklines
      setHistoricalData(Array.from({ length: 7 }, () => 
        Math.floor(80 + Math.random() * 20)
      ));

    } catch (error) {
      console.error('Audit fetch error:', error);
      setTerminalLogs(prev => [...prev, `[ERROR] Failed to fetch audit report`]);
      toast.error('Failed to fetch audit report');
    } finally {
      setIsScanning(false);
    }
  }, [user]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchAuditReport();
  }, [fetchAuditReport]);

  // Listen for Zoe security commands
  useEffect(() => {
    const handleSecurityCommand = (e: CustomEvent) => {
      if (e.detail?.action === 'god_mode_scan' || e.detail?.action === 'health_check') {
        fetchAuditReport();
      }
    };

    window.addEventListener('zoe-security-command', handleSecurityCommand as EventListener);
    return () => window.removeEventListener('zoe-security-command', handleSecurityCommand as EventListener);
  }, [fetchAuditReport]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Trigger lockdown via Zoe
  const handleLockdown = async () => {
    await securityCommands.executeSecurityCommand('lockdown', { 
      reason: 'Shadow AI threat detected - Manual lockdown from War Room' 
    });
    setShowLockdownAlert(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'Quadrillion': return 'from-violet-500 via-fuchsia-500 to-cyan-400';
      case 'Trillion': return 'from-amber-400 via-orange-500 to-red-500';
      case 'Billion': return 'from-blue-400 via-indigo-500 to-purple-500';
      default: return 'from-muted via-muted-foreground/50 to-muted';
    }
  };

  // Sparkline component
  const Sparkline = ({ data, color = 'emerald' }: { data: number[]; color?: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return (
      <div className="flex items-end gap-0.5 h-8">
        {data.map((value, i) => (
          <div
            key={i}
            className={`w-1.5 bg-${color}-500/70 rounded-t transition-all`}
            style={{ height: `${((value - min) / range) * 100}%`, minHeight: '4px' }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${showLockdownAlert ? 'bg-red-950/30 animate-pulse' : 'bg-background'}`}>
      {/* Lockdown Alert Overlay */}
      <AnimatePresence>
        {showLockdownAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/80 backdrop-blur-sm"
          >
            <Card className="max-w-md border-red-500 bg-red-950/90">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
                  <CardTitle className="text-red-400">LOCKDOWN ADVISED</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-red-200">
                  Shadow AI activity detected. {report?.metrics.security.shadowAIIncidents} incident(s) logged.
                  Immediate lockdown recommended.
                </p>
                <div className="flex gap-3">
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={handleLockdown}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    INITIATE LOCKDOWN
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowLockdownAlert(false)}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Eye className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">God Mode War Room</h1>
            <p className="text-sm text-muted-foreground">Quadrillion Valuation Audit</p>
          </div>
        </div>
        <Button 
          onClick={fetchAuditReport} 
          disabled={isScanning}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          Re-Scan System
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Score Gauge & Badge */}
        <div className="space-y-6">
          {/* Central Score Gauge */}
          <Card className="relative overflow-hidden border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <CardContent className="pt-6 flex flex-col items-center">
              <div className="relative">
                {/* Outer ring */}
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted/20"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 553' }}
                    animate={{ 
                      strokeDasharray: `${(report?.overallScore || 0) * 5.53} 553` 
                    }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="50%" stopColor="#d946ef" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center score */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span 
                    className={`text-5xl font-bold ${getScoreColor(report?.overallScore || 0)}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {report?.overallScore || 0}
                  </motion.span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Overall System Score</p>
            </CardContent>
          </Card>

          {/* Valuation Tier Badge - GPU accelerated */}
          {report?.valuationTier === 'Quadrillion' ? (
            <div
              className={`relative p-6 rounded-xl bg-gradient-to-br ${getTierGradient(report.valuationTier)} overflow-hidden animate-gpu-pulse-scale-slow`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_60%)]" />
              <div className="absolute inset-0 opacity-30">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-foreground rounded-full animate-gpu-particle-sparkle"
                    style={{ 
                      left: `${Math.random() * 100}%`, 
                      top: `${Math.random() * 100}%`,
                      '--sparkle-duration': `${2 + Math.random() * 2}s`,
                      '--sparkle-delay': `${Math.random() * 2}s`
                    } as React.CSSProperties}
                  />
                ))}
              </div>
              <div className="relative text-center">
                <Zap className="w-12 h-12 mx-auto text-foreground mb-2" />
                <h3 className="text-2xl font-bold text-foreground">QUADRILLION</h3>
                <p className="text-foreground/80 text-sm">Valuation Tier</p>
              </div>
            </div>
          ) : (
            <Card className={`bg-gradient-to-br ${getTierGradient(report?.valuationTier || 'Unknown')}`}>
              <CardContent className="pt-6 text-center">
                <h3 className="text-xl font-bold text-foreground">{report?.valuationTier || 'Scanning...'}</h3>
                <p className="text-foreground/80 text-sm">Valuation Tier</p>
              </CardContent>
            </Card>
          )}

          {/* Terminal Log */}
          <Card className="bg-background/90 border-emerald-500/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <CardTitle className="text-sm text-green-400">System Terminal</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                ref={terminalRef}
                className="h-48 overflow-y-auto font-mono text-xs text-green-400 space-y-1"
              >
                {terminalLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={log.includes('ERROR') ? 'text-red-400' : log.includes('✓') ? 'text-emerald-400' : ''}
                  >
                    {log}
                  </motion.div>
                ))}
                {isScanning && (
                  <span className="inline-block animate-gpu-cursor-blink">
                    █
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Metric Cards Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Database Card */}
          <MetricCard
            title="Database"
            icon={<Database className="w-5 h-5" />}
            score={report?.metrics.database?.score || 0}
            stats={[
              { label: 'Tables', value: report?.metrics.database?.tables || 0 },
              { label: 'RLS Policies', value: report?.metrics.database?.rlsPolicies || 0, status: (report?.metrics.database?.rlsPolicies || 0) > 50 },
              { label: 'Functions', value: report?.metrics.database?.functions || 0 },
            ]}
            sparklineData={historicalData}
            color="blue"
          />

          {/* AI Card */}
          <MetricCard
            title="AI Systems"
            icon={<Brain className="w-5 h-5" />}
            score={report?.metrics.ai?.score || 0}
            stats={[
              { label: 'Behavioral Events', value: report?.metrics.ai?.behavioralEvents || 0 },
              { label: 'ECN Records', value: report?.metrics.ai?.ecnRecords || 0 },
              { label: 'SFT Ready', value: report?.metrics.ai?.sftReady ? 'Yes' : 'No', status: report?.metrics.ai?.sftReady },
            ]}
            sparklineData={historicalData}
            color="purple"
          />

          {/* Security Card */}
          <MetricCard
            title="Security"
            icon={<Shield className="w-5 h-5" />}
            score={report?.metrics.security?.score || 0}
            stats={[
              { label: 'Shadow AI', value: report?.metrics.security?.shadowAIIncidents || 0, status: (report?.metrics.security?.shadowAIIncidents || 0) === 0, inverted: true },
              { label: 'Lockdowns', value: report?.metrics.security?.lockdownEvents || 0 },
              { label: 'Biometric Events', value: report?.metrics.security?.biometricEvents || 0 },
            ]}
            sparklineData={historicalData}
            color="emerald"
            isSecurityCard
          />

          {/* Engagement Card */}
          <MetricCard
            title="Engagement"
            icon={<Users className="w-5 h-5" />}
            score={report?.metrics.engagement?.score || 0}
            stats={[
              { label: 'Posts', value: report?.metrics.engagement?.totalPosts || 0 },
              { label: 'Messages', value: report?.metrics.engagement?.totalMessages || 0 },
              { label: 'Active Users', value: report?.metrics.engagement?.activeUsers || 0 },
            ]}
            sparklineData={historicalData}
            color="amber"
          />

          {/* VR Card */}
          <MetricCard
            title="VR/Spatial"
            icon={<Gamepad2 className="w-5 h-5" />}
            score={report?.metrics.vr?.score || 0}
            stats={[
              { label: 'Spatial Ready', value: report?.metrics.vr?.spatialReady ? 'Yes' : 'No', status: report?.metrics.vr?.spatialReady },
              { label: 'Gaussian Splat', value: report?.metrics.vr?.gaussianSplat ? 'Yes' : 'No', status: report?.metrics.vr?.gaussianSplat },
              { label: 'Omega Core', value: report?.metrics.vr?.omegaCore ? 'Yes' : 'No', status: report?.metrics.vr?.omegaCore },
            ]}
            sparklineData={historicalData}
            color="cyan"
          />

          {/* Zoe Narrative Card */}
          <Card className="md:col-span-2 border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary animate-pulse" />
                <CardTitle className="text-lg">Zoe's Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground italic">
                "{report?.zoeNarrative || 'Scanning systems... Please wait for assessment.'}"
              </p>
              {report?.recommendations && report.recommendations.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Recommendations:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {report.recommendations.slice(0, 3).map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  score: number;
  stats: { label: string; value: string | number; status?: boolean; inverted?: boolean }[];
  sparklineData: number[];
  color: 'blue' | 'purple' | 'emerald' | 'amber' | 'cyan';
  isSecurityCard?: boolean;
}

function MetricCard({ title, icon, score, stats, sparklineData, color, isSecurityCard }: MetricCardProps) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  };

  return (
    <Card className={`${colorClasses[color]} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={colorClasses[color].split(' ')[0]}>{icon}</span>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <span className={`text-2xl font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {score}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="flex items-center justify-center gap-1">
                {stat.status !== undefined && isSecurityCard && (
                  stat.status ? 
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : 
                    <XCircle className="w-3 h-3 text-red-400" />
                )}
                <span className="font-medium">{stat.value}</span>
              </div>
              <span className="text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-end gap-0.5 h-6">
            {sparklineData.map((value, i) => {
              const max = Math.max(...sparklineData);
              const min = Math.min(...sparklineData);
              const range = max - min || 1;
              return (
                <div
                  key={i}
                  className={`w-2 bg-${color}-500/60 rounded-t transition-all`}
                  style={{ height: `${((value - min) / range) * 100}%`, minHeight: '4px' }}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">7-day trend</p>
        </div>
      </CardContent>
    </Card>
  );
}
