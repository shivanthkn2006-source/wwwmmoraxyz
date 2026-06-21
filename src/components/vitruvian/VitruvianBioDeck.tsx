import { motion } from 'framer-motion';
import { Dna, Activity, Shield, Sparkles, ArrowLeft, Vibrate } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVitruvianIntegration } from '@/hooks/useVitruvianIntegration';
import HumanHologram from './HumanHologram';
import BioMetricCard from './BioMetricCard';
import ZoeAnalysisStream from './ZoeAnalysisStream';
import DeviceStatus from './DeviceStatus';
import GuardianAngelCard from './GuardianAngelCard';
import { Button } from '@/components/ui/button';

const VitruvianBioDeck = () => {
  const navigate = useNavigate();
  const {
    metrics,
    isConnected,
    deviceName,
    signalStrength,
    batteryLevel,
    lastSyncAt,
    analysis,
    analysisHistory,
    reconnect,
    triggerBreathingProtocol,
    hapticEnabled
  } = useVitruvianIntegration();
  
  return (
    <div className="min-h-screen bg-background omega-void-bg">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-omega-cyan/10"
      >
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="p-2 rounded-lg bg-omega-cyan/10 border border-omega-cyan/30">
                <Dna className="w-6 h-6 text-omega-cyan" />
              </div>
              <div>
                <h1 className="text-xl font-orbitron font-bold text-foreground">
                  VITRUVIAN
                </h1>
                <p className="text-xs font-share-tech text-muted-foreground uppercase tracking-wider">
                  Bio-Telemetry Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hapticEnabled && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-omega-purple/10 border border-omega-purple/20">
                  <Vibrate className="w-3 h-3 text-omega-purple" />
                  <span className="text-xs font-share-tech text-omega-purple">HAPTIC</span>
                </div>
              )}
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-omega-cyan/10 border border-omega-cyan/20">
                <Activity className="w-3 h-3 text-omega-cyan" />
                <span className="text-xs font-share-tech text-omega-cyan">DHF SYNC</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      <div className="container py-6 space-y-6 pb-24">
        {/* Device Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <DeviceStatus
            isConnected={isConnected}
            deviceName={deviceName}
            signalStrength={signalStrength}
            batteryLevel={batteryLevel}
            lastSyncAt={lastSyncAt}
            onReconnect={reconnect}
          />
        </motion.div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Human Hologram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="oni-neuro-glass border-omega-cyan/20 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-omega-cyan/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-omega-cyan" />
                    <span className="text-sm font-rajdhani font-semibold text-omega-cyan uppercase tracking-wider">
                      Bio-Matrix Visualization
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-omega-purple" />
                    <span className="text-xs font-share-tech text-muted-foreground">3D</span>
                  </div>
                </div>
              </div>
              
              <HumanHologram 
                metrics={metrics} 
                className="h-[400px] md:h-[500px]"
              />
              
              {/* Status Legend */}
              <div className="p-4 border-t border-omega-cyan/10">
                <div className="flex flex-wrap gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-omega-cyan" />
                    <span className="text-xs font-share-tech text-muted-foreground">Optimal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-omega-gold" />
                    <span className="text-xs font-share-tech text-muted-foreground">Elevated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-xs font-share-tech text-muted-foreground">Alert</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Right Column - Metrics & Analysis */}
          <div className="space-y-6">
            {/* Bio Metrics */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <BioMetricCard metrics={metrics} />
            </motion.div>
            
            {/* Zoe Analysis */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ZoeAnalysisStream
                analysis={analysis}
                analysisHistory={analysisHistory}
                onBreathingProtocol={triggerBreathingProtocol}
              />
            </motion.div>
            
            {/* Guardian Angel - Predictive Health Protection */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <GuardianAngelCard />
            </motion.div>
          </div>
        </div>
        
        {/* Integration Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center py-4"
        >
          <p className="text-xs font-share-tech text-muted-foreground">
            <span className="text-omega-cyan">VITRUVIAN</span> • Bio-Sync Bridge • 
            <span className="text-omega-purple"> DHF CORE </span> Integration Active
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default VitruvianBioDeck;
