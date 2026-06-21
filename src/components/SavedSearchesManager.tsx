import React, { useState } from 'react';
import { Bookmark, Trash2, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface SavedSearchesManagerProps {
  onSelectSearch: (query: string, filters: any) => void;
  currentQuery: string;
  currentFilters: any;
}

export const SavedSearchesManager: React.FC<SavedSearchesManagerProps> = ({
  onSelectSearch,
  currentQuery,
  currentFilters
}) => {
  const { savedSearches, loading, saveSearch, deleteSearch, updateLastUsed } = useSavedSearches();
  const [isOpen, setIsOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSaveCurrentSearch = async () => {
    if (!searchName.trim() || !currentQuery.trim()) return;
    
    await saveSearch(searchName, currentQuery, currentFilters);
    setSearchName('');
    setShowSaveDialog(false);
  };

  const handleSelectSearch = async (search: any) => {
    await updateLastUsed(search.id);
    onSelectSearch(search.search_query, search.filters);
    setIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <Bookmark className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-background/95 backdrop-blur-lg border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Saved Searches</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Save Current Search */}
            {currentQuery && (
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-xs text-white/70 mb-2">Save current search</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Button
                    onClick={handleSaveCurrentSearch}
                    disabled={!searchName.trim()}
                    size="sm"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            {/* Saved Searches List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <p className="text-center text-white/50 py-4">Loading...</p>
              ) : savedSearches.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark className="w-12 h-12 mx-auto mb-2 text-white/30" />
                  <p className="text-white/50 text-sm">No saved searches yet</p>
                </div>
              ) : (
                savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleSelectSearch(search)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Search className="w-4 h-4 text-primary shrink-0" />
                          <p className="font-semibold text-white text-sm">{search.search_name}</p>
                        </div>
                        <p className="text-xs text-white/70 mb-2">{search.search_query}</p>
                        {search.last_used_at && (
                          <div className="flex items-center gap-1 text-xs text-white/50">
                            <Clock className="w-3 h-3" />
                            Last used {formatDistanceToNow(new Date(search.last_used_at))} ago
                          </div>
                        )}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSearch(search.id)}
                        className="h-8 w-8 text-white/70 hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
