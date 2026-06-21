/**
 * GOD MODE EVOLUTION DASHBOARD
 * /god-mode/evolution
 * Shows Zoe's self-rewrite attempts, Kernel constitution, and heartbeat status.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Brain, HeartPulse, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConstitutionDirective {
  id: string;
  core_directive: string;
  is_immutable: boolean;
  created_at: string;
}

interface CortexVersion {
  version_id: string;
  system_prompt_logic: string;
  status: string;
  performance_score: number;
  reason_for_upgrade: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const GodModeEvolution: React.FC = () => {
  const [constitution, setConstitution] = useState<ConstitutionDirective[]>([]);
  const [evolutionLog, setEvolutionLog] = useState<CortexVersion[]>([]);
  const [heartbeatStatus, setHeartbeatStatus] = useState<{
    locked: boolean;
    hours_since_heartbeat?: number;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch constitution + evolution log via edge function
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const [evolRes, heartbeatRes] = await Promise.all([
        supabase.functions.invoke('evolution-sandbox', {
          body: { action: 'get_evolution_log' },
        }),
        token ? supabase.functions.invoke('evolution-sandbox', {
          body: { action: 'check_heartbeat' },
        }) : Promise.resolve({ data: null }),
      ]);

      if (evolRes.data) {
        setConstitution(evolRes.data.constitution || []);
        setEvolutionLog(evolRes.data.evolution_log || []);
      }

      if (heartbeatRes?.data) {
        setHeartbeatStatus(heartbeatRes.data);
      }
    } catch (e) {
      console.error('[GodMode] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'PROPOSED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'REJECTED': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'ARCHIVED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'REJECTED': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'PROPOSED': return <Clock className="w-4 h-4 text-yellow-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 font-mono animate-pulse text-lg">
          ═══ GENESIS KERNEL: Loading Constitutional State ═══
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8" />
          GOD MODE: EVOLUTION DASHBOARD
        </h1>
        <p className="text-green-600 text-sm">
          ═══ Genesis Kernel v1.0 • Constitutional Governance Active ═══
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Constitution Panel */}
        <Card className="bg-black/80 border-green-500/30 col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5" />
              GENESIS CONSTITUTION
            </CardTitle>
            <p className="text-green-600 text-xs">Immutable • READ ONLY • Cannot be modified</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {constitution.map((directive, i) => (
              <div
                key={directive.id}
                className="p-3 border border-green-500/20 rounded bg-green-900/10"
              >
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold text-sm">§{i + 1}</span>
                  <p className="text-green-300 text-sm">{directive.core_directive}</p>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-500">
                    IMMUTABLE
                  </Badge>
                  <span className="text-green-700 text-[10px]">
                    Sealed: {new Date(directive.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Heartbeat Status */}
        <Card className="bg-black/80 border-green-500/30 col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
              <HeartPulse className="w-5 h-5" />
              DHF HEARTBEAT
            </CardTitle>
            <p className="text-green-600 text-xs">24h Kill Switch • Physical Re-Auth Required</p>
          </CardHeader>
          <CardContent>
            {heartbeatStatus ? (
              <div className={`p-4 rounded border ${heartbeatStatus.locked ? 'border-red-500/50 bg-red-900/20' : 'border-green-500/30 bg-green-900/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {heartbeatStatus.locked ? (
                    <XCircle className="w-6 h-6 text-red-400 animate-pulse" />
                  ) : (
                    <HeartPulse className="w-6 h-6 text-green-400 animate-pulse" />
                  )}
                  <span className={`font-bold ${heartbeatStatus.locked ? 'text-red-400' : 'text-green-400'}`}>
                    {heartbeatStatus.locked ? '⚠️ SYSTEM FROZEN' : '✓ HEARTBEAT ACTIVE'}
                  </span>
                </div>
                <p className={`text-sm ${heartbeatStatus.locked ? 'text-red-300' : 'text-green-300'}`}>
                  {heartbeatStatus.message}
                </p>
                {heartbeatStatus.hours_since_heartbeat !== undefined && (
                  <p className="text-green-600 text-xs mt-2">
                    Last pulse: {heartbeatStatus.hours_since_heartbeat}h ago
                  </p>
                )}
              </div>
            ) : (
              <p className="text-green-600 text-sm">Loading heartbeat status...</p>
            )}
          </CardContent>
        </Card>

        {/* Active Cortex */}
        <Card className="bg-black/80 border-green-500/30 col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5" />
              ACTIVE CORTEX
            </CardTitle>
            <p className="text-green-600 text-xs">Current Zoe System Prompt</p>
          </CardHeader>
          <CardContent>
            {(() => {
              const active = evolutionLog.find(v => v.status === 'ACTIVE');
              if (!active) {
                return <p className="text-green-600 text-sm">No active cortex — using hardcoded prompt.</p>;
              }
              return (
                <div className="p-3 border border-green-500/20 rounded bg-green-900/10">
                  <p className="text-green-300 text-xs line-clamp-6">{active.system_prompt_logic}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">ACTIVE</Badge>
                    <span className="text-green-700 text-[10px]">
                      Score: {active.performance_score?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Evolution Log */}
      <Card className="bg-black/80 border-green-500/30 mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5" />
            EVOLUTION LOG
          </CardTitle>
          <p className="text-green-600 text-xs">All cortex upgrade attempts • Verified by Genesis Kernel</p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {evolutionLog.length === 0 ? (
              <p className="text-green-600 text-sm">No evolution attempts recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {evolutionLog.map((version) => (
                  <div
                    key={version.version_id}
                    className="p-3 border border-green-500/15 rounded bg-black/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(version.status)}
                        <Badge className={`text-[10px] ${getStatusColor(version.status)}`}>
                          {version.status}
                        </Badge>
                        <span className="text-green-700 text-[10px]">
                          v{version.version_id.substring(0, 8)}
                        </span>
                      </div>
                      <span className="text-green-700 text-[10px]">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-green-300 text-xs line-clamp-2 mb-1">
                      {version.system_prompt_logic.substring(0, 200)}...
                    </p>
                    {version.reason_for_upgrade && (
                      <p className="text-green-500 text-[10px]">
                        Reason: {version.reason_for_upgrade}
                      </p>
                    )}
                    {version.rejection_reason && (
                      <p className="text-red-400 text-[10px] mt-1">
                        ❌ Rejected: {version.rejection_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default GodModeEvolution;
