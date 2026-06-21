export interface MacroTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_phrase: string;
  commands: string[];
  variables?: Array<{
    name: string;
    defaultValue: string;
    description: string;
  }>;
  icon: string;
}

export const MACRO_TEMPLATES: MacroTemplate[] = [
  // Morning Routines
  {
    id: 'morning-routine-basic',
    name: 'Morning Routine',
    description: 'Start your day with weather, briefing, and calendar',
    category: 'home',
    trigger_phrase: 'start my day',
    commands: [
      'show weather',
      'morning briefing',
      'show calendar',
      'who\'s online'
    ],
    icon: '☀️'
  },
  {
    id: 'morning-workout',
    name: 'Morning Workout',
    description: 'Get ready for exercise with motivation and music',
    category: 'home',
    trigger_phrase: 'workout time',
    commands: [
      'show weather',
      'set timer 30 minutes',
      'play workout music'
    ],
    icon: '💪'
  },
  
  // Work Routines
  {
    id: 'work-start',
    name: 'Start Work Day',
    description: 'Begin work with calendar, tasks, and focus mode',
    category: 'work',
    trigger_phrase: 'start working',
    commands: [
      'show calendar',
      'check reminders',
      'who\'s online',
      'enable focus mode'
    ],
    icon: '💼'
  },
  {
    id: 'meeting-prep',
    name: 'Meeting Prep',
    description: 'Quick preparation before meetings',
    category: 'work',
    trigger_phrase: 'prepare for meeting',
    commands: [
      'show calendar',
      'check schedule',
      'set reminder 5 minutes'
    ],
    icon: '📅'
  },
  {
    id: 'end-work-day',
    name: 'End Work Day',
    description: 'Wrap up work with summary and tomorrow preview',
    category: 'work',
    trigger_phrase: 'finish work',
    commands: [
      'show calendar tomorrow',
      'set reminders',
      'good night'
    ],
    icon: '🌙'
  },

  // Entertainment
  {
    id: 'movie-night',
    name: 'Movie Night',
    description: 'Set up for entertainment with mood lighting',
    category: 'entertainment',
    trigger_phrase: 'movie time',
    commands: [
      'dim lights',
      'set mood cinematic',
      'show movie recommendations'
    ],
    icon: '🎬'
  },
  {
    id: 'gaming-session',
    name: 'Gaming Session',
    description: 'Optimize for gaming with friends',
    category: 'entertainment',
    trigger_phrase: 'gaming time',
    commands: [
      'who\'s online',
      'enable gaming mode',
      'show friends list'
    ],
    icon: '🎮'
  },

  // Location-based with variables
  {
    id: 'commute-check',
    name: 'Commute Check',
    description: 'Check weather and traffic before leaving',
    category: 'travel',
    trigger_phrase: 'check commute',
    commands: [
      'show weather for {location}',
      'check traffic to {destination}',
      'show calendar'
    ],
    variables: [
      {
        name: 'location',
        defaultValue: 'current location',
        description: 'Your starting location'
      },
      {
        name: 'destination',
        defaultValue: 'work',
        description: 'Where you\'re heading'
      }
    ],
    icon: '🚗'
  },
  {
    id: 'travel-prep',
    name: 'Travel Preparation',
    description: 'Get ready for a trip with all essentials',
    category: 'travel',
    trigger_phrase: 'prepare for trip',
    commands: [
      'show weather for {destination}',
      'check calendar',
      'create packing list'
    ],
    variables: [
      {
        name: 'destination',
        defaultValue: 'destination city',
        description: 'Where you\'re traveling to'
      }
    ],
    icon: '✈️'
  },

  // Health & Wellness
  {
    id: 'meditation-routine',
    name: 'Meditation Session',
    description: 'Start a calming meditation practice',
    category: 'wellness',
    trigger_phrase: 'meditate',
    commands: [
      'set mood relaxation',
      'set timer {duration} minutes',
      'play meditation sounds'
    ],
    variables: [
      {
        name: 'duration',
        defaultValue: '10',
        description: 'Meditation duration in minutes'
      }
    ],
    icon: '🧘'
  },
  {
    id: 'bedtime-routine',
    name: 'Bedtime Routine',
    description: 'Wind down for better sleep',
    category: 'wellness',
    trigger_phrase: 'bedtime',
    commands: [
      'set mood sleep',
      'show tomorrow calendar',
      'set alarm {time}',
      'good night'
    ],
    variables: [
      {
        name: 'time',
        defaultValue: '7:00 AM',
        description: 'Wake up time'
      }
    ],
    icon: '🌙'
  },

  // Quick Actions
  {
    id: 'quick-status',
    name: 'Quick Status Update',
    description: 'Fast overview of everything important',
    category: 'general',
    trigger_phrase: 'status update',
    commands: [
      'show weather',
      'show calendar',
      'check reminders',
      'who\'s online'
    ],
    icon: '⚡'
  },
  {
    id: 'emergency-info',
    name: 'Emergency Info',
    description: 'Quick access to important information',
    category: 'general',
    trigger_phrase: 'emergency',
    commands: [
      'show current location',
      'show emergency contacts',
      'call emergency services'
    ],
    icon: '🚨'
  }
];

export const MACRO_CATEGORIES = [
  { value: 'general', label: 'General', icon: '📌' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎮' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'wellness', label: 'Health & Wellness', icon: '💚' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'custom', label: 'Custom', icon: '⭐' },
] as const;
