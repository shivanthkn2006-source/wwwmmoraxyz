import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, AlertTriangle, Info, Lightbulb, Zap, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZoeAnalysis } from '@/hooks/useBioTelemetry';

interface ZoeAnalysisStreamProps {
  analysis: ZoeAnalysis;
  analysisHistory: ZoeAnalysis[];
  onBreathingProtocol: () => void;
}

const ZoeAnalysisStream = ({ analysis, analysisHistory, onBreathingProtocol }: ZoeAnalysisStreamProps) => {
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messageRef = useRef(analysis.message);
  
  // Typewriter effect for Zoe's messages
  useEffect(() => {
    if (analysis.message === messageRef.current && displayedMessage.length > 0) return;
    
    messageRef.current = analysis.message;
    setIsTyping(true);
    setDisplayedMessage('');
    
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < analysis.message.length) {
        setDisplayedMessage(prev => prev + analysis.message[i]);
        i++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, 30);
    
    return () => clearInterval(typeInterval);
  }, [analysis.message]);
  
  const getUrgencyStyles = (urgency: ZoeAnalysis['urgency']) => {
    switch (urgency) {
      case 'critical':
        return {
          border: 'border-accent/50',
          bg: 'bg-accent/10',
          icon: <AlertTriangle className="w-5 h-5 text-accent" />,
          glow: 'shadow-accent/20'
        };
      case 'warning':
        return {
          border: 'border-omega-gold/50',
          bg: 'bg-omega-gold/10',
          icon: <Zap className="w-5 h-5 text-omega-gold" />,
          glow: 'shadow-omega-gold/20'
        };
      case 'suggestion':
        return {
          border: 'border-omega-purple/50',
          bg: 'bg-omega-purple/10',
          icon: <Lightbulb className="w-5 h-5 text-omega-purple" />,
          glow: 'shadow-omega-purple/20'
        };
      default:
        return {
          border: 'border-omega-cyan/30',
          bg: 'bg-omega-cyan/5',
          icon: <Info className="w-5 h-5 text-omega-cyan" />,
          glow: 'shadow-omega-cyan/10'
        };
    }
  };
  
  const styles = getUrgencyStyles(analysis.urgency);
  
  return (
    <Card className={`oni-neuro-glass ${styles.border} p-4 shadow-lg ${styles.glow}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-5 h-5 text-omega-cyan" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-omega-green rounded-full animate-gpu-ring-scale-pulse" />
          </div>
          <span className="text-sm font-rajdhani font-semibold text-omega-cyan uppercase tracking-wider">
            Zoe Bio-Analysis
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-share-tech">
          {analysis.timestamp.toLocaleTimeString()}
        </span>
      </div>
      
      {/* Current Analysis */}
      <AnimatePresence mode="wait">
        <motion.div
          key={analysis.message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`${styles.bg} rounded-lg p-4 mb-4`}
        >
          <div className="flex gap-3">
            {styles.icon}
            <div className="flex-1">
              <p className="text-sm font-share-tech text-foreground leading-relaxed">
                <span className="text-omega-cyan font-semibold">Zoe:</span>{' '}
                {displayedMessage}
                {isTyping && (
                  <span className="inline-block w-2 h-4 bg-omega-cyan ml-1 animate-gpu-cursor-blink" />
                )}
              </p>
              {!isTyping && analysis.recommendation && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs text-muted-foreground mt-2 font-share-tech italic"
                >
                  → {analysis.recommendation}
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Quick Actions */}
      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBreathingProtocol}
          className="flex-1 border-omega-cyan/30 text-omega-cyan hover:bg-omega-cyan/10 font-share-tech text-xs"
        >
          <Wind className="w-3 h-3 mr-1" />
          Breathing Protocol
        </Button>
      </div>
      
      {/* Analysis History */}
      {analysisHistory.length > 1 && (
        <div className="border-t border-border/30 pt-3">
          <span className="text-xs text-muted-foreground font-share-tech uppercase mb-2 block">
            Recent Analysis
          </span>
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {analysisHistory.slice(1, 4).map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="opacity-50 font-share-tech">
                  {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-share-tech truncate">{item.message}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ZoeAnalysisStream;
