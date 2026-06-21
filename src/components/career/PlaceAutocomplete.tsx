/**
 * PLACE AUTOCOMPLETE COMPONENT - World Places Search
 * Fast autocomplete for global cities with coordinates
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Globe, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchCities, CityData, getCityData } from '@/utils/worldCities';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onCitySelect?: (city: CityData) => void;
  placeholder?: string;
  className?: string;
}

export const PlaceAutocomplete: React.FC<PlaceAutocompleteProps> = ({
  value,
  onChange,
  onCitySelect,
  placeholder = 'Type city name...',
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<CityData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search cities on input change
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);
    
    if (newValue.length >= 2) {
      const results = searchCities(newValue, 8);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setHighlightIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [onChange]);

  // Handle city selection
  const handleSelect = useCallback((city: CityData) => {
    const displayValue = `${city.name}, ${city.country}`;
    onChange(displayValue);
    onCitySelect?.(city);
    setSuggestions([]);
    setIsOpen(false);
    setHighlightIndex(-1);
  }, [onChange, onCitySelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0) {
          handleSelect(suggestions[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  }, [isOpen, suggestions, highlightIndex, handleSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear input
  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50 pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="pl-9 pr-8 border-amber-500/20 bg-amber-950/20 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-400/50 focus:ring-amber-400/20"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/50 hover:text-amber-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 rounded-lg border border-amber-500/30 bg-gradient-to-br from-[#0d0d35] via-[#0a0a2e] to-[#050520] backdrop-blur-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
              {suggestions.map((city, index) => (
                <motion.button
                  key={`${city.name}-${city.country}`}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                    highlightIndex === index 
                      ? 'bg-amber-500/20' 
                      : 'hover:bg-amber-500/10'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="flex-shrink-0">
                    <MapPin className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-amber-100 truncate">
                      {city.name}
                    </div>
                    <div className="text-xs text-amber-200/50 truncate">
                      {city.country}, {city.continent}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs text-amber-300/40">
                    UTC{city.timezone >= 0 ? '+' : ''}{city.timezone}
                  </div>
                </motion.button>
              ))}
            </div>
            
            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-amber-500/10 bg-amber-950/30">
              <div className="flex items-center gap-2 text-xs text-amber-200/40">
                <Globe className="w-3 h-3" />
                <span>Type 2+ letters to search worldwide</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlaceAutocomplete;
