import React from 'react';
import { Circle, Clock, Navigation, Briefcase, BookOpen, Utensils, Users, Sprout, Dumbbell, Gamepad2, Library, Brain, Film, Play, Trophy, Plane, Tv, Palmtree, HeartHandshake, Moon, Car } from 'lucide-react';

interface StatusIconBadgeProps {
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusIconBadge: React.FC<StatusIconBadgeProps> = ({ status, size = 'md' }) => {
  if (!status || status === 'none' || status === 'offline') return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5'
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return { icon: Circle, color: 'hsl(142, 76%, 36%)', bgColor: 'hsl(142, 76%, 96%)' };
      case 'away':
        return { icon: Clock, color: 'hsl(45, 93%, 47%)', bgColor: 'hsl(45, 93%, 95%)' };
      case 'transit':
        return { icon: Navigation, color: 'hsl(25, 95%, 53%)', bgColor: 'hsl(25, 95%, 95%)' };
      case 'driving':
        return { icon: Car, color: 'hsl(210, 90%, 55%)', bgColor: 'hsl(210, 90%, 95%)' };
      case 'work':
        return { icon: Briefcase, color: 'hsl(0, 84%, 60%)', bgColor: 'hsl(0, 84%, 95%)' };
      case 'studying':
        return { icon: BookOpen, color: 'hsl(217, 91%, 60%)', bgColor: 'hsl(217, 91%, 95%)' };
      case 'cooking':
        return { icon: Utensils, color: 'hsl(30, 100%, 50%)', bgColor: 'hsl(30, 100%, 95%)' };
      case 'dining':
        return { icon: Utensils, color: 'hsl(15, 85%, 55%)', bgColor: 'hsl(15, 85%, 95%)' };
      case 'family_time':
        return { icon: Users, color: 'hsl(280, 65%, 60%)', bgColor: 'hsl(280, 65%, 95%)' };
      case 'farming':
        return { icon: Sprout, color: 'hsl(100, 60%, 45%)', bgColor: 'hsl(100, 60%, 95%)' };
      case 'fitness':
        return { icon: Dumbbell, color: 'hsl(5, 80%, 55%)', bgColor: 'hsl(5, 80%, 95%)' };
      case 'gaming':
        return { icon: Gamepad2, color: 'hsl(260, 80%, 60%)', bgColor: 'hsl(260, 80%, 95%)' };
      case 'library':
        return { icon: Library, color: 'hsl(200, 60%, 50%)', bgColor: 'hsl(200, 60%, 95%)' };
      case 'meditation':
        return { icon: Brain, color: 'hsl(270, 70%, 60%)', bgColor: 'hsl(270, 70%, 95%)' };
      case 'movie':
        return { icon: Film, color: 'hsl(340, 75%, 55%)', bgColor: 'hsl(340, 75%, 95%)' };
      case 'party':
        return { icon: HeartHandshake, color: 'hsl(320, 85%, 60%)', bgColor: 'hsl(320, 85%, 95%)' };
      case 'play':
        return { icon: Play, color: 'hsl(180, 70%, 50%)', bgColor: 'hsl(180, 70%, 95%)' };
      case 'sleep':
        return { icon: Moon, color: 'hsl(190, 80%, 50%)', bgColor: 'hsl(190, 80%, 95%)' };
      case 'sports':
        return { icon: Trophy, color: 'hsl(10, 90%, 55%)', bgColor: 'hsl(10, 90%, 95%)' };
      case 'traveling':
        return { icon: Plane, color: 'hsl(195, 85%, 50%)', bgColor: 'hsl(195, 85%, 95%)' };
      case 'tv':
        return { icon: Tv, color: 'hsl(240, 70%, 60%)', bgColor: 'hsl(240, 70%, 95%)' };
      case 'vacation':
        return { icon: Palmtree, color: 'hsl(170, 80%, 50%)', bgColor: 'hsl(170, 80%, 95%)' };
      case 'yoga':
        return { icon: HeartHandshake, color: 'hsl(290, 70%, 60%)', bgColor: 'hsl(290, 70%, 95%)' };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={`absolute -bottom-0.5 -right-0.5 ${sizeClasses[size]} rounded-full border-2 border-background flex items-center justify-center shadow-sm transition-all duration-300`}
      style={{ 
        backgroundColor: config.bgColor,
        animation: (status === 'online' || status === 'sleep') ? 'statusPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
      }}
    >
      <Icon
        className={iconSizeClasses[size]}
        style={{ color: config.color }}
        strokeWidth={2.5}
        fill={status === 'online' ? config.color : 'none'}
      />
      <style>{`
        @keyframes statusPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 0 0 ${config.color}60, 0 2px 8px rgba(0,0,0,0.2);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.1);
            box-shadow: 0 0 0 10px ${config.color}00, 0 4px 12px rgba(0,0,0,0.3);
          }
        }
      `}</style>
    </div>
  );
};

export default StatusIconBadge;
