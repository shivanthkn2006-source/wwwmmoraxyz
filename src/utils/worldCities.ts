/**
 * WORLD CITIES DATABASE - Comprehensive coordinates for global places
 * Used by Career Divinity Engine for accurate Lagna calculations
 * Part of Zoe Infinity DHF Core - Standalone System
 */

export interface CityData {
  name: string;
  country: string;
  continent: string;
  lat: number;
  lng: number;
  timezone: number; // UTC offset in hours
}

// Comprehensive world cities with coordinates and timezone offsets
export const WORLD_CITIES: CityData[] = [
  // ═══════════════════════════════════════════════════════════════════
  // ASIA
  // ═══════════════════════════════════════════════════════════════════
  // India (IST = UTC+5.5)
  { name: 'Trivandrum', country: 'India', continent: 'Asia', lat: 8.5241, lng: 76.9366, timezone: 5.5 },
  { name: 'Thiruvananthapuram', country: 'India', continent: 'Asia', lat: 8.5241, lng: 76.9366, timezone: 5.5 },
  { name: 'Chennai', country: 'India', continent: 'Asia', lat: 13.0827, lng: 80.2707, timezone: 5.5 },
  { name: 'Madras', country: 'India', continent: 'Asia', lat: 13.0827, lng: 80.2707, timezone: 5.5 },
  { name: 'Mumbai', country: 'India', continent: 'Asia', lat: 19.0760, lng: 72.8777, timezone: 5.5 },
  { name: 'Bombay', country: 'India', continent: 'Asia', lat: 19.0760, lng: 72.8777, timezone: 5.5 },
  { name: 'Delhi', country: 'India', continent: 'Asia', lat: 28.6139, lng: 77.2090, timezone: 5.5 },
  { name: 'New Delhi', country: 'India', continent: 'Asia', lat: 28.6139, lng: 77.2090, timezone: 5.5 },
  { name: 'Bangalore', country: 'India', continent: 'Asia', lat: 12.9716, lng: 77.5946, timezone: 5.5 },
  { name: 'Bengaluru', country: 'India', continent: 'Asia', lat: 12.9716, lng: 77.5946, timezone: 5.5 },
  { name: 'Hyderabad', country: 'India', continent: 'Asia', lat: 17.3850, lng: 78.4867, timezone: 5.5 },
  { name: 'Kolkata', country: 'India', continent: 'Asia', lat: 22.5726, lng: 88.3639, timezone: 5.5 },
  { name: 'Calcutta', country: 'India', continent: 'Asia', lat: 22.5726, lng: 88.3639, timezone: 5.5 },
  { name: 'Pune', country: 'India', continent: 'Asia', lat: 18.5204, lng: 73.8567, timezone: 5.5 },
  { name: 'Ahmedabad', country: 'India', continent: 'Asia', lat: 23.0225, lng: 72.5714, timezone: 5.5 },
  { name: 'Jaipur', country: 'India', continent: 'Asia', lat: 26.9124, lng: 75.7873, timezone: 5.5 },
  { name: 'Lucknow', country: 'India', continent: 'Asia', lat: 26.8467, lng: 80.9462, timezone: 5.5 },
  { name: 'Kochi', country: 'India', continent: 'Asia', lat: 9.9312, lng: 76.2673, timezone: 5.5 },
  { name: 'Cochin', country: 'India', continent: 'Asia', lat: 9.9312, lng: 76.2673, timezone: 5.5 },
  { name: 'Coimbatore', country: 'India', continent: 'Asia', lat: 11.0168, lng: 76.9558, timezone: 5.5 },
  { name: 'Madurai', country: 'India', continent: 'Asia', lat: 9.9252, lng: 78.1198, timezone: 5.5 },
  { name: 'Visakhapatnam', country: 'India', continent: 'Asia', lat: 17.6868, lng: 83.2185, timezone: 5.5 },
  { name: 'Bhopal', country: 'India', continent: 'Asia', lat: 23.2599, lng: 77.4126, timezone: 5.5 },
  { name: 'Indore', country: 'India', continent: 'Asia', lat: 22.7196, lng: 75.8577, timezone: 5.5 },
  { name: 'Surat', country: 'India', continent: 'Asia', lat: 21.1702, lng: 72.8311, timezone: 5.5 },
  { name: 'Nagpur', country: 'India', continent: 'Asia', lat: 21.1458, lng: 79.0882, timezone: 5.5 },
  { name: 'Patna', country: 'India', continent: 'Asia', lat: 25.5941, lng: 85.1376, timezone: 5.5 },
  { name: 'Varanasi', country: 'India', continent: 'Asia', lat: 25.3176, lng: 82.9739, timezone: 5.5 },
  { name: 'Banaras', country: 'India', continent: 'Asia', lat: 25.3176, lng: 82.9739, timezone: 5.5 },
  { name: 'Agra', country: 'India', continent: 'Asia', lat: 27.1767, lng: 78.0081, timezone: 5.5 },
  { name: 'Kanpur', country: 'India', continent: 'Asia', lat: 26.4499, lng: 80.3319, timezone: 5.5 },
  { name: 'Amritsar', country: 'India', continent: 'Asia', lat: 31.6340, lng: 74.8723, timezone: 5.5 },
  { name: 'Chandigarh', country: 'India', continent: 'Asia', lat: 30.7333, lng: 76.7794, timezone: 5.5 },
  { name: 'Mysore', country: 'India', continent: 'Asia', lat: 12.2958, lng: 76.6394, timezone: 5.5 },
  { name: 'Mysuru', country: 'India', continent: 'Asia', lat: 12.2958, lng: 76.6394, timezone: 5.5 },
  { name: 'Goa', country: 'India', continent: 'Asia', lat: 15.2993, lng: 74.1240, timezone: 5.5 },
  { name: 'Mangalore', country: 'India', continent: 'Asia', lat: 12.9141, lng: 74.8560, timezone: 5.5 },
  { name: 'Pondicherry', country: 'India', continent: 'Asia', lat: 11.9416, lng: 79.8083, timezone: 5.5 },
  { name: 'Puducherry', country: 'India', continent: 'Asia', lat: 11.9416, lng: 79.8083, timezone: 5.5 },
  { name: 'Thrissur', country: 'India', continent: 'Asia', lat: 10.5276, lng: 76.2144, timezone: 5.5 },
  { name: 'Kozhikode', country: 'India', continent: 'Asia', lat: 11.2588, lng: 75.7804, timezone: 5.5 },
  { name: 'Calicut', country: 'India', continent: 'Asia', lat: 11.2588, lng: 75.7804, timezone: 5.5 },
  { name: 'Gurugram', country: 'India', continent: 'Asia', lat: 28.4595, lng: 77.0266, timezone: 5.5 },
  { name: 'Gurgaon', country: 'India', continent: 'Asia', lat: 28.4595, lng: 77.0266, timezone: 5.5 },
  { name: 'Noida', country: 'India', continent: 'Asia', lat: 28.5355, lng: 77.3910, timezone: 5.5 },
  { name: 'Ranchi', country: 'India', continent: 'Asia', lat: 23.3441, lng: 85.3096, timezone: 5.5 },
  { name: 'Bhubaneswar', country: 'India', continent: 'Asia', lat: 20.2961, lng: 85.8245, timezone: 5.5 },
  { name: 'Guwahati', country: 'India', continent: 'Asia', lat: 26.1445, lng: 91.7362, timezone: 5.5 },
  { name: 'Shimla', country: 'India', continent: 'Asia', lat: 31.1048, lng: 77.1734, timezone: 5.5 },
  { name: 'Srinagar', country: 'India', continent: 'Asia', lat: 34.0837, lng: 74.7973, timezone: 5.5 },
  { name: 'Dehradun', country: 'India', continent: 'Asia', lat: 30.3165, lng: 78.0322, timezone: 5.5 },
  
  // China (UTC+8)
  { name: 'Beijing', country: 'China', continent: 'Asia', lat: 39.9042, lng: 116.4074, timezone: 8 },
  { name: 'Shanghai', country: 'China', continent: 'Asia', lat: 31.2304, lng: 121.4737, timezone: 8 },
  { name: 'Guangzhou', country: 'China', continent: 'Asia', lat: 23.1291, lng: 113.2644, timezone: 8 },
  { name: 'Shenzhen', country: 'China', continent: 'Asia', lat: 22.5431, lng: 114.0579, timezone: 8 },
  { name: 'Hong Kong', country: 'China', continent: 'Asia', lat: 22.3193, lng: 114.1694, timezone: 8 },
  
  // Japan (UTC+9)
  { name: 'Tokyo', country: 'Japan', continent: 'Asia', lat: 35.6762, lng: 139.6503, timezone: 9 },
  { name: 'Osaka', country: 'Japan', continent: 'Asia', lat: 34.6937, lng: 135.5023, timezone: 9 },
  { name: 'Kyoto', country: 'Japan', continent: 'Asia', lat: 35.0116, lng: 135.7681, timezone: 9 },
  { name: 'Yokohama', country: 'Japan', continent: 'Asia', lat: 35.4437, lng: 139.6380, timezone: 9 },
  { name: 'Nagoya', country: 'Japan', continent: 'Asia', lat: 35.1815, lng: 136.9066, timezone: 9 },
  
  // South Korea (UTC+9)
  { name: 'Seoul', country: 'South Korea', continent: 'Asia', lat: 37.5665, lng: 126.9780, timezone: 9 },
  { name: 'Busan', country: 'South Korea', continent: 'Asia', lat: 35.1796, lng: 129.0756, timezone: 9 },
  { name: 'Incheon', country: 'South Korea', continent: 'Asia', lat: 37.4563, lng: 126.7052, timezone: 9 },
  
  // Southeast Asia
  { name: 'Singapore', country: 'Singapore', continent: 'Asia', lat: 1.3521, lng: 103.8198, timezone: 8 },
  { name: 'Bangkok', country: 'Thailand', continent: 'Asia', lat: 13.7563, lng: 100.5018, timezone: 7 },
  { name: 'Chiang Mai', country: 'Thailand', continent: 'Asia', lat: 18.7883, lng: 98.9853, timezone: 7 },
  { name: 'Phuket', country: 'Thailand', continent: 'Asia', lat: 7.8804, lng: 98.3923, timezone: 7 },
  { name: 'Jakarta', country: 'Indonesia', continent: 'Asia', lat: -6.2088, lng: 106.8456, timezone: 7 },
  { name: 'Bali', country: 'Indonesia', continent: 'Asia', lat: -8.3405, lng: 115.0920, timezone: 8 },
  { name: 'Kuala Lumpur', country: 'Malaysia', continent: 'Asia', lat: 3.1390, lng: 101.6869, timezone: 8 },
  { name: 'Penang', country: 'Malaysia', continent: 'Asia', lat: 5.4141, lng: 100.3288, timezone: 8 },
  { name: 'Manila', country: 'Philippines', continent: 'Asia', lat: 14.5995, lng: 120.9842, timezone: 8 },
  { name: 'Cebu', country: 'Philippines', continent: 'Asia', lat: 10.3157, lng: 123.8854, timezone: 8 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', continent: 'Asia', lat: 10.8231, lng: 106.6297, timezone: 7 },
  { name: 'Hanoi', country: 'Vietnam', continent: 'Asia', lat: 21.0285, lng: 105.8542, timezone: 7 },
  
  // Middle East
  { name: 'Dubai', country: 'UAE', continent: 'Asia', lat: 25.2048, lng: 55.2708, timezone: 4 },
  { name: 'Abu Dhabi', country: 'UAE', continent: 'Asia', lat: 24.4539, lng: 54.3773, timezone: 4 },
  { name: 'Riyadh', country: 'Saudi Arabia', continent: 'Asia', lat: 24.7136, lng: 46.6753, timezone: 3 },
  { name: 'Jeddah', country: 'Saudi Arabia', continent: 'Asia', lat: 21.4858, lng: 39.1925, timezone: 3 },
  { name: 'Tel Aviv', country: 'Israel', continent: 'Asia', lat: 32.0853, lng: 34.7818, timezone: 2 },
  { name: 'Jerusalem', country: 'Israel', continent: 'Asia', lat: 31.7683, lng: 35.2137, timezone: 2 },
  { name: 'Istanbul', country: 'Turkey', continent: 'Asia', lat: 41.0082, lng: 28.9784, timezone: 3 },
  { name: 'Ankara', country: 'Turkey', continent: 'Asia', lat: 39.9334, lng: 32.8597, timezone: 3 },
  { name: 'Tehran', country: 'Iran', continent: 'Asia', lat: 35.6892, lng: 51.3890, timezone: 3.5 },
  
  // Pakistan/Bangladesh/Sri Lanka
  { name: 'Karachi', country: 'Pakistan', continent: 'Asia', lat: 24.8607, lng: 67.0011, timezone: 5 },
  { name: 'Lahore', country: 'Pakistan', continent: 'Asia', lat: 31.5204, lng: 74.3587, timezone: 5 },
  { name: 'Islamabad', country: 'Pakistan', continent: 'Asia', lat: 33.6844, lng: 73.0479, timezone: 5 },
  { name: 'Dhaka', country: 'Bangladesh', continent: 'Asia', lat: 23.8103, lng: 90.4125, timezone: 6 },
  { name: 'Colombo', country: 'Sri Lanka', continent: 'Asia', lat: 6.9271, lng: 79.8612, timezone: 5.5 },
  
  // ═══════════════════════════════════════════════════════════════════
  // EUROPE
  // ═══════════════════════════════════════════════════════════════════
  { name: 'London', country: 'United Kingdom', continent: 'Europe', lat: 51.5074, lng: -0.1278, timezone: 0 },
  { name: 'Manchester', country: 'United Kingdom', continent: 'Europe', lat: 53.4808, lng: -2.2426, timezone: 0 },
  { name: 'Birmingham', country: 'United Kingdom', continent: 'Europe', lat: 52.4862, lng: -1.8904, timezone: 0 },
  { name: 'Edinburgh', country: 'United Kingdom', continent: 'Europe', lat: 55.9533, lng: -3.1883, timezone: 0 },
  { name: 'Glasgow', country: 'United Kingdom', continent: 'Europe', lat: 55.8642, lng: -4.2518, timezone: 0 },
  { name: 'Paris', country: 'France', continent: 'Europe', lat: 48.8566, lng: 2.3522, timezone: 1 },
  { name: 'Marseille', country: 'France', continent: 'Europe', lat: 43.2965, lng: 5.3698, timezone: 1 },
  { name: 'Lyon', country: 'France', continent: 'Europe', lat: 45.7640, lng: 4.8357, timezone: 1 },
  { name: 'Nice', country: 'France', continent: 'Europe', lat: 43.7102, lng: 7.2620, timezone: 1 },
  { name: 'Berlin', country: 'Germany', continent: 'Europe', lat: 52.5200, lng: 13.4050, timezone: 1 },
  { name: 'Munich', country: 'Germany', continent: 'Europe', lat: 48.1351, lng: 11.5820, timezone: 1 },
  { name: 'Hamburg', country: 'Germany', continent: 'Europe', lat: 53.5511, lng: 9.9937, timezone: 1 },
  { name: 'Frankfurt', country: 'Germany', continent: 'Europe', lat: 50.1109, lng: 8.6821, timezone: 1 },
  { name: 'Cologne', country: 'Germany', continent: 'Europe', lat: 50.9375, lng: 6.9603, timezone: 1 },
  { name: 'Rome', country: 'Italy', continent: 'Europe', lat: 41.9028, lng: 12.4964, timezone: 1 },
  { name: 'Milan', country: 'Italy', continent: 'Europe', lat: 45.4642, lng: 9.1900, timezone: 1 },
  { name: 'Venice', country: 'Italy', continent: 'Europe', lat: 45.4408, lng: 12.3155, timezone: 1 },
  { name: 'Florence', country: 'Italy', continent: 'Europe', lat: 43.7696, lng: 11.2558, timezone: 1 },
  { name: 'Naples', country: 'Italy', continent: 'Europe', lat: 40.8518, lng: 14.2681, timezone: 1 },
  { name: 'Madrid', country: 'Spain', continent: 'Europe', lat: 40.4168, lng: -3.7038, timezone: 1 },
  { name: 'Barcelona', country: 'Spain', continent: 'Europe', lat: 41.3851, lng: 2.1734, timezone: 1 },
  { name: 'Valencia', country: 'Spain', continent: 'Europe', lat: 39.4699, lng: -0.3763, timezone: 1 },
  { name: 'Seville', country: 'Spain', continent: 'Europe', lat: 37.3891, lng: -5.9845, timezone: 1 },
  { name: 'Amsterdam', country: 'Netherlands', continent: 'Europe', lat: 52.3676, lng: 4.9041, timezone: 1 },
  { name: 'Rotterdam', country: 'Netherlands', continent: 'Europe', lat: 51.9244, lng: 4.4777, timezone: 1 },
  { name: 'Brussels', country: 'Belgium', continent: 'Europe', lat: 50.8503, lng: 4.3517, timezone: 1 },
  { name: 'Vienna', country: 'Austria', continent: 'Europe', lat: 48.2082, lng: 16.3738, timezone: 1 },
  { name: 'Zurich', country: 'Switzerland', continent: 'Europe', lat: 47.3769, lng: 8.5417, timezone: 1 },
  { name: 'Geneva', country: 'Switzerland', continent: 'Europe', lat: 46.2044, lng: 6.1432, timezone: 1 },
  { name: 'Lisbon', country: 'Portugal', continent: 'Europe', lat: 38.7223, lng: -9.1393, timezone: 0 },
  { name: 'Porto', country: 'Portugal', continent: 'Europe', lat: 41.1579, lng: -8.6291, timezone: 0 },
  { name: 'Athens', country: 'Greece', continent: 'Europe', lat: 37.9838, lng: 23.7275, timezone: 2 },
  { name: 'Warsaw', country: 'Poland', continent: 'Europe', lat: 52.2297, lng: 21.0122, timezone: 1 },
  { name: 'Krakow', country: 'Poland', continent: 'Europe', lat: 50.0647, lng: 19.9450, timezone: 1 },
  { name: 'Prague', country: 'Czech Republic', continent: 'Europe', lat: 50.0755, lng: 14.4378, timezone: 1 },
  { name: 'Budapest', country: 'Hungary', continent: 'Europe', lat: 47.4979, lng: 19.0402, timezone: 1 },
  { name: 'Moscow', country: 'Russia', continent: 'Europe', lat: 55.7558, lng: 37.6173, timezone: 3 },
  { name: 'St Petersburg', country: 'Russia', continent: 'Europe', lat: 59.9311, lng: 30.3609, timezone: 3 },
  { name: 'Stockholm', country: 'Sweden', continent: 'Europe', lat: 59.3293, lng: 18.0686, timezone: 1 },
  { name: 'Oslo', country: 'Norway', continent: 'Europe', lat: 59.9139, lng: 10.7522, timezone: 1 },
  { name: 'Copenhagen', country: 'Denmark', continent: 'Europe', lat: 55.6761, lng: 12.5683, timezone: 1 },
  { name: 'Helsinki', country: 'Finland', continent: 'Europe', lat: 60.1699, lng: 24.9384, timezone: 2 },
  { name: 'Dublin', country: 'Ireland', continent: 'Europe', lat: 53.3498, lng: -6.2603, timezone: 0 },
  { name: 'Reykjavik', country: 'Iceland', continent: 'Europe', lat: 64.1466, lng: -21.9426, timezone: 0 },
  
  // ═══════════════════════════════════════════════════════════════════
  // NORTH AMERICA
  // ═══════════════════════════════════════════════════════════════════
  { name: 'New York', country: 'USA', continent: 'North America', lat: 40.7128, lng: -74.0060, timezone: -5 },
  { name: 'Los Angeles', country: 'USA', continent: 'North America', lat: 34.0522, lng: -118.2437, timezone: -8 },
  { name: 'Chicago', country: 'USA', continent: 'North America', lat: 41.8781, lng: -87.6298, timezone: -6 },
  { name: 'Houston', country: 'USA', continent: 'North America', lat: 29.7604, lng: -95.3698, timezone: -6 },
  { name: 'Phoenix', country: 'USA', continent: 'North America', lat: 33.4484, lng: -112.0740, timezone: -7 },
  { name: 'Philadelphia', country: 'USA', continent: 'North America', lat: 39.9526, lng: -75.1652, timezone: -5 },
  { name: 'San Antonio', country: 'USA', continent: 'North America', lat: 29.4241, lng: -98.4936, timezone: -6 },
  { name: 'San Diego', country: 'USA', continent: 'North America', lat: 32.7157, lng: -117.1611, timezone: -8 },
  { name: 'Dallas', country: 'USA', continent: 'North America', lat: 32.7767, lng: -96.7970, timezone: -6 },
  { name: 'San Francisco', country: 'USA', continent: 'North America', lat: 37.7749, lng: -122.4194, timezone: -8 },
  { name: 'Miami', country: 'USA', continent: 'North America', lat: 25.7617, lng: -80.1918, timezone: -5 },
  { name: 'Seattle', country: 'USA', continent: 'North America', lat: 47.6062, lng: -122.3321, timezone: -8 },
  { name: 'Boston', country: 'USA', continent: 'North America', lat: 42.3601, lng: -71.0589, timezone: -5 },
  { name: 'Las Vegas', country: 'USA', continent: 'North America', lat: 36.1699, lng: -115.1398, timezone: -8 },
  { name: 'Washington DC', country: 'USA', continent: 'North America', lat: 38.9072, lng: -77.0369, timezone: -5 },
  { name: 'Denver', country: 'USA', continent: 'North America', lat: 39.7392, lng: -104.9903, timezone: -7 },
  { name: 'Atlanta', country: 'USA', continent: 'North America', lat: 33.7490, lng: -84.3880, timezone: -5 },
  { name: 'Toronto', country: 'Canada', continent: 'North America', lat: 43.6532, lng: -79.3832, timezone: -5 },
  { name: 'Vancouver', country: 'Canada', continent: 'North America', lat: 49.2827, lng: -123.1207, timezone: -8 },
  { name: 'Montreal', country: 'Canada', continent: 'North America', lat: 45.5017, lng: -73.5673, timezone: -5 },
  { name: 'Calgary', country: 'Canada', continent: 'North America', lat: 51.0447, lng: -114.0719, timezone: -7 },
  { name: 'Ottawa', country: 'Canada', continent: 'North America', lat: 45.4215, lng: -75.6972, timezone: -5 },
  { name: 'Mexico City', country: 'Mexico', continent: 'North America', lat: 19.4326, lng: -99.1332, timezone: -6 },
  { name: 'Guadalajara', country: 'Mexico', continent: 'North America', lat: 20.6597, lng: -103.3496, timezone: -6 },
  { name: 'Monterrey', country: 'Mexico', continent: 'North America', lat: 25.6866, lng: -100.3161, timezone: -6 },
  { name: 'Cancun', country: 'Mexico', continent: 'North America', lat: 21.1619, lng: -86.8515, timezone: -5 },
  
  // ═══════════════════════════════════════════════════════════════════
  // SOUTH AMERICA
  // ═══════════════════════════════════════════════════════════════════
  { name: 'São Paulo', country: 'Brazil', continent: 'South America', lat: -23.5505, lng: -46.6333, timezone: -3 },
  { name: 'Rio de Janeiro', country: 'Brazil', continent: 'South America', lat: -22.9068, lng: -43.1729, timezone: -3 },
  { name: 'Brasília', country: 'Brazil', continent: 'South America', lat: -15.7975, lng: -47.8919, timezone: -3 },
  { name: 'Salvador', country: 'Brazil', continent: 'South America', lat: -12.9714, lng: -38.5014, timezone: -3 },
  { name: 'Buenos Aires', country: 'Argentina', continent: 'South America', lat: -34.6037, lng: -58.3816, timezone: -3 },
  { name: 'Córdoba', country: 'Argentina', continent: 'South America', lat: -31.4201, lng: -64.1888, timezone: -3 },
  { name: 'Bogotá', country: 'Colombia', continent: 'South America', lat: 4.7110, lng: -74.0721, timezone: -5 },
  { name: 'Medellín', country: 'Colombia', continent: 'South America', lat: 6.2442, lng: -75.5812, timezone: -5 },
  { name: 'Lima', country: 'Peru', continent: 'South America', lat: -12.0464, lng: -77.0428, timezone: -5 },
  { name: 'Santiago', country: 'Chile', continent: 'South America', lat: -33.4489, lng: -70.6693, timezone: -4 },
  { name: 'Caracas', country: 'Venezuela', continent: 'South America', lat: 10.4806, lng: -66.9036, timezone: -4 },
  { name: 'Quito', country: 'Ecuador', continent: 'South America', lat: -0.1807, lng: -78.4678, timezone: -5 },
  { name: 'Montevideo', country: 'Uruguay', continent: 'South America', lat: -34.9011, lng: -56.1645, timezone: -3 },
  
  // ═══════════════════════════════════════════════════════════════════
  // AFRICA
  // ═══════════════════════════════════════════════════════════════════
  { name: 'Cape Town', country: 'South Africa', continent: 'Africa', lat: -33.9249, lng: 18.4241, timezone: 2 },
  { name: 'Johannesburg', country: 'South Africa', continent: 'Africa', lat: -26.2041, lng: 28.0473, timezone: 2 },
  { name: 'Durban', country: 'South Africa', continent: 'Africa', lat: -29.8587, lng: 31.0218, timezone: 2 },
  { name: 'Cairo', country: 'Egypt', continent: 'Africa', lat: 30.0444, lng: 31.2357, timezone: 2 },
  { name: 'Alexandria', country: 'Egypt', continent: 'Africa', lat: 31.2001, lng: 29.9187, timezone: 2 },
  { name: 'Lagos', country: 'Nigeria', continent: 'Africa', lat: 6.5244, lng: 3.3792, timezone: 1 },
  { name: 'Abuja', country: 'Nigeria', continent: 'Africa', lat: 9.0765, lng: 7.3986, timezone: 1 },
  { name: 'Nairobi', country: 'Kenya', continent: 'Africa', lat: -1.2921, lng: 36.8219, timezone: 3 },
  { name: 'Casablanca', country: 'Morocco', continent: 'Africa', lat: 33.5731, lng: -7.5898, timezone: 1 },
  { name: 'Marrakech', country: 'Morocco', continent: 'Africa', lat: 31.6295, lng: -7.9811, timezone: 1 },
  { name: 'Addis Ababa', country: 'Ethiopia', continent: 'Africa', lat: 9.0054, lng: 38.7636, timezone: 3 },
  { name: 'Accra', country: 'Ghana', continent: 'Africa', lat: 5.6037, lng: -0.1870, timezone: 0 },
  { name: 'Tunis', country: 'Tunisia', continent: 'Africa', lat: 36.8065, lng: 10.1815, timezone: 1 },
  
  // ═══════════════════════════════════════════════════════════════════
  // OCEANIA
  // ═══════════════════════════════════════════════════════════════════
  { name: 'Sydney', country: 'Australia', continent: 'Oceania', lat: -33.8688, lng: 151.2093, timezone: 10 },
  { name: 'Melbourne', country: 'Australia', continent: 'Oceania', lat: -37.8136, lng: 144.9631, timezone: 10 },
  { name: 'Brisbane', country: 'Australia', continent: 'Oceania', lat: -27.4698, lng: 153.0251, timezone: 10 },
  { name: 'Perth', country: 'Australia', continent: 'Oceania', lat: -31.9505, lng: 115.8605, timezone: 8 },
  { name: 'Adelaide', country: 'Australia', continent: 'Oceania', lat: -34.9285, lng: 138.6007, timezone: 9.5 },
  { name: 'Gold Coast', country: 'Australia', continent: 'Oceania', lat: -28.0167, lng: 153.4000, timezone: 10 },
  { name: 'Auckland', country: 'New Zealand', continent: 'Oceania', lat: -36.8485, lng: 174.7633, timezone: 12 },
  { name: 'Wellington', country: 'New Zealand', continent: 'Oceania', lat: -41.2865, lng: 174.7762, timezone: 12 },
  { name: 'Christchurch', country: 'New Zealand', continent: 'Oceania', lat: -43.5321, lng: 172.6362, timezone: 12 },
  { name: 'Suva', country: 'Fiji', continent: 'Oceania', lat: -18.1416, lng: 178.4419, timezone: 12 },
];

// Build search index for fast lookup
const searchIndex = new Map<string, CityData[]>();
WORLD_CITIES.forEach(city => {
  const keys = [
    city.name.toLowerCase(),
    city.country.toLowerCase(),
    `${city.name.toLowerCase()}, ${city.country.toLowerCase()}`
  ];
  keys.forEach(key => {
    // Index by first 2-3 characters for quick prefix search
    for (let i = 2; i <= Math.min(key.length, 4); i++) {
      const prefix = key.slice(0, i);
      if (!searchIndex.has(prefix)) {
        searchIndex.set(prefix, []);
      }
      const arr = searchIndex.get(prefix)!;
      if (!arr.includes(city)) arr.push(city);
    }
  });
});

/**
 * Search cities by partial name - fast autocomplete
 * Returns up to 10 matching cities
 */
export const searchCities = (query: string, limit = 10): CityData[] => {
  if (!query || query.length < 2) return [];
  
  const normalized = query.toLowerCase().trim();
  
  // Get candidates from prefix index
  const candidates = searchIndex.get(normalized.slice(0, Math.min(normalized.length, 3))) || [];
  
  // Filter and score by match quality
  const matches = candidates
    .filter(city => 
      city.name.toLowerCase().includes(normalized) ||
      city.country.toLowerCase().includes(normalized) ||
      `${city.name.toLowerCase()}, ${city.country.toLowerCase()}`.includes(normalized)
    )
    .map(city => ({
      city,
      score: city.name.toLowerCase().startsWith(normalized) ? 2 :
             city.name.toLowerCase().includes(normalized) ? 1 : 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(m => m.city);
  
  // If no matches from index, do full scan (fallback)
  if (matches.length === 0) {
    return WORLD_CITIES
      .filter(city => 
        city.name.toLowerCase().includes(normalized) ||
        city.country.toLowerCase().includes(normalized)
      )
      .slice(0, limit);
  }
  
  return matches;
};

/**
 * Get city coordinates by name - handles partial matches
 */
export const getCityData = (query: string): CityData | null => {
  if (!query) return null;
  
  const normalized = query.toLowerCase().trim();
  
  // Exact match first
  const exact = WORLD_CITIES.find(c => c.name.toLowerCase() === normalized);
  if (exact) return exact;
  
  // Partial match
  const partial = WORLD_CITIES.find(c => 
    c.name.toLowerCase().includes(normalized) ||
    normalized.includes(c.name.toLowerCase())
  );
  
  return partial || null;
};

/**
 * Default location (Trivandrum, India)
 */
export const DEFAULT_CITY: CityData = {
  name: 'Trivandrum',
  country: 'India',
  continent: 'Asia',
  lat: 8.5241,
  lng: 76.9366,
  timezone: 5.5
};
