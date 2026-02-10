import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';

interface MemorySector {
  id: string;
  title: string;
  timestamp: string;
  imageUrl?: string;
  type: 'post' | 'memory' | 'achievement';
}

interface MemorySectorsProps {
  posts?: any[];
}

const MemorySectors: React.FC<MemorySectorsProps> = ({ posts = [] }) => {
  const { user } = useAuth();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Generate future timestamp for display
  const getFutureTimestamp = (date: Date) => {
    const futureYear = 2050 + Math.floor(Math.random() * 50);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `DATE: ${futureYear}.${month}.${day}`;
  };

  const memorySectors: MemorySector[] = posts.slice(0, 9).map((post) => ({
    id: post.id,
    title: post.caption?.substring(0, 30) || 'Memory Fragment',
    timestamp: getFutureTimestamp(new Date(post.created_at)),
    imageUrl: post.media_url,
    type: 'post'
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
        MEMORY SECTORS
      </h3>
      
      <div className="grid grid-cols-3 gap-2">
        {memorySectors.map((sector, idx) => (
          <motion.div
            key={sector.id}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
            onMouseEnter={() => setHoveredId(sector.id)}
            onMouseLeave={() => setHoveredId(null)}
            animate={{
              scale: hoveredId === sector.id ? 1.1 : 1,
              filter: hoveredId === sector.id 
                ? 'hue-rotate(10deg) saturate(1.2)' 
                : 'saturate(0.8)'
            }}
            transition={{ type: 'spring', stiffness: 400 }}
            style={{ zIndex: hoveredId === sector.id ? 10 : 1 }}
          >
            {/* Glass Card Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/20 backdrop-blur-sm border border-primary/20 rounded-lg" />
            
            {/* Image (if exists) */}
            {sector.imageUrl && (
              <img 
                src={sector.imageUrl} 
                alt={sector.title}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                loading="lazy"
              />
            )}
            
            {/* Chromatic Aberration Effect on Hover */}
            {hoveredId === sector.id && (
              <>
                <motion.div 
                  className="absolute inset-0 bg-red-500/10"
                  style={{ transform: 'translate(-2px, 0)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                />
                <motion.div 
                  className="absolute inset-0 bg-blue-500/10"
                  style={{ transform: 'translate(2px, 0)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                />
              </>
            )}
            
            {/* Timestamp Label */}
            <div className="absolute bottom-1 left-1 right-1">
              <span className="text-[8px] font-mono text-primary/80 bg-background/60 px-1 rounded">
                {sector.timestamp}
              </span>
            </div>
            
            {/* Scan Line Effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)'
              }}
            />
          </motion.div>
        ))}
        
        {/* Empty Slots */}
        {Array.from({ length: Math.max(0, 9 - memorySectors.length) }).map((_, idx) => (
          <div 
            key={`empty-${idx}`}
            className="aspect-square rounded-lg border border-dashed border-muted-foreground/20 flex items-center justify-center"
          >
            <span className="text-[10px] text-muted-foreground font-mono">EMPTY</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemorySectors;
