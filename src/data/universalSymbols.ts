/**
 * Universal Symbols Registry
 * Centralized symbol system for platform-wide notifications and indicators
 */

export interface UniversalSymbol {
  id: string;
  symbol: string;
  name: string;
  category: 'activity' | 'social' | 'content' | 'achievement' | 'system';
  description: string;
  color: string;
}

export const UNIVERSAL_SYMBOLS: UniversalSymbol[] = [
  // Activity Symbols
  { id: 'new_post', symbol: '✨', name: 'New Post', category: 'content', description: 'User created a new post', color: 'hsl(262, 83%, 58%)' },
  { id: 'new_photo', symbol: '📸', name: 'New Photo', category: 'content', description: 'User uploaded a new photo', color: 'hsl(217, 91%, 60%)' },
  { id: 'new_video', symbol: '🎬', name: 'New Video', category: 'content', description: 'User shared a new video', color: 'hsl(0, 84%, 60%)' },
  
  // Social Symbols
  { id: 'like', symbol: '❤️', name: 'Like', category: 'social', description: 'User liked content', color: 'hsl(0, 100%, 50%)' },
  { id: 'comment', symbol: '💬', name: 'Comment', category: 'social', description: 'User commented on content', color: 'hsl(142, 76%, 36%)' },
  { id: 'share', symbol: '🔄', name: 'Share', category: 'social', description: 'User shared content', color: 'hsl(25, 95%, 53%)' },
  { id: 'message', symbol: '💌', name: 'Message', category: 'social', description: 'New message from user', color: 'hsl(320, 85%, 60%)' },
  { id: 'friend_request', symbol: '🤝', name: 'Friend Request', category: 'social', description: 'Friend request sent/received', color: 'hsl(45, 93%, 47%)' },
  
  // Achievement Symbols
  { id: 'badge_earned', symbol: '🏆', name: 'Badge Earned', category: 'achievement', description: 'User earned a new badge', color: 'hsl(30, 100%, 50%)' },
  { id: 'milestone', symbol: '🎯', name: 'Milestone', category: 'achievement', description: 'User reached a milestone', color: 'hsl(280, 65%, 60%)' },
  { id: 'level_up', symbol: '⭐', name: 'Level Up', category: 'achievement', description: 'User leveled up', color: 'hsl(45, 93%, 47%)' },
  
  // Content Activity Symbols
  { id: 'trending', symbol: '🔥', name: 'Trending', category: 'activity', description: 'User\'s content is trending', color: 'hsl(15, 85%, 55%)' },
  { id: 'creative', symbol: '🎨', name: 'Creative', category: 'activity', description: 'User created artistic content', color: 'hsl(280, 65%, 60%)' },
  { id: 'voice_post', symbol: '🎤', name: 'Voice Post', category: 'content', description: 'User shared a voice recording', color: 'hsl(340, 75%, 55%)' },
  
  // System & Special Symbols
  { id: 'event', symbol: '📅', name: 'Event', category: 'system', description: 'User has an upcoming event', color: 'hsl(217, 91%, 60%)' },
  { id: 'birthday', symbol: '🎂', name: 'Birthday', category: 'system', description: 'User\'s birthday today', color: 'hsl(320, 85%, 60%)' },
  { id: 'anniversary', symbol: '💝', name: 'Anniversary', category: 'system', description: 'User celebrating anniversary', color: 'hsl(0, 100%, 50%)' },
  { id: 'verified', symbol: '✓', name: 'Verified', category: 'system', description: 'Verified user', color: 'hsl(142, 76%, 36%)' },
  { id: 'premium', symbol: '👑', name: 'Premium', category: 'system', description: 'Premium member', color: 'hsl(45, 93%, 47%)' },
];

export const getSymbolById = (id: string): UniversalSymbol | undefined => {
  return UNIVERSAL_SYMBOLS.find(symbol => symbol.id === id);
};

export const getSymbolsByCategory = (category: UniversalSymbol['category']): UniversalSymbol[] => {
  return UNIVERSAL_SYMBOLS.filter(symbol => symbol.category === category);
};

export const getSymbolColor = (id: string): string => {
  const symbol = getSymbolById(id);
  return symbol?.color || 'hsl(var(--primary))';
};

// Notification priority mapping for badge display
export const NOTIFICATION_PRIORITY: Record<string, number> = {
  'birthday': 10,
  'anniversary': 9,
  'badge_earned': 8,
  'level_up': 7,
  'message': 6,
  'friend_request': 5,
  'trending': 4,
  'new_post': 3,
  'like': 2,
  'comment': 1,
  'share': 1,
};

export const getNotificationPriority = (symbolId: string): number => {
  return NOTIFICATION_PRIORITY[symbolId] || 0;
};
