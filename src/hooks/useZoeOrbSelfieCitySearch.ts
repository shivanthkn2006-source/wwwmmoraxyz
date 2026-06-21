/**
 * useZoeOrbSelfieCitySearch
 * 
 * Hook for Zoe Orb to receive and display Selfie City search results
 * Integrates search functionality directly into Zoe's conversational UI
 */

import { useState, useEffect, useCallback } from 'react';

interface SelfieCitySearchResult {
  type: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  discount?: string;
  relevance_score: number;
  thumbnail?: string;
}

interface SelfieCitySearchEvent {
  query: string;
  results: SelfieCitySearchResult[];
  zoeInsight: string;
}

export const useZoeOrbSelfieCitySearch = () => {
  const [lastQuery, setLastQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SelfieCitySearchResult[]>([]);
  const [zoeInsight, setZoeInsight] = useState<string>('');
  const [hasNewResults, setHasNewResults] = useState(false);

  // Listen for Selfie City search events
  useEffect(() => {
    const handleSearchResults = (e: CustomEvent<SelfieCitySearchEvent>) => {
      const { query, results, zoeInsight } = e.detail;
      
      if (results && results.length > 0) {
        setLastQuery(query);
        setSearchResults(results);
        setZoeInsight(zoeInsight || '');
        setHasNewResults(true);
        
        console.log('[ZoeOrb] Received Selfie City search:', query, results.length, 'results');
      }
    };

    window.addEventListener('selfie-city-search-results', handleSearchResults as EventListener);
    return () => {
      window.removeEventListener('selfie-city-search-results', handleSearchResults as EventListener);
    };
  }, []);

  // Mark results as seen
  const markResultsSeen = useCallback(() => {
    setHasNewResults(false);
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setSearchResults([]);
    setZoeInsight('');
    setLastQuery('');
    setHasNewResults(false);
  }, []);

  // Format results as Zoe message content
  const getZoeSearchMessage = useCallback(() => {
    if (searchResults.length === 0) return null;

    const topResults = searchResults.slice(0, 5);
    let message = zoeInsight ? `${zoeInsight}\n\n` : '';
    message += `I found ${searchResults.length} results for "${lastQuery}":\n\n`;
    
    topResults.forEach((result, i) => {
      message += `${i + 1}. **${result.name}** - ${result.category}`;
      if (result.discount) message += ` (${result.discount})`;
      message += '\n';
    });

    if (searchResults.length > 5) {
      message += `\n...and ${searchResults.length - 5} more results.`;
    }

    return message;
  }, [searchResults, zoeInsight, lastQuery]);

  // Get results for display in Zoe Orb chat
  const getFormattedResults = useCallback(() => {
    return searchResults.slice(0, 10).map(result => ({
      name: result.name,
      category: result.category,
      type: result.type,
      discount: result.discount,
      description: result.description,
    }));
  }, [searchResults]);

  return {
    // State
    lastQuery,
    searchResults,
    zoeInsight,
    hasNewResults,
    
    // Formatted data
    getZoeSearchMessage,
    getFormattedResults,
    
    // Actions
    markResultsSeen,
    clearResults,
  };
};

export default useZoeOrbSelfieCitySearch;
