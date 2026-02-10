/**
 * LocationMapDetailView
 * 
 * A detailed map view for exploring nearby options after product selection
 * Supports 360° rotation via touch, mouse, keyboard, and trackpad
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Star, Navigation, ChevronLeft, ChevronRight, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationResult {
  id: string;
  name: string;
  category: string;
  type: string;
  discount?: string;
  location_lat?: number;
  location_lng?: number;
  distance_km?: number;
  timing?: string;
  rating?: number;
  store_name?: string;
}

interface LocationMapDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  selectedResult: LocationResult | null;
  nearbyResults: LocationResult[];
  userLocation?: { lat: number; lng: number } | null;
}

const LocationMapDetailView: React.FC<LocationMapDetailViewProps> = ({
  isOpen,
  onClose,
  selectedResult,
  nearbyResults,
  userLocation
}) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse/touch drag for 360° rotation
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    lastPosition.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastPosition.current.x;
    const deltaY = e.clientY - lastPosition.current.y;
    setRotation(prev => ({
      x: Math.max(-85, Math.min(85, prev.x - deltaY * 0.3)),
      y: (prev.y + deltaX * 0.5) % 360
    }));
    lastPosition.current = { x: e.clientX, y: e.clientY };
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.001)));
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          setRotation(prev => ({ ...prev, y: prev.y - 10 }));
          break;
        case 'ArrowRight':
        case 'd':
          setRotation(prev => ({ ...prev, y: prev.y + 10 }));
          break;
        case 'ArrowUp':
        case 'w':
          setRotation(prev => ({ ...prev, x: Math.min(85, prev.x + 10) }));
          break;
        case 'ArrowDown':
        case 's':
          setRotation(prev => ({ ...prev, x: Math.max(-85, prev.x - 10) }));
          break;
        case '+':
        case '=':
          setZoom(prev => Math.min(3, prev + 0.2));
          break;
        case '-':
          setZoom(prev => Math.max(0.5, prev - 0.2));
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Navigate between results
  const goToPrevious = () => setSelectedIndex(prev => Math.max(0, prev - 1));
  const goToNext = () => setSelectedIndex(prev => Math.min(nearbyResults.length - 1, prev + 1));

  const currentResult = nearbyResults[selectedIndex] || selectedResult;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-background to-transparent">
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              {currentResult?.name || 'Location Details'}
            </h2>
            <Button variant="ghost" size="icon" className="rounded-full opacity-0">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 3D Map Container */}
          <div
            ref={containerRef}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {/* Simulated 3D Map View */}
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              {/* Map Grid */}
              <div className="relative w-[600px] h-[600px] rounded-full border border-primary/20">
                {/* Grid lines */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute left-0 right-0 border-t border-primary/10"
                    style={{ top: `${(i + 1) * 12.5}%` }}
                  />
                ))}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute top-0 bottom-0 border-l border-primary/10"
                    style={{ left: `${(i + 1) * 12.5}%` }}
                  />
                ))}

                {/* User location */}
                {userLocation && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-blue-400 whitespace-nowrap">
                      You
                    </div>
                  </div>
                )}

                {/* Location pins */}
                {nearbyResults.slice(0, 10).map((result, i) => {
                  const angle = (i / Math.min(nearbyResults.length, 10)) * 2 * Math.PI;
                  const distance = 100 + (result.distance_km || 1) * 30;
                  const x = Math.cos(angle) * distance;
                  const y = Math.sin(angle) * distance;
                  const isSelected = i === selectedIndex;

                  return (
                    <motion.div
                      key={result.id || i}
                      className={`absolute cursor-pointer transition-all ${isSelected ? 'z-20 scale-125' : 'z-10'}`}
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onClick={() => setSelectedIndex(i)}
                      whileHover={{ scale: 1.2 }}
                    >
                      <div className={`relative ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                        <MapPin className={`w-6 h-6 ${isSelected ? 'fill-primary' : ''}`} />
                        {isSelected && (
                          <motion.div
                            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground px-2 py-1 rounded text-xs whitespace-nowrap"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            {result.name}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Controls hint */}
          <div className="absolute top-20 left-4 text-xs text-muted-foreground space-y-1">
            <div>🖱️ Drag to rotate</div>
            <div>⌨️ WASD/Arrows</div>
            <div>🔍 +/- to zoom</div>
          </div>

          {/* Result Details Panel */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/30 rounded-t-3xl"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
          >
            {/* Navigation arrows */}
            <div className="flex items-center justify-between px-4 pt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                disabled={selectedIndex === 0}
                className="rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedIndex + 1} of {nearbyResults.length} nearby
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                disabled={selectedIndex === nearbyResults.length - 1}
                className="rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Current result details */}
            {currentResult && (
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{currentResult.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {currentResult.store_name || currentResult.category}
                    </p>
                  </div>
                  {currentResult.discount && (
                    <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                      {currentResult.discount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {currentResult.distance_km && (
                    <div className="flex items-center gap-1">
                      <Navigation className="w-4 h-4" />
                      <span>{currentResult.distance_km.toFixed(1)} km</span>
                    </div>
                  )}
                  {currentResult.timing && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{currentResult.timing}</span>
                    </div>
                  )}
                  {currentResult.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <span>{currentResult.rating}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" variant="default">
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                  <Button variant="outline" size="icon">
                    <Locate className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationMapDetailView;
