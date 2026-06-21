// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE CONTROL DECK - Admin "God Mode" Overlay
// Semi-transparent command console for world administration
// Features: Broadcast, World Reset, Summon All, Player Management
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  RotateCcw, 
  Users, 
  AlertTriangle,
  Megaphone,
  MapPin,
  Shield,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PlayerPresence } from '@/hooks/useMultiplayerPresence';

interface EnterpriseControlDeckProps {
  isAdmin: boolean;
  players: PlayerPresence[];
  playerCount: number;
  onBroadcast: (message: string) => void;
  onWorldReset: () => void;
  onSummonAll: (position: { x: number; y: number; z: number }) => void;
  onKickPlayer?: (userId: string) => void;
  onTeleportTo?: (userId: string) => void;
  myPosition?: { x: number; y: number; z: number };
  isConnected: boolean;
}

export const EnterpriseControlDeck: React.FC<EnterpriseControlDeckProps> = ({
  isAdmin,
  players,
  playerCount,
  onBroadcast,
  onWorldReset,
  onSummonAll,
  onKickPlayer,
  onTeleportTo,
  myPosition = { x: 0, y: 1.6, z: 0 },
  isConnected,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Handle broadcast
  const handleBroadcast = useCallback(() => {
    if (!broadcastMessage.trim()) {
      toast.error('Enter a message to broadcast');
      return;
    }
    onBroadcast(broadcastMessage);
    setBroadcastMessage('');
    toast.success('Broadcast sent to all players');
  }, [broadcastMessage, onBroadcast]);

  // Handle world reset with confirmation
  const handleWorldReset = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    onWorldReset();
    setConfirmReset(false);
    toast.success('World state reset');
  }, [confirmReset, onWorldReset]);

  // Handle summon all
  const handleSummonAll = useCallback(() => {
    onSummonAll(myPosition);
    toast.success(`Summoning all players to your location`);
  }, [myPosition, onSummonAll]);

  // Don't render if not admin
  if (!isAdmin) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl"
    >
      {/* Collapsed Header Bar */}
      <motion.div
        layout
        className={cn(
          "bg-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg overflow-hidden",
          "shadow-lg shadow-cyan-500/10"
        )}
        style={{
          fontFamily: "'Orbitron', 'Space Grotesk', sans-serif",
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 text-xs font-bold tracking-wider uppercase">
              Enterprise Control Deck
            </span>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
            )} />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <Users className="w-3 h-3" />
              <span>{playerCount} online</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronUp className="w-4 h-4 text-white/50" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-cyan-500/20"
            >
              {/* Broadcast Section */}
              <div className="p-3 border-b border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] text-cyan-300 uppercase font-bold tracking-wide">
                    World Broadcast
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Message to all players..."
                    className="bg-black/50 border-cyan-500/30 text-white text-xs h-8 placeholder:text-white/30"
                    onKeyPress={(e) => e.key === 'Enter' && handleBroadcast()}
                  />
                  <Button
                    onClick={handleBroadcast}
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white h-8 px-4"
                  >
                    <Radio className="w-3 h-3 mr-1" />
                    Send
                  </Button>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="p-3 grid grid-cols-3 gap-2">
                {/* Summon All */}
                <Button
                  onClick={handleSummonAll}
                  variant="outline"
                  size="sm"
                  className="bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 h-auto py-2 flex-col gap-1"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="text-[9px] uppercase tracking-wide">Summon All</span>
                </Button>

                {/* World Reset - Destructive */}
                <Button
                  onClick={handleWorldReset}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-auto py-2 flex-col gap-1 transition-all",
                    confirmReset 
                      ? "bg-red-600 border-red-500 text-white hover:bg-red-500 animate-pulse"
                      : "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30"
                  )}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-[9px] uppercase tracking-wide">
                    {confirmReset ? 'Confirm Reset' : 'World Reset'}
                  </span>
                </Button>

                {/* Player List Toggle */}
                <Button
                  onClick={() => setShowPlayerList(!showPlayerList)}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-auto py-2 flex-col gap-1",
                    showPlayerList 
                      ? "bg-cyan-500/30 border-cyan-500 text-cyan-300"
                      : "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20"
                  )}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-[9px] uppercase tracking-wide">Players</span>
                </Button>
              </div>

              {/* Player List */}
              <AnimatePresence>
                {showPlayerList && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 max-h-40 overflow-y-auto"
                  >
                    {players.length === 0 ? (
                      <div className="p-3 text-center text-white/40 text-xs">
                        No other players online
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {players.map((player) => (
                          <div
                            key={player.user_id}
                            className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                player.is_speaking ? "bg-green-400 animate-pulse" : "bg-green-400/50"
                              )} />
                              <span className="text-white/80 text-xs font-mono">
                                {player.display_name}
                              </span>
                              {player.role === 'admin' && (
                                <Shield className="w-3 h-3 text-magenta-400" />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {onTeleportTo && (
                                <Button
                                  onClick={() => onTeleportTo(player.user_id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              )}
                              {onKickPlayer && (
                                <Button
                                  onClick={() => onKickPlayer(player.user_id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status Bar */}
              <div className="px-3 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] text-white/40">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span>Admin Mode Active</span>
                </div>
                <div className="text-[9px] text-white/30 font-mono">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default EnterpriseControlDeck;
