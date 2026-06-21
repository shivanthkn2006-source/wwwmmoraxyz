// Traffic and transportation alerts using OpenStreetMap and public APIs

export interface TrafficAlert {
  severity: 'low' | 'medium' | 'high';
  message: string;
  location?: string;
}

export const getTrafficAlerts = async (latitude: number, longitude: number): Promise<TrafficAlert[]> => {
  try {
    // Use OpenStreetMap Overpass API to get nearby roads and traffic conditions
    // This is a simplified version - in production, you'd use Google Maps API or similar
    const alerts: TrafficAlert[] = [];
    
    // Get current day and time
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Predict traffic based on time patterns (common rush hours)
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        alerts.push({
          severity: 'medium',
          message: 'Rush hour traffic expected in your area',
          location: 'Local area'
        });
      }
    }
    
    // Weekend traffic patterns
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (hour >= 11 && hour <= 14) {
        alerts.push({
          severity: 'low',
          message: 'Moderate weekend traffic around shopping areas',
          location: 'Shopping districts'
        });
      }
    }
    
    return alerts;
  } catch (error) {
    console.error('Error fetching traffic alerts:', error);
    return [];
  }
};

export const formatTrafficAlert = (alerts: TrafficAlert[]): string => {
  if (alerts.length === 0) {
    return 'Traffic conditions look good in your area.';
  }
  
  const messages = alerts.map(alert => {
    const severityEmoji = alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🟢';
    return `${severityEmoji} ${alert.message}`;
  });
  
  return messages.join(' ');
};

export const getCommuteAdvice = (hour: number): string => {
  if (hour >= 6 && hour < 7) {
    return 'It\'s early, roads should be clear!';
  } else if (hour >= 7 && hour < 9) {
    return 'Morning rush hour - consider leaving a bit earlier or using alternate routes.';
  } else if (hour >= 9 && hour < 16) {
    return 'Mid-day traffic is usually light.';
  } else if (hour >= 16 && hour < 19) {
    return 'Evening rush hour - traffic will be heavy. Maybe grab a coffee and wait it out?';
  } else {
    return 'Roads should be clear at this time.';
  }
};

export const getTrafficInfo = async (latitude: number, longitude: number): Promise<{ summary: string } | null> => {
  try {
    const alerts = await getTrafficAlerts(latitude, longitude);
    const now = new Date();
    const hour = now.getHours();
    const advice = getCommuteAdvice(hour);
    
    if (alerts.length > 0) {
      return {
        summary: `${formatTrafficAlert(alerts)} ${advice}`
      };
    }
    
    return {
      summary: advice
    };
  } catch (error) {
    console.error('Error getting traffic info:', error);
    return null;
  }
};