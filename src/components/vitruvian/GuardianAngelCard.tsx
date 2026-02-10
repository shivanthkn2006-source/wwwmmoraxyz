/**
 * GUARDIAN ANGEL STATUS CARD
 * Shows current predictions and guardian status
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Brain, Zap, Heart, Moon, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { guardianAngel, type HealthPrediction, type GuardianState } from '@/services/ZoeGuardianAngel';

const PREDICTION_ICONS: Record<string, React.ElementType> = {
  cognitive_fatigue: Brain,
  stress_critical: AlertTriangle,
  energy_crash: Zap,
  focus_decline: Moon,
  burnout_warning: Heart,
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const GuardianAngelCard: React.FC = () => {
  const [state, setState] = useState<GuardianState>(guardianAngel.getState());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = guardianAngel.subscribe(setState);
    return unsubscribe;
  }, []);

  const handleStartMonitoring = () => {
    guardianAngel.startMonitoring();
  };

  const handleStopMonitoring = () => {
    guardianAngel.stopMonitoring();
  };

  const handleTestIntervention = () => {
    guardianAngel.simulateCriticalStress();
  };

  const highestSeverity = state.currentPredictions.reduce((highest, pred) => {
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return severityOrder[pred.severity] > severityOrder[highest] ? pred.severity : highest;
  }, 'low' as 'low' | 'medium' | 'high' | 'critical');

  return (
    <Card className="bg-black/40 border-cyan-500/20 backdrop-blur-xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div
              className={state.isMonitoring ? 'animate-gpu-pulse-scale' : ''}
            >
              <Shield className={`w-5 h-5 ${state.isMonitoring ? 'text-cyan-400' : 'text-gray-500'}`} />
            </div>
            <span className="text-white">Guardian Angel</span>
          </CardTitle>
          
          <Badge 
            variant="outline" 
            className={state.isMonitoring 
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
            }
          >
            {state.isMonitoring ? 'Active' : 'Standby'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status message */}
        <div className="text-sm text-cyan-300/60">
          {state.isMonitoring ? (
            state.currentPredictions.length > 0 
              ? `Monitoring ${state.currentPredictions.length} health indicator${state.currentPredictions.length > 1 ? 's' : ''}`
              : 'All systems nominal. You are protected.'
          ) : (
            'Guardian Angel is on standby. Activate to enable predictive health monitoring.'
          )}
        </div>

        {/* Predictions list */}
        <AnimatePresence>
          {state.currentPredictions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {(expanded ? state.currentPredictions : state.currentPredictions.slice(0, 2)).map((prediction, index) => {
                const Icon = PREDICTION_ICONS[prediction.type] || AlertTriangle;
                return (
                  <motion.div
                    key={`${prediction.type}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border ${SEVERITY_COLORS[prediction.severity]}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            {prediction.message}
                          </span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {Math.round(prediction.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs opacity-70 mt-1">
                          {prediction.suggestedAction}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {state.currentPredictions.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="w-full text-cyan-400/60 hover:text-cyan-400"
                >
                  {expanded ? 'Show less' : `Show ${state.currentPredictions.length - 2} more`}
                  <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last analysis time */}
        {state.lastAnalysis && (
          <div className="text-xs text-gray-500">
            Last analysis: {state.lastAnalysis.toLocaleTimeString()}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 pt-2">
          {state.isMonitoring ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopMonitoring}
                className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                Pause Guardian
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestIntervention}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Test Alert
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleStartMonitoring}
              className="flex-1 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
            >
              <Shield className="w-4 h-4 mr-2" />
              Activate Guardian
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GuardianAngelCard;
