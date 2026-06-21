// ═══════════════════════════════════════════════════════════════════════════════
// EMOJI PICKER - Scrollable emoji grid with custom emoji upload
// ═══════════════════════════════════════════════════════════════════════════════

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { X, Search, Upload } from 'lucide-react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys & People',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
      '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
      '🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫',
      '🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒',
      '🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒',
      '🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳',
      '🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮',
      '😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥',
      '😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱',
      '😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡',
      '👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻',
      '😼','😽','🙀','😿','😾',
    ],
  },
  {
    label: 'Gestures & Body',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌',
      '🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉',
      '👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛',
      '🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','💪','🦾',
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟',
    ],
  },
  {
    label: 'Animals & Nature',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨',
      '🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒',
      '🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗',
      '🌸','🌺','🌻','🌹','🌷','🌱','🌿','🍀','🍁','🍂',
      '🌊','🔥','⭐','🌙','☀️','🌈','❄️','💧','🌍',
    ],
  },
  {
    label: 'Food & Drink',
    emojis: [
      '🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒',
      '🍑','🥭','🍍','🥥','🥝','🍔','🍟','🍕','🌭','🍿',
      '🧁','🍰','🎂','🍩','🍪','☕','🍵','🧋','🥤','🍺',
    ],
  },
  {
    label: 'Objects & Symbols',
    emojis: [
      '⚡','💡','🔮','🎮','🎯','🏆','🎨','🎬','🎵','🎶',
      '💎','🔑','🗝️','🛡️','⚔️','🧲','💊','🩹','🔬','🔭',
      '📱','💻','⌨️','🖥️','🖨️','📷','📹','📞','📧','📝',
      '✅','❌','⭕','💯','🔴','🟢','🔵','🟡','🟠','🟣',
    ],
  },
];

const EMOJI_SEARCH_TERMS: Record<string, string[]> = {
  '😀': ['grinning', 'smile', 'happy', 'joy'],
  '😃': ['happy', 'smile', 'joy'],
  '😄': ['happy', 'smile', 'laugh'],
  '😁': ['grin', 'happy', 'teeth'],
  '😆': ['laugh', 'funny', 'happy'],
  '😅': ['relief', 'nervous', 'sweat'],
  '🤣': ['laugh', 'lol', 'rofl', 'funny'],
  '😂': ['laugh', 'crying', 'funny', 'tears'],
  '🙂': ['smile', 'slight', 'happy'],
  '🙃': ['upside down', 'sarcasm', 'silly'],
  '😉': ['wink', 'flirt'],
  '😊': ['blush', 'happy', 'smile'],
  '😇': ['angel', 'innocent'],
  '🥰': ['love', 'hearts', 'adoring'],
  '😍': ['love', 'heart eyes', 'crush'],
  '😘': ['kiss', 'love'],
  '🤗': ['hug', 'caring'],
  '🤔': ['thinking', 'think', 'hmm', 'question'],
  '🤨': ['skeptical', 'doubt', 'raised eyebrow'],
  '😐': ['neutral', 'blank'],
  '😑': ['expressionless', 'blank'],
  '😶': ['speechless', 'silent'],
  '😏': ['smirk', 'flirty'],
  '😒': ['unamused', 'annoyed'],
  '🙄': ['eye roll', 'annoyed'],
  '😬': ['awkward', 'grimace'],
  '😌': ['relieved', 'calm'],
  '😔': ['sad', 'down'],
  '😪': ['sleepy', 'tired'],
  '🤤': ['drool', 'hungry'],
  '😴': ['sleep', 'sleeping', 'tired'],
  '😷': ['sick', 'mask', 'ill'],
  '🤒': ['fever', 'sick'],
  '🤕': ['hurt', 'injured'],
  '🤢': ['nausea', 'sick'],
  '🤮': ['vomit', 'sick'],
  '🥵': ['hot', 'heat'],
  '🥶': ['cold', 'freezing'],
  '🥴': ['dizzy', 'drunk', 'woozy'],
  '😵': ['dizzy', 'shocked'],
  '🤯': ['mind blown', 'shocked'],
  '🥳': ['party', 'celebrate'],
  '😎': ['cool', 'sunglasses'],
  '🤓': ['nerd', 'geek'],
  '🧐': ['monocle', 'inspect'],
  '😕': ['confused'],
  '😟': ['worried'],
  '🙁': ['sad', 'frown'],
  '☹️': ['sad', 'frown'],
  '😮': ['surprised', 'wow'],
  '😯': ['surprised', 'hushed'],
  '😲': ['shocked', 'surprised'],
  '😳': ['embarrassed', 'flushed'],
  '🥺': ['pleading', 'puppy eyes'],
  '😨': ['fear', 'scared'],
  '😰': ['anxious', 'nervous'],
  '😢': ['cry', 'sad', 'tear'],
  '😭': ['crying', 'sob'],
  '😱': ['scream', 'fear', 'shock'],
  '😖': ['frustrated'],
  '😞': ['disappointed', 'sad'],
  '😩': ['weary', 'tired'],
  '😫': ['exhausted'],
  '🥱': ['yawn', 'sleepy'],
  '😤': ['triumph', 'steam', 'frustrated'],
  '😡': ['angry', 'mad'],
  '😠': ['angry', 'mad'],
  '🤬': ['swear', 'angry', 'rage'],
  '😈': ['devil', 'evil'],
  '💀': ['skull', 'dead'],
  '💩': ['poop'],
  '🤡': ['clown'],
  '👻': ['ghost', 'spooky'],
  '👽': ['alien'],
  '🤖': ['robot', 'bot', 'ai'],
  '👋': ['wave', 'hello', 'hi'],
  '👌': ['ok', 'okay'],
  '✌️': ['peace', 'victory'],
  '👍': ['thumbs up', 'like', 'yes'],
  '👎': ['thumbs down', 'dislike', 'no'],
  '👏': ['clap', 'applause'],
  '🙌': ['celebrate', 'raise hands'],
  '🫶': ['heart hands', 'love'],
  '🙏': ['pray', 'thanks'],
  '💪': ['strong', 'muscle'],
  '❤️': ['heart', 'love'],
  '💔': ['broken heart', 'sad'],
  '💕': ['hearts', 'love'],
  '💖': ['sparkle heart', 'love'],
  '🐶': ['dog', 'pet'],
  '🐱': ['cat', 'pet'],
  '🔥': ['fire', 'lit', 'hot'],
  '⭐': ['star'],
  '🌙': ['moon', 'night'],
  '☀️': ['sun', 'day'],
  '🌈': ['rainbow'],
  '🍕': ['pizza', 'food'],
  '☕': ['coffee', 'drink'],
  '⚡': ['lightning', 'energy'],
  '💡': ['idea', 'thinking'],
  '🎵': ['music', 'song'],
  '📱': ['phone', 'mobile'],
  '💻': ['laptop', 'computer'],
  '📷': ['camera', 'photo'],
  '📞': ['phone', 'call'],
  '✅': ['check', 'done', 'success'],
  '❌': ['cross', 'wrong', 'error'],
  '💯': ['100', 'perfect'],
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function matchesEmojiSearch(emoji: string, categoryLabel: string, query: string) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) return true;
  if (emoji.includes(normalizedQuery)) return true;
  if (categoryLabel.toLowerCase().includes(normalizedQuery)) return true;

  return (EMOJI_SEARCH_TERMS[emoji] || []).some((term) =>
    term.toLowerCase().includes(normalizedQuery)
  );
}

const CUSTOM_EMOJIS_KEY = 'zoe_custom_emojis';

function loadCustomEmojis(): string[] {
  try {
    const stored = localStorage.getItem(CUSTOM_EMOJIS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomEmojis(emojis: string[]) {
  try {
    localStorage.setItem(CUSTOM_EMOJIS_KEY, JSON.stringify(emojis));
  } catch { /* ignore */ }
}

const RECENT_KEY = 'zoe_recent_emojis';

function loadRecent(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecent(emojis: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(emojis.slice(0, 24)));
  } catch { /* ignore */ }
}

export const EmojiPicker = memo(function EmojiPicker({ isOpen, onClose, onSelect }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [customEmojis, setCustomEmojis] = useState<string[]>(loadCustomEmojis);
  const [activeTab, setActiveTab] = useState<'emojis' | 'custom'>('emojis');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const handleSelect = useCallback((emoji: string) => {
    onSelect(emoji);
    setRecent(prev => {
      const next = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 24);
      saveRecent(next);
      return next;
    });
  }, [onSelect]);

  const handleCustomUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 512 * 1024) {
      alert('Image must be under 512KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomEmojis(prev => {
        const next = [...prev, dataUrl];
        saveCustomEmojis(next);
        return next;
      });

      handleSelect(dataUrl);
      onClose();
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleSelect, onClose]);

  const removeCustomEmoji = useCallback((index: number) => {
    setCustomEmojis(prev => {
      const next = prev.filter((_, i) => i !== index);
      saveCustomEmojis(next);
      return next;
    });
  }, []);

  if (!isOpen) return null;

  const filteredCategories = search.trim()
    ? EMOJI_CATEGORIES.map(cat => ({
        ...cat,
        emojis: cat.emojis.filter(e => matchesEmojiSearch(e, cat.label, search)),
      })).filter(cat => cat.emojis.length > 0)
    : EMOJI_CATEGORIES;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 z-[60] animate-in slide-in-from-bottom-2 fade-in duration-200"
      style={{
        width: 'min(320px, calc(100vw - 32px))',
        maxHeight: 'min(380px, 50vh)',
        background: 'rgba(20, 20, 25, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="flex-1 bg-transparent text-white/90 text-xs placeholder:text-white/30 outline-none"
        />
        <button onClick={onClose} className="p-0.5 hover:bg-white/10 rounded transition-colors">
          <X className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => setActiveTab('emojis')}
          className="flex-1 py-1.5 text-[11px] font-medium transition-colors"
          style={{
            color: activeTab === 'emojis' ? '#00FFFF' : 'rgba(255,255,255,0.5)',
            borderBottom: activeTab === 'emojis' ? '2px solid #00FFFF' : '2px solid transparent',
          }}
        >
          Emojis
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className="flex-1 py-1.5 text-[11px] font-medium transition-colors"
          style={{
            color: activeTab === 'custom' ? '#00FFFF' : 'rgba(255,255,255,0.5)',
            borderBottom: activeTab === 'custom' ? '2px solid #00FFFF' : '2px solid transparent',
          }}
        >
          Custom
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === 'emojis' ? (
          <div className="p-2">
            {/* Recent */}
            {recent.length > 0 && !search && (
              <div className="mb-2">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1 px-1">Recent</p>
                <div className="grid grid-cols-8 gap-0.5">
                  {recent.map((emoji, i) => (
                    <button
                      key={`recent-${i}`}
                      onClick={() => handleSelect(emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-lg"
                    >
                      {emoji.startsWith('data:') ? (
                        <img src={emoji} alt="custom" className="w-5 h-5 object-contain" />
                      ) : emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => (
                <div key={cat.label} className="mb-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1 px-1">{cat.label}</p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {cat.emojis.map((emoji, i) => (
                      <button
                        key={`${cat.label}-${i}`}
                        onClick={() => handleSelect(emoji)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-2 py-8 text-center text-xs text-white/40">
                No emojis found for "{search.trim()}"
              </div>
            )}
          </div>
        ) : (
          <div className="p-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Your Custom Emojis</p>

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCustomUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-lg transition-colors"
              style={{
                border: '1px dashed rgba(0, 255, 255, 0.3)',
                background: 'rgba(0, 255, 255, 0.05)',
                color: 'rgba(0, 255, 255, 0.7)',
              }}
            >
              <Upload className="w-4 h-4" />
              <span className="text-xs">Upload Custom Emoji</span>
            </button>

            {/* Custom emoji grid */}
            {customEmojis.length > 0 ? (
              <div className="grid grid-cols-6 gap-1">
                {customEmojis.map((dataUrl, i) => (
                  <div key={i} className="relative group">
                    <button
                      onClick={() => handleSelect(dataUrl)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <img src={dataUrl} alt={`custom-${i}`} className="w-7 h-7 object-contain" />
                    </button>
                    <button
                      onClick={() => removeCustomEmoji(i)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 items-center justify-center text-white text-[8px] hidden group-hover:flex"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-4">No custom emojis yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default EmojiPicker;
