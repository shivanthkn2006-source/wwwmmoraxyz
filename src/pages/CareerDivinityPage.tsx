/**
 * CAREER DIVINITY PAGE - Temple of Time Interface
 * Divine Sci-Fi Aesthetic with Sacred Geometry
 * 
 * Features:
 * - Deep Cosmic Blue with Golden Mandalas
 * - Glassmorphism "Digital Yantra" form
 * - 432Hz Temple Bell resonance
 * - 3D Navagraha planetary alignment
 * - Divine Decree revelation
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Star, Calendar, MapPin, Clock, User, 
  Gem, Sun, Moon, ChevronRight, Zap, Orbit, Download, Wand2 
} from 'lucide-react';
import { toast } from 'sonner';
import { generateCareerDivinityPdf } from '@/utils/careerDivinityPdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVedicComputation, VedicComputationResult } from '@/hooks/useVedicComputation';
import { PlaceAutocomplete } from '@/components/career/PlaceAutocomplete';
import { CityData, getCityData, DEFAULT_CITY } from '@/utils/worldCities';
import { useZoeReSleeve } from '@/hooks/useZoeReSleeve';

// ═══════════════════════════════════════════════════════════════════
// 432Hz TEMPLE BELL AUDIO
// ═══════════════════════════════════════════════════════════════════
const useTempleBellSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTempleBell = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, ctx.currentTime); // 432Hz sacred frequency
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      // Audio not supported
    }
  }, []);

  const playRevealSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Ascending divine chord
      const frequencies = [432, 528, 639, 741];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 1.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 1.5);
      });
    } catch (e) {
      // Audio not supported
    }
  }, []);

  return { playTempleBell, playRevealSound };
};

// ═══════════════════════════════════════════════════════════════════
// ROTATING MANDALA COMPONENT
// ═══════════════════════════════════════════════════════════════════
const RotatingMandala: React.FC<{ size?: number; speed?: number; opacity?: number }> = ({ 
  size = 400, 
  speed = 120,
  opacity = 0.08 
}) => (
  <div
    className="absolute pointer-events-none animate-spin-slow"
    style={{ width: size, height: size, animationDuration: `${speed}s` }}
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="mandalaGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(45, 100%, 60%)" stopOpacity={opacity} />
          <stop offset="50%" stopColor="hsl(35, 100%, 50%)" stopOpacity={opacity * 1.5} />
          <stop offset="100%" stopColor="hsl(45, 100%, 60%)" stopOpacity={opacity} />
        </linearGradient>
      </defs>
      {/* Sacred Geometry Mandala */}
      {[0, 30, 60, 90, 120, 150].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <path
            d="M50 10 L55 25 L70 25 L58 35 L63 50 L50 40 L37 50 L42 35 L30 25 L45 25 Z"
            fill="none"
            stroke="url(#mandalaGold)"
            strokeWidth="0.3"
          />
          <circle cx="50" cy="10" r="2" fill="url(#mandalaGold)" />
        </g>
      ))}
      <circle cx="50" cy="50" r="35" fill="none" stroke="url(#mandalaGold)" strokeWidth="0.2" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="url(#mandalaGold)" strokeWidth="0.15" />
    </svg>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// NAVAGRAHA 3D PLANETARY DISPLAY
// ═══════════════════════════════════════════════════════════════════
const NavagrahaAlignment: React.FC<{ chart: VedicComputationResult['chart'] }> = ({ chart }) => {
  const planets = [
    { name: 'Sun', symbol: '☉', color: '#FF6B35' },
    { name: 'Moon', symbol: '☽', color: '#E8F4F8' },
    { name: 'Mars', symbol: '♂', color: '#DC143C' },
    { name: 'Mercury', symbol: '☿', color: '#50C878' },
    { name: 'Jupiter', symbol: '♃', color: '#FFD700' },
    { name: 'Venus', symbol: '♀', color: '#FF69B4' },
    { name: 'Saturn', symbol: '♄', color: '#191970' },
    { name: 'Rahu', symbol: '☊', color: '#8B4513' },
    { name: 'Ketu', symbol: '☋', color: '#808080' }
  ];

  return (
    <motion.div 
      className="relative w-64 h-64 mx-auto my-8"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, type: 'spring' }}
    >
      {/* Central User Node - CSS animation */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/50 flex items-center justify-center z-10 animate-gpu-glow-pulse">
        <User className="w-6 h-6 text-primary" />
      </div>

      {/* Orbital Planets */}
      {planets.map((planet, i) => {
        const angle = (i / planets.length) * 360;
        const radius = 100;
        const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
        const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
        const isStrong = chart.strongestPlanet.name === planet.name;

        return (
            <motion.div
              key={planet.name}
              className="absolute left-1/2 top-1/2"
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{ 
                x: x - 12, 
                y: y - 12, 
                opacity: 1,
                scale: isStrong ? 1.3 : 1
              }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isStrong ? 'ring-2 ring-primary ring-offset-2 ring-offset-background animate-gpu-planet-glow' : ''}`}
                style={{ 
                  backgroundColor: `${planet.color}20`,
                  borderColor: planet.color,
                  color: planet.color,
                  '--planet-color': planet.color
                } as React.CSSProperties}
              >
                {planet.symbol}
              </div>
              
              {/* Light beam connection for strongest planet */}
              {isStrong && (
                <div
                  className="absolute left-1/2 top-1/2 w-0.5 origin-top animate-gpu-light-beam"
                  style={{ 
                    height: radius,
                    background: `linear-gradient(to bottom, ${planet.color}, transparent)`,
                    transform: `rotate(${angle + 180}deg) translateX(-50%)`
                  }}
                />
              )}
            </motion.div>
        );
      })}

      {/* Orbital Ring */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-primary/20 rounded-full" />
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════
const CareerDivinityPage: React.FC = () => {
  const navigate = useNavigate();
  const { isComputing, result, computeVedicChart, RASHIS, NAKSHATRAS } = useVedicComputation();
  const { equipSleeve, availableSleeves } = useZoeReSleeve();
  const { playTempleBell, playRevealSound } = useTempleBellSound();
  const [showResult, setShowResult] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [isDeployingSleeve, setIsDeployingSleeve] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: ''
  });

  // Map strongest planet to sleeve ID
  const getRecommendedSleeve = (planetName: string): { sleeveId: string; sleeveName: string } => {
    const planetToSleeve: Record<string, { sleeveId: string; sleeveName: string }> = {
      Sun: { sleeveId: 'zoe-entrepreneur', sleeveName: 'Zoe-Entrepreneur' },
      Moon: { sleeveId: 'zoe-healer', sleeveName: 'Zoe-Healer' },
      Mars: { sleeveId: 'zoe-coder', sleeveName: 'Zoe-Coder' },
      Mercury: { sleeveId: 'zoe-coder', sleeveName: 'Zoe-Coder' },
      Jupiter: { sleeveId: 'zoe-entrepreneur', sleeveName: 'Zoe-Entrepreneur' },
      Venus: { sleeveId: 'zoe-painter', sleeveName: 'Zoe-Painter' },
      Saturn: { sleeveId: 'zoe-coder', sleeveName: 'Zoe-Coder' },
      Rahu: { sleeveId: 'zoe-coder', sleeveName: 'Zoe-Coder' },
      Ketu: { sleeveId: 'zoe-healer', sleeveName: 'Zoe-Healer' }
    };
    return planetToSleeve[planetName] || { sleeveId: 'zoe-entrepreneur', sleeveName: 'Zoe-Entrepreneur' };
  };

  // Handle Deploy Sleeve action
  const handleDeploySleeve = async () => {
    if (!result) return;
    
    setIsDeployingSleeve(true);
    
    try {
      const { sleeveId, sleeveName } = getRecommendedSleeve(result.chart.strongestPlanet.name);
      
      // Equip the sleeve
      const success = equipSleeve(sleeveId);
      
      if (success) {
        // Show success toast
        toast.success(`Re-Sleeving Interface...`, {
          description: `Welcome, Creator. ${sleeveName} activated.`,
          duration: 4000
        });
        
        // Dispatch DHF event
        window.dispatchEvent(new CustomEvent('zoe-sleeve-deployed-from-divinity', {
          detail: {
            sleeveId,
            sleeveName,
            strongestPlanet: result.chart.strongestPlanet.name,
            ultimateProfession: result.decree.ultimateProfession,
            timestamp: Date.now()
          }
        }));
        
        // Navigate to Re-Sleeve page after short delay
        setTimeout(() => {
          navigate('/resleeve');
        }, 1500);
      } else {
        toast.error('Failed to deploy sleeve. Please try again.');
      }
    } catch (error) {
      console.error('[CareerDivinity] Sleeve deployment error:', error);
      toast.error('Sleeve deployment failed');
    } finally {
      setIsDeployingSleeve(false);
    }
  };

  const parseDateInputAsLocalDate = (yyyyMmDd: string): Date => {
    // Avoid JS Date("YYYY-MM-DD") UTC parsing drift.
    const [y, m, d] = yyyyMmDd.split('-').map((p) => parseInt(p, 10));
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  };

  const handleInputChange = (field: string, value: string) => {
    playTempleBell();
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle city selection from autocomplete
  const handleCitySelect = (city: CityData) => {
    setSelectedCity(city);
    playTempleBell();
  };

  const handlePredict = async () => {
    if (!formData.name || !formData.birthDate) return;

    playRevealSound();

    // Use selected city or try to find from input, fallback to default
    const cityData = selectedCity || getCityData(formData.birthPlace) || DEFAULT_CITY;

    await computeVedicChart({
      name: formData.name,
      birthDate: parseDateInputAsLocalDate(formData.birthDate),
      birthTime: formData.birthTime || undefined,
      birthPlace: formData.birthPlace || cityData.name,
      latitude: cityData.lat,
      longitude: cityData.lng,
      timezone: cityData.timezone // Pass timezone for accurate calculation
    });

    // Delay showing result for animation effect
    setTimeout(() => setShowResult(true), 500);
  };

  // Dispatch page view event
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('zoe-career-divinity-view', {
      detail: { timestamp: Date.now() }
    }));
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Deep Cosmic Blue Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#050520] via-[#0a0a2e] to-[#0d0d35]" />
      
      {/* Rotating Golden Mandalas */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <RotatingMandala size={600} speed={180} opacity={0.05} />
        <div className="absolute right-0 bottom-0">
          <RotatingMandala size={400} speed={120} opacity={0.08} />
        </div>
        <div className="absolute left-1/4 top-1/3">
          <RotatingMandala size={300} speed={90} opacity={0.04} />
        </div>
      </div>

      {/* Stars Background - GPU accelerated */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-200 rounded-full animate-gpu-star-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              '--star-opacity-start': '0.3',
              '--star-opacity-end': '0.8',
              '--star-duration': `${2 + Math.random() * 3}s`,
              '--star-delay': `${Math.random() * 2}s`
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 pb-24 max-w-2xl mx-auto">
        {/* Temple Header */}
        <motion.div 
          className="text-center mb-8 pt-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-4 animate-gpu-badge-glow"
            style={{ '--glow-color': 'rgba(245, 158, 11, 0.3)' } as React.CSSProperties}
          >
            <Orbit className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Temple of Time</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent">
            Career Divinity
          </h1>
          <p className="text-amber-200/60 mt-2 font-light tracking-wide">
            ॐ अगस्त्य मुनये नमः
          </p>
          <p className="text-amber-100/40 text-sm mt-1">
            Vedic Astrology × Quantum AI Career Prediction
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!result || !showResult ? (
            /* Digital Yantra Form */
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
            >
              <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-background/80 to-amber-950/10 backdrop-blur-xl">
                <CardHeader className="text-center border-b border-amber-500/10">
                  <CardTitle className="flex items-center justify-center gap-2 text-lg text-amber-100">
                    <Star className="w-5 h-5 text-amber-400" />
                    Digital Yantra
                  </CardTitle>
                  <p className="text-xs text-amber-200/50 mt-1">
                    जन्म कुंडली विश्लेषण
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-5 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2 text-amber-200/80">
                      <User className="w-4 h-4" />
                      Full Name (पूर्ण नाम)
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="border-amber-500/20 bg-amber-950/20 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-400/50 focus:ring-amber-400/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate" className="flex items-center gap-2 text-amber-200/80">
                      <Calendar className="w-4 h-4" />
                      Birth Date (जन्म तिथि)
                    </Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="border-amber-500/20 bg-amber-950/20 text-amber-50 focus:border-amber-400/50 focus:ring-amber-400/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthTime" className="flex items-center gap-2 text-amber-200/80">
                      <Clock className="w-4 h-4" />
                      Birth Time (जन्म समय) <span className="text-amber-200/40 text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="birthTime"
                      type="time"
                      value={formData.birthTime}
                      onChange={(e) => handleInputChange('birthTime', e.target.value)}
                      className="border-amber-500/20 bg-amber-950/20 text-amber-50 focus:border-amber-400/50 focus:ring-amber-400/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthPlace" className="flex items-center gap-2 text-amber-200/80">
                      <MapPin className="w-4 h-4" />
                      Birth Place (जन्म स्थान) <span className="text-amber-200/40 text-xs">(Optional)</span>
                    </Label>
                    <PlaceAutocomplete
                      value={formData.birthPlace}
                      onChange={(value) => handleInputChange('birthPlace', value)}
                      onCitySelect={handleCitySelect}
                      placeholder="Start typing city name..."
                    />
                  </div>

                  <Button 
                    onClick={handlePredict}
                    disabled={!formData.name || !formData.birthDate || isComputing}
                    className="w-full mt-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 text-amber-950 font-semibold py-6 text-base"
                  >
                    {isComputing ? (
                      <span
                        className="flex items-center gap-2 animate-gpu-pulse-opacity"
                      >
                        <Sparkles className="w-5 h-5" />
                        Aligning Navagraha...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Reveal Divine Destiny
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* Divine Decree Results - Enhanced Gemini-style */
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Header with Cosmic ID */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-4"
              >
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-primary/20 border border-amber-400/40 animate-gpu-glow-amber"
                >
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-amber-100">ZOE DIVINE DECREE</span>
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-amber-100 mt-3">{formData.name.toUpperCase()}</h2>
                <p className="text-amber-300/80 text-sm mt-1">Cosmic ID: <span className="font-semibold">{result.decree.cosmicId}</span></p>
              </motion.div>

              {/* Planetary Alignment Visualization */}
              <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-background/80 to-amber-950/10 backdrop-blur-xl overflow-hidden">
                <CardHeader className="text-center pb-0">
                  <CardTitle className="text-lg text-amber-100">Navagraha Alignment</CardTitle>
                  <p className="text-xs text-amber-200/50">नवग्रह संरेखण</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <NavagrahaAlignment chart={result.chart} />
                </CardContent>
              </Card>

              {/* SECTION 1: THE CELESTIAL BLUEPRINT */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-amber-400/30 bg-gradient-to-br from-amber-900/20 via-background/80 to-amber-950/20 backdrop-blur-xl">
                  <CardHeader className="pb-3 border-b border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <span className="text-amber-400 font-bold">1</span>
                      </div>
                      <div>
                        <CardTitle className="text-base text-amber-100">THE CELESTIAL BLUEPRINT</CardTitle>
                        <p className="text-xs text-amber-200/50">The Roots</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Sun Sign */}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sun className="w-5 h-5 text-orange-400" />
                        <span className="text-sm font-semibold text-orange-300">Sun Sign (Soul)</span>
                        <span className="ml-auto text-lg font-bold text-orange-200">{result.chart.sunSign.english} ({result.chart.sunSign.name})</span>
                        <span className="text-xl">{result.chart.sunSign.symbol}</span>
                      </div>
                      <p className="text-sm text-amber-100/80 italic">Meaning: {result.decree.sunSignMeaning}</p>
                    </div>

                    {/* Moon Sign */}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Moon className="w-5 h-5 text-blue-300" />
                        <span className="text-sm font-semibold text-blue-300">Moon Sign (Mind)</span>
                        <span className="ml-auto text-lg font-bold text-blue-200">{result.chart.moonSign.english} ({result.chart.moonSign.name})</span>
                        <span className="text-xl">{result.chart.moonSign.symbol}</span>
                      </div>
                      <p className="text-sm text-amber-100/80 italic">Meaning: {result.decree.moonSignMeaning}</p>
                    </div>

                    {/* Nakshatra - Critical Key */}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/5 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-purple-400" />
                        <span className="text-sm font-semibold text-purple-300">The Critical Key (Nakshatra)</span>
                        <span className="ml-auto text-lg font-bold text-purple-200">{result.chart.nakshatra.name}</span>
                        <span className="text-xl">{result.chart.nakshatra.symbol}</span>
                      </div>
                      <p className="text-xs text-purple-300/80 mb-1">Ruled by: {result.chart.nakshatra.lord} • Deity: {result.chart.nakshatra.deity}</p>
                      <p className="text-sm text-amber-100/80 italic">Significance: {result.decree.nakshatraCriticalKey}</p>
                    </div>

                    {/* Lagna */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <Orbit className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-semibold text-amber-300">Lagna (Ascendant)</span>
                        <span className="ml-auto text-lg font-bold text-amber-200">{result.chart.lagna.english}</span>
                        <span className="text-xl">{result.chart.lagna.symbol}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* SECTION 2: THE NUMEROLOGY */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background/80 to-cyan-950/20 backdrop-blur-xl">
                  <CardHeader className="pb-3 border-b border-primary/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold">2</span>
                      </div>
                      <div>
                        <CardTitle className="text-base text-amber-100">THE NUMEROLOGY</CardTitle>
                        <p className="text-xs text-amber-200/50">The Vibration</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-xs text-primary/80 mb-1">Psychic Number</p>
                        <p className="text-3xl font-bold text-primary">{result.chart.psychicNumber}</p>
                        <p className="text-xs text-amber-200/60 mt-1">({['', 'Sun', 'Moon', 'Jupiter', 'Rahu', 'Mercury', 'Venus', 'Ketu', 'Saturn', 'Mars'][result.chart.psychicNumber]})</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-400/80 mb-1">Destiny Number</p>
                        <p className="text-3xl font-bold text-amber-400">{result.chart.destinyNumber}</p>
                        <p className="text-xs text-amber-200/60 mt-1">({['', 'Sun', 'Moon', 'Jupiter', 'Rahu', 'Mercury', 'Venus', 'Ketu', 'Saturn', 'Mars'][result.chart.destinyNumber]})</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-xs text-purple-400/80 mb-1">Name Number</p>
                        <p className="text-3xl font-bold text-purple-400">{result.chart.nameNumber}</p>
                        <p className="text-xs text-amber-200/60 mt-1">Vibration</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 via-amber-500/10 to-purple-500/10 border border-amber-500/30">
                      <p className="text-xs text-amber-400 mb-1 font-semibold">The Clash:</p>
                      <p className="text-sm text-amber-100">{result.decree.numerologyClash}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* SECTION 3: THE ULTIMATE PROFESSION */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-amber-400/40 bg-gradient-to-br from-amber-800/20 via-background/80 to-amber-950/30 backdrop-blur-xl overflow-hidden">
                  <CardHeader className="pb-3 border-b border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center">
                        <span className="text-amber-300 font-bold">3</span>
                      </div>
                      <div>
                        <CardTitle className="text-base text-amber-100">THE ULTIMATE PROFESSION</CardTitle>
                        <p className="text-xs text-amber-200/50">Top Career Paths</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {(result.decree?.topCareerPaths ?? []).length === 0 ? (
                      <p className="text-sm text-amber-200/60">Career paths are still being synthesized.</p>
                    ) : (
                      (result.decree?.topCareerPaths ?? []).map((career, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + idx * 0.1 }}
                          className={`p-3 rounded-lg border ${idx === 0 ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400/40' : 'bg-amber-500/5 border-amber-500/20'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-amber-950' : 'bg-amber-500/20 text-amber-300'}`}>
                                {idx + 1}
                              </div>
                              <span className={`font-semibold ${idx === 0 ? 'text-amber-200' : 'text-amber-300/80'}`}>{career.title}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                              {career.compatibility}% Match
                            </span>
                          </div>
                          <p className="text-sm text-amber-100/70 pl-8">
                            <span className="text-amber-400 font-medium">Why: </span>{career.reason}
                          </p>
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* SECTION 4: ZOE'S ACTION PLAN */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border-green-500/30 bg-gradient-to-br from-green-900/20 via-background/80 to-emerald-950/20 backdrop-blur-xl">
                  <CardHeader className="pb-3 border-b border-green-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-400 font-bold">4</span>
                      </div>
                      <div>
                        <CardTitle className="text-base text-amber-100">ZOE'S ACTION PLAN</CardTitle>
                        <p className="text-xs text-amber-200/50">For {formData.name}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-start gap-2">
                        <Zap className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-100/90">{result.decree.actionPlan}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-start gap-2">
                        <span className="text-orange-400 text-lg">⚠️</span>
                        <div>
                          <p className="text-xs text-orange-400 font-semibold mb-1">Warning:</p>
                          <p className="text-sm text-amber-100/80">{result.decree.warningNote}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Soul Purpose & Dharma */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-background/80 to-amber-950/10 backdrop-blur-xl">
                  <CardContent className="pt-4 space-y-3">
                    <div className="p-3 rounded bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs text-amber-400 mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Soul Purpose
                      </p>
                      <p className="text-sm text-amber-100/90">{result.decree.soulPurpose}</p>
                    </div>
                    <div className="p-3 rounded bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs text-amber-400 mb-1">Dharma Path</p>
                      <p className="text-sm text-amber-100/90">{result.decree.dharmaPath}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Gemstone, Mantra & Extras */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card className="border-amber-400/30 bg-gradient-to-br from-amber-900/20 via-background/80 to-amber-950/20 backdrop-blur-xl">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded bg-amber-500/10">
                      <Gem className="w-8 h-8 text-amber-400" />
                      <div>
                        <p className="text-sm font-semibold text-amber-100">{result.decree.gemstone}</p>
                        <p className="text-xs text-amber-200/60">Recommended Gemstone</p>
                      </div>
                    </div>
                    <div className="text-center p-3 rounded bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10">
                      <p className="text-lg font-semibold text-amber-300">{result.decree.mantra}</p>
                      <p className="text-xs text-amber-200/50 mt-1">Daily Mantra for {result.decree.deity}</p>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs text-amber-200/60 mb-1">Lucky Colors</p>
                        <div className="flex gap-1 flex-wrap">
                          {result.decree.luckyColors.map((color, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-200">
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-amber-200/60 mb-1">Lucky Numbers</p>
                        <div className="flex gap-1">
                          {result.decree.luckyNumbers.map((num, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-200 font-bold">
                              {num}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-amber-200/60 mb-1">Auspicious Ages</p>
                      <div className="flex gap-2">
                        {result.decree.auspiciousAge.map((age, i) => (
                          <span key={i} className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                            {age}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* DEPLOY SLEEVE - Interactive Action Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <div
                  className="relative overflow-hidden rounded-xl p-4 border-2 border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 animate-gpu-glow-amber"
                >
                  <div className="text-center mb-3">
                    <p className="text-xs text-amber-300/80 mb-1">Recommended Tool from Zoe's Divine Decree</p>
                    <p className="text-lg font-bold text-amber-100">
                      Deploy "{getRecommendedSleeve(result.chart.strongestPlanet.name).sleeveName}" Sleeve
                    </p>
                  </div>
                  <Button
                    onClick={handleDeploySleeve}
                    disabled={isDeployingSleeve}
                    className="w-full py-6 text-base font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:via-amber-300 hover:to-amber-400 text-amber-950 shadow-lg shadow-amber-500/30"
                  >
                    {isDeployingSleeve ? (
                      <span
                        className="flex items-center gap-2 animate-gpu-pulse-opacity"
                      >
                        <Wand2 className="w-5 h-5 animate-spin" />
                        Re-Sleeving Interface...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5" />
                        ACTIVATE {result.chart.strongestPlanet.name.toUpperCase()} SLEEVE
                      </span>
                    )}
                  </Button>
                  <p className="text-xs text-amber-200/60 text-center mt-2">
                   Transform Mmora into your personalized career interface
                  </p>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
                  onClick={() => {
                    setShowResult(false);
                    setFormData({ name: '', birthDate: '', birthTime: '', birthPlace: '' });
                    setSelectedCity(null);
                  }}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  New Reading
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 text-amber-950"
                  onClick={() => generateCareerDivinityPdf(result, formData)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CareerDivinityPage;
