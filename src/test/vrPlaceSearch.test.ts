import { describe, it, expect } from 'vitest';
import { mapNominatim } from '@/worlds/search/placeSearch';
describe('VR city search', () => {
  it('maps OpenStreetMap places to results', () => {
    const r = mapNominatim([{ place_id: 1, lat: '9.93', lon: '76.26', name: 'Kochi', display_name: 'Kochi, Ernakulam, Kerala, India' }, { lat: 'x', lon: '1' }]);
    expect(r).toEqual([{ id: 'c:1', name: 'Kochi', detail: 'Ernakulam, Kerala, India', lat: 9.93, lng: 76.26 }]);
  });
});
