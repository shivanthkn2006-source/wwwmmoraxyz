// World locations including continents, countries, and major cities
// Optimized for performance with essential locations

export const WORLD_REGIONS = {
  'Asia': {
    'China': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hong Kong'],
    'India': ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'],
    'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya'],
    'Indonesia': ['Jakarta', 'Bali', 'Surabaya', 'Bandung'],
    'Thailand': ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya'],
    'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu'],
    'Malaysia': ['Kuala Lumpur', 'Penang', 'Johor Bahru'],
    'Singapore': ['Singapore'],
    'Philippines': ['Manila', 'Cebu', 'Davao'],
    'Vietnam': ['Ho Chi Minh City', 'Hanoi', 'Da Nang'],
    'Pakistan': ['Karachi', 'Lahore', 'Islamabad'],
    'Bangladesh': ['Dhaka', 'Chittagong'],
    'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah'],
    'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca'],
    'Turkey': ['Istanbul', 'Ankara', 'Izmir', 'Antalya'],
    'Israel': ['Tel Aviv', 'Jerusalem', 'Haifa'],
    'Iran': ['Tehran', 'Isfahan', 'Shiraz'],
  },
  'Europe': {
    'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow'],
    'France': ['Paris', 'Marseille', 'Lyon', 'Nice', 'Bordeaux'],
    'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
    'Italy': ['Rome', 'Milan', 'Venice', 'Florence', 'Naples'],
    'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Málaga'],
    'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague'],
    'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Bern'],
    'Belgium': ['Brussels', 'Antwerp', 'Bruges'],
    'Austria': ['Vienna', 'Salzburg', 'Innsbruck'],
    'Portugal': ['Lisbon', 'Porto', 'Faro'],
    'Greece': ['Athens', 'Thessaloniki', 'Santorini', 'Mykonos'],
    'Poland': ['Warsaw', 'Krakow', 'Gdansk'],
    'Czech Republic': ['Prague', 'Brno'],
    'Russia': ['Moscow', 'St Petersburg', 'Kazan'],
    'Sweden': ['Stockholm', 'Gothenburg', 'Malmö'],
    'Norway': ['Oslo', 'Bergen', 'Trondheim'],
    'Denmark': ['Copenhagen', 'Aarhus'],
    'Finland': ['Helsinki', 'Tampere'],
    'Ireland': ['Dublin', 'Cork', 'Galway'],
    'Iceland': ['Reykjavik'],
  },
  'North America': {
    'USA': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Francisco', 'Miami', 'Seattle', 'Boston', 'Las Vegas', 'Washington DC'],
    'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton'],
    'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Cancun', 'Tijuana'],
  },
  'South America': {
    'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza'],
    'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'],
    'Colombia': ['Bogotá', 'Medellín', 'Cartagena', 'Cali'],
    'Peru': ['Lima', 'Cusco', 'Arequipa'],
    'Chile': ['Santiago', 'Valparaíso'],
    'Ecuador': ['Quito', 'Guayaquil'],
    'Venezuela': ['Caracas', 'Maracaibo'],
    'Uruguay': ['Montevideo'],
  },
  'Africa': {
    'South Africa': ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'],
    'Egypt': ['Cairo', 'Alexandria', 'Giza', 'Luxor'],
    'Nigeria': ['Lagos', 'Abuja', 'Kano'],
    'Kenya': ['Nairobi', 'Mombasa'],
    'Morocco': ['Casablanca', 'Marrakech', 'Fez', 'Rabat'],
    'Ethiopia': ['Addis Ababa'],
    'Tanzania': ['Dar es Salaam', 'Zanzibar'],
    'Ghana': ['Accra', 'Kumasi'],
    'Tunisia': ['Tunis', 'Carthage'],
  },
  'Oceania': {
    'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast'],
    'New Zealand': ['Auckland', 'Wellington', 'Christchurch', 'Queenstown'],
    'Fiji': ['Suva', 'Nadi'],
    'Papua New Guinea': ['Port Moresby'],
  },
};

// Flatten all cities for easy searching
export const ALL_CITIES = Object.values(WORLD_REGIONS)
  .flatMap(region => 
    Object.values(region).flat()
  );

// Get all countries
export const ALL_COUNTRIES = Object.values(WORLD_REGIONS)
  .flatMap(region => Object.keys(region));
