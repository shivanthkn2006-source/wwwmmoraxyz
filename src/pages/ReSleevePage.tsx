/**
 * RE-SLEEVE PAGE - Project Re-Sleeve
 * Universal Career Prosthetic Interface
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowLeft, 
  Scan, 
  ShoppingBag, 
  Zap, 
  Compass,
  Brain,
  Target,
  Rocket,
  ChevronRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SoulScanner } from '@/components/resleeve/SoulScanner';
import { SleeveMarketplace } from '@/components/resleeve/SleeveMarketplace';
import { PuppetMasterAgent } from '@/components/resleeve/PuppetMasterAgent';
import { LifeYouWantJourney } from '@/components/resleeve/LifeYouWantJourney';
import { CreativeExecutor } from '@/components/resleeve/CreativeExecutor';
import { useZoeReSleeve } from '@/hooks/useZoeReSleeve';
import { cn } from '@/lib/utils';

// How it works step data
const HOW_IT_WORKS = [
  {
    icon: Brain,
    title: 'Soul Scan',
    description: 'Zoe analyzes your behavioral patterns, posts, and emotions to detect dormant talents you didn\'t know you had.',
    detail: 'Uses DHF History + ECN emotional patterns for 95% accuracy'
  },
  {
    icon: ShoppingBag,
    title: 'Equip Sleeve',
    description: 'Choose from 5 Skill Sleeves that transform your entire app experience to match your new career path.',
    detail: 'Map, Feed, Voice Persona, and Color Scheme all transform'
  },
  {
    icon: Target,
    title: 'Execute Tasks',
    description: 'Tell Zoe your intent ("I want to paint a mural for this cafe") and she executes with 95% precision.',
    detail: 'Auto-generates proposals, designs, invoices, emails'
  },
  {
    icon: Rocket,
    title: 'Live the Life',
    description: 'Your new identity is active. The app shows relevant opportunities, clients, and resources.',
    detail: 'Continuous AI support for your new career'
  }
];

// Available sleeves overview
const SLEEVE_OVERVIEW = [
  { id: 'zoe-painter', name: 'Zoe-Painter', icon: '🎨', focus: 'Art & Design', color: 'from-rose-500/20 to-orange-500/20' },
  { id: 'zoe-coder', name: 'Zoe-Coder', icon: '💻', focus: 'Tech & Development', color: 'from-cyan-500/20 to-blue-500/20' },
  { id: 'zoe-entrepreneur', name: 'Zoe-Entrepreneur', icon: '🚀', focus: 'Business & Startups', color: 'from-violet-500/20 to-purple-500/20' },
  { id: 'zoe-healer', name: 'Zoe-Healer', icon: '🧘', focus: 'Wellness & Health', color: 'from-green-500/20 to-emerald-500/20' },
  { id: 'zoe-connector', name: 'Zoe-Connector', icon: '🤝', focus: 'Networking & Social', color: 'from-amber-500/20 to-yellow-500/20' }
];

const ReSleevePage = () => {
  const navigate = useNavigate();
  const { activeSleeve, soulScanResult } = useZoeReSleeve();
  const [activeTab, setActiveTab] = useState('overview');
  const [recommendedSleeveId, setRecommendedSleeveId] = useState<string | undefined>();

  // Dispatch page visit event to Zoe Core DHF
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('zoe-page-visit', {
      detail: { page: 'resleeve', feature: 'universal-career-prosthetic' }
    }));
  }, []);

  const handleSleeveRecommended = (sleeveId: string) => {
    setRecommendedSleeveId(sleeveId);
    setActiveTab('marketplace');
  };

  const handleSleeveEquipped = () => {
    setActiveTab('execute');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Project Re-Sleeve
              </h1>
              <p className="text-xs text-muted-foreground">Universal Career Prosthetic</p>
            </div>
          </div>
          
          {activeSleeve && (
            <Badge variant="outline" className="bg-primary/10 border-primary/30">
              <span className="mr-1">{activeSleeve.icon}</span>
              {activeSleeve.name}
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="p-4 pb-24 space-y-6">
          
          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto p-1">
              <TabsTrigger value="overview" className="text-xs py-2 flex flex-col gap-1">
                <Compass className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="scan" className="text-xs py-2 flex flex-col gap-1">
                <Scan className="w-4 h-4" />
                Soul Scan
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="text-xs py-2 flex flex-col gap-1">
                <ShoppingBag className="w-4 h-4" />
                Sleeves
              </TabsTrigger>
              <TabsTrigger value="execute" className="text-xs py-2 flex flex-col gap-1">
                <Zap className="w-4 h-4" />
                Execute
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-4 space-y-6">
              {/* Hero Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 border border-primary/20"
              >
                <div className="absolute inset-0 bg-grid-white/5" />
                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Become Who You're Meant to Be</h2>
                      <p className="text-sm text-muted-foreground">Agentic Vocational Prosthetics</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-foreground/80">
                    Re-Sleeve is your AI-powered career transformation system. Zoe scans your soul to detect 
                    hidden talents, helps you "download" a new professional identity, and executes 95% of 
                    the work while you provide the vision.
                  </p>

                  <Button 
                    onClick={() => setActiveTab('scan')} 
                    className="w-full"
                    size="lg"
                  >
                    <Scan className="w-4 h-4 mr-2" />
                    Start Soul Scan
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>

              {/* How It Works */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    How Re-Sleeve Works
                  </CardTitle>
                  <CardDescription>4-step transformation process</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {HOW_IT_WORKS.map((step, index) => (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <step.icon className="w-5 h-5 text-primary" />
                        </div>
                        {index < HOW_IT_WORKS.length - 1 && (
                          <div className="w-px h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="pb-4">
                        <h4 className="font-medium">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        <p className="text-xs text-primary/70 mt-1">{step.detail}</p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Available Sleeves Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Available Skill Sleeves
                  </CardTitle>
                  <CardDescription>Transform your app experience</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {SLEEVE_OVERVIEW.map((sleeve) => (
                      <motion.button
                        key={sleeve.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setRecommendedSleeveId(sleeve.id);
                          setActiveTab('marketplace');
                        }}
                        className={cn(
                          "p-4 rounded-xl border border-border/50 text-left transition-colors",
                          `bg-gradient-to-br ${sleeve.color}`,
                          activeSleeve?.id === sleeve.id && "ring-2 ring-primary"
                        )}
                      >
                        <span className="text-2xl">{sleeve.icon}</span>
                        <h4 className="font-medium text-sm mt-2">{sleeve.name}</h4>
                        <p className="text-xs text-muted-foreground">{sleeve.focus}</p>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Current Status */}
              {(activeSleeve || soulScanResult) && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Your Re-Sleeve Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activeSleeve && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                        <span className="text-3xl">{activeSleeve.icon}</span>
                        <div>
                          <p className="font-medium">{activeSleeve.name} Active</p>
                          <p className="text-xs text-muted-foreground">{activeSleeve.description}</p>
                        </div>
                      </div>
                    )}
                    {soulScanResult && (
                      <div className="p-3 rounded-lg bg-background/50">
                        <p className="text-sm font-medium">Last Soul Scan</p>
                        <p className="text-xs text-muted-foreground">
                          Detected {soulScanResult.talents.length} dormant talents
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {soulScanResult.talents.slice(0, 3).map((talent) => (
                            <Badge key={talent.id} variant="secondary" className="text-xs">
                              {talent.name} ({talent.confidence}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button 
                      onClick={() => setActiveTab('execute')} 
                      className="w-full"
                      disabled={!activeSleeve}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {activeSleeve ? 'Execute Tasks' : 'Equip a Sleeve First'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* SOUL SCAN TAB */}
            <TabsContent value="scan" className="mt-4">
              <SoulScanner onSleeveRecommended={handleSleeveRecommended} />
              
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">How Soul Scanning Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Analyzes your behavioral patterns from DHF History
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Detects dormant talents with confidence scores
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Matches talents to vocational archetypes
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Triggers "Destiny Notifications" for high matches
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* MARKETPLACE TAB */}
            <TabsContent value="marketplace" className="mt-4">
              <SleeveMarketplace
                recommendedSleeveId={recommendedSleeveId}
                onSleeveEquipped={handleSleeveEquipped}
              />
              
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sleeve Transformations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <strong>Map Focus:</strong> Shows profession-relevant locations
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <strong>Feed Filter:</strong> Surfaces relevant opportunities
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <strong>Voice Persona:</strong> Adjusts Zoe's communication style
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <strong>Color Scheme:</strong> Transforms app aesthetics
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* EXECUTE TAB */}
            <TabsContent value="execute" className="mt-4 space-y-4">
              <PuppetMasterAgent />
              
              {activeSleeve && (
                <CreativeExecutor 
                  sleeveId={activeSleeve.id}
                  onComplete={() => {}}
                />
              )}
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">95% Precision Engine</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      You provide the Soul/Vision (intent)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Zoe provides the Hands/Technique (execution)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Critic Agent validates each step before proceeding
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Automated outputs: proposals, designs, emails, invoices
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Guided Journey Mode */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                Full Guided Journey
              </CardTitle>
              <CardDescription className="text-xs">
                Prefer a step-by-step experience? Start the complete transformation journey.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LifeYouWantJourney />
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
    </div>
  );
};

export default ReSleevePage;
