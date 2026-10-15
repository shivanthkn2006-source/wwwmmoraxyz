import { describe, it, expect } from 'vitest';
import { readWeather } from '@/worlds/mmora/VillageSky';

describe('village weather reading', () => {
  it('drizzle code → rain', () => expect(readWeather({ current: { weather_code: 53, precipitation: 0.2, rain: 0.2 } })?.kind).toBe('rain'));
  it('overcast code but rain falling now → rain', () => expect(readWeather({ current: { weather_code: 3, precipitation: 0.4, rain: 0.4, showers: 0 } })?.kind).toBe('rain'));
  it('thunderstorm in the current or next hour → storm', () => {
    expect(readWeather({ current: { weather_code: 61, precipitation: 1 }, hourly: { weather_code: [61, 95, 80] } })?.kind).toBe('storm');
    expect(readWeather({ current: { weather_code: 96 } })?.kind).toBe('storm');
  });
  it('dry and clear → clear', () => expect(readWeather({ current: { weather_code: 1, precipitation: 0 }, hourly: { weather_code: [1, 2, 3] } })?.kind).toBe('clear'));
  it('bad reply → null (keeps the last sky)', () => expect(readWeather({})).toBeNull());
});
