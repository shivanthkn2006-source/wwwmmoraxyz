import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Building2, AlertTriangle, CheckCircle, 
  RotateCcw, Zap, Shield, Sparkles, MapPin, 
  Home, Flame, Droplets, Wind, Mountain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  VASTU_MANDALA, 
  VEDIC_RULES, 
  calculateVastuScore, 
  generateQuantumVastuReading,
  type RoomPlacement,
  type RoomType,
  type VastuDirection,
  type VastuAnalysis,
  type QuantumVastuReading
} from '@/core/quantum/VastuShastraEngine';
import { cn } from '@/lib/utils';

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  'Water': <Droplets className="w-4 h-4" />,
  'Fire': <Flame className="w-4 h-4" />,
  'Earth': <Mountain className="w-4 h-4" />,
  'Air': <Wind className="w-4 h-4" />,
  'Ether': <Sparkles className="w-4 h-4" />,
  'Water+Space': <Droplets className="w-4 h-4" />,
  'Earth+Fire': <Flame className="w-4 h-4" />
};

const ELEMENT_COLORS: Record<string, string> = {
  'Water': 'text-blue-400',
  'Fire': 'text-orange-400',
  'Earth': 'text-amber-600',
  'Air': 'text-slate-300',
  'Ether': 'text-purple-400',
  'Water+Space': 'text-cyan-400',
  'Earth+Fire': 'text-red-500'
};

const DIRECTION_LABELS: Record<VastuDirection, string> = {
  NORTH: 'North (N)',
  NORTH_EAST: 'North-East (NE)',
  EAST: 'East (E)',
  SOUTH_EAST: 'South-East (SE)',
  SOUTH: 'South (S)',
  SOUTH_WEST: 'South-West (SW)',
  WEST: 'West (W)',
  NORTH_WEST: 'North-West (NW)',
  CENTER: 'Center (Brahmasthan)'
};

const ROOM_TYPES: RoomType[] = [
  'Main Entrance',
  'Kitchen',
  'Master Bedroom',
  'Living Room',
  'Bathroom',
  'Toilet',
  'Prayer Room',
  'Study',
  'Dining Room',
  'Guest Room',
  'Children Room',
  'Storage',
  'Garage'
];

const DIRECTIONS: VastuDirection[] = [
  'NORTH', 'NORTH_EAST', 'EAST', 'SOUTH_EAST',
  'SOUTH', 'SOUTH_WEST', 'WEST', 'NORTH_WEST', 'CENTER'
];

interface CompassWheelProps {
  selectedDirection: VastuDirection | null;
  onDirectionSelect: (direction: VastuDirection) => void;
  highlightedZones?: VastuDirection[];
}

const CompassWheel = ({ selectedDirection, onDirectionSelect, highlightedZones = [] }: CompassWheelProps) => {
  const directionPositions: Record<VastuDirection, { x: number; y: number; angle: number }> = {
    NORTH: { x: 50, y: 10, angle: 0 },
    NORTH_EAST: { x: 85, y: 15, angle: 45 },
    EAST: { x: 90, y: 50, angle: 90 },
    SOUTH_EAST: { x: 85, y: 85, angle: 135 },
    SOUTH: { x: 50, y: 90, angle: 180 },
    SOUTH_WEST: { x: 15, y: 85, angle: 225 },
    WEST: { x: 10, y: 50, angle: 270 },
    NORTH_WEST: { x: 15, y: 15, angle: 315 },
    CENTER: { x: 50, y: 50, angle: 0 }
  };

  return (
    <div className="relative w-full max-w-[280px] sm:max-w-xs aspect-square mx-auto">
      {/* Outer ring with neon glow */}
      <div className="absolute inset-0 rounded-full border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(0,255,255,0.3)]" />
      
      {/* Inner grid lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        {/* Cross lines */}
        <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(0,255,255,0.2)" strokeWidth="0.5" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(0,255,255,0.2)" strokeWidth="0.5" />
        <line x1="15" y1="15" x2="85" y2="85" stroke="rgba(0,255,255,0.2)" strokeWidth="0.5" />
        <line x1="85" y1="15" x2="15" y2="85" stroke="rgba(0,255,255,0.2)" strokeWidth="0.5" />
        
        {/* Center circle */}
        <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(147,51,234,0.3)" strokeWidth="1" />
      </svg>

      {/* Direction buttons */}
      {DIRECTIONS.map((dir) => {
        const pos = directionPositions[dir];
        const zone = VASTU_MANDALA[dir];
        const isSelected = selectedDirection === dir;
        const isHighlighted = highlightedZones.includes(dir);
        
        return (
          <motion.button
            key={dir}
            onClick={() => onDirectionSelect(dir)}
            className={cn(
              "absolute w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center",
              "text-[10px] sm:text-xs font-bold transition-all duration-300 touch-manipulation",
              "border-2 backdrop-blur-sm",
              isSelected 
                ? "bg-cyan-500/40 border-cyan-400 text-white shadow-[0_0_20px_rgba(0,255,255,0.5)]" 
                : isHighlighted
                  ? "bg-green-500/30 border-green-400 text-green-300"
                  : "bg-black/40 border-slate-600 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-300"
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {dir === 'CENTER' ? (
              <span className={ELEMENT_COLORS[zone.element]}>ॐ</span>
            ) : (
              <span>{dir.replace('_', '\n').split('\n').map(w => w[0]).join('')}</span>
            )}
          </motion.button>
        );
      })}

      {/* Compass needle */}
      <motion.div
        className="absolute w-1 h-20 bg-gradient-to-b from-red-500 to-transparent left-1/2 top-[15%] -translate-x-1/2 origin-bottom"
        animate={{ rotate: selectedDirection ? directionPositions[selectedDirection].angle : 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        style={{ transformOrigin: 'center bottom' }}
      />
    </div>
  );
};

export const VastuQuantumScan = () => {
  const [placements, setPlacements] = useState<RoomPlacement[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomType | ''>('');
  const [currentZone, setCurrentZone] = useState<VastuDirection | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [userName, setUserName] = useState('');
  const [scanResult, setScanResult] = useState<QuantumVastuReading | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const addPlacement = useCallback(() => {
    if (currentRoom && currentZone) {
      setPlacements(prev => {
        const filtered = prev.filter(p => p.room !== currentRoom);
        return [...filtered, { room: currentRoom, zone: currentZone }];
      });
      setCurrentRoom('');
      setCurrentZone(null);
    }
  }, [currentRoom, currentZone]);

  const removePlacement = (room: RoomType) => {
    setPlacements(prev => prev.filter(p => p.room !== room));
  };

  const runQuantumScan = async () => {
    if (placements.length < 3) return;
    
    setIsScanning(true);
    
    // Simulate quantum processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const dob = birthDate ? new Date(birthDate) : undefined;
    const result = generateQuantumVastuReading(placements, dob, userName || undefined);
    setScanResult(result);
    setIsScanning(false);
  };

  const resetScan = () => {
    setPlacements([]);
    setScanResult(null);
    setCurrentRoom('');
    setCurrentZone(null);
  };

  const getIdealZonesForRoom = (room: RoomType): VastuDirection[] => {
    return VEDIC_RULES[room]?.idealZones || [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-2 sm:p-4 md:p-8 overflow-x-hidden">
      {/* Animated grid background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 sm:gap-3 mb-2"
          >
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              VASTU QUANTUM SCAN
            </h1>
            <Compass className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 animate-spin-slow" />
          </motion.div>
          <p className="text-cyan-300/70 text-xs sm:text-sm">
            Module 5000.1 · Sthapatya Veda · Space-Time Energy Analysis
          </p>
          <p className="text-purple-400/50 text-xs mt-1">
            Holographic Blueprint Scanner · 99% Precision Protocol
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Panel - Input */}
          <Card className="backdrop-blur-2xl bg-black/30 border border-indigo-400/30 shadow-[0_0_60px_rgba(99,102,241,0.1)] p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-indigo-300 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Room Placement Map
            </h2>

            {/* User Profile Section */}
            <div className="space-y-3 mb-6 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-purple-300 text-xs">Optional: Add DOB for Quantum Cross-Check</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-slate-400 text-xs">Your Name</Label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter name"
                    className="bg-black/50 border-purple-500/30 text-purple-300 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Date of Birth</Label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="bg-black/50 border-purple-500/30 text-purple-300 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Room Selection */}
            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-slate-400 text-xs mb-1 block">Select Room</Label>
                <Select value={currentRoom} onValueChange={(v) => setCurrentRoom(v as RoomType)}>
                  <SelectTrigger className="bg-black/50 border-cyan-500/30 text-cyan-300">
                    <SelectValue placeholder="Choose a room..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-cyan-500/30">
                    {ROOM_TYPES.map(room => (
                      <SelectItem 
                        key={room} 
                        value={room}
                        className="text-cyan-300 focus:bg-cyan-500/20"
                        disabled={placements.some(p => p.room === room)}
                      >
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Compass Wheel */}
              <div>
                <Label className="text-slate-400 text-xs mb-2 block text-center">
                  Tap Direction Where "{currentRoom || 'Room'}" is Located
                </Label>
                <CompassWheel
                  selectedDirection={currentZone}
                  onDirectionSelect={setCurrentZone}
                  highlightedZones={currentRoom ? getIdealZonesForRoom(currentRoom) : []}
                />
                {currentRoom && (
                  <p className="text-green-400/70 text-xs text-center mt-2">
                    <span className="text-green-400">●</span> Green = Ideal zones for {currentRoom}
                  </p>
                )}
              </div>

              <Button
                onClick={addPlacement}
                disabled={!currentRoom || !currentZone}
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500"
              >
                <Home className="w-4 h-4 mr-2" /> Add Room Placement
              </Button>
            </div>

            {/* Current Placements */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400">
                Mapped Rooms ({placements.length}/13)
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-1">
                <AnimatePresence>
                  {placements.map((p) => {
                    const rule = VEDIC_RULES[p.room];
                    const score = rule?.scores[p.zone] || 0;
                    const isGood = score >= 50;
                    const isBad = score <= -30;

                    return (
                      <motion.div
                        key={p.room}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded border text-xs",
                          isGood ? "bg-green-500/10 border-green-500/30" :
                          isBad ? "bg-red-500/10 border-red-500/30" :
                          "bg-slate-500/10 border-slate-500/30"
                        )}
                      >
                        <span className={cn(
                          isGood ? "text-green-300" : isBad ? "text-red-300" : "text-slate-300"
                        )}>
                          {p.room} → {DIRECTION_LABELS[p.zone]}
                        </span>
                        <button
                          onClick={() => removePlacement(p.room)}
                          className="text-slate-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Scan Button */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={runQuantumScan}
                disabled={placements.length < 3 || isScanning}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
              >
                {isScanning ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-pulse" /> Scanning...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" /> Run Quantum Scan
                  </>
                )}
              </Button>
              <Button
                onClick={resetScan}
                variant="outline"
                className="border-slate-600 text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Right Panel - Results */}
          <Card className="backdrop-blur-2xl bg-black/30 border border-cyan-400/30 shadow-[0_0_60px_rgba(0,255,255,0.1)] p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Quantum Analysis
            </h2>

            <AnimatePresence mode="wait">
              {isScanning ? (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-64 gap-4"
                >
                  <div className="w-24 h-24 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-gpu-spin" />
                  <p className="text-cyan-300 animate-pulse">Analyzing Space-Time Matrix...</p>
                </motion.div>
              ) : scanResult ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Score Display */}
                  <div className="text-center p-4 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 rounded-xl border border-cyan-500/20">
                    <div className="text-4xl sm:text-5xl font-bold mb-2">
                      <span className={cn(
                        "bg-gradient-to-r bg-clip-text text-transparent",
                        scanResult.vastuAnalysis.grade === 'A+' || scanResult.vastuAnalysis.grade === 'A' 
                          ? "from-green-400 to-emerald-400"
                          : scanResult.vastuAnalysis.grade === 'B' || scanResult.vastuAnalysis.grade === 'C'
                            ? "from-yellow-400 to-amber-400"
                            : "from-red-400 to-orange-400"
                      )}>
                        {scanResult.vastuAnalysis.percentageScore}%
                      </span>
                    </div>
                    <div className={cn(
                      "text-2xl font-bold",
                      scanResult.vastuAnalysis.grade === 'A+' || scanResult.vastuAnalysis.grade === 'A' 
                        ? "text-green-400"
                        : scanResult.vastuAnalysis.grade === 'B' || scanResult.vastuAnalysis.grade === 'C'
                          ? "text-yellow-400"
                          : "text-red-400"
                    )}>
                      Grade: {scanResult.vastuAnalysis.grade}
                    </div>
                    <Progress 
                      value={scanResult.vastuAnalysis.percentageScore} 
                      className="h-2 mt-3"
                    />
                  </div>

                  {/* Quantum Resonance */}
                  {scanResult.userNumberProfile && (
                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-300 text-sm">Quantum Resonance</span>
                        <span className={cn(
                          "text-lg font-bold",
                          scanResult.karmicSynthesis.quantumResonance >= 70 ? "text-green-400" :
                          scanResult.karmicSynthesis.quantumResonance >= 40 ? "text-yellow-400" :
                          "text-red-400"
                        )}>
                          {scanResult.karmicSynthesis.quantumResonance}%
                        </span>
                      </div>
                      <div className={cn(
                        "text-xs px-2 py-1 rounded inline-block",
                        scanResult.karmicSynthesis.spaceTimeAlignment === 'ALIGNED' 
                          ? "bg-green-500/20 text-green-300"
                          : scanResult.karmicSynthesis.spaceTimeAlignment === 'PARTIAL'
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-red-500/20 text-red-300"
                      )}>
                        Space-Time: {scanResult.karmicSynthesis.spaceTimeAlignment}
                      </div>
                    </div>
                  )}

                  {/* Critical Faults */}
                  {scanResult.vastuAnalysis.criticalFaults > 0 && (
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-semibold">
                          {scanResult.vastuAnalysis.criticalFaults} Critical Energy Leaks
                        </span>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {scanResult.vastuAnalysis.energyLeaks
                          .filter(l => l.severity === 'CRITICAL')
                          .map((leak, i) => (
                            <div key={i} className="text-xs text-red-300/80 p-2 bg-red-500/5 rounded">
                              <strong>{leak.room}</strong> in {leak.currentZone.replace('_', '-')}: {leak.karmicImpact}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}

                  {/* Positive Energies */}
                  {scanResult.vastuAnalysis.positiveEnergies.length > 0 && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-semibold">
                          {scanResult.vastuAnalysis.positiveEnergies.length} Activated Zones
                        </span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {scanResult.vastuAnalysis.positiveEnergies.slice(0, 3).map((pos, i) => (
                          <div key={i} className="text-xs text-green-300/80">
                            ✓ {pos}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personalized Impacts */}
                  {scanResult.karmicSynthesis.personalizedImpacts.length > 0 && (
                    <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                      <h4 className="text-indigo-300 font-semibold text-sm mb-2">
                        Karmic Impact Report
                      </h4>
                      <div className="space-y-1 text-xs text-indigo-200/80">
                        {scanResult.karmicSynthesis.personalizedImpacts.map((impact, i) => (
                          <p key={i}>• {impact}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remedies */}
                  <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <h4 className="text-cyan-300 font-semibold text-sm mb-2">
                      Quantum Remedies
                    </h4>
                    <div className="space-y-2 text-xs">
                      {scanResult.remedies.immediate.slice(0, 3).map((rem, i) => (
                        <div key={i} className="text-cyan-200/80 flex items-start gap-2">
                          <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{rem}</span>
                        </div>
                      ))}
                      {scanResult.remedies.mantras.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-cyan-500/20 text-purple-300">
                          <strong>Mantra:</strong> {scanResult.remedies.mantras[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evolutionary Advice */}
                  <div className="p-3 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-500/30">
                    <p className="text-purple-200 text-sm italic">
                      "{scanResult.karmicSynthesis.evolutionaryAdvice}"
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4"
                >
                  <Compass className="w-16 h-16 opacity-30" />
                  <p className="text-center text-sm">
                    Map at least 3 rooms to initiate Quantum Scan
                  </p>
                  <p className="text-xs text-slate-600">
                    Use the compass wheel to position rooms
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Zone Reference */}
        <Card className="mt-6 backdrop-blur-2xl bg-black/30 border border-indigo-400/20 p-4">
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">Vastu Purusha Mandala Reference</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
            {Object.entries(VASTU_MANDALA).slice(0, 5).map(([dir, zone]) => (
              <div 
                key={dir} 
                className="p-2 bg-slate-800/50 rounded border border-slate-700/50"
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className={ELEMENT_COLORS[zone.element]}>
                    {ELEMENT_ICONS[zone.element]}
                  </span>
                  <span className="text-slate-300 font-medium">{dir.replace('_', '-')}</span>
                </div>
                <p className="text-slate-500">{zone.deity}</p>
                <p className="text-slate-600 truncate">{zone.attributes[0]}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Sthapatya Veda · 5000 Year Archive · Vastu Quantum Protocol · 99% Precision
        </p>
      </motion.div>
    </div>
  );
};

export default VastuQuantumScan;
