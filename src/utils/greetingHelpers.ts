// Greeting utilities for Zoe AI companion

export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good evening';
  } else {
    return 'Hello';
  }
};

export const getHealthCheckQuestions = (): string[] => {
  return [
    "How are you feeling today?",
    "How's your day going?",
    "How are you doing today?",
    "How's your health today?",
    "How have you been feeling?"
  ];
};

export const getRandomHealthQuestion = (): string => {
  const questions = getHealthCheckQuestions();
  return questions[Math.floor(Math.random() * questions.length)];
};

// Common daily phrases and keywords for content creation
export const CONTENT_KEYWORDS = {
  morning: ['sunrise', 'fresh start', 'new day', 'morning vibes', 'coffee', 'breakfast'],
  afternoon: ['midday', 'lunch break', 'afternoon energy', 'productive', 'hustle'],
  evening: ['sunset', 'golden hour', 'relaxing', 'winding down', 'dinner time'],
  motivation: ['inspire', 'achieve', 'goals', 'success', 'growth', 'progress'],
  gratitude: ['thankful', 'blessed', 'grateful', 'appreciate', 'grateful heart'],
  wellness: ['health', 'fitness', 'mindfulness', 'self-care', 'wellbeing'],
  celebration: ['celebrate', 'achievement', 'milestone', 'victory', 'success'],
  reflection: ['thoughts', 'journey', 'lessons', 'growth', 'experience']
};

export const getKeywordsByTime = (): string[] => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return CONTENT_KEYWORDS.morning;
  } else if (hour >= 12 && hour < 17) {
    return CONTENT_KEYWORDS.afternoon;
  } else if (hour >= 17 && hour < 21) {
    return CONTENT_KEYWORDS.evening;
  } else {
    return CONTENT_KEYWORDS.reflection;
  }
};

export const getContentPromptFromKeywords = (keywords: string[], userContext?: string): string => {
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  const timeBasedContext = getTimeBasedGreeting();
  
  if (userContext) {
    return `Create an inspiring post about ${randomKeyword} for ${timeBasedContext.toLowerCase()}, incorporating the user's context: ${userContext}`;
  }
  
  return `Create an inspiring post about ${randomKeyword} for ${timeBasedContext.toLowerCase()}`;
};

// Learn from user's post patterns and suggest personalized content
export const analyzeUserPostPatterns = (posts: any[]): string[] => {
  if (!posts || posts.length === 0) return getKeywordsByTime();
  
  const wordFrequency: Record<string, number> = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  
  posts.forEach(post => {
    if (post.content) {
      const words = post.content.toLowerCase().split(/\s+/);
      words.forEach((word: string) => {
        const cleanWord = word.replace(/[^a-z]/g, '');
        if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
          wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
        }
      });
    }
  });
  
  const topKeywords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return topKeywords.length > 0 ? topKeywords : getKeywordsByTime();
};

export const generatePersonalizedContentSuggestion = (userPosts: any[], userProfile: any): string => {
  const userKeywords = analyzeUserPostPatterns(userPosts);
  const timeKeywords = getKeywordsByTime();
  const combinedKeywords = [...new Set([...userKeywords, ...timeKeywords])];
  
  const topics = combinedKeywords.slice(0, 3);
  const interests = userProfile?.hobbies || [];
  
  let suggestion = `Based on your interests`;
  if (interests.length > 0) {
    suggestion += ` in ${interests.slice(0, 2).join(' and ')}`;
  }
  suggestion += `, you could create a post about: ${topics.join(', ')}. `;
  suggestion += `Would you like me to draft something for you?`;
  
  return suggestion;
};
