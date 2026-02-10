import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { thresholds, type Threshold } from '@/data/universalTimelineData';
import { cn } from '@/lib/utils';

interface TimelineSearchBarProps {
  onThresholdSelect: (threshold: Threshold) => void;
}

interface SearchResult {
  threshold: Threshold;
  matchType: 'name' | 'description' | 'scientific' | 'experiential' | 'futureImpact';
  matchText: string;
}

export const TimelineSearchBar: React.FC<TimelineSearchBarProps> = ({ onThresholdSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    thresholds.forEach((threshold) => {
      // Search in name
      if (threshold.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          threshold,
          matchType: 'name',
          matchText: threshold.name
        });
      }

      // Search in short description
      if (threshold.shortDescription.toLowerCase().includes(lowerQuery)) {
        results.push({
          threshold,
          matchType: 'description',
          matchText: threshold.shortDescription
        });
      }

      // Search in scientific narrative
      if (threshold.narratives.scientific.toLowerCase().includes(lowerQuery)) {
        results.push({
          threshold,
          matchType: 'scientific',
          matchText: threshold.narratives.scientific.substring(0, 100) + '...'
        });
      }

      // Search in experiential narrative
      if (threshold.narratives.experiential.toLowerCase().includes(lowerQuery)) {
        results.push({
          threshold,
          matchType: 'experiential',
          matchText: threshold.narratives.experiential.substring(0, 100) + '...'
        });
      }

      // Search in future impact
      if (threshold.narratives.futureImpact.toLowerCase().includes(lowerQuery)) {
        results.push({
          threshold,
          matchType: 'futureImpact',
          matchText: threshold.narratives.futureImpact.substring(0, 100) + '...'
        });
      }
    });

    // Remove duplicates (same threshold found in multiple fields)
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex((r) => r.threshold.id === result.threshold.id)
    );

    setSearchResults(uniqueResults);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  const handleResultClick = (threshold: Threshold) => {
    onThresholdSelect(threshold);
    setSearchQuery('');
    setSearchResults([]);
    setIsExpanded(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'name': return 'Name';
      case 'description': return 'Description';
      case 'scientific': return 'Scientific';
      case 'experiential': return 'Experiential';
      case 'futureImpact': return 'Future Impact';
      default: return 'Match';
    }
  };

  return (
    <div ref={searchRef} className="relative z-30">
      {/* Search Button / Bar */}
      <motion.div
        initial={false}
        animate={{
          width: isExpanded ? '400px' : '56px',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative"
      >
        <div
          className={cn(
            "relative h-14 rounded-full overflow-hidden",
            "bg-gradient-to-r from-background/80 via-background/60 to-background/80",
            "backdrop-blur-xl border-2 border-white/20",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "hover:border-primary/50 transition-colors duration-300",
            isExpanded && "border-primary/60"
          )}
        >
          {/* Animated glow effect - GPU */}
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              isExpanded ? "animate-gpu-glow-pulse" : "opacity-0"
            )}
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
            }}
          />

          {/* Search Icon Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute left-0 top-0 h-14 w-14 flex items-center justify-center z-10"
          >
            <Search className="w-5 h-5 text-primary" />
          </button>

          {/* Input Field */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center pl-14 pr-14"
              >
                <Input
                  type="text"
                  placeholder="Search the universe..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full bg-transparent border-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/60"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clear / Sparkle Button */}
          {isExpanded && (
            <button
              onClick={searchQuery ? handleClear : undefined}
              className="absolute right-0 top-0 h-14 w-14 flex items-center justify-center z-10"
            >
              {searchQuery ? (
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              ) : (
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              )}
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {isExpanded && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "absolute top-16 left-0 right-0 max-h-96 overflow-y-auto",
                "rounded-2xl bg-background/95 backdrop-blur-xl",
                "border-2 border-white/20 shadow-2xl",
                "custom-scrollbar"
              )}
            >
              <div className="p-2">
                {searchResults.map((result, index) => (
                  <motion.button
                    key={`${result.threshold.id}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleResultClick(result.threshold)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl mb-2",
                      "hover:bg-white/10 transition-colors duration-200",
                      "border border-transparent hover:border-primary/30",
                      "group"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Threshold Icon */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `hsl(${result.threshold.color})` }}
                      >
                        {result.threshold.icon}
                      </div>

                      {/* Result Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {result.threshold.name}
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            {getMatchTypeLabel(result.matchType)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {result.threshold.displayTime}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.matchText}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Results Message */}
        <AnimatePresence>
          {isExpanded && searchQuery && searchResults.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "absolute top-16 left-0 right-0 p-6 text-center",
                "rounded-2xl bg-background/95 backdrop-blur-xl",
                "border-2 border-white/20 shadow-2xl"
              )}
            >
              <p className="text-muted-foreground">
                No results found for "<span className="text-foreground">{searchQuery}</span>"
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Try searching for thresholds, events, or concepts from the timeline
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
