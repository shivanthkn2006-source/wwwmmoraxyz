// Weather and location utilities for Lisa greeting system

export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
}

export const getWeatherInfo = async (latitude: number, longitude: number): Promise<WeatherData | null> => {
  try {
    // Using Open-Meteo API (free, no API key needed)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
    );
    
    if (!response.ok) throw new Error('Weather fetch failed');
    
    const data = await response.json();
    const weather = data.current_weather;
    
    // Get location name from reverse geocoding
    const locationResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    );
    
    let locationName = 'your area';
    if (locationResponse.ok) {
      const locationData = await locationResponse.json();
      locationName = locationData.address?.city || locationData.address?.town || locationData.address?.village || 'your area';
    }
    
    return {
      temperature: Math.round(weather.temperature),
      condition: getWeatherCondition(weather.weathercode),
      location: locationName
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
};

export const getWeatherCondition = (code: number): string => {
  const conditions: { [key: number]: string } = {
    0: 'clear skies',
    1: 'mostly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'foggy',
    48: 'foggy',
    51: 'light drizzle',
    53: 'moderate drizzle',
    55: 'heavy drizzle',
    61: 'light rain',
    63: 'moderate rain',
    65: 'heavy rain',
    71: 'light snow',
    73: 'moderate snow',
    75: 'heavy snow',
    77: 'snow grains',
    80: 'rain showers',
    81: 'rain showers',
    82: 'heavy rain showers',
    85: 'snow showers',
    86: 'heavy snow showers',
    95: 'thunderstorm',
    96: 'thunderstorm with hail',
    99: 'thunderstorm with hail'
  };
  
  return conditions[code] || 'changing weather';
};

export const getUserLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 300000, // 5 minutes cache
    });
  });
};
