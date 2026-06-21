import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface SearchResult {
  type: 'brand' | 'product' | 'offer' | 'seller' | 'category';
  name: string;
  brand?: string;
  category: string;
  description?: string;
  price_range?: string;
  discount?: string;
  location?: string;
  location_lat?: number;
  location_lng?: number;
  distance_km?: number;
  timing?: string;
  store_name?: string;
  rating?: number;
  relevance_score: number;
  tags?: string[];
  thumbnail?: string;
}

interface SearchResponse {
  results: SearchResult[];
  suggestions: string[];
  categories_matched: string[];
  zoe_insight?: string;
}

// Global event for Zoe Orb integration
const dispatchSearchToZoe = (query: string, results: SearchResult[], zoeInsight: string) => {
  window.dispatchEvent(new CustomEvent('selfie-city-search-results', {
    detail: { query, results, zoeInsight }
  }));
};

// PHASE 2: Dispatch to Navigation Bus for Globe fly-to
export const dispatchToNavigationBus = (result: SearchResult) => {
  if (!result.location_lat || !result.location_lng) {
    console.log('[Search] No coordinates for result, skipping Navigation Bus dispatch');
    return;
  }
  
  const target = {
    lat: result.location_lat,
    lng: result.location_lng,
    zoom: 4,
    productId: result.name,
    type: result.type,
    name: result.name,
    metadata: {
      brand: result.brand,
      category: result.category,
      discount: result.discount,
      storeName: result.store_name,
      description: result.description,
      price_range: result.price_range,
      rating: result.rating,
      imageUrl: result.thumbnail,
    },
  };
  
  console.log('[Search → NavigationBus] Dispatching fly-to target:', target);
  
  // Dispatch to Navigation Bus
  window.dispatchEvent(new CustomEvent('navigation-bus-start-flight', {
    detail: target
  }));
  
  // Also dispatch direct globe fly-to for immediate camera animation
  window.dispatchEvent(new CustomEvent('selfie-city-globe-fly-to', {
    detail: {
      lat: result.location_lat,
      lng: result.location_lng,
      name: result.name,
      zoom: 4,
      duration: 2000,
    }
  }));
};

export const useSelfieCitySearch = () => {
  const { user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [zoeInsight, setZoeInsight] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef<string>('');

  // Quick search for autocomplete (local brands only)
  const quickSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('selfie-city-search', {
        body: { query, mode: 'quick' },
      });

      if (error) throw error;
      
      setResults(data?.results || []);
      setSuggestions(data?.suggestions || []);
    } catch (err) {
      console.error('[useSelfieCitySearch] Quick search error:', err);
    }
  }, []);

  // Debounced quick search
  const debouncedQuickSearch = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      quickSearch(query);
    }, 200);
  }, [quickSearch]);

  // Full AI search
  const search = useCallback(async (
    query: string,
    location?: { lat: number; lng: number }
  ): Promise<SearchResponse | null> => {
    if (!query || query.trim().length === 0) {
      return null;
    }

    setIsSearching(true);
    setError(null);
    lastQueryRef.current = query;

    try {
      // Get user preferences for personalization
      let preferences: string[] = [];
      if (user?.id) {
        const { data: prefs } = await supabase
          .from('user_brand_preferences')
          .select('brand_name')
          .eq('user_id', user.id)
          .order('affinity_score', { ascending: false })
          .limit(10);
        
        preferences = (prefs || []).map(p => p.brand_name);
      }

      const { data, error: searchError } = await supabase.functions.invoke('selfie-city-search', {
        body: { query, location, preferences, mode: 'full' },
      });

      if (searchError) throw searchError;

      setResults(data?.results || []);
      setSuggestions(data?.suggestions || []);
      setZoeInsight(data?.zoe_insight || '');

      // Dispatch to Zoe Orb for integration
      dispatchSearchToZoe(query, data?.results || [], data?.zoe_insight || '');

      // Log search event for DHF
      if (user?.id) {
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'selfie_city_search',
          event_category: 'ar_commerce',
          context_snippet: query.slice(0, 100),
          metadata: {
            query,
            results_count: data?.results?.length || 0,
            categories: data?.categories_matched || [],
          },
          dhf_logged: true,
        });
      }

      return data as SearchResponse;
    } catch (err) {
      console.error('[useSelfieCitySearch] Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [user?.id]);

  // Voice search processing
  const processVoiceSearch = useCallback(async (
    transcript: string,
    location?: { lat: number; lng: number }
  ): Promise<SearchResponse | null> => {
    console.log('[useSelfieCitySearch] Voice search:', transcript);
    
    // Clean up voice transcript
    const cleanQuery = transcript
      .replace(/^(hey zoe|zoe|search for|find|show me|look for|i want|i need)/i, '')
      .trim();
    
    if (!cleanQuery) {
      return null;
    }

    return search(cleanQuery, location);
  }, [search]);

  // Clear search
  const clearSearch = useCallback(() => {
    setResults([]);
    setSuggestions([]);
    setZoeInsight('');
    setError(null);
    lastQueryRef.current = '';
  }, []);

  // Get trending searches (could be from DB later)
  const getTrendingSearches = useCallback((): string[] => {
    return [
      'Lakme lipstick',
      'Boat earbuds',
      'Fabindia kurta',
      'Haldiram sweets',
      'Patanjali products',
      'Raymond suit',
      'Urban Company services',
      'Chaayos near me',
    ];
  }, []);

  return {
    // State
    isSearching,
    results,
    suggestions,
    zoeInsight,
    error,
    
    // Actions
    search,
    quickSearch: debouncedQuickSearch,
    processVoiceSearch,
    clearSearch,
    getTrendingSearches,
    
    // Last query for reference
    lastQuery: lastQueryRef.current,
  };
};
