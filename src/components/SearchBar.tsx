import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, Bot, Calendar, Camera, MapPin, MessageSquare, Plus, Settings, User, Eye, Zap, Library, Clock, MessageCircle, UserPlus, Bookmark, Share, Bell, Heart, History, Filter, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Mic, MicOff, Check, Book, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import StatusIconBadge from '@/components/StatusIconBadge';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';
import { searchFeatures, getFeatureRecommendations } from '@/data/appFeatures';
import { searchSettings } from '@/data/settingsRegistry';
import { searchDictionary, searchLocations } from '@/data/searchableData';
import { Badge } from '@/components/ui/badge';
import PostModal from '@/components/PostModal';
import { useFeatureAnalytics } from '@/hooks/useFeatureAnalytics';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SavedSearchesManager } from '@/components/SavedSearchesManager';
import { TrendingSearchesDashboard } from '@/components/TrendingSearchesDashboard';
import { SearchAnalyticsDashboard } from '@/components/SearchAnalyticsDashboard';
import { useZoeAgent } from '@/hooks/useZoeAgent';
import { useToast } from '@/hooks/use-toast';
import { useFriendRequests } from '@/hooks/useFriendRequests';

interface SearchHistoryItem {
  id: string;
  search_query: string;
  result_type: string | null;
  result_id: string | null;
  created_at: string;
}

interface SearchFilters {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  location: string;
  postType: 'all' | 'text' | 'image' | 'video';
}

interface SearchResult {
  type: 'user' | 'post' | 'feature' | 'setting' | 'dictionary' | 'location';
  id: string;
  display_name?: string;
  username?: string;
  profile_photo_url?: string;
  content?: string;
  media_url?: string;
  user_id?: string;
  status?: string;
  event_date?: string;
  event_recurring?: boolean;
  // Feature-specific fields
  feature_name?: string;
  feature_description?: string;
  feature_location?: string;
  feature_icon?: string;
  feature_category?: string;
  // Settings-specific fields
  setting_name?: string;
  setting_description?: string;
  setting_category?: string;
  setting_action?: string;
  // Dictionary-specific fields
  word?: string;
  definition?: string;
  partOfSpeech?: string;
  // Location-specific fields
  location_name?: string;
  location_type?: string;
  location_country?: string;
  location_region?: string;
  // Ranking fields
  relevanceScore?: number;
  engagementScore?: number;
  recencyScore?: number;
  totalScore?: number;
  created_at?: string;
  likes_count?: number;
  comments_count?: number;
}

// Icon mapping for features
const getFeatureIcon = (iconName: string) => {
  const icons: { [key: string]: any } = {
    Bot, Calendar, Camera, MapPin, MessageSquare, Plus, Settings, User, Eye, 
    Zap, Library, Clock, MessageCircle, UserPlus, Bookmark, Share, Bell, Heart, Search
  };
  const Icon = icons[iconName] || Search;
  return Icon;
};

// Separate component for each result item to properly use hooks
const SearchResultItem = ({ result, onClick }: { result: SearchResult; onClick: () => void }) => {
  const { user } = useAuth();
  const { sendFriendRequest, sentRequests } = useFriendRequests();
  const [friendships, setFriendships] = useState<Set<string>>(new Set());
  const hasEvent = useEventGlow(result.event_date, result.event_recurring);
  const glowClass = getAvatarGlowClass(hasEvent, result.status);

  // Load friendships for this user
  useEffect(() => {
    const loadFriendships = async () => {
      if (!user || result.type !== 'user') return;
      
      const { data } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      const friendIds = new Set(
        data?.map(f => f.user1_id === user.id ? f.user2_id : f.user1_id) || []
      );
      setFriendships(friendIds);
    };
    
    loadFriendships();
  }, [user, result.type]);

  const isFriend = result.type === 'user' && friendships.has(result.id);
  const hasSentRequest = result.type === 'user' && sentRequests.some(req => req.receiver_id === result.id);

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (result.type === 'user') {
      await sendFriendRequest(result.id);
    }
  };

  return (
    <div
      onClick={onClick}
      className="w-full p-3 hover:bg-white/10 transition-colors flex items-center gap-3 text-left cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {result.type === 'user' ? (
        <>
          <div className="relative">
            <Avatar className={`w-10 h-10 ${glowClass}`}>
              <AvatarImage src={result.profile_photo_url} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {result.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <StatusIconBadge status={result.status} size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{result.display_name}</p>
            <p className="text-xs text-white/70 truncate">@{result.username}</p>
          </div>
          {!isFriend && !hasSentRequest && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddFriend}
              className="shrink-0 border-white/20 hover:bg-white/10"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          )}
          {hasSentRequest && (
            <span className="text-xs text-white/50">Sent</span>
          )}
          {isFriend && (
            <Check className="w-4 h-4 text-green-500" />
          )}
        </>
      ) : result.type === 'feature' ? (
        <>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            {(() => {
              const Icon = getFeatureIcon(result.feature_icon || 'Search');
              return <Icon className="w-5 h-5 text-primary" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white truncate">{result.feature_name}</p>
              <Badge variant="secondary" className="text-xs shrink-0">
                {result.feature_category}
              </Badge>
            </div>
            <p className="text-xs text-white/70 line-clamp-1">{result.feature_description}</p>
          </div>
        </>
      ) : result.type === 'setting' ? (
        <>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white truncate">{result.setting_name}</p>
              <Badge variant="outline" className="text-xs shrink-0 border-blue-400/30 text-blue-400">
                {result.setting_category}
              </Badge>
            </div>
            <p className="text-xs text-white/70 line-clamp-1">{result.setting_description}</p>
          </div>
        </>
      ) : result.type === 'dictionary' ? (
        <>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center">
            <Book className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white truncate">{result.word}</p>
              <Badge variant="outline" className="text-xs shrink-0 border-green-400/30 text-green-400">
                {result.partOfSpeech}
              </Badge>
            </div>
            <p className="text-xs text-white/70 line-clamp-1">{result.definition}</p>
          </div>
        </>
      ) : result.type === 'location' ? (
        <>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white truncate">{result.location_name}</p>
              <Badge variant="outline" className="text-xs shrink-0 border-orange-400/30 text-orange-400">
                {result.location_type}
              </Badge>
            </div>
            <p className="text-xs text-white/70 line-clamp-1">
              {result.location_country && result.location_region 
                ? `${result.location_region}, ${result.location_country}`
                : result.location_country || 'Location'}
            </p>
          </div>
        </>
      ) : (
        <>
          {result.media_url ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
              <img 
                src={result.media_url} 
                alt="Post preview" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 text-accent" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white line-clamp-2 mb-1">{result.content || 'Post'}</p>
            <p className="text-xs text-white/50">Tap to view full post</p>
          </div>
        </>
      )}
    </div>
  );
};

export const SearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'users' | 'features'>('all');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [recommendations, setRecommendations] = useState<SearchResult[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: 'all',
    location: '',
    postType: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'popularity'>('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const resultsPerPage = 10;
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { trackFeatureAccess } = useFeatureAnalytics();
  const { executeCommand } = useZoeAgent();
  const { toast } = useToast();

  // Listen for open-search event from bottom navigation
  useEffect(() => {
    const handleOpenSearch = () => {
      setIsOpen(true);
      setSearchActive(true);
    };

    window.addEventListener('open-search', handleOpenSearch);
    return () => window.removeEventListener('open-search', handleOpenSearch);
  }, []);

  // Dispatch event to hide/show bottom navigation
  const setSearchActive = (active: boolean) => {
    window.dispatchEvent(new CustomEvent('search-active', { detail: { active } }));
  };

  // Keyboard detection using visualViewport
  useEffect(() => {
    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      
      const newKeyboardHeight = Math.max(0, window.innerHeight - vv.height);
      if (newKeyboardHeight > 120) {
        setKeyboardHeight(newKeyboardHeight);
      } else {
        setKeyboardHeight(0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, []);

  // Auto-focus input when expanded
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);


  // Listen for Zoe voice search responses
  useEffect(() => {
    const handleZoeResponse = (event: CustomEvent) => {
      const response = event.detail?.response;
      if (response && isListening) {
        const searchMatch = response.match(/(?:search|find|look for).*?["'](.+?)["']/i) || 
                           response.match(/(?:search|find|look for)\s+(.+?)(?:\.|$)/i);
        if (searchMatch) {
          const searchQuery = searchMatch[1].trim();
          setIsOpen(true);
          setQuery(searchQuery);
          setIsListening(false);
          toast({
            title: "Voice Search",
            description: `Searching for: ${searchQuery}`,
          });
        }
      }
    };

    window.addEventListener('zoe-response', handleZoeResponse as EventListener);
    return () => window.removeEventListener('zoe-response', handleZoeResponse as EventListener);
  }, [isListening, toast]);

  // Load recommendations, search history, and locations on mount
  useEffect(() => {
    const featureRecs = getFeatureRecommendations().map(f => ({
      type: 'feature' as const,
      id: f.id,
      feature_name: f.name,
      feature_description: f.description,
      feature_location: f.location,
      feature_icon: f.icon,
      feature_category: f.category
    }));
    setRecommendations(featureRecs);
    loadSearchHistory();
    loadAvailableLocations();
  }, []);

  // Load available user locations for filter
  const loadAvailableLocations = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('city')
      .not('city', 'is', null);
    
    if (data) {
      const uniqueCities = [...new Set(data.map(p => p.city).filter(Boolean))] as string[];
      setAvailableLocations(uniqueCities.sort());
    }
  };

  // Load search history from database
  const loadSearchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setSearchHistory(data);
    }
  };

  // Save search to history
  const saveSearchHistory = async (searchQuery: string, resultType?: string, resultId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !searchQuery.trim()) return;

    await supabase.from('search_history').insert({
      user_id: user.id,
      search_query: searchQuery,
      result_type: resultType || null,
      result_id: resultId || null,
    });

    loadSearchHistory();
  };

  // Clear all search history
  const clearSearchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('search_history')
      .delete()
      .eq('user_id', user.id);

    setSearchHistory([]);
  };

  // Handle voice search using Zoe AI
  const handleVoiceSearch = async () => {
    if (isListening) {
      setIsListening(false);
      toast({
        title: "Voice Search",
        description: "Cancelled voice search",
      });
      return;
    }

    setIsOpen(true);
    setSearchActive(true);
    setIsListening(true);
    toast({
      title: "Listening...",
      description: "Say something like 'search for users in Mumbai'",
    });

    try {
      await executeCommand("listen for a search query and tell me what to search for");
    } catch (error) {
      console.error('Voice search error:', error);
      setIsListening(false);
      toast({
        title: "Error",
        description: "Failed to start voice search",
        variant: "destructive",
      });
    }
  };

  // Generate search suggestions based on partial query
  useEffect(() => {
    if (query.length > 0 && query.length < 3) {
      const popularSearches = searchHistory.slice(0, 5).map(h => h.search_query);
      const featureNames = searchFeatures(query).slice(0, 3).map(f => f.name);
      setSuggestions([...new Set([...popularSearches, ...featureNames])]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [query, searchHistory]);

  // Get date filter timestamp
  const getDateFilterTimestamp = () => {
    const now = new Date();
    switch (filters.dateRange) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default:
        return null;
    }
  };

  // Ranking algorithm - calculates relevance, engagement, and recency scores
  const calculateRankingScore = (result: SearchResult, searchQuery: string): SearchResult => {
    let relevanceScore = 0;
    let engagementScore = 0;
    let recencyScore = 0;

    // Relevance score based on text match quality
    const lowerQuery = searchQuery.toLowerCase();
    if (result.type === 'user') {
      const nameMatch = result.display_name?.toLowerCase().includes(lowerQuery);
      const usernameMatch = result.username?.toLowerCase().includes(lowerQuery);
      relevanceScore = (nameMatch ? 50 : 0) + (usernameMatch ? 30 : 0);
    } else if (result.type === 'post') {
      const contentMatch = result.content?.toLowerCase().includes(lowerQuery);
      relevanceScore = contentMatch ? 40 : 0;
      // Boost for exact matches
      if (result.content?.toLowerCase() === lowerQuery) relevanceScore += 30;
    } else if (result.type === 'feature') {
      const nameMatch = result.feature_name?.toLowerCase().includes(lowerQuery);
      const descMatch = result.feature_description?.toLowerCase().includes(lowerQuery);
      relevanceScore = (nameMatch ? 60 : 0) + (descMatch ? 20 : 0);
    } else if (result.type === 'setting') {
      const nameMatch = result.setting_name?.toLowerCase().includes(lowerQuery);
      const descMatch = result.setting_description?.toLowerCase().includes(lowerQuery);
      relevanceScore = (nameMatch ? 65 : 0) + (descMatch ? 25 : 0);
      // Boost settings for exact keyword matches
      if (result.setting_name?.toLowerCase() === lowerQuery) relevanceScore += 40;
    } else if (result.type === 'dictionary') {
      const wordMatch = result.word?.toLowerCase().includes(lowerQuery);
      const defMatch = result.definition?.toLowerCase().includes(lowerQuery);
      relevanceScore = (wordMatch ? 70 : 0) + (defMatch ? 15 : 0);
      // Boost for exact word matches
      if (result.word?.toLowerCase() === lowerQuery) relevanceScore += 50;
    } else if (result.type === 'location') {
      const nameMatch = result.location_name?.toLowerCase().includes(lowerQuery);
      const countryMatch = result.location_country?.toLowerCase().includes(lowerQuery);
      const regionMatch = result.location_region?.toLowerCase().includes(lowerQuery);
      relevanceScore = (nameMatch ? 60 : 0) + (countryMatch ? 20 : 0) + (regionMatch ? 15 : 0);
      // Boost for exact location matches
      if (result.location_name?.toLowerCase() === lowerQuery) relevanceScore += 45;
    }

    // Engagement score (for posts)
    if (result.type === 'post' && (result.likes_count || result.comments_count)) {
      const likes = result.likes_count || 0;
      const comments = result.comments_count || 0;
      engagementScore = Math.min(100, (likes * 2) + (comments * 5));
    }

    // Recency score
    if (result.created_at) {
      const createdDate = new Date(result.created_at);
      const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 1) recencyScore = 100;
      else if (daysDiff < 7) recencyScore = 80;
      else if (daysDiff < 30) recencyScore = 50;
      else recencyScore = 20;
    } else {
      // For items without dates (settings, dictionary, locations), use moderate recency
      recencyScore = 60;
    }

    // Calculate total score (weighted average)
    const totalScore = (relevanceScore * 0.5) + (engagementScore * 0.3) + (recencyScore * 0.2);

    return {
      ...result,
      relevanceScore,
      engagementScore,
      recencyScore,
      totalScore
    };
  };

  // Sort results based on selected criteria
  const sortResults = (resultsToSort: SearchResult[]) => {
    return [...resultsToSort].sort((a, b) => {
      if (sortBy === 'relevance') {
        return (b.totalScore || 0) - (a.totalScore || 0);
      } else if (sortBy === 'date') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === 'popularity') {
        const scoreA = (a.likes_count || 0) + (a.comments_count || 0);
        const scoreB = (b.likes_count || 0) + (b.comments_count || 0);
        return scoreB - scoreA;
      }
      return 0;
    });
  };

  // Search function with filters
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setAllResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchQuery = query.toLowerCase();
        const searchResults: SearchResult[] = [];
        const dateFilter = getDateFilterTimestamp();

        // Search users with location filter
        const userQueryBuilder = supabase
          .from('public_profiles')
          .select('*')
          .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .limit(5);
        
        const { data: users } = filters.location 
          ? await userQueryBuilder
          : await userQueryBuilder;

        if (users) {
          users.forEach(user => {
            // Apply location filter client-side if needed
            if (filters.location && user.bio !== filters.location) {
              return;
            }
            
            searchResults.push({
              type: 'user',
              id: user.user_id,
              display_name: user.display_name,
              username: user.username,
              profile_photo_url: user.profile_photo_url || undefined,
            });
          });
        }

        // Search posts with filters
        let postQuery = supabase
          .from('posts')
          .select(`
            *,
            profile:profiles!posts_user_id_fkey(display_name, username, profile_photo_url, city)
          `)
          .eq('visibility', 'global')
          .ilike('content', `%${searchQuery}%`);
        
        // Apply date filter
        if (dateFilter) {
          postQuery = postQuery.gte('created_at', dateFilter);
        }
        
        // Apply post type filter
        if (filters.postType !== 'all') {
          if (filters.postType === 'text') {
            postQuery = postQuery.is('media_url', null);
          } else {
            postQuery = postQuery.not('media_url', 'is', null);
            if (filters.postType === 'image') {
              postQuery = postQuery.ilike('media_type', 'image%');
            } else if (filters.postType === 'video') {
              postQuery = postQuery.ilike('media_type', 'video%');
            }
          }
        }
        
        const { data: posts } = await postQuery
          .order('created_at', { ascending: false })
          .limit(5);

        if (posts) {
          posts.forEach(post => {
            // Apply location filter to post author
            if (filters.location && post.profile?.city !== filters.location) {
              return;
            }
            
            searchResults.push({
              type: 'post',
              id: post.id,
              content: post.content || undefined,
              media_url: post.media_url || undefined,
              user_id: post.user_id,
              created_at: post.created_at,
              likes_count: post.likes_count,
              comments_count: post.comments_count,
            });
          });
        }

        // Search features
        const features = searchFeatures(searchQuery);
        features.forEach(feature => {
          searchResults.push({
            type: 'feature',
            id: feature.id,
            feature_name: feature.name,
            feature_description: feature.description,
            feature_location: feature.location,
            feature_icon: feature.icon,
            feature_category: feature.category
          });
        });

        // Search settings
        const settings = searchSettings(searchQuery);
        settings.forEach(setting => {
          searchResults.push({
            type: 'setting',
            id: setting.id,
            setting_name: setting.name,
            setting_description: setting.description,
            setting_category: setting.category,
            setting_action: setting.action,
            feature_location: setting.location
          });
        });

        // Search dictionary
        const dictionaryEntries = searchDictionary(searchQuery);
        dictionaryEntries.forEach(entry => {
          searchResults.push({
            type: 'dictionary',
            id: entry.word,
            word: entry.word,
            definition: entry.definition,
            partOfSpeech: entry.partOfSpeech
          });
        });

        // Search locations
        const locations = searchLocations(searchQuery);
        locations.forEach(location => {
          searchResults.push({
            type: 'location',
            id: location.name,
            location_name: location.name,
            location_type: location.type,
            location_country: location.country,
            location_region: location.region
          });
        });

        // Calculate ranking scores for all results
        const rankedResults = searchResults.map(result => 
          calculateRankingScore(result, searchQuery)
        );

        // Sort results
        const sortedResults = sortResults(rankedResults);
        
        setAllResults(sortedResults);
        
        // Apply filter and pagination
        let filteredResults = sortedResults;
        if (filterType !== 'all') {
          filteredResults = sortedResults.filter(r => {
            if (filterType === 'users') return r.type === 'user';
            if (filterType === 'posts') return r.type === 'post';
            if (filterType === 'features') return r.type === 'feature' || r.type === 'setting' || r.type === 'dictionary' || r.type === 'location';
            return true;
          });
        }
        
        // Calculate pagination
        const totalResults = filteredResults.length;
        setTotalPages(Math.ceil(totalResults / resultsPerPage));
        
        // Get current page results
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        setResults(filteredResults.slice(startIndex, endIndex));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [query, filterType, filters, sortBy, currentPage]);

  // Apply filter and re-sort when sortBy changes
  useEffect(() => {
    if (allResults.length > 0) {
      const sortedResults = sortResults(allResults);
      let filteredResults = sortedResults;
      
      if (filterType !== 'all') {
        filteredResults = sortedResults.filter(r => {
          if (filterType === 'users') return r.type === 'user';
          if (filterType === 'posts') return r.type === 'post';
          if (filterType === 'features') return r.type === 'feature';
          return true;
        });
      }
      
      const totalResults = filteredResults.length;
      setTotalPages(Math.ceil(totalResults / resultsPerPage));
      
      const startIndex = (currentPage - 1) * resultsPerPage;
      const endIndex = startIndex + resultsPerPage;
      setResults(filteredResults.slice(startIndex, endIndex));
    }
  }, [sortBy, filterType, allResults, currentPage]);

  const fetchPostData = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: post } = await supabase
      .from('posts')
      .select(`
        *,
        profile:profiles!posts_user_id_fkey(display_name, username, profile_photo_url, status, event_date, event_recurring)
      `)
      .eq('id', postId)
      .single();
    
    if (!post) return null;

    // Check if user liked the post
    if (user) {
      const { data: likeData } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      return {
        ...post,
        user_liked: !!likeData
      };
    }
    
    return {
      ...post,
      user_liked: false
    };
  };

  const handleResultClick = async (result: SearchResult) => {
    // Save to history
    await saveSearchHistory(query, result.type, result.id);

    if (result.type === 'user') {
      navigate(`/profile/${result.id}`);
      setIsOpen(false);
      setQuery('');
      setResults([]);
      setSearchActive(false);
    } else if (result.type === 'feature') {
      // Track feature access via search
      await trackFeatureAccess(
        result.id,
        result.feature_name || '',
        'search',
        result.feature_location
      );
      
      // Navigate to feature location
      navigate(result.feature_location || '/');
      setIsOpen(false);
      setQuery('');
      setResults([]);
      setSearchActive(false);
      
      // Dispatch Zoe command to explain feature
      window.dispatchEvent(new CustomEvent('zoe-command', { 
        detail: { command: `tell me about ${result.feature_name}` } 
      }));
    } else if (result.type === 'setting') {
      // Handle setting navigation
      if (result.setting_action === 'open-profile-edit') {
        navigate('/profile');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-profile-edit'));
        }, 300);
      } else if (result.setting_action === 'open-voice-settings') {
        navigate('/profile');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-voice-settings'));
        }, 300);
      } else if (result.setting_action === 'navigate-voice-commands') {
        navigate('/voice-commands');
      } else if (result.setting_action === 'navigate-notification-preferences') {
        navigate('/notification-preferences');
      } else if (result.setting_action === 'logout') {
        // Trigger logout confirmation
        window.dispatchEvent(new CustomEvent('request-logout'));
      } else if (result.feature_location) {
        navigate(result.feature_location);
      }
      setIsOpen(false);
      setQuery('');
      setResults([]);
      setSearchActive(false);
      toast({
        title: "Opening Setting",
        description: result.setting_name,
      });
    } else if (result.type === 'dictionary') {
      // Show dictionary definition
      toast({
        title: result.word,
        description: `${result.partOfSpeech}: ${result.definition}`,
        duration: 5000,
      });
    } else if (result.type === 'location') {
      // Show location information
      const locationInfo = result.location_country && result.location_region
        ? `${result.location_name} - ${result.location_region}, ${result.location_country}`
        : result.location_country
        ? `${result.location_name} - ${result.location_country}`
        : result.location_name;
      
      toast({
        title: `${result.location_type?.charAt(0).toUpperCase()}${result.location_type?.slice(1)}`,
        description: locationInfo,
        duration: 4000,
      });
    } else if (result.type === 'post') {
      const postData = await fetchPostData(result.id);
      if (postData) {
        setSelectedPost(postData);
        setIsPostModalOpen(true);
      }
    }
  };

  // Handle clicking on a search history item
  const handleHistoryClick = (historyItem: SearchHistoryItem) => {
    setQuery(historyItem.search_query);
  };

  // Handle clicking on a suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      dateRange: 'all',
      location: '',
      postType: 'all'
    });
  };

  // Check if any filters are active
  const hasActiveFilters = filters.dateRange !== 'all' || filters.location !== '' || filters.postType !== 'all';

  // Handle saved search selection
  const handleSavedSearchSelect = (searchQuery: string, searchFilters: any) => {
    setQuery(searchQuery);
    setFilters(searchFilters);
    setCurrentPage(1);
  };

  // Handle trending search selection
  const handleTrendingSearchSelect = (searchQuery: string) => {
    setQuery(searchQuery);
    setCurrentPage(1);
  };

  return (
    <>
      {isOpen && (
        <div 
          ref={searchRef}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg"
          style={{ 
            bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0'
          }}
        >
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Search</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false);
                setQuery('');
                setResults([]);
                setSearchActive(false);
              }}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-white/50" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search users, posts, or features..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-white/50"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVoiceSearch}
                  className={`h-6 w-6 ${isListening ? 'text-red-400 animate-pulse' : ''}`}
                  title="Voice Search by Lisa"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                    }}
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Action buttons - Analytics, Saved, Trending */}
              <SearchAnalyticsDashboard />
              
              <SavedSearchesManager
                onSelectSearch={handleSavedSearchSelect}
                currentQuery={query}
                currentFilters={filters}
              />
              
              <TrendingSearchesDashboard
                onSelectSearch={handleTrendingSearchSelect}
              />

              {/* Advanced Filters */}
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`relative ${hasActiveFilters ? 'text-primary' : 'text-white'} hover:bg-white/10`}
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    {hasActiveFilters && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-background/95 backdrop-blur-lg border-white/10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Filters</h3>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetFilters}
                          className="text-xs text-white/70 hover:text-white h-7"
                        >
                          Reset
                        </Button>
                      )}
                    </div>

                    {/* Date Range Filter */}
                    <div>
                      <label className="text-sm text-white/70 mb-2 block">Date Range</label>
                      <Select value={filters.dateRange} onValueChange={(value: any) => setFilters({...filters, dateRange: value})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-white/20 z-50">
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">Past Week</SelectItem>
                          <SelectItem value="month">Past Month</SelectItem>
                          <SelectItem value="year">Past Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location Filter */}
                    <div>
                      <label className="text-sm text-white/70 mb-2 block">Location</label>
                      <Select value={filters.location || "all_locations"} onValueChange={(value) => setFilters({...filters, location: value === "all_locations" ? "" : value})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-white/20 z-50">
                          <SelectItem value="all_locations">All Locations</SelectItem>
                          {availableLocations.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Post Type Filter */}
                    <div>
                      <label className="text-sm text-white/70 mb-2 block">Post Type</label>
                      <Select value={filters.postType} onValueChange={(value: any) => setFilters({...filters, postType: value})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-white/20 z-50">
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="text">Text Only</SelectItem>
                          <SelectItem value="image">Images</SelectItem>
                          <SelectItem value="video">Videos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-2 bg-white/5 rounded-lg divide-y divide-white/10">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <Search className="w-3 h-3 text-white/50" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter buttons and sorting */}
          <div className="flex items-center justify-between gap-2 px-4 pb-2 border-b border-white/10">
            <div className="flex gap-2 overflow-x-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterType('all')}
                className={`text-xs shrink-0 ${filterType === 'all' ? 'bg-white/20' : ''}`}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterType('features')}
                className={`text-xs shrink-0 ${filterType === 'features' ? 'bg-white/20' : ''}`}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Features
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterType('users')}
                className={`text-xs shrink-0 ${filterType === 'users' ? 'bg-white/20' : ''}`}
              >
                Users
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterType('posts')}
                className={`text-xs shrink-0 ${filterType === 'posts' ? 'bg-white/20' : ''}`}
              >
                Posts
              </Button>
            </div>

            {/* Sort dropdown */}
            {query && results.length > 0 && (
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32 h-8 bg-white/10 border-white/20 text-white text-xs">
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-white/20 z-50">
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-white/70">
                <Search className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                <p className="text-sm">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-white/10">
                {results.map((result) => (
                  <SearchResultItem
                    key={`${result.type}-${result.id}`}
                    result={result}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </div>
            ) : query.trim() ? (
              <div className="p-8 text-center text-white/70">
                <Search className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No results found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              <>
                {/* Recent Searches */}
                {searchHistory.length > 0 && (
                  <div className="mb-4">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-white/70" />
                        <p className="text-sm font-semibold text-white">Recent Searches</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearchHistory}
                        className="text-xs text-white/50 hover:text-white hover:bg-white/10 h-7 px-2"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="divide-y divide-white/10">
                      {searchHistory.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleHistoryClick(item)}
                          className="w-full p-3 hover:bg-white/10 transition-colors flex items-center gap-3 text-left"
                        >
                          <Clock className="w-4 h-4 text-white/50 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{item.search_query}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div>
                    <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold text-white">Lisa recommends trying:</p>
                    </div>
                    <div className="divide-y divide-white/10">
                      {recommendations.map((result) => (
                        <SearchResultItem
                          key={`${result.type}-${result.id}`}
                          result={result}
                          onClick={() => handleResultClick(result)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pagination Controls */}
          {query && results.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-white hover:bg-white/10 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <div className="text-sm text-white/70">
                Page {currentPage} of {totalPages}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-white hover:bg-white/10 disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Post Modal */}
      <PostModal
        post={selectedPost}
        isOpen={isPostModalOpen}
        onClose={() => {
          setIsPostModalOpen(false);
          setSelectedPost(null);
        }}
        onUpdate={() => {
          // Refresh post data if needed
        }}
      />
    </>
  );
};

export default SearchBar;
