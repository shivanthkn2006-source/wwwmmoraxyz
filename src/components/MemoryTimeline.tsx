// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY TIMELINE - Visual cortical stack memory stream
// Sci-fi HUD sidebar showing color-coded memory nodes with click navigation
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemoryStream, MemoryNode } from '@/hooks/useMemoryStream';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MemoryTimelineProps {
  onNodeClick?: (memoryId: string) => void;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const formatMemoryDate = (date: Date): string => {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday ' + format(date, 'h:mm a');
  return format(date, 'MMM d, h:mm a');
};

const NodeDot: React.FC<{
  node: MemoryNode;
  onClick: () => void;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}> = ({ node, onClick, isHovered, onHover }) => {
  const colorClasses = {
    red: 'bg-red-500 shadow-red-500/50',
    blue: 'bg-blue-500 shadow-blue-500/50',
    gold: 'bg-amber-400 shadow-amber-400/50',
    gray: 'bg-gray-400 shadow-gray-400/30',
  };

  const glowClasses = {
    red: 'bg-red-500/20',
    blue: 'bg-blue-500/20',
    gold: 'bg-amber-400/30',
    gray: 'bg-gray-400/10',
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
            className="relative flex items-center justify-center group"
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
          >
            {/* Glow effect */}
            <motion.div
              className={cn(
                "absolute w-6 h-6 rounded-full blur-md transition-opacity",
                glowClasses[node.color],
                isHovered ? 'opacity-100' : 'opacity-50'
              )}
              animate={node.isBreakthrough ? { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] } : {}}
              transition={{ repeat: node.isBreakthrough ? Infinity : 0, duration: 2 }}
            />
            
            {/* Main dot */}
            <div
              className={cn(
                "relative w-3 h-3 rounded-full shadow-lg transition-all cursor-pointer",
                colorClasses[node.color],
                node.isBreakthrough && 'ring-2 ring-amber-300 ring-offset-1 ring-offset-background'
              )}
            />
            
            {/* Breakthrough sparkle */}
            {node.isBreakthrough && (
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-400" />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs bg-background/95 backdrop-blur-xl border-primary/20">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{formatMemoryDate(node.timestamp)}</p>
            <p className="text-sm font-medium">{node.summary}</p>
            {node.isBreakthrough && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Breakthrough moment
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({
  onNodeClick,
  className,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { nodes, isLoading, error } = useMemoryStream();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const handleNodeClick = useCallback((memoryId: string) => {
    console.log('[MemoryTimeline] Node clicked:', memoryId);
    onNodeClick?.(memoryId);
  }, [onNodeClick]);

  // Group nodes by date
  const groupedNodes = nodes.reduce((acc, node) => {
    const dateKey = isToday(node.timestamp) 
      ? 'Today' 
      : isYesterday(node.timestamp) 
        ? 'Yesterday' 
        : format(node.timestamp, 'MMM d');
    
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(node);
    return acc;
  }, {} as Record<string, MemoryNode[]>);

  if (collapsed) {
    return (
      <motion.div
        initial={{ width: 48 }}
        animate={{ width: 48 }}
        className={cn(
          "fixed left-0 top-1/2 -translate-y-1/2 z-40",
          "bg-background/30 backdrop-blur-xl border-r border-primary/20",
          "rounded-r-xl shadow-lg",
          className
        )}
      >
        <button
          onClick={onToggleCollapse}
          className="w-12 h-24 flex items-center justify-center hover:bg-primary/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-primary/60" />
        </button>
        
        {/* Mini node indicators when collapsed */}
        <div className="flex flex-col items-center gap-1 py-2">
          {nodes.slice(0, 8).map((node) => (
            <div
              key={node.id}
              className={cn(
                "w-2 h-2 rounded-full",
                node.color === 'red' && 'bg-red-500',
                node.color === 'blue' && 'bg-blue-500',
                node.color === 'gold' && 'bg-amber-400',
                node.color === 'gray' && 'bg-gray-400'
              )}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 w-64",
        "bg-background/30 backdrop-blur-xl border-r border-primary/20",
        "shadow-2xl shadow-primary/5",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="font-medium text-sm">Memory Stream</h2>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-primary/10 rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-b border-primary/10 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{nodes.length} memories</span>
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          {nodes.filter(n => n.isBreakthrough).length} breakthroughs
        </span>
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto p-4 h-[calc(100vh-120px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            {/* CSS animation instead of framer-motion */}
            <div className="animate-gpu-spin-2s">
              <Brain className="w-6 h-6 text-primary/50" />
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-red-400 text-center py-4">{error}</p>
        ) : nodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No memories yet</p>
            <p className="text-xs mt-1">Start a conversation with Zoe</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNodes).map(([dateKey, dateNodes]) => (
              <div key={dateKey}>
                {/* Date label */}
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">{dateKey}</span>
                </div>
                
                {/* Timeline line with nodes */}
                <div className="relative ml-1.5">
                  {/* Vertical line */}
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/10 to-transparent" />
                  
                  {/* Nodes */}
                  <div className="space-y-4 pl-4">
                    {dateNodes.map((node) => (
                      <div key={node.id} className="relative flex items-start gap-3">
                        {/* Connection to line */}
                        <div className="absolute -left-4 top-1.5 w-4 h-px bg-primary/20" />
                        
                        {/* Node dot */}
                        <div className="absolute -left-[22px] top-0">
                          <NodeDot
                            node={node}
                            onClick={() => handleNodeClick(node.id)}
                            isHovered={hoveredNodeId === node.id}
                            onHover={(hovered) => setHoveredNodeId(hovered ? node.id : null)}
                          />
                        </div>
                        
                        {/* Content preview */}
                        <button
                          onClick={() => handleNodeClick(node.id)}
                          className={cn(
                            "flex-1 text-left p-2 rounded-lg transition-all",
                            "hover:bg-primary/5 cursor-pointer",
                            hoveredNodeId === node.id && 'bg-primary/10'
                          )}
                        >
                          <p className="text-xs text-muted-foreground mb-0.5">
                            {format(node.timestamp, 'h:mm a')}
                          </p>
                          <p className="text-sm line-clamp-2">{node.summary}</p>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-primary/10 bg-background/20">
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Calm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Stress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-muted-foreground">Breakthrough</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MemoryTimeline;
