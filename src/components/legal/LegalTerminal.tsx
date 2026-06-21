import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LegalPillar, LegalSection, LegalClause } from '@/data/mmoraLegalFramework';
import { ChevronRight, Shield, FileText, Scale, AlertTriangle } from 'lucide-react';

interface LegalTerminalProps {
  pillar: LegalPillar | null;
  onClose?: () => void;
}

const LegalTerminal: React.FC<LegalTerminalProps> = ({ pillar, onClose }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedClause, setExpandedClause] = useState<string | null>(null);

  // Terminal typing effect for header
  useEffect(() => {
    if (!pillar) {
      setDisplayedText('');
      return;
    }

    setIsTyping(true);
    const text = `> LOADING ${pillar.title}...\n> STATUS: ACTIVE\n> PROTOCOL VERSION: 1.0.0`;
    let index = 0;
    
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [pillar]);

  if (!pillar) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto opacity-30" />
          <p className="text-sm">Select a protocol from the menu to view details</p>
        </div>
      </div>
    );
  }

  const getIcon = (id: string) => {
    switch (id) {
      case 'dhf-protocols': return <Shield className="h-5 w-5" />;
      case 'zoe-accords': return <FileText className="h-5 w-5" />;
      case 'reality-interface': return <AlertTriangle className="h-5 w-5" />;
      case 'exodus-rules': return <Scale className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      {/* Terminal Header */}
      <div className="glass-panel rounded-t-lg p-4 border-b border-primary/20">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            mmora://legal/{pillar.id}
          </span>
        </div>
        
        <pre className="mt-3 text-xs font-mono text-primary whitespace-pre-wrap">
          {displayedText}
          {isTyping && <span className="animate-pulse">▌</span>}
        </pre>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 glass-panel rounded-b-lg">
        <div className="p-4 space-y-6">
          {/* Pillar Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{pillar.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-foreground">{pillar.title}</h2>
                <p className="text-sm text-muted-foreground">{pillar.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {pillar.sections.map((section) => (
              <div key={section.id} className="space-y-2">
                <button
                  onClick={() => setExpandedSection(
                    expandedSection === section.id ? null : section.id
                  )}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {getIcon(pillar.id)}
                    <span className="font-medium">{section.title}</span>
                  </div>
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform ${
                      expandedSection === section.id ? 'rotate-90' : ''
                    }`} 
                  />
                </button>

                <AnimatePresence>
                  {expandedSection === section.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pr-2 py-2 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {section.content}
                        </p>

                        {/* Clauses */}
                        <div className="space-y-2">
                          {section.clauses.map((clause) => (
                            <ClauseCard
                              key={clause.id}
                              clause={clause}
                              isExpanded={expandedClause === clause.id}
                              onToggle={() => setExpandedClause(
                                expandedClause === clause.id ? null : clause.id
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
};

// Clause Card Component
const ClauseCard: React.FC<{
  clause: LegalClause;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ clause, isExpanded, onToggle }) => (
  <div className="rounded-lg border border-border/50 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-3 flex items-center justify-between bg-muted/20 hover:bg-muted/40 transition-colors text-left"
    >
      <span className="text-sm font-medium">{clause.title}</span>
      <ChevronRight 
        className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
      />
    </button>
    
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden"
        >
          <div className="p-3 space-y-3 bg-background/30">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {clause.text}
            </p>
            
            {clause.compliance && clause.compliance.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {clause.compliance.map((reg) => (
                  <Badge 
                    key={reg} 
                    variant="outline" 
                    className="text-xs bg-primary/10 text-primary border-primary/30"
                  >
                    {reg}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default LegalTerminal;
