import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import LegalGlobe from './LegalGlobe';
import LegalTerminal from './LegalTerminal';
import { 
  MMORA_LEGAL_PILLARS, 
  CONTINENT_STATUS,
  ContinentStatus,
  LegalPillar,
  LEGAL_VERSION,
  LEGAL_EFFECTIVE_DATE
} from '@/data/mmoraLegalFramework';
import { 
  Shield, 
  Bot, 
  Glasses, 
  Sword, 
  Globe,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileSearch,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

const LegalNexusPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPillar, setSelectedPillar] = useState<LegalPillar | null>(null);
  const [hoveredContinent, setHoveredContinent] = useState<ContinentStatus | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [acknowledgmentChecked, setAcknowledgmentChecked] = useState(false);

  // Check if user has already acknowledged (localStorage-based)
  useEffect(() => {
    if (!user) return;
    
    const stored = localStorage.getItem('mmora-legal-acknowledged');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.version === LEGAL_VERSION && parsed.userId === user.id) {
          setHasAcknowledged(true);
        }
      } catch (e) {
        console.log('Legal acknowledgment check error');
      }
    }
  }, [user]);

  const handleAcknowledge = async () => {
    if (!user || !acknowledgmentChecked) return;
    
    setIsAcknowledging(true);
    try {
      // Store acknowledgment in localStorage as fallback
      localStorage.setItem('mmora-legal-acknowledged', JSON.stringify({
        version: LEGAL_VERSION,
        timestamp: new Date().toISOString(),
        userId: user.id
      }));
      
      setHasAcknowledged(true);
      toast.success('Legal protocols acknowledged', {
        description: 'You now have full access to the Exodus Protocol'
      });
    } catch (error) {
      console.error('Acknowledgment error:', error);
      toast.error('Failed to save acknowledgment');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const getPillarIcon = (id: string) => {
    switch (id) {
      case 'dhf-protocols': return <Shield className="h-5 w-5" />;
      case 'zoe-accords': return <Bot className="h-5 w-5" />;
      case 'reality-interface': return <Glasses className="h-5 w-5" />;
      case 'exodus-rules': return <Sword className="h-5 w-5" />;
      case 'sovereignty-clause': return <Globe className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: ContinentStatus['status']) => {
    switch (status) {
      case 'compliant': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'active': return <Info className="h-4 w-4 text-blue-500" />;
      case 'pending': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
            THE NEXUS: LEGAL & PROTOCOLS
          </h1>
          <p className="text-muted-foreground">
            The M'mora White Book - Dynamic Constitutional Framework
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Version {LEGAL_VERSION}</span>
            <span>•</span>
            <span>Effective: {LEGAL_EFFECTIVE_DATE}</span>
          </div>
          
          {/* Contract Scanner Link */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="pt-4"
          >
            <Button 
              onClick={() => navigate('/contract-scanner')}
              className="gap-2"
              size="lg"
            >
              <FileSearch className="h-5 w-5" />
              <span>Contract Scanner</span>
              <Sparkles className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              AI-Powered Risk Assessment • Upload & Analyze Contracts
            </p>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 space-y-4"
          >
            <Card className="glass-panel p-4">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                PROTOCOL PILLARS
              </h2>
              <div className="space-y-2">
                {MMORA_LEGAL_PILLARS.map((pillar) => (
                  <button
                    key={pillar.id}
                    onClick={() => setSelectedPillar(pillar)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                      selectedPillar?.id === pillar.id
                        ? 'bg-primary/20 border border-primary/50'
                        : 'bg-background/50 hover:bg-background/80 border border-transparent'
                    }`}
                  >
                    <span className="text-xl">{pillar.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pillar.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {pillar.sections.length} sections
                      </p>
                    </div>
                    {getPillarIcon(pillar.id)}
                  </button>
                ))}
              </div>
            </Card>

            {/* Acknowledgment Card */}
            <Card className="glass-panel p-4">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                ACKNOWLEDGMENT
              </h2>
              {hasAcknowledged ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm">Protocols Acknowledged</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="acknowledge"
                      checked={acknowledgmentChecked}
                      onCheckedChange={(checked) => setAcknowledgmentChecked(checked === true)}
                    />
                    <label 
                      htmlFor="acknowledge" 
                      className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      I acknowledge the Exodus Protocol and agree to the M'mora Constitutional Framework
                    </label>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAcknowledge}
                    disabled={!acknowledgmentChecked || isAcknowledging}
                    className="w-full"
                  >
                    {isAcknowledging ? 'Processing...' : 'Confirm Acknowledgment'}
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Center Panel - Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4"
          >
            <Card className="glass-panel h-[400px] lg:h-[500px] relative overflow-hidden">
              <LegalGlobe 
                onContinentHover={setHoveredContinent}
                selectedContinent={hoveredContinent?.code}
              />
              
              {/* Continent Info Overlay */}
              {hoveredContinent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-4 right-4 glass-panel rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{hoveredContinent.name}</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(hoveredContinent.status)}
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          hoveredContinent.status === 'compliant' 
                            ? 'border-green-500/50 text-green-500'
                            : hoveredContinent.status === 'active'
                            ? 'border-blue-500/50 text-blue-500'
                            : 'border-yellow-500/50 text-yellow-500'
                        }`}
                      >
                        {hoveredContinent.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hoveredContinent.regulations.slice(0, 3).map((reg) => (
                      <Badge key={reg} variant="secondary" className="text-xs">
                        {reg}
                      </Badge>
                    ))}
                    {hoveredContinent.regulations.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{hoveredContinent.regulations.length - 3} more
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>

          {/* Right Panel - Terminal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-5 h-[400px] lg:h-[500px]"
          >
            <LegalTerminal pillar={selectedPillar} />
          </motion.div>
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          {MMORA_LEGAL_PILLARS.map((pillar) => {
            const totalClauses = pillar.sections.reduce(
              (acc, section) => acc + section.clauses.length, 0
            );
            return (
              <Card 
                key={pillar.id} 
                className="glass-panel p-4 text-center cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => setSelectedPillar(pillar)}
              >
                <span className="text-2xl">{pillar.icon}</span>
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {pillar.title.replace('THE ', '')}
                </p>
                <p className="text-lg font-bold text-primary">{totalClauses}</p>
                <p className="text-xs text-muted-foreground">Clauses</p>
              </Card>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default LegalNexusPage;
