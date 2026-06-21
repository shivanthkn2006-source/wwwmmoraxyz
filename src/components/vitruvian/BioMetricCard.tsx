import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Heart, Activity, Battery, Wind, Thermometer, Footprints } from 'lucide-react';
import { motion } from 'framer-motion';
import type { BioMetrics } from '@/hooks/useBioTelemetry';

interface MetricDisplayProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  progress?: number;
  status?: 'optimal' | 'warning' | 'critical' | 'info';
  animate?: boolean;
}

const MetricDisplay = ({ icon, label, value, unit, progress, status = 'info', animate = false }: MetricDisplayProps) => {
  const statusColors = {
    optimal: 'text-omega-cyan border-omega-cyan/30',
    warning: 'text-omega-gold border-omega-gold/30',
    critical: 'text-accent border-accent/30',
    info: 'text-muted-foreground border-border'
  };
  
  const progressColors = {
    optimal: 'bg-omega-cyan',
    warning: 'bg-omega-gold',
    critical: 'bg-accent',
    info: 'bg-primary'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-3 rounded-lg border ${statusColors[status]} bg-card/50 backdrop-blur-sm`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`${status === 'optimal' ? 'text-omega-cyan' : status === 'warning' ? 'text-omega-gold' : status === 'critical' ? 'text-accent' : 'text-muted-foreground'}`}>
          {icon}
        </div>
        <span className="text-xs uppercase font-share-tech text-muted-foreground">{label}</span>
      </div>
      
      <div className="flex items-baseline gap-1">
        <span 
          className={`text-2xl font-orbitron font-bold ${
            status === 'optimal' ? 'text-omega-cyan' : 
            status === 'warning' ? 'text-omega-gold' : 
            status === 'critical' ? 'text-accent' : 
            'text-foreground'
          } ${animate ? 'animate-gpu-pulse-scale-slow' : ''}`}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      
      {progress !== undefined && (
        <div className="mt-2">
          <Progress 
            value={progress} 
            className="h-1 bg-muted"
          />
        </div>
      )}
    </motion.div>
  );
};

interface BioMetricCardProps {
  metrics: BioMetrics;
}

const BioMetricCard = ({ metrics }: BioMetricCardProps) => {
  const getHeartRateStatus = (hr: number): 'optimal' | 'warning' | 'critical' => {
    if (hr >= 60 && hr <= 85) return 'optimal';
    if (hr > 100 || hr < 50) return 'critical';
    return 'warning';
  };
  
  const getOxygenStatus = (spo2: number): 'optimal' | 'warning' | 'critical' => {
    if (spo2 >= 97) return 'optimal';
    if (spo2 >= 94) return 'warning';
    return 'critical';
  };
  
  const getEnergyStatus = (energy: number): 'optimal' | 'warning' | 'critical' => {
    if (energy >= 60) return 'optimal';
    if (energy >= 30) return 'warning';
    return 'critical';
  };
  
  const getStressStatus = (stress: BioMetrics['stressLevel']): 'optimal' | 'warning' | 'critical' => {
    if (stress === 'low') return 'optimal';
    if (stress === 'moderate' || stress === 'elevated') return 'warning';
    return 'critical';
  };
  
  return (
    <Card className="oni-neuro-glass border-omega-cyan/20 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-rajdhani font-semibold text-omega-cyan uppercase tracking-wider">
          Vital Signs
        </h3>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-omega-green animate-pulse" />
          <span className="text-xs text-muted-foreground font-share-tech">LIVE</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <MetricDisplay
          icon={<Heart className="w-4 h-4" />}
          label="Heart Rate"
          value={metrics.heartRate}
          unit="BPM"
          status={getHeartRateStatus(metrics.heartRate)}
          animate={true}
        />
        
        <MetricDisplay
          icon={<Activity className="w-4 h-4" />}
          label="HRV"
          value={metrics.hrv}
          unit="ms"
          status={getStressStatus(metrics.stressLevel)}
        />
        
        <MetricDisplay
          icon={<Battery className="w-4 h-4" />}
          label="Energy"
          value={Math.round(metrics.energyLevel)}
          unit="%"
          progress={metrics.energyLevel}
          status={getEnergyStatus(metrics.energyLevel)}
        />
        
        <MetricDisplay
          icon={<Wind className="w-4 h-4" />}
          label="SpO₂"
          value={metrics.oxygenLevel.toFixed(1)}
          unit="%"
          status={getOxygenStatus(metrics.oxygenLevel)}
        />
        
        <MetricDisplay
          icon={<Thermometer className="w-4 h-4" />}
          label="Temp"
          value={metrics.skinTemp.toFixed(1)}
          unit="°C"
          status="info"
        />
        
        <MetricDisplay
          icon={<Footprints className="w-4 h-4" />}
          label="Steps"
          value={metrics.steps.toLocaleString()}
          status="info"
        />
      </div>
    </Card>
  );
};

export default BioMetricCard;
