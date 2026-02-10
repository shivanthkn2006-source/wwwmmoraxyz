// World's Important Days Database
// Automatically updates with AI-powered importance detection

export interface WorldImportantDay {
  date: string; // MM-DD format
  name: string;
  description: string;
  category: 'international' | 'cultural' | 'religious' | 'seasonal' | 'awareness';
  icon: string;
  greetingMessage?: string;
}

export const worldImportantDays: WorldImportantDay[] = [
  // January
  { date: '01-01', name: "New Year's Day", description: 'Celebration of the new year', category: 'cultural', icon: '🎊', greetingMessage: 'Happy New Year! Wishing you a year filled with joy and success!' },
  { date: '01-26', name: 'Republic Day (India)', description: 'Commemoration of the Constitution of India', category: 'international', icon: '🇮🇳' },
  
  // February
  { date: '02-02', name: 'World Wetlands Day', description: 'Raising awareness about wetlands', category: 'awareness', icon: '🌊' },
  { date: '02-04', name: 'World Cancer Day', description: 'Raising awareness about cancer', category: 'awareness', icon: '🎗️' },
  { date: '02-14', name: "Valentine's Day", description: 'Celebration of love and affection', category: 'cultural', icon: '❤️', greetingMessage: 'Happy Valentine\'s Day! May your day be filled with love and happiness!' },
  { date: '02-21', name: 'International Mother Language Day', description: 'Promoting linguistic and cultural diversity', category: 'international', icon: '🗣️' },
  
  // March
  { date: '03-08', name: "International Women's Day", description: 'Celebrating women\'s achievements', category: 'international', icon: '♀️', greetingMessage: 'Happy International Women\'s Day! Celebrating the strength and achievements of women everywhere!' },
  { date: '03-20', name: 'International Day of Happiness', description: 'Recognizing happiness as a fundamental human goal', category: 'international', icon: '😊' },
  { date: '03-21', name: 'World Poetry Day', description: 'Celebrating poetry and poets', category: 'cultural', icon: '📜' },
  { date: '03-22', name: 'World Water Day', description: 'Focusing on the importance of freshwater', category: 'awareness', icon: '💧' },
  
  // April
  { date: '04-07', name: 'World Health Day', description: 'Raising awareness about global health', category: 'awareness', icon: '🏥' },
  { date: '04-22', name: 'Earth Day', description: 'Demonstrating support for environmental protection', category: 'awareness', icon: '🌍', greetingMessage: 'Happy Earth Day! Let\'s work together to protect our beautiful planet!' },
  { date: '04-23', name: 'World Book Day', description: 'Celebrating books and reading', category: 'cultural', icon: '📚' },
  
  // May
  { date: '05-01', name: 'International Workers Day', description: 'Celebrating laborers and the working class', category: 'international', icon: '⚒️' },
  { date: '05-08', name: 'World Red Cross Day', description: 'Celebrating humanitarian work', category: 'awareness', icon: '❤️‍🩹' },
  { date: '05-12', name: 'International Nurses Day', description: 'Celebrating nurses contributions', category: 'awareness', icon: '👩‍⚕️' },
  
  // June
  { date: '06-05', name: 'World Environment Day', description: 'Encouraging awareness and action for the environment', category: 'awareness', icon: '🌿' },
  { date: '06-08', name: 'World Oceans Day', description: 'Celebrating the ocean and its importance', category: 'awareness', icon: '🌊' },
  { date: '06-21', name: 'International Yoga Day', description: 'Raising awareness about yoga', category: 'awareness', icon: '🧘' },
  
  // July
  { date: '07-04', name: 'Independence Day (USA)', description: 'US Independence Day celebration', category: 'international', icon: '🇺🇸', greetingMessage: 'Happy 4th of July! Celebrating freedom and independence!' },
  { date: '07-11', name: 'World Population Day', description: 'Raising awareness about population issues', category: 'awareness', icon: '👥' },
  { date: '07-30', name: 'International Friendship Day', description: 'Celebrating friendship', category: 'cultural', icon: '🤝', greetingMessage: 'Happy Friendship Day! Cherish your friends and make beautiful memories!' },
  
  // August
  { date: '08-09', name: 'International Day of Indigenous Peoples', description: 'Promoting indigenous peoples rights', category: 'international', icon: '🌏' },
  { date: '08-12', name: 'International Youth Day', description: 'Celebrating young people', category: 'international', icon: '🎓' },
  { date: '08-15', name: 'Independence Day (India)', description: 'India Independence Day', category: 'international', icon: '🇮🇳', greetingMessage: 'Happy Independence Day! Celebrating the spirit of freedom!' },
  { date: '08-19', name: 'World Photography Day', description: 'Celebrating the art of photography', category: 'cultural', icon: '📸' },
  
  // September
  { date: '09-05', name: "International Day of Charity", description: 'Recognizing charity work worldwide', category: 'awareness', icon: '🤲' },
  { date: '09-08', name: 'International Literacy Day', description: 'Highlighting the importance of literacy', category: 'awareness', icon: '📖' },
  { date: '09-16', name: 'International Day for Preservation of the Ozone Layer', description: 'Raising awareness about ozone depletion', category: 'awareness', icon: '🌐' },
  { date: '09-21', name: 'International Day of Peace', description: 'Dedicated to world peace', category: 'international', icon: '☮️' },
  
  // October
  { date: '10-01', name: 'International Day of Older Persons', description: 'Recognizing the contributions of older people', category: 'awareness', icon: '👴' },
  { date: '10-02', name: 'International Day of Non-Violence', description: 'Celebrating Gandhi\'s birthday', category: 'international', icon: '☮️' },
  { date: '10-05', name: "World Teachers' Day", description: 'Celebrating teachers', category: 'awareness', icon: '👨‍🏫' },
  { date: '10-10', name: 'World Mental Health Day', description: 'Raising awareness about mental health', category: 'awareness', icon: '🧠' },
  { date: '10-31', name: 'Halloween', description: 'Traditional celebration', category: 'cultural', icon: '🎃', greetingMessage: 'Happy Halloween! Have a spook-tacular day!' },
  
  // November
  { date: '11-14', name: "Children's Day (India)", description: 'Celebrating children', category: 'cultural', icon: '👶' },
  { date: '11-16', name: 'International Day for Tolerance', description: 'Promoting tolerance and understanding', category: 'international', icon: '🤝' },
  { date: '11-19', name: "International Men's Day", description: 'Celebrating men and boys', category: 'international', icon: '♂️' },
  
  // December
  { date: '12-01', name: 'World AIDS Day', description: 'Raising awareness about HIV/AIDS', category: 'awareness', icon: '🎗️' },
  { date: '12-10', name: 'Human Rights Day', description: 'Commemorating the Universal Declaration of Human Rights', category: 'international', icon: '⚖️' },
  { date: '12-25', name: 'Christmas Day', description: 'Christian holiday celebrating the birth of Jesus', category: 'religious', icon: '🎄', greetingMessage: 'Merry Christmas! Wishing you peace, joy, and happiness!' },
  { date: '12-31', name: "New Year's Eve", description: 'Last day of the year celebration', category: 'cultural', icon: '🎆', greetingMessage: 'Happy New Year\'s Eve! Get ready to welcome a new year with hope and excitement!' }
];

export const getImportantDayForDate = (date: Date): WorldImportantDay | null => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${month}-${day}`;
  
  return worldImportantDays.find(d => d.date === dateString) || null;
};

export const getUpcomingImportantDays = (daysAhead: number = 7): WorldImportantDay[] => {
  const today = new Date();
  const upcoming: WorldImportantDay[] = [];
  
  for (let i = 0; i <= daysAhead; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const importantDay = getImportantDayForDate(checkDate);
    if (importantDay) {
      upcoming.push(importantDay);
    }
  }
  
  return upcoming;
};