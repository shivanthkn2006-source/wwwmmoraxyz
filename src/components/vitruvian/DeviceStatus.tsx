import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bluetooth, Battery, Wifi, RefreshCw, Watch } from 'lucide-react';
import { motion } from 'framer-motion';

interface DeviceStatusProps {
  isConnected: boolean;
  deviceName: string;
  signalStrength: number;
  batteryLevel: number;
  lastSyncAt: Date | null;
  onReconnect: () => void;
}

const DeviceStatus = ({
  isConnected,
  deviceName,
  signalStrength,
  batteryLevel,
  lastSyncAt,
  onReconnect
}: DeviceStatusProps) => {
  return (
    <Card className="oni-neuro-glass border-omega-cyan/20 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Device Icon */}
          <div className="relative">
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-omega-cyan/10' : 'bg-muted'}`}>
              <Watch className={`w-5 h-5 ${isConnected ? 'text-omega-cyan' : 'text-muted-foreground'}`} />
            </div>
            {isConnected && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-omega-green rounded-full border-2 border-card animate-gpu-scale-bounce" />
            )}
          </div>
          
          {/* Device Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-rajdhani font-semibold text-foreground">
                {deviceName}
              </span>
              {isConnected && (
                <Bluetooth className="w-3 h-3 text-omega-cyan" />
              )}
            </div>
            <span className="text-xs text-muted-foreground font-share-tech">
              {isConnected 
                ? `Synced ${lastSyncAt ? lastSyncAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'now'}`
                : 'Disconnected'
              }
            </span>
          </div>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              {/* Signal Strength */}
              <div className="flex items-center gap-1">
                <Wifi className={`w-4 h-4 ${signalStrength > 70 ? 'text-omega-cyan' : signalStrength > 40 ? 'text-omega-gold' : 'text-accent'}`} />
                <span className="text-xs font-share-tech text-muted-foreground">
                  {signalStrength}%
                </span>
              </div>
              
              {/* Battery */}
              <div className="flex items-center gap-1">
                <Battery className={`w-4 h-4 ${batteryLevel > 50 ? 'text-omega-green' : batteryLevel > 20 ? 'text-omega-gold' : 'text-accent'}`} />
                <span className="text-xs font-share-tech text-muted-foreground">
                  {batteryLevel}%
                </span>
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onReconnect}
              className="border-omega-cyan/30 text-omega-cyan hover:bg-omega-cyan/10"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Connect
            </Button>
          )}
        </div>
      </div>
      
      {/* Connection Animation */}
      {!isConnected && (
        <motion.div
          className="mt-3 h-1 bg-muted rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="h-full bg-omega-cyan/50 w-1/2 animate-gpu-bg-slide" />
        </motion.div>
      )}
    </Card>
  );
};

export default DeviceStatus;
