import React, { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { searchSettings, type SettingsItem } from '@/data/settingsRegistry';
import { Settings, Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SettingsSearchCommandProps {
  onOpenProfileEdit?: () => void;
  onOpenVoiceSettings?: () => void;
}

export const SettingsSearchCommand = ({ onOpenProfileEdit, onOpenVoiceSettings }: SettingsSearchCommandProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchResults = searchSettings(searchQuery);

  const handleSettingAction = (setting: SettingsItem) => {
    setIsOpen(false);
    setSearchQuery('');

    switch (setting.action) {
      case 'open-profile-edit':
        onOpenProfileEdit?.();
        break;
      case 'open-voice-settings':
        onOpenVoiceSettings?.();
        break;
      case 'navigate-voice-commands':
        navigate('/voice-commands');
        break;
      case 'navigate-notification-preferences':
        navigate('/notification-preferences');
        break;
      case 'toggle-theme':
        toast.info('Theme toggle coming soon');
        break;
      case 'open-accessibility':
        toast.info('Accessibility settings coming soon');
        break;
      case 'open-account-settings':
        toast.info('Account settings coming soon');
        break;
      case 'logout':
        toast.info('Use the logout button in the top right');
        break;
      default:
        toast.info(`Navigate to ${setting.name}`);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto px-4 pt-4">
      {/* Search Input */}
      <div 
        className="relative bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-primary/30 shadow-2xl overflow-hidden hover:shadow-primary/20 transition-all duration-300"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Search className="w-5 h-5 text-primary" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm font-medium"
          />
          <Settings className="w-5 h-5 text-primary animate-pulse" />
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && searchQuery && searchResults.length > 0 && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Results */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/30 shadow-2xl overflow-hidden z-50 mx-4">
            <div className="max-h-[60vh] overflow-y-auto">
              {searchResults.map((setting) => (
                <button
                  key={setting.id}
                  onClick={() => handleSettingAction(setting)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {setting.name}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {setting.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {setting.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* No Results */}
      {isOpen && searchQuery && searchResults.length === 0 && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/30 shadow-2xl overflow-hidden z-50 mx-4">
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No settings found for "{searchQuery}"</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};