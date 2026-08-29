/**
 * Live world data for Zoe's ambient search.
 *
 * The synthesis model has no live feed, so "current weather" used to answer
 * "I don't have current weather data". This module fetches real, keyless
 * open data (Open-Meteo geocoding + forecast + air quality) and returns a
 * compact, fully detailed block the model can speak from.
 *
 * Everything is best-effort: any failure returns null and search behaves
 * exactly as before.
 */

export interface LiveGeo {
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  place?: string | null;
}

const WEATHER_HINTS = [
  'weather', 'temperature', 'temp ', 'forecast', 'rain', 'raining', 'snow', 'humid',
  'humidity', 'wind', 'storm', 'sunny', 'cloudy', 'hot', 'cold', 'climate', 'monsoon',
  'uv index', 'sunrise', 'sunset', 'air quality', 'aqi', 'season',
];

export const isWeatherQuery = (query: string): boolean => {
  const q = query.toLowerCase();
  return WEATHER_HINTS.some((hint) => q.includes(hint));
};

const WMO: Record<number, string> = {
  0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'fog', 48: 'rime fog', 51: 'light drizzle', 53: 'drizzle', 55: 'dense drizzle',
  56: 'freezing drizzle', 57: 'dense freezing drizzle',
  61: 'light rain', 63: 'moderate rain', 65: 'heavy rain',
  66: 'freezing rain', 67: 'heavy freezing rain',
  71: 'light snow', 73: 'moderate snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'light rain showers', 81: 'rain showers', 82: 'violent rain showers',
  85: 'snow showers', 86: 'heavy snow showers',
  95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'severe thunderstorm with hail',
};

const seasonFor = (latitude: number, date: Date): string => {
  const month = date.getUTCMonth() + 1;
  const tropical = Math.abs(latitude) < 23.5;
  if (tropical) {
    if (month >= 6 && month <= 9) return 'monsoon / wet season';
    if (month >= 3 && month <= 5) return 'hot dry season';
    return 'cooler dry season';
  }
  const north = latitude >= 0;
  const seasons = ['winter', 'spring', 'summer', 'autumn'];
  const index = month <= 2 || month === 12 ? 0 : month <= 5 ? 1 : month <= 8 ? 2 : 3;
  return north ? seasons[index] : seasons[(index + 2) % 4];
};

const comfort = (tempC: number, apparentC: number): string => {
  const t = Number.isFinite(apparentC) ? apparentC : tempC;
  if (t >= 38) return 'dangerously hot — limit outdoor exertion and hydrate';
  if (t >= 30) return 'hot';
  if (t >= 24) return 'warm and comfortable';
  if (t >= 16) return 'mild';
  if (t >= 8) return 'cool — a light jacket helps';
  if (t >= 0) return 'cold';
  return 'freezing — dress in layers';
};

const geocode = async (query: string): Promise<LiveGeo | null> => {
  // "weather in Chennai" -> "Chennai"
  const match = query.match(/\b(?:in|at|for)\s+([A-Za-z\u00C0-\u024F' .-]{2,40})$/i)
    || query.match(/\b(?:in|at|for)\s+([A-Za-z\u00C0-\u024F' .-]{2,40})\b/i);
  const place = match?.[1]?.trim();
  if (!place) return null;
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.results?.[0];
    if (!hit) return null;
    return {
      latitude: hit.latitude,
      longitude: hit.longitude,
      timezone: hit.timezone,
      place: [hit.name, hit.admin1, hit.country].filter(Boolean).join(', '),
    };
  } catch {
    return null;
  }
};

export interface LiveWeather {
  place: string;
  season: string;
  summary: string;
  block: string;
}

/**
 * Builds a fully detailed local weather brief: right now, today, the next
 * three days, air quality, sun times and the seasonal frame.
 */
export const buildLiveWeather = async (
  query: string,
  geo: LiveGeo | null | undefined,
): Promise<LiveWeather | null> => {
  if (!isWeatherQuery(query)) return null;

  let location: LiveGeo | null = (await geocode(query)) ?? null;
  if (!location && geo && typeof geo.latitude === 'number' && typeof geo.longitude === 'number') {
    location = { ...geo, place: geo.place ?? 'your current location' };
  }
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return null;
  }

  const tz = location.timezone || geo?.timezone || 'auto';
  const base = `latitude=${location.latitude}&longitude=${location.longitude}&timezone=${encodeURIComponent(tz)}`;

  try {
    const [forecastRes, airRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?${base}` +
          '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day' +
          '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,wind_speed_10m_max' +
          '&forecast_days=4',
      ),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${base}&current=pm2_5,european_aqi`).catch(() => null),
    ]);
    if (!forecastRes.ok) return null;
    const wx = await forecastRes.json();
    const air = airRes && airRes.ok ? await airRes.json().catch(() => null) : null;

    const c = wx.current ?? {};
    const d = wx.daily ?? {};
    const code = Number(c.weather_code);
    const condition = WMO[code] ?? 'unsettled conditions';
    const season = seasonFor(location.latitude, new Date());
    const feels = Number(c.apparent_temperature);
    const temp = Number(c.temperature_2m);

    const days = (d.time ?? []).slice(0, 4).map((day: string, i: number) =>
      `${day}: ${WMO[Number(d.weather_code?.[i])] ?? 'mixed'}, ${d.temperature_2m_min?.[i]}–${d.temperature_2m_max?.[i]}°C, rain chance ${d.precipitation_probability_max?.[i] ?? 0}%, precip ${d.precipitation_sum?.[i] ?? 0}mm, UV max ${d.uv_index_max?.[i] ?? 'n/a'}`,
    );

    const raining = Number(c.precipitation ?? 0) > 0 || Number(c.rain ?? 0) > 0 || Number(c.showers ?? 0) > 0;
    const snowing = Number(c.snowfall ?? 0) > 0;

    const summary = `${location.place}: ${condition}, ${temp}°C (feels ${feels}°C), ${comfort(temp, feels)}. ${
      snowing ? 'Snow falling now.' : raining ? 'Rain falling now.' : 'No precipitation right now.'
    } Season: ${season}.`;

    const block = [
      `LOCATION: ${location.place} (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}, timezone ${wx.timezone ?? tz})`,
      `SEASON: ${season}`,
      `NOW: ${condition}; temperature ${temp}°C; feels like ${feels}°C (${comfort(temp, feels)}); humidity ${c.relative_humidity_2m}%; cloud cover ${c.cloud_cover}%; wind ${c.wind_speed_10m} km/h gusting ${c.wind_gusts_10m} km/h from ${c.wind_direction_10m}°; pressure ${c.pressure_msl} hPa; precipitation ${c.precipitation ?? 0} mm; snowfall ${c.snowfall ?? 0} cm; ${c.is_day ? 'daytime' : 'night'}`,
      `RAINING NOW: ${raining ? 'yes' : 'no'}; SNOWING NOW: ${snowing ? 'yes' : 'no'}`,
      `SUN: sunrise ${d.sunrise?.[0] ?? 'n/a'}, sunset ${d.sunset?.[0] ?? 'n/a'}`,
      air?.current
        ? `AIR QUALITY: European AQI ${air.current.european_aqi ?? 'n/a'}, PM2.5 ${air.current.pm2_5 ?? 'n/a'} µg/m³`
        : 'AIR QUALITY: unavailable',
      `OUTLOOK:\n${days.join('\n')}`,
      'SOURCE: Open-Meteo live observation and forecast data.',
    ].join('\n');

    return { place: location.place ?? 'your location', season, summary, block };
  } catch (error) {
    console.warn('[live-world-data] weather fetch failed', error);
    return null;
  }
};
