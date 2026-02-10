import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Circle } from 'lucide-react';

interface StatusSelectorProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ currentStatus, onStatusChange }) => {
  // Statuses in alphabetical order
  const statuses = [
    { value: 'away', label: 'Away', color: 'hsl(45, 93%, 47%)' },
    { value: 'cooking', label: 'Cooking', color: 'hsl(30, 100%, 50%)' },
    { value: 'dining', label: 'Dining', color: 'hsl(15, 85%, 55%)' },
    { value: 'driving', label: 'Driving', color: 'hsl(210, 90%, 55%)' },
    { value: 'family_time', label: 'Family Time', color: 'hsl(280, 65%, 60%)' },
    { value: 'farming', label: 'Farming', color: 'hsl(100, 60%, 45%)' },
    { value: 'fitness', label: 'Fitness', color: 'hsl(5, 80%, 55%)' },
    { value: 'gaming', label: 'Gaming', color: 'hsl(260, 80%, 60%)' },
    { value: 'library', label: 'Library', color: 'hsl(200, 60%, 50%)' },
    { value: 'meditation', label: 'Meditation', color: 'hsl(270, 70%, 60%)' },
    { value: 'movie', label: 'Movie', color: 'hsl(340, 75%, 55%)' },
    { value: 'online', label: 'Online', color: 'hsl(142, 76%, 36%)' },
    { value: 'party', label: 'Party', color: 'hsl(320, 85%, 60%)' },
    { value: 'play', label: 'Play', color: 'hsl(180, 70%, 50%)' },
    { value: 'sleep', label: 'Sleep', color: 'hsl(190, 80%, 50%)' },
    { value: 'sports', label: 'Sports', color: 'hsl(10, 90%, 55%)' },
    { value: 'studying', label: 'Studying', color: 'hsl(217, 91%, 60%)' },
    { value: 'transit', label: 'In Transit', color: 'hsl(25, 95%, 53%)' },
    { value: 'traveling', label: 'Traveling', color: 'hsl(195, 85%, 50%)' },
    { value: 'tv', label: 'Watching TV', color: 'hsl(240, 70%, 60%)' },
    { value: 'vacation', label: 'Vacation', color: 'hsl(170, 80%, 50%)' },
    { value: 'work', label: 'Work', color: 'hsl(0, 84%, 60%)' },
    { value: 'yoga', label: 'Yoga', color: 'hsl(290, 70%, 60%)' },
  ];

  const currentStatusData = statuses.find(s => s.value === currentStatus) || statuses.find(s => s.value === 'online')!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Circle className="w-3 h-3" fill={currentStatusData.color} />
          {currentStatusData.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-card/95 backdrop-blur-xl border-border max-h-[400px] overflow-y-auto">
        {statuses.map((status) => (
          <DropdownMenuItem
            key={status.value}
            onClick={() => onStatusChange(status.value)}
            className="gap-2 hover:bg-accent"
          >
            <Circle className="w-3 h-3" fill={status.color} />
            {status.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusSelector;
