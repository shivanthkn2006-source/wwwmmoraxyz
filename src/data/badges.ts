export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  target: number;
  badge_id: string;
  feature_category?: string;
}

export const BADGES: Badge[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Discovered 5 features through search',
    icon: '🔍',
    category: 'discovery',
    requirement: 'Search for 5 different features'
  },
  {
    id: 'voice_master',
    name: 'Voice Master',
    description: 'Used voice commands 10 times',
    icon: '🎤',
    category: 'voice',
    requirement: 'Use voice commands 10 times'
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Connected with 5 friends',
    icon: '🦋',
    category: 'social',
    requirement: 'Add 5 friends'
  },
  {
    id: 'content_creator',
    name: 'Content Creator',
    description: 'Created 10 posts',
    icon: '✍️',
    category: 'content',
    requirement: 'Create 10 posts'
  },
  {
    id: 'zoe_friend',
    name: 'Zoe\'s Friend',
    description: 'Had 20 conversations with Zoe',
    icon: '🤖',
    category: 'ai',
    requirement: 'Interact with Zoe 20 times'
  },
  {
    id: 'macro_wizard',
    name: 'Macro Wizard',
    description: 'Created 5 voice macros',
    icon: '🪄',
    category: 'automation',
    requirement: 'Create 5 voice macros'
  },
  {
    id: 'huddle_hero',
    name: 'Huddle Hero',
    description: 'Joined 10 huddle sessions',
    icon: '👥',
    category: 'huddle',
    requirement: 'Join 10 huddle sessions'
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Used the app at 6 AM for 7 days',
    icon: '🌅',
    category: 'engagement',
    requirement: 'Check in at 6 AM for 7 days'
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Used the app at midnight for 7 days',
    icon: '🦉',
    category: 'engagement',
    requirement: 'Check in at midnight for 7 days'
  },
  {
    id: 'power_user',
    name: 'Power User',
    description: 'Explored all major features',
    icon: '⚡',
    category: 'discovery',
    requirement: 'Try all 15+ features'
  },
  {
    id: 'creative_genius',
    name: 'Creative Genius',
    description: 'Generated 10 pieces of content with Zoe',
    icon: '🎨',
    category: 'ai',
    requirement: 'Create 10 AI-generated contents'
  },
  {
    id: 'location_explorer',
    name: 'Location Explorer',
    description: 'Used features from 3 different cities',
    icon: '🗺️',
    category: 'discovery',
    requirement: 'Access features from 3 locations'
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'search_5', name: 'Feature Finder', description: 'Search for 5 features', target: 5, badge_id: 'explorer', feature_category: 'search' },
  { id: 'voice_10', name: 'Voice Enthusiast', description: 'Use voice commands 10 times', target: 10, badge_id: 'voice_master', feature_category: 'voice' },
  { id: 'friends_5', name: 'Social Starter', description: 'Add 5 friends', target: 5, badge_id: 'social_butterfly', feature_category: 'social' },
  { id: 'posts_10', name: 'Regular Poster', description: 'Create 10 posts', target: 10, badge_id: 'content_creator', feature_category: 'content' },
  { id: 'zoe_20', name: 'AI Companion', description: 'Chat with Zoe 20 times', target: 20, badge_id: 'zoe_friend', feature_category: 'ai' },
  { id: 'macros_5', name: 'Automation Expert', description: 'Create 5 macros', target: 5, badge_id: 'macro_wizard', feature_category: 'automation' },
  { id: 'huddle_10', name: 'Community Member', description: 'Join 10 huddles', target: 10, badge_id: 'huddle_hero', feature_category: 'huddle' },
  { id: 'all_features', name: 'Complete Explorer', description: 'Try all features', target: 15, badge_id: 'power_user', feature_category: 'discovery' },
  { id: 'ai_content_10', name: 'AI Creator', description: 'Generate 10 contents', target: 10, badge_id: 'creative_genius', feature_category: 'ai' },
  { id: 'locations_3', name: 'Traveler', description: 'Use from 3 locations', target: 3, badge_id: 'location_explorer', feature_category: 'discovery' }
];
