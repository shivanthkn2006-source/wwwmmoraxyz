import {
  BookOpen,
  Brain,
  Briefcase,
  Car,
  Circle,
  Clock,
  Dumbbell,
  Film,
  Gamepad2,
  HeartHandshake,
  Library,
  Moon,
  Navigation,
  Palmtree,
  Plane,
  Play,
  Sprout,
  Trophy,
  Tv,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

export interface CallActivityStatus {
  value: string;
  label: string;
  Icon: LucideIcon;
}

/** Matches the complete activity list already available on Profile. */
export const CALL_ACTIVITY_STATUSES: readonly CallActivityStatus[] = [
  { value: 'away', label: 'Away', Icon: Clock },
  { value: 'cooking', label: 'Cooking', Icon: Utensils },
  { value: 'dining', label: 'Dining', Icon: Utensils },
  { value: 'driving', label: 'Driving', Icon: Car },
  { value: 'family_time', label: 'Family Time', Icon: Users },
  { value: 'farming', label: 'Farming', Icon: Sprout },
  { value: 'fitness', label: 'Fitness', Icon: Dumbbell },
  { value: 'gaming', label: 'Gaming', Icon: Gamepad2 },
  { value: 'library', label: 'Library', Icon: Library },
  { value: 'meditation', label: 'Meditation', Icon: Brain },
  { value: 'movie', label: 'Movie', Icon: Film },
  { value: 'online', label: 'Online', Icon: Circle },
  { value: 'party', label: 'Party', Icon: HeartHandshake },
  { value: 'play', label: 'Play', Icon: Play },
  { value: 'sleep', label: 'Sleep', Icon: Moon },
  { value: 'sports', label: 'Sports', Icon: Trophy },
  { value: 'studying', label: 'Studying', Icon: BookOpen },
  { value: 'transit', label: 'In Transit', Icon: Navigation },
  { value: 'traveling', label: 'Traveling', Icon: Plane },
  { value: 'tv', label: 'Watching TV', Icon: Tv },
  { value: 'vacation', label: 'Vacation', Icon: Palmtree },
  { value: 'work', label: 'Work', Icon: Briefcase },
  { value: 'yoga', label: 'Yoga', Icon: HeartHandshake },
] as const;

export const getCallActivityStatus = (value?: string | null): CallActivityStatus =>
  CALL_ACTIVITY_STATUSES.find(status => status.value === value)
  ?? CALL_ACTIVITY_STATUSES.find(status => status.value === 'online')
  ?? CALL_ACTIVITY_STATUSES[0];