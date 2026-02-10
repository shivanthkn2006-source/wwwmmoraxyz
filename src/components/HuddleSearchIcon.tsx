import React, { useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import StatusIconBadge from '@/components/StatusIconBadge';
import { getAvatarGlowClass } from '@/hooks/useEventGlow';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface SearchResult {
  type: 'user';
  id: string;
  display_name?: string;
  username?: string;
  profile_photo_url?: string;
  status?: string;
  event_date?: string;
  event_recurring?: boolean;
  city?: string;
}

interface HuddleSearchIconProps {
  onUserSelect?: (userId: string, city: string | null) => void;
}

const HuddleSearchIcon: React.FC<HuddleSearchIconProps> = ({ onUserSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

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
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Click outside and escape key handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setQuery('');
        setResults([]);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
        setQuery('');
        setResults([]);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isExpanded]);

  // Search functionality with debounce - USERS ONLY
  useEffect(() => {
    const searchContent = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        // Search users only (by display name or username)
        const { data: users } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, profile_photo_url, status, event_date, event_recurring, city')
          .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(10);

        const userResults: SearchResult[] = (users || []).map(u => ({
          type: 'user' as const,
          id: u.user_id,
          display_name: u.display_name,
          username: u.username,
          profile_photo_url: u.profile_photo_url,
          status: u.status,
          event_date: u.event_date,
          event_recurring: u.event_recurring,
          city: u.city,
        }));

        setResults(userResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchContent, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    if (!result.city) {
      toast.error('User has no public city set');
      return;
    }
    
    // Call the callback to pan to user's city on map
    if (onUserSelect) {
      onUserSelect(result.id, result.city);
    }
    
    setIsExpanded(false);
    setQuery('');
    setResults([]);
  };

  const handleIconClick = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setQuery('');
      setResults([]);
    }
  };

  const iconSize = isMobile ? 'w-12 h-12' : 'w-14 h-14';
  const searchBarWidth = 'w-64'; // Compact width matching Home search

  return (
    <div ref={searchRef} className="relative">
      <div className="flex items-center gap-2">
        {/* Search Icon Button */}
        <button
          onClick={handleIconClick}
          aria-label="Open Huddle search"
          aria-expanded={isExpanded}
          className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center"
          style={{
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          }}
        >
          <Users className="w-5 h-5 text-white" />
        </button>

        {/* Slide-out Search Bar - Compact */}
        {isExpanded && (
          <div 
            className={`${searchBarWidth} h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center px-4 animate-in slide-in-from-left duration-200`}
          >
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-white placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
          </div>
        )}
      </div>

      {/* Results Dropdown (appears below the search bar) */}
      {isExpanded && (results.length > 0 || loading) && (
        <div 
          className={`absolute top-16 left-0 ${searchBarWidth} max-h-[400px] bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}
          style={{
            marginBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0'
          }}
        >
          <div className="overflow-y-auto max-h-[400px] p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-white/60">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-white/60">No results</p>
              </div>
            ) : (
              <div role="listbox" className="space-y-1">
                {Array.isArray(results) && results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    role="option"
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className={`w-10 h-10 border-2 ${(() => {
                        const hasEvent = result.event_date ? 
                          (result.event_recurring ? 
                            new Date().getMonth() === new Date(result.event_date).getMonth() && 
                            new Date().getDate() === new Date(result.event_date).getDate() :
                            new Date().toISOString().split('T')[0] === result.event_date) 
                          : false;
                        return getAvatarGlowClass(hasEvent, result.status);
                      })()}`}>
                        <AvatarImage src={result.profile_photo_url} />
                        <AvatarFallback className="bg-white/10 text-white">
                          {result.display_name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {result.status && (
                        <StatusIconBadge 
                          status={result.status}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {result.display_name}
                      </p>
                      <p className="text-xs text-white/60 truncate">
                        @{result.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HuddleSearchIcon;
