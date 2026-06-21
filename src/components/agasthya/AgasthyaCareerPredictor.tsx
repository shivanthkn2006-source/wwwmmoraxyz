/**
 * AGASTHYA CAREER PREDICTOR
 * Divine Career Engine with Temple Glass Aesthetics
 * Holographic Sanskrit + Golden Ratios
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Calendar, MapPin, User, Gem, Clock, ChevronRight, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgasthyaCareerEngine, CareerPrediction } from '@/hooks/useAgasthyaCareerEngine';

export const AgasthyaCareerPredictor: React.FC = () => {
  const { isPredicting, prediction, calculateVedicCareer } = useAgasthyaCareerEngine();
  
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: ''
  });

  const handlePredict = async () => {
    if (!formData.name || !formData.birthDate) return;
    
    await calculateVedicCareer({
      name: formData.name,
      birthDate: new Date(formData.birthDate),
      birthTime: formData.birthTime,
      birthPlace: formData.birthPlace
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-primary/5 p-4">
      {/* Temple Glass Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Project Agasthya</span>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-primary to-amber-400 bg-clip-text text-transparent">
          Divine Career Engine
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          ॐ अगस्त्य मुनये नमः | Vedic Astrology × Quantum AI
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!prediction ? (
          /* Birth Data Form */
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="max-w-md mx-auto border-primary/20 bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center border-b border-primary/10">
                <CardTitle className="flex items-center justify-center gap-2 text-lg">
                  <Star className="w-5 h-5 text-amber-400" />
                  Enter Birth Details
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  जन्म विवरण दर्ज करें
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="border-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Birth Date
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    className="border-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthTime" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Birth Time (Optional)
                  </Label>
                  <Input
                    id="birthTime"
                    type="time"
                    value={formData.birthTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthTime: e.target.value }))}
                    className="border-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthPlace" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Birth Place (Optional)
                  </Label>
                  <Input
                    id="birthPlace"
                    placeholder="City, Country"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthPlace: e.target.value }))}
                    className="border-primary/20"
                  />
                </div>

                <Button 
                  onClick={handlePredict}
                  disabled={!formData.name || !formData.birthDate || isPredicting}
                  className="w-full mt-4 bg-gradient-to-r from-amber-500 to-primary hover:from-amber-600 hover:to-primary/90"
                >
                  {isPredicting ? (
                    <div className="flex items-center gap-2 animate-gpu-status-primary">
                      <Sparkles className="w-4 h-4" />
                      Reading the Stars...
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Reveal Destiny
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Prediction Results */
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto space-y-4"
          >
            {/* Primary Archetype Card */}
            <Card 
              className="border-primary/30 overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${prediction.primaryArchetype.color}15, transparent)` 
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Archetype</p>
                    <CardTitle className="text-xl">{prediction.primaryArchetype.name}</CardTitle>
                    <p className="text-lg text-primary font-medium">{prediction.primaryArchetype.sanskritName}</p>
                  </div>
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                    style={{ background: `${prediction.primaryArchetype.color}30` }}
                  >
                    <Star className="w-8 h-8" style={{ color: prediction.primaryArchetype.color }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                    {prediction.primaryArchetype.planetaryLord}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-secondary/50 text-secondary-foreground capitalize">
                    {prediction.primaryArchetype.element} Element
                  </span>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Strengths</p>
                  <div className="flex flex-wrap gap-1">
                    {prediction.primaryArchetype.strengths.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded bg-green-500/10 text-green-600 dark:text-green-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Careers */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Recommended Careers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {prediction.recommendedCareers.map((career, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2 p-2 rounded bg-primary/5"
                    >
                      <ChevronRight className="w-4 h-4 text-primary" />
                      <span className="text-sm">{career}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Karma Processor */}
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Karma Processor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-amber-500 mb-1">Past Life Influence</p>
                  <p className="text-muted-foreground">{prediction.karmaProcessor.pastLifeInfluence}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-500 mb-1">Current Life Lesson</p>
                  <p className="text-muted-foreground">{prediction.karmaProcessor.currentLifeLesson}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-500 mb-1">Future Destiny</p>
                  <p className="text-foreground font-medium">{prediction.karmaProcessor.futureDestiny}</p>
                </div>
              </CardContent>
            </Card>

            {/* Remedies & Gemstone */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gem className="w-4 h-4 text-primary" />
                  Divine Remedies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded bg-primary/5">
                  <div 
                    className="w-8 h-8 rounded-full"
                    style={{ background: prediction.primaryArchetype.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">{prediction.primaryArchetype.gemstone}</p>
                    <p className="text-xs text-muted-foreground">Primary Gemstone</p>
                  </div>
                </div>
                <p className="text-sm text-primary font-medium">{prediction.primaryArchetype.mantra}</p>
                {prediction.remedies.slice(0, 3).map((remedy, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {remedy}
                  </p>
                ))}
              </CardContent>
            </Card>

            {/* New Prediction Button */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.reload()}
            >
              New Prediction
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgasthyaCareerPredictor;
