import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, MicOff, Sparkles, MapPin, Clock, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSelfieCitySearch, dispatchToNavigationBus } from '@/hooks/useSelfieCitySearch';
import { useSelfieCityVoice } from '@/hooks/useSelfieCityVoice';
import { smartFlyTo } from '@/services/globeNavigationService';
import LocationMapDetailView from './LocationMapDetailView';

interface SelfieCitySearchBarProps {
  userLocation?: { lat: number; lng: number } | null;
}

const SelfieCitySearchBar: React.FC<SelfieCitySearchBarProps> = ({ userLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [zoeInsight, setZoeInsight] = useState('');
  const [showMapDetail, setShowMapDetail] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const { search, quickSearch, results, zoeInsight: searchZoeInsight } = useSelfieCitySearch();
  const { isListening, toggleListening, transcript, registerCallbacks } = useSelfieCityVoice();

  // Register voice callbacks
  React.useEffect(() => {
    registerCallbacks({
      onSearch: (query, results) => {
        setSearchQuery(query);
        setSearchResults(results);
        setShowSearchResults(true);
        window.dispatchEvent(new CustomEvent('selfie-city-search-results', { 
          detail: { query, results, zoeInsight: searchZoeInsight } 
        }));
      },
      onAction: (action, data) => {
        window.dispatchEvent(new CustomEvent('selfie-city-voice-action', { detail: { action, data } }));
      },
    });
  }, [registerCallbacks, searchZoeInsight]);

  // Sync search results
  React.useEffect(() => {
    if (results.length > 0) {
      setSearchResults(results);
      setShowSearchResults(true);
      window.dispatchEvent(new CustomEvent('selfie-city-search-results', { 
        detail: { query: searchQuery, results, zoeInsight: searchZoeInsight } 
      }));
    }
    if (searchZoeInsight) {
      setZoeInsight(searchZoeInsight);
    }
  }, [results, searchZoeInsight, searchQuery]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.length >= 2) {
      quickSearch(value);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [quickSearch]);

  const handleSearchSubmit = useCallback(async () => {
    if (searchQuery.length >= 2) {
      await search(searchQuery, userLocation || undefined);
      setShowSearchResults(true);
    }
  }, [searchQuery, search, userLocation]);

  const handleResultClick = async (result: any) => {
    setSearchQuery(result.name);
    setSelectedResult(result);
    
    // PHASE 2: Use Navigation Bus for coordinated Search → Globe → Modal flow
    if (result.location_lat && result.location_lng) {
      // Dispatch to Navigation Bus for coordinated flight + auto-modal
      dispatchToNavigationBus(result);
    } else if (result.location) {
      // Fallback to smart fly-to with geocoding
      await smartFlyTo(result.location);
    } else {
      // Final fallback: geocode the name
      await smartFlyTo(result.name);
    }
    
    // Show map detail view with nearby options
    setShowSearchResults(false);
    setShowMapDetail(true);
  };

  return (
    <>
      {/* Search Bar - Bottom Center */}
      <motion.div 
        className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative w-full max-w-sm flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
            <Input
              placeholder="Search meals, products, brands..."
              className="w-full pl-12 pr-4 py-3 bg-background/80 backdrop-blur-2xl border-0 border-b border-primary/20 rounded-none rounded-b-2xl text-foreground placeholder:text-muted-foreground focus:ring-0 focus:border-primary/40 transition-all shadow-lg"
              value={isListening ? transcript : searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleListening}
            className={`rounded-full w-11 h-11 backdrop-blur-xl border-0 ${isListening ? 'bg-primary/20 text-primary animate-pulse' : 'bg-background/80'}`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        </div>
      </motion.div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showSearchResults && searchResults.length > 0 && (
          <motion.div
            className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="w-full max-w-sm bg-background/95 backdrop-blur-xl rounded-b-xl border-0 border-b border-x border-border/30 shadow-xl max-h-[420px] overflow-y-auto">
              {zoeInsight && (
                <div className="p-3 border-b border-border/30 flex items-center gap-2 text-sm text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span>{zoeInsight}</span>
                </div>
              )}
              {searchResults.slice(0, 10).map((result, i) => (
                <div
                  key={i}
                  className="p-3 hover:bg-primary/10 cursor-pointer border-b border-border/20 last:border-0"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{result.name}</span>
                        {result.discount && <span className="text-xs text-primary shrink-0">{result.discount}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">{result.category} • {result.type}</div>
                    </div>
                  </div>
                  {/* Location info */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {result.distance_km && (
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {result.distance_km.toFixed(1)} km
                      </span>
                    )}
                    {result.timing && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {result.timing}
                      </span>
                    )}
                    {result.store_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {result.store_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowSearchResults(false)}
                className="w-full p-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Map Detail View */}
      <LocationMapDetailView
        isOpen={showMapDetail}
        onClose={() => setShowMapDetail(false)}
        selectedResult={selectedResult}
        nearbyResults={searchResults}
        userLocation={userLocation}
      />
    </>
  );
};

export default SelfieCitySearchBar;
