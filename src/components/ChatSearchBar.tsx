import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { Message } from '@/hooks/useRealTimeChat';

interface ChatSearchBarProps {
  messages: Message[];
  onResultClick: (messageId: string) => void;
}

const ChatSearchBar: React.FC<ChatSearchBarProps> = ({ messages, onResultClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const searchResults = messages.filter(msg =>
    msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/50">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(e.target.value.length > 0);
          }}
          placeholder="Search messages..."
          className="bg-transparent border-none focus-visible:ring-0 text-sm"
        />
        {searchQuery && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchQuery('');
              setShowResults(false);
            }}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-b-lg shadow-lg max-h-64 overflow-y-auto z-50">
          {searchResults.map(msg => (
            <div
              key={msg.id}
              onClick={() => {
                onResultClick(msg.id);
                setShowResults(false);
                setSearchQuery('');
              }}
              className="p-3 hover:bg-muted/50 cursor-pointer border-b border-border/30 last:border-0"
            >
              <p className="text-sm truncate">{msg.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(msg.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {showResults && searchResults.length === 0 && searchQuery && (
        <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-b-lg shadow-lg p-4 z-50">
          <p className="text-sm text-muted-foreground text-center">No messages found</p>
        </div>
      )}
    </div>
  );
};

export default ChatSearchBar;
