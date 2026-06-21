/**
 * Orbital Command Page - "God View" VR Navigation
 * Part of Project Exodus: 2120 Edition
 */

import React, { useEffect, useState } from 'react';
import { OrbitalCommand } from '@/components/vr/orbital';
import { useOrbitalNavigation, ViewLevel, WorldStructure } from '@/hooks/useOrbitalNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Satellite, 
  Maximize2,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const OrbitalCommandPage = () => {
  const navigate = useNavigate();
  const orbital = useOrbitalNavigation();
  const [fullscreen, setFullscreen] = useState(false);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleLevelChange = (level: ViewLevel) => {
    console.log('[OrbitalCommand] View level changed to:', level);
  };

  const handleStructureSelect = (structure: WorldStructure) => {
    console.log('[OrbitalCommand] Structure selected:', structure.name);
    orbital.focusOnStructure(structure.id);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case '1': orbital.zoomToLevel('exosphere'); break;
        case '2': orbital.zoomToLevel('stratosphere'); break;
        case '3': orbital.zoomToLevel('ground'); break;
        case '4': orbital.zoomToLevel('immersive'); break;
        case 's': orbital.toggleStoryMode(); break;
        case 'f': handleFullscreen(); break;
        case 'Escape': navigate(-1); break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, orbital]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-background via-background/95 to-background overflow-hidden">
      {/* Main Orbital Command Component */}
      <OrbitalCommand
        onLevelChange={handleLevelChange}
        onStructureSelect={handleStructureSelect}
        className="w-full h-full"
      />

      {/* Top Navigation Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <Badge variant="outline" className="bg-background/60 backdrop-blur-sm border-primary/30">
          <Satellite className="h-3 w-3 mr-1" />
          ORBITAL COMMAND
        </Badge>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFullscreen}
          className="bg-background/40 backdrop-blur-sm"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Back Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 bg-background/40 backdrop-blur-sm"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Loading Overlay */}
      <AnimatePresence>
        {orbital.isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-none"
          >
            <div className="text-center">
              {/* CSS spinner instead of framer-motion */}
              <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4 animate-gpu-spin" />
              <p className="text-muted-foreground">Transitioning...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/50 z-50">
        <kbd className="px-1 bg-muted/20 rounded">1-4</kbd> Views · 
        <kbd className="px-1 bg-muted/20 rounded ml-1">S</kbd> Story · 
        <kbd className="px-1 bg-muted/20 rounded ml-1">F</kbd> Fullscreen · 
        <kbd className="px-1 bg-muted/20 rounded ml-1">ESC</kbd> Back
      </div>
    </div>
  );
};

export default OrbitalCommandPage;
