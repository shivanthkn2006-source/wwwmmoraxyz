import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UNIVERSAL_SYMBOLS, UniversalSymbol } from '@/data/universalSymbols';

interface UniversalSymbolsGuideProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<UniversalSymbol['category'], string> = {
  'activity': 'Activity',
  'social': 'Social',
  'content': 'Content',
  'achievement': 'Achievement',
  'system': 'System',
};

const CATEGORY_COLORS: Record<UniversalSymbol['category'], string> = {
  'activity': 'hsl(25, 95%, 53%)',
  'social': 'hsl(142, 76%, 36%)',
  'content': 'hsl(262, 83%, 58%)',
  'achievement': 'hsl(45, 93%, 47%)',
  'system': 'hsl(217, 91%, 60%)',
};

export const UniversalSymbolsGuide: React.FC<UniversalSymbolsGuideProps> = ({ open, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<UniversalSymbol['category'] | 'all'>('all');

  const filteredSymbols = UNIVERSAL_SYMBOLS.filter(symbol => {
    const matchesSearch = 
      symbol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      symbol.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || symbol.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)] as Array<UniversalSymbol['category'] | 'all'>;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
        {/* Header with glassmorphism */}
        <div 
          className="relative p-6 border-b backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--accent) / 0.08))',
            borderColor: 'hsl(var(--border) / 0.5)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="animate-spin animate-gpu-pulse-scale-slow" style={{ animationDuration: '3s' }}>
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              Universal Symbols Guide
            </DialogTitle>
          </DialogHeader>

          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 backdrop-blur-sm border-border/50"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer whitespace-nowrap transition-all hover:scale-105"
                onClick={() => setSelectedCategory(category)}
                style={{
                  backgroundColor: selectedCategory === category 
                    ? (category === 'all' ? 'hsl(var(--primary))' : CATEGORY_COLORS[category as UniversalSymbol['category']]) 
                    : 'transparent',
                  borderColor: category === 'all' 
                    ? 'hsl(var(--border))' 
                    : CATEGORY_COLORS[category as UniversalSymbol['category']],
                }}
              >
                {category === 'all' ? 'All' : CATEGORY_LABELS[category as UniversalSymbol['category']]}
              </Badge>
            ))}
          </div>
        </div>

        {/* Symbols Grid */}
        <ScrollArea className="h-[500px]">
          <div className="p-6">
            <AnimatePresence mode="popLayout">
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                layout
              >
                {filteredSymbols.map((symbol, index) => (
                  <motion.div
                    key={symbol.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: index * 0.02,
                      ease: 'easeOut'
                    }}
                    className="relative p-4 rounded-xl border backdrop-blur-xl transition-all hover:scale-105 hover:shadow-lg group"
                    style={{
                      background: `linear-gradient(135deg, ${symbol.color}08, ${symbol.color}15)`,
                      borderColor: `${symbol.color}30`,
                    }}
                  >
                    {/* Hover glow effect */}
                    <motion.div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${symbol.color}20, transparent 70%)`,
                        filter: 'blur(10px)',
                      }}
                    />

                    <div className="relative z-10">
                      {/* Symbol Icon */}
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3 backdrop-blur-sm border"
                        style={{
                          background: `linear-gradient(135deg, ${symbol.color}20, ${symbol.color}35)`,
                          borderColor: `${symbol.color}50`,
                          boxShadow: `0 0 20px ${symbol.color}30`,
                        }}
                      >
                        {symbol.symbol}
                      </div>

                      {/* Symbol Info */}
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm">{symbol.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {symbol.description}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="text-[10px] mt-2"
                          style={{
                            borderColor: `${symbol.color}50`,
                            color: symbol.color,
                          }}
                        >
                          {CATEGORY_LABELS[symbol.category]}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {filteredSymbols.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No symbols found matching your search</p>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div 
          className="p-4 border-t text-xs text-muted-foreground text-center backdrop-blur-xl"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--background) / 0.8), hsl(var(--muted) / 0.3))',
            borderColor: 'hsl(var(--border) / 0.5)',
          }}
        >
          These symbols appear on user profiles in Huddle and throughout the platform
        </div>
      </DialogContent>
    </Dialog>
  );
};
