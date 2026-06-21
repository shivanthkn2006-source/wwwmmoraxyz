// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SATELLITE GLOBE - Cinematic 3D Globe for M'mora Sentinel
// Real OpenSky flights rendered as clickable Plane icons
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { motion, AnimatePresence } from 'framer-motion';
import { Satellite, Plane } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { cn } from '@/lib/utils';

type IntelligencePoint = {
  id: string;
  lat: number;
  lng: number;
  event: string;
  altitude?: number;
  radius?: number;
  color?: string;
  source?: 'intelligence' | 'flight';
  heading?: number;
};

interface ZoeSatelliteGlobeProps {
  className?: string;
  points?: IntelligencePoint[];
  onFlightClick?: (point: IntelligencePoint) => void;
}

const ZoeSatelliteGlobe: React.FC<ZoeSatelliteGlobeProps> = ({ className, points = [], onFlightClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const fallbackTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 3000);
    return () => clearTimeout(fallbackTimer);
  }, [isMounted]);

  const handleGlobeReady = useCallback(() => {
    setIsLoaded(true);

    if (globeRef.current) {
      const globe = globeRef.current;
      globe.pointOfView({ lat: 20, lng: 30, altitude: 2.5 }, 1000);

      const controls = globe.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
      }
    }
  }, []);

  const flightPoints = useMemo(() => points.filter(p => p.source === 'flight'), [points]);
  const intelPoints = useMemo(() => points.filter(p => p.source !== 'flight'), [points]);

  // Stable ref for onFlightClick to avoid re-creating htmlElement closures
  const onFlightClickRef = useRef(onFlightClick);
  onFlightClickRef.current = onFlightClick;

  return (
    <div ref={containerRef} className={cn('relative w-full h-full', className)}>
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-accent/20 border-t-accent animate-spin" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Satellite className="w-7 h-7 text-accent/70" />
              </div>
            </div>
            <p className="mt-6 text-xs text-accent/60 font-mono tracking-[0.25em] uppercase">
              Calibrating Zoe Satellite View...
            </p>
            <div className="mt-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-accent/60 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isMounted && dimensions.width > 0 && (
        <div className={cn('transition-opacity duration-1000', isLoaded ? 'opacity-100' : 'opacity-0')}>
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            onGlobeReady={handleGlobeReady}
            globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="#00e5ff"
            atmosphereAltitude={0.18}
            // Intelligence points (non-flight)
            pointsData={intelPoints}
            pointLat="lat"
            pointLng="lng"
            pointLabel="event"
            pointColor={(point: object) => {
              const typedPoint = point as IntelligencePoint;
              return typedPoint.color ?? '#FFCC00';
            }}
            pointAltitude={(point: object) => {
              const typedPoint = point as IntelligencePoint;
              return typeof typedPoint.altitude === 'number' ? typedPoint.altitude : 0.05;
            }}
            pointRadius={(point: object) => {
              const typedPoint = point as IntelligencePoint;
              return typeof typedPoint.radius === 'number' ? typedPoint.radius : 0.3;
            }}
            pointsTransitionDuration={1000}
            // Flight airplane icons via HTML elements
            htmlElementsData={flightPoints}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude={0.05}
            htmlTransitionDuration={1000}
            htmlElement={(d: object) => {
              const flight = d as IntelligencePoint;
              const wrapper = document.createElement('div');
              wrapper.style.transform = `rotate(${flight.heading ?? 0}deg)`;
              wrapper.style.filter = 'drop-shadow(0 0 4px #FFCC00)';
              wrapper.style.cursor = 'pointer';
              wrapper.style.pointerEvents = 'auto';
              wrapper.title = flight.event;
              wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                onFlightClickRef.current?.(flight);
              });
              const root = createRoot(wrapper);
              root.render(
                <Plane
                  size={12}
                  fill="#FFCC00"
                  color="#FFCC00"
                  strokeWidth={1}
                />
              );
              return wrapper;
            }}
            animateIn={true}
          />
        </div>
      )}

      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, hsl(var(--background) / 0.65) 100%)' }}
      />
    </div>
  );
};

export default ZoeSatelliteGlobe;
