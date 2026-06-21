import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import StatusIconBadge from '@/components/StatusIconBadge';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';

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

interface HuddleSearchBarProps {
  onUserSelect?: (userId: string) => void;
}

const HuddleSearchBar = ({ onUserSelect }: HuddleSearchBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  // Auto-focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Click outside and escape key handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
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
        iconRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExpanded]);

  // Search functionality
  useEffect(() => {
    const searchUsers = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const { data: users } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, profile_photo_url, status, event_date, event_recurring, city')
          .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(8);

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

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    if (onUserSelect) {
      onUserSelect(result.id);
    } else {
      navigate(`/profile/${result.id}`);
    }
    setIsExpanded(false);
    setQuery('');
    setResults([]);
  };

  const handleIconClick = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <>
      {/* Search Container */}
      <div 
        ref={wrapperRef}
        className="flex items-center gap-2"
      >
        {/* Search Input - slides right from icon */}
        <div 
          className={`transition-all duration-220 ease-out ${
            isExpanded 
              ? 'w-[min(520px,80vw)] opacity-100 translate-x-0' 
              : 'w-0 opacity-0 -translate-x-2 pointer-events-none'
          }`}
          style={{
            transformOrigin: 'left center'
          }}
        >
          <div className="bg-foreground/10 backdrop-blur-xl rounded-full border border-foreground/20 shadow-lg p-1 pr-3">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none text-foreground placeholder:text-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label="Search users"
            />
          </div>
        </div>

        {/* Search Icon Button - matches other nav buttons */}
        <Button
          ref={iconRef}
          onClick={handleIconClick}
          size="icon"
          className="w-12 h-12 rounded-full bg-foreground/10 backdrop-blur-xl border border-foreground/20 hover:bg-foreground/20 transition-all"
          style={{
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          }}
          aria-label="Open search"
          aria-expanded={isExpanded}
        >
          <Search className="w-5 h-5 text-foreground" />
        </Button>
      </div>

      {/* Results Dropdown - DROP UP */}
      {isExpanded && results.length > 0 && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-[1001] bg-background/95 backdrop-blur-xl rounded-2xl border border-border/30 shadow-2xl overflow-hidden max-h-96 overflow-y-auto"
          style={{
            bottom: '80px', // Position above the search button
            width: 'min(520px, 90vw)',
          }}
        >
          {results.map((result) => {
            const hasEvent = useEventGlow(result.event_date, result.event_recurring);
            const glowClass = getAvatarGlowClass(hasEvent, result.status);
            
            return (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full p-3 hover:bg-accent/50 transition-colors flex items-center gap-3 text-left"
              >
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
                  <p className="font-semibold text-foreground truncate">{result.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{result.username}
                    {result.city && ` • ${result.city}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading indicator - DROP UP */}
      {isExpanded && loading && results.length === 0 && query.length >= 2 && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-[1001] bg-background/95 backdrop-blur-xl rounded-2xl border border-border/30 shadow-2xl p-4"
          style={{
            bottom: '80px', // Position above the search button
            width: 'min(520px, 90vw)',
          }}
        >
          <p className="text-muted-foreground text-sm">Searching...</p>
        </div>
      )}
    </>
  );
};

export default HuddleSearchBar;
