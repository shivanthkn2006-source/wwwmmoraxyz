import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface UserSuggestion {
  user_id: string;
  display_name: string;
  username: string;
  profile_photo_url?: string;
}

interface UserMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionUser?: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const UserMentionInput: React.FC<UserMentionInputProps> = ({
  value,
  onChange,
  onMentionUser,
  placeholder,
  disabled,
  className
}) => {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchUserSuggestions = async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    const { data } = await supabase
      .from('public_profiles')
      .select('user_id, display_name, username, profile_photo_url')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(5);

    if (data) {
      setSuggestions(data);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    onChange(newValue);

    // Check for @ mentions
    const lastAtSymbol = newValue.lastIndexOf('@', cursorPos - 1);
    if (lastAtSymbol !== -1) {
      const textAfterAt = newValue.substring(lastAtSymbol + 1, cursorPos);
      const hasSpace = textAfterAt.includes(' ');
      
      if (!hasSpace) {
        setMentionStart(lastAtSymbol);
        setShowSuggestions(true);
        fetchUserSuggestions(textAfterAt);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (user: UserSuggestion) => {
    if (mentionStart === -1) return;

    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(inputRef.current?.selectionStart || value.length);
    const newValue = `${beforeMention}@${user.username} ${afterMention}`;

    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionStart(-1);

    if (onMentionUser) {
      onMentionUser(user.user_id);
    }

    // Focus back on input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && showSuggestions) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute bottom-full left-0 right-0 mb-2 p-2 max-h-48 overflow-y-auto z-50 bg-card">
          {suggestions.map((user, index) => (
            <div
              key={user.user_id}
              className={`flex items-center gap-2 p-2 cursor-pointer rounded-md ${
                index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
              }`}
              onClick={() => selectSuggestion(user)}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.profile_photo_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.display_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default UserMentionInput;