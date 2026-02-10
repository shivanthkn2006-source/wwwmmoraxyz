/**
 * LOCAL TIME DISPLAY - Shows user's local time for both MMORA & Zoe Infinity
 * Provides precise time context for all calculations (astrology, circadian, etc.)
 */

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocalTimeDisplayProps {
  className?: string;
  showTimezone?: boolean;
  variant?: 'compact' | 'full';
}

export const LocalTimeDisplay: React.FC<LocalTimeDisplayProps> = ({
  className,
  showTimezone = true,
  variant = 'compact',
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: variant === 'full' ? '2-digit' : undefined,
    hour12: true,
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: variant === 'full' ? 'long' : 'short',
    month: 'short',
    day: 'numeric',
  });

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzAbbrev = time.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground/70",
        className
      )}>
        <Clock className="w-3 h-3" />
        <span>{formattedTime}</span>
        {showTimezone && <span className="opacity-60">({tzAbbrev})</span>}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-start gap-0.5 text-xs text-muted-foreground",
      className
    )}>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-primary/60" />
        <span className="font-medium">{formattedTime}</span>
      </div>
      <div className="flex items-center gap-1 pl-5">
        <span>{formattedDate}</span>
        {showTimezone && (
          <span className="text-muted-foreground/50">• {tzAbbrev}</span>
        )}
      </div>
    </div>
  );
};

// Export utility to get current time context for calculations
export const getTimeContext = () => {
  const now = new Date();
  const hours = now.getHours();
  
  return {
    timestamp: now.toISOString(),
    localTime: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    localDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeOfDay: hours < 5 ? 'night' : hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : hours < 21 ? 'evening' : 'night',
    hour: hours,
    minute: now.getMinutes(),
    second: now.getSeconds(),
    julianDay: getJulianDay(now),
    siderealTime: getSiderealTime(now),
  };
};

// Julian Day calculation for astronomical precision
const getJulianDay = (date: Date): number => {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + 
    (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
  
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
};

// Local Sidereal Time (approximation for astrology)
const getSiderealTime = (date: Date): string => {
  const jd = getJulianDay(date);
  const t = (jd - 2451545.0) / 36525;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t;
  gmst = gmst % 360;
  if (gmst < 0) gmst += 360;
  
  const hours = Math.floor(gmst / 15);
  const minutes = Math.floor((gmst % 15) * 4);
  const seconds = Math.floor(((gmst % 15) * 4 - minutes) * 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default LocalTimeDisplay;
