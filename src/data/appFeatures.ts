export interface AppFeature {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  category: 'profile' | 'posts' | 'ai' | 'chat' | 'settings' | 'social' | 'media';
  location: string;
  icon: string;
  action?: () => void;
  announcement?: string; // Voice announcement for first-time users
}

export const APP_FEATURES: AppFeature[] = [
  // Profile Features
  {
    id: 'activity-status',
    name: 'Activity Status',
    description: 'Set your current status and activity for friends to see',
    keywords: ['status', 'activity', 'online', 'available', 'busy', 'mood'],
    category: 'profile',
    location: '/profile',
    icon: 'User',
    announcement: 'Welcome to Activity Status! Here you can set your current mood and let your friends know what you\'re up to. Choose from various statuses like available, busy, or away to keep everyone informed.'
  },
  {
    id: 'event-setup',
    name: 'Event Setup',
    description: 'Set up special events like birthdays or anniversaries',
    keywords: ['event', 'birthday', 'anniversary', 'celebration', 'special date'],
    category: 'profile',
    location: '/profile',
    icon: 'Calendar',
    announcement: 'This is the Event Setup feature! You can configure special events like birthdays or anniversaries here. I\'ll remind you when these important dates are coming up.'
  },
  {
    id: 'profile-edit',
    name: 'Edit Profile',
    description: 'Update your profile information, bio, and photo',
    keywords: ['edit', 'profile', 'bio', 'photo', 'update', 'change'],
    category: 'profile',
    location: '/profile',
    icon: 'Settings',
    announcement: 'You\'re now in the Profile Editor! Here you can update your display name, bio, profile photo, and personal information. Make your profile truly yours!'
  },
  {
    id: 'profile-visibility',
    name: 'Profile Visibility',
    description: 'Control who can see your profile',
    keywords: ['privacy', 'visibility', 'public', 'private', 'friends'],
    category: 'profile',
    location: '/profile',
    icon: 'Eye',
    announcement: 'Profile Visibility settings let you control who can see your information. You can make your profile public, friends-only, or completely private. Your privacy, your choice!'
  },
  
  // AI Features
  {
    id: 'zoe-assistant',
    name: 'Zoe AI Assistant',
    description: 'Voice-controlled AI assistant for hands-free control',
    keywords: ['zoe', 'ai', 'assistant', 'voice', 'commands', 'virtual assistant'],
    category: 'ai',
    location: '/ai-companion',
    icon: 'Bot',
    announcement: 'Welcome to the Zoe AI Assistant page! I can help you navigate the app, search for content, send messages, and much more using just your voice. Try saying "Hi Zoe" followed by what you need!'
  },
  {
    id: 'voice-macros',
    name: 'Voice Macros',
    description: 'Create automated voice command sequences',
    keywords: ['macro', 'automation', 'voice commands', 'shortcuts', 'routine'],
    category: 'ai',
    location: '/ai-companion',
    icon: 'Zap',
    announcement: 'You\'ve discovered Voice Macros! Create custom voice commands that execute multiple actions at once. For example, create a morning routine macro that checks weather, reads notifications, and plays your favorite playlist.'
  },
  
  // Chat & Social Features
  {
    id: 'direct-messages',
    name: 'Direct Messages',
    description: 'Send private messages to friends',
    keywords: ['dm', 'message', 'chat', 'private', 'inbox', 'conversation'],
    category: 'chat',
    location: '/chat',
    icon: 'MessageSquare',
    announcement: 'Welcome to Direct Messages! Here you can have private conversations with your friends. Send text, photos, or videos in a secure one-on-one chat.'
  },
  {
    id: 'friend-requests',
    name: 'Friend Requests',
    description: 'View and manage friend requests',
    keywords: ['friends', 'requests', 'add', 'accept', 'connections'],
    category: 'social',
    location: '/home',
    icon: 'UserPlus',
    announcement: 'This is where you manage your Friend Requests! Accept or decline connection requests from other users. Build your network and stay connected with friends.'
  },
  {
    id: 'huddle',
    name: 'Huddle',
    description: 'See friends nearby and connect in real-time',
    keywords: ['huddle', 'nearby', 'location', 'map', 'friends around'],
    category: 'social',
    location: '/huddle',
    icon: 'MapPin',
    announcement: 'Welcome to Huddle! This feature shows you friends who are nearby in real-time. Enable location services to discover and connect with people around you instantly.'
  },
  
  // Post Features
  {
    id: 'create-post',
    name: 'Create Post',
    description: 'Share photos, videos, or text with friends',
    keywords: ['post', 'share', 'upload', 'photo', 'video', 'create'],
    category: 'posts',
    location: '/camera',
    icon: 'Plus',
    announcement: 'Time to Create a Post! Share your moments with friends through photos, videos, or text updates. Express yourself and let your network know what\'s happening in your world!'
  },
  {
    id: 'saved-posts',
    name: 'Saved Posts',
    description: 'View your saved posts',
    keywords: ['saved', 'bookmarks', 'favorites', 'collection'],
    category: 'posts',
    location: '/profile',
    icon: 'Bookmark',
    announcement: 'Welcome to your Saved Posts! Here you can revisit all the posts you\'ve bookmarked for later. Your personal collection of memorable moments and interesting content.'
  },
  {
    id: 'post-comments',
    name: 'Comments',
    description: 'Comment and engage with posts',
    keywords: ['comments', 'reply', 'discuss', 'engage', 'conversation'],
    category: 'posts',
    location: '/home',
    icon: 'MessageCircle',
    announcement: 'You\'re viewing the Comments section! Engage with posts by sharing your thoughts and starting conversations. Your comments help build meaningful connections with friends.'
  },
  
  // Media Features
  {
    id: 'camera',
    name: 'Camera',
    description: 'Capture photos and videos',
    keywords: ['camera', 'photo', 'video', 'capture', 'take picture'],
    category: 'media',
    location: '/camera',
    icon: 'Camera',
    announcement: 'You\'ve opened the Camera! Capture life\'s moments with photos and videos. Snap a picture or record a video to share with your friends instantly.'
  },
  {
    id: 'webdrop',
    name: 'WebDrop',
    description: 'Share files and media quickly',
    keywords: ['webdrop', 'share', 'transfer', 'files', 'send'],
    category: 'media',
    location: '/webdrop',
    icon: 'Share',
    announcement: 'Welcome to WebDrop! Quickly share files and media with nearby friends. Fast, simple, and secure file transfers made easy.'
  },
  
  // Settings & Other
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Manage your notifications and alerts',
    keywords: ['notifications', 'alerts', 'updates', 'bell'],
    category: 'settings',
    location: '/home',
    icon: 'Bell',
    announcement: 'This is your Notifications center! Stay updated with likes, comments, friend requests, and other important activities. You can customize notification preferences here.'
  },
  {
    id: 'reminders',
    name: 'Reminders',
    description: 'Set and manage reminders',
    keywords: ['reminder', 'alarm', 'notification', 'schedule', 'alert'],
    category: 'settings',
    location: '/ai-companion',
    icon: 'Bell',
    announcement: 'You\'ve discovered the Reminders feature! Set up alerts for important tasks, events, or anything you need to remember. I\'ll make sure you never miss a thing!'
  },
  {
    id: 'emotion-tracker',
    name: 'Emotion Tracker',
    description: 'Track your emotional well-being over time',
    keywords: ['emotion', 'mood', 'feelings', 'wellness', 'mental health'],
    category: 'profile',
    location: '/profile',
    icon: 'Heart',
    announcement: 'Welcome to the Emotion Tracker! Monitor your emotional well-being by logging your daily moods and feelings. Over time, you\'ll see patterns and insights about your mental health journey.'
  },
  {
    id: 'day-planner',
    name: 'Day Planner',
    description: 'Plan and organize your daily activities',
    keywords: ['planner', 'schedule', 'calendar', 'organize', 'diary', 'journal'],
    category: 'profile',
    location: '/profile',
    icon: 'Calendar',
    announcement: 'You\'ve opened the Day Planner! Organize your daily activities, set goals, and keep track of your schedule. Plan your day for maximum productivity and balance.'
  }
];

// Helper function to search features
export const searchFeatures = (query: string): AppFeature[] => {
  const lowercaseQuery = query.toLowerCase().trim();
  
  if (!lowercaseQuery) return [];
  
  return APP_FEATURES.filter(feature => {
    // Search in name
    if (feature.name.toLowerCase().includes(lowercaseQuery)) return true;
    
    // Search in description
    if (feature.description.toLowerCase().includes(lowercaseQuery)) return true;
    
    // Search in keywords
    if (feature.keywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery))) return true;
    
    // Search in category
    if (feature.category.toLowerCase().includes(lowercaseQuery)) return true;
    
    return false;
  }).slice(0, 5); // Limit to top 5 results
};

// Get random feature recommendations
export const getFeatureRecommendations = (count: number = 3): AppFeature[] => {
  const shuffled = [...APP_FEATURES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Get features by category
export const getFeaturesByCategory = (category: AppFeature['category']): AppFeature[] => {
  return APP_FEATURES.filter(f => f.category === category);
};
