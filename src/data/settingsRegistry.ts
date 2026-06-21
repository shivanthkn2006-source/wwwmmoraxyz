export interface SettingsItem {
  id: string;
  name: string;
  description: string;
  category: 'profile' | 'privacy' | 'notifications' | 'voice' | 'ai' | 'account' | 'display' | 'accessibility';
  keywords: string[];
  location: string;
  action?: string;
}

export const SETTINGS_REGISTRY: SettingsItem[] = [
  // Profile Settings
  {
    id: 'edit-profile',
    name: 'Edit Profile',
    description: 'Update your display name, username, bio, and profile picture',
    category: 'profile',
    keywords: ['profile', 'edit', 'name', 'username', 'bio', 'photo', 'picture', 'avatar'],
    location: '/profile',
    action: 'open-profile-edit'
  },
  {
    id: 'profile-visibility',
    name: 'Profile Visibility',
    description: 'Control who can see your profile (public, friends, private)',
    category: 'privacy',
    keywords: ['visibility', 'privacy', 'public', 'private', 'friends', 'who can see'],
    location: '/profile',
    action: 'open-profile-edit'
  },
  {
    id: 'location-settings',
    name: 'Location Settings',
    description: 'Enable or disable location sharing and set your city',
    category: 'privacy',
    keywords: ['location', 'city', 'place', 'gps', 'geolocation', 'where'],
    location: '/profile',
    action: 'open-profile-edit'
  },
  {
    id: 'interests-hobbies',
    name: 'Interests & Hobbies',
    description: 'Add your interests and hobbies for better friend matching',
    category: 'profile',
    keywords: ['interests', 'hobbies', 'activities', 'likes', 'passions'],
    location: '/profile',
    action: 'open-profile-edit'
  },
  {
    id: 'profession',
    name: 'Profession & Education',
    description: 'Set your profession and field of study',
    category: 'profile',
    keywords: ['profession', 'job', 'career', 'work', 'education', 'study', 'field'],
    location: '/profile',
    action: 'open-profile-edit'
  },

  // Voice & AI Settings
  {
    id: 'voice-commands',
    name: 'Voice Commands',
    description: 'View and customize Zoe voice commands',
    category: 'voice',
    keywords: ['voice', 'commands', 'zoe', 'speech', 'talk', 'speak', 'listen'],
    location: '/voice-commands',
    action: 'navigate-voice-commands'
  },
  {
    id: 'zoe-settings',
    name: 'Zoe AI Settings',
    description: 'Configure Zoe voice assistant settings and behavior',
    category: 'ai',
    keywords: ['zoe', 'ai', 'assistant', 'voice', 'settings', 'configure'],
    location: '/profile',
    action: 'open-voice-settings'
  },
  {
    id: 'dhf-dashboard',
    name: 'DHF Dashboard',
    description: 'Digital Human Fingerprint management with ATLAS Sync verification',
    category: 'ai',
    keywords: ['dhf', 'digital', 'human', 'fingerprint', 'atlas', 'sync', 'verification', 'upload', 'data', 'autonomy'],
    location: '/dhf-dashboard',
    action: 'navigate-dhf-dashboard'
  },
  {
    id: 'custom-commands',
    name: 'Custom Voice Commands',
    description: 'Create your own custom voice commands and shortcuts',
    category: 'voice',
    keywords: ['custom', 'commands', 'shortcuts', 'voice', 'macros'],
    location: '/voice-commands',
    action: 'navigate-voice-commands'
  },
  {
    id: 'voice-pitch',
    name: 'Voice Pitch',
    description: 'Adjust Zoe voice pitch (low, normal, high)',
    category: 'voice',
    keywords: ['pitch', 'tone', 'voice', 'high', 'low', 'sound'],
    location: '/profile',
    action: 'open-voice-settings'
  },
  {
    id: 'voice-speed',
    name: 'Voice Speed',
    description: 'Control Zoe speaking speed (slow, normal, fast)',
    category: 'voice',
    keywords: ['speed', 'rate', 'fast', 'slow', 'pace', 'tempo'],
    location: '/profile',
    action: 'open-voice-settings'
  },
  {
    id: 'voice-volume',
    name: 'Voice Volume',
    description: 'Set Zoe voice volume level',
    category: 'voice',
    keywords: ['volume', 'loud', 'quiet', 'sound', 'level'],
    location: '/profile',
    action: 'open-voice-settings'
  },

  // Notification Settings
  {
    id: 'notification-preferences',
    name: 'Notification Preferences',
    description: 'Manage notification settings for different activities',
    category: 'notifications',
    keywords: ['notifications', 'alerts', 'push', 'bells', 'reminders'],
    location: '/notification-preferences',
    action: 'navigate-notification-preferences'
  },
  {
    id: 'voice-notifications',
    name: 'Voice Notifications',
    description: 'Enable voice announcements for notifications',
    category: 'notifications',
    keywords: ['voice', 'announcements', 'spoken', 'audio', 'notifications'],
    location: '/notification-preferences',
    action: 'navigate-notification-preferences'
  },

  // Display & Accessibility
  {
    id: 'theme',
    name: 'Theme',
    description: 'Switch between light and dark mode',
    category: 'display',
    keywords: ['theme', 'dark', 'light', 'mode', 'appearance', 'color'],
    location: '/profile',
    action: 'toggle-theme'
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    description: 'Accessibility features and adjustments',
    category: 'accessibility',
    keywords: ['accessibility', 'a11y', 'screen reader', 'contrast', 'font size'],
    location: '/profile',
    action: 'open-accessibility'
  },

  // Account Settings
  {
    id: 'account-settings',
    name: 'Account Settings',
    description: 'Manage your account and security settings',
    category: 'account',
    keywords: ['account', 'security', 'password', 'email', 'login'],
    location: '/profile',
    action: 'open-account-settings'
  },
  {
    id: 'logout',
    name: 'Logout',
    description: 'Sign out of your account',
    category: 'account',
    keywords: ['logout', 'sign out', 'exit', 'leave', 'disconnect'],
    location: '/profile',
    action: 'logout'
  }
];

export const searchSettings = (query: string): SettingsItem[] => {
  const lowercaseQuery = query.toLowerCase().trim();
  
  if (!lowercaseQuery) return [];
  
  return SETTINGS_REGISTRY.filter(setting => {
    if (setting.name.toLowerCase().includes(lowercaseQuery)) return true;
    if (setting.description.toLowerCase().includes(lowercaseQuery)) return true;
    if (setting.keywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery))) return true;
    if (setting.category.toLowerCase().includes(lowercaseQuery)) return true;
    return false;
  });
};

export const getSettingsByCategory = (category: SettingsItem['category']): SettingsItem[] => {
  return SETTINGS_REGISTRY.filter(s => s.category === category);
};
