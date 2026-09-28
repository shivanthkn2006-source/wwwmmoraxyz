/**
 * Local weather for Zoe, always from the member's own device location
 * (never a server region). Free Open-Meteo, no key. Returns a spoken line.
 */
import { getGrantedCoords, getSharedCoords } from '@/utils/sharedGeolocation';
import { getWeatherCondition } from '@/utils/weatherHelpers';

export const WEATHER_QUESTION = /\b(weather|forecast|temperature|umbrella|rain(?:ing|y)?|humid(?:ity)?|sunny|cloudy|snow(?:ing)?|jacket)\b|\b(?:is it|it'?s)\s+(?:hot|cold)\s+(?:outside|today|now)\b/i;

async function resolveCoords(): Promise<{ lat: number; lng: number } | null> {
  const granted = await getGrantedCoords();
  if (granted) return granted;
  // The member asked directly, so a one-time browser prompt is acceptable.
  await getSharedCoords();
  return getGrantedCoords();
}

export async function localWeatherLine(question = ''): Promise<string> {
  const coords = await resolveCoords();
  if (!coords) return "I can't reach your location yet. Please allow location for M'Mora and ask me again.";
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    let place = 'your area';
    try {
      const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`);
      if (geo.ok) {
        const g = await geo.json();
        place = g.address?.city || g.address?.town || g.address?.village || g.address?.county || place;
      }
    } catch { /* place name is optional */ }
    const temp = Math.round(data.current_weather?.temperature);
    const condition = getWeatherCondition(data.current_weather?.weathercode);
    const rain = Number(data.daily?.precipitation_probability_max?.[0] ?? 0);
    const hi = Math.round(data.daily?.temperature_2m_max?.[0]);
    const lo = Math.round(data.daily?.temperature_2m_min?.[0]);
    let line = `Right now in ${place} it's ${temp} degrees with ${condition}. Today ranges from ${lo} to ${hi}, with a ${rain} percent chance of rain.`;
    if (/umbrella|rain/i.test(question) || rain >= 40) {
      line += rain >= 40 ? ' Yes, take an umbrella.' : ' No umbrella needed today.';
    }
    return line;
  } catch {
    return "I couldn't fetch the weather just now. Please try again in a moment.";
  }
}
