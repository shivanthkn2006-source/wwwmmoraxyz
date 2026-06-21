// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY STANDALONE AGENT
// Pure Zoe Infinity intent detection and agent capabilities
// No external platform dependencies
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo, useCallback } from 'react';

export type AgentFeature = 'map' | 'timeline' | 'cab' | 'food' | 'text' | 'dhf' | 'quantum' | 'neural';

interface AgentIntent {
  feature: AgentFeature;
  confidence: number;
  keywords: string[];
  extractedLocation?: string;
  extractedQuery?: string;
}

// Extract location from user input
function extractLocation(input: string): string | undefined {
  // Clean the input
  let cleaned = input.trim();
  
  // Remove common prefixes (Zoe-specific wake words)
  cleaned = cleaned.replace(/^(hey\s+)?(zoe|infinity)\s*/i, '');
  cleaned = cleaned.replace(/^(show\s+me|find|locate|navigate\s+to|directions?\s+to|go\s+to|take\s+me\s+to|where\s+is|map\s+of)\s*/i, '');
  
  // Remove common suffixes
  cleaned = cleaned.replace(/\s+(on\s+map|location|please|map)$/i, '');
  cleaned = cleaned.replace(/\s+map$/i, '');
  
  const result = cleaned.trim();
  return result.length > 0 ? result : undefined;
}

export function useZoeInfinityAgent() {
  const detectIntent = useMemo(() => {
    return (input: string): AgentIntent => {
      const lower = input.toLowerCase();
      
      // DHF/Neural detection - Zoe Infinity specific
      if (/\b(dhf|digital\s+human|fingerprint|neural|brain|consciousness|mind|soul\s+codex)\b/.test(lower)) {
        return { feature: 'dhf', confidence: 0.95, keywords: ['dhf', 'neural'] };
      }
      
      // Quantum detection - Zoe Infinity specific
      if (/\b(quantum|entangle|superposition|multiverse|dimension|parallel)\b/.test(lower)) {
        return { feature: 'quantum', confidence: 0.92, keywords: ['quantum', 'dimensional'] };
      }
      
      // Neural/AI detection - Zoe Infinity specific
      if (/\b(analyze|pattern|predict|intelligence|ai|memory|learn|insight)\b/.test(lower)) {
        return { feature: 'neural', confidence: 0.88, keywords: ['neural', 'ai'] };
      }
      
      // Map/Location detection - expanded patterns
      if (/\b(map|where|location|find|navigate|directions?|go to|take me|show me|nearby|around|place|address|route|street|city|town)\b/.test(lower)) {
        const location = extractLocation(input);
        return { 
          feature: 'map', 
          confidence: 0.9, 
          keywords: ['map', 'location'],
          extractedLocation: location 
        };
      }
      
      // Timeline detection
      if (/\b(timeline|history|time|when|era|epoch|past|future|evolution)\b/.test(lower)) {
        return { feature: 'timeline', confidence: 0.9, keywords: ['timeline', 'history'] };
      }
      
      // Cab/Transport detection
      if (/\b(cab|taxi|uber|lyft|ride|transport|car|pick me up|drive|book a ride)\b/.test(lower)) {
        return { feature: 'cab', confidence: 0.9, keywords: ['cab', 'transport'] };
      }
      
      // Food detection
      if (/\b(food|eat|hungry|order|delivery|restaurant|meal|dinner|lunch|breakfast|pizza|burger|sushi)\b/.test(lower)) {
        return { feature: 'food', confidence: 0.9, keywords: ['food', 'delivery'] };
      }
      
      // Default to text response
      return { feature: 'text', confidence: 1.0, keywords: [] };
    };
  }, []);

  const getMoodFromResponse = useCallback((response: string): string => {
    const lower = response.toLowerCase();
    
    if (/warn|danger|alert|critical/.test(lower)) return 'warn';
    if (/curious|wonder|interest|question/.test(lower)) return 'curious';
    if (/excite|great|excellent|perfect/.test(lower)) return 'excited';
    if (/sorry|sad|unfortunate|regret/.test(lower)) return 'melancholic';
    if (/understand|feel|empathy|care/.test(lower)) return 'empathetic';
    if (/quantum|neural|dhf|consciousness/.test(lower)) return 'transcendent';
    if (/analyze|processing|computing/.test(lower)) return 'processing';
    
    return 'analytical';
  }, []);

  // Geocode a location string to coordinates using free Nominatim API
  const geocodeLocation = useCallback(async (location: string): Promise<{ lat: number; lng: number; name: string } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
        {
          headers: {
            'User-Agent': 'ZoeInfinity-App/1.0'
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name
        };
      }
      return null;
    } catch (err) {
      console.error('[ZoeInfinityAgent] Geocoding error:', err);
      return null;
    }
  }, []);

  // Zoe Infinity specific: Extract DHF-related queries
  const extractDHFQuery = useCallback((input: string): string | undefined => {
    let cleaned = input.trim();
    cleaned = cleaned.replace(/^(hey\s+)?(zoe|infinity)\s*/i, '');
    cleaned = cleaned.replace(/^(show|analyze|scan|check|get)\s+(?:my\s+)?/i, '');
    return cleaned.length > 0 ? cleaned : undefined;
  }, []);

  return {
    detectIntent,
    getMoodFromResponse,
    geocodeLocation,
    extractLocation,
    extractDHFQuery,
  };
}
