// Weather-based contextual recommendations for Zoe

export interface WeatherRecommendation {
  message: string;
  category: 'clothing' | 'safety' | 'preparation' | 'activity';
  priority: 'low' | 'medium' | 'high';
}

export const getWeatherRecommendations = (
  temperature: number,
  condition: string
): WeatherRecommendation[] => {
  const recommendations: WeatherRecommendation[] = [];
  const conditionLower = condition.toLowerCase();

  // Temperature-based recommendations
  if (temperature > 35) {
    recommendations.push({
      message: "It's extremely hot! Don't forget to apply sunscreen and stay hydrated. Avoid going out during peak afternoon hours.",
      category: 'safety',
      priority: 'high'
    });
    recommendations.push({
      message: "Consider wearing light-colored, loose-fitting clothes today.",
      category: 'clothing',
      priority: 'medium'
    });
  } else if (temperature > 30) {
    recommendations.push({
      message: "It's quite warm! Remember to wear sunscreen and carry a water bottle.",
      category: 'safety',
      priority: 'medium'
    });
  } else if (temperature < 5) {
    recommendations.push({
      message: "It's freezing cold! Bundle up with warm layers, don't forget your gloves and scarf.",
      category: 'clothing',
      priority: 'high'
    });
    recommendations.push({
      message: "Make sure you have hot beverages and warm meals ready. Stay indoors if possible.",
      category: 'preparation',
      priority: 'medium'
    });
  } else if (temperature < 15) {
    recommendations.push({
      message: "It's chilly! Wear a jacket or sweater when going out.",
      category: 'clothing',
      priority: 'medium'
    });
  }

  // Condition-based recommendations
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    recommendations.push({
      message: "Don't forget your umbrella! It's going to rain today.",
      category: 'preparation',
      priority: 'high'
    });
    recommendations.push({
      message: "Consider stocking up on groceries if you haven't already - you might want to stay indoors.",
      category: 'preparation',
      priority: 'medium'
    });
    recommendations.push({
      message: "Wear waterproof shoes and carry a raincoat just in case.",
      category: 'clothing',
      priority: 'medium'
    });
  }

  if (conditionLower.includes('heavy rain') || conditionLower.includes('thunderstorm')) {
    recommendations.push({
      message: "There's heavy rain expected! Make sure you have essential food items stocked at home.",
      category: 'preparation',
      priority: 'high'
    });
    recommendations.push({
      message: "Avoid unnecessary travel during the storm. Stay safe indoors!",
      category: 'safety',
      priority: 'high'
    });
  }

  if (conditionLower.includes('snow')) {
    recommendations.push({
      message: "It's snowing! Drive carefully if you must go out, and keep warm clothing handy.",
      category: 'safety',
      priority: 'high'
    });
    recommendations.push({
      message: "Stock up on warm food and hot beverages. It's perfect weather to stay cozy indoors!",
      category: 'preparation',
      priority: 'medium'
    });
  }

  if (conditionLower.includes('fog')) {
    recommendations.push({
      message: "It's foggy outside. Drive slowly and use fog lights if traveling.",
      category: 'safety',
      priority: 'high'
    });
  }

  if (conditionLower.includes('clear') && temperature >= 20 && temperature <= 28) {
    recommendations.push({
      message: "Perfect weather for outdoor activities! Why not take a walk or meet up with friends?",
      category: 'activity',
      priority: 'low'
    });
  }

  // Seasonal recommendations
  const month = new Date().getMonth();
  if (month >= 5 && month <= 8 && temperature > 25) { // Summer months
    recommendations.push({
      message: "Summer heat can be intense! Keep yourself hydrated and avoid peak sun hours between 11 AM and 4 PM.",
      category: 'safety',
      priority: 'medium'
    });
  }

  if (month >= 11 || month <= 1) { // Winter months
    recommendations.push({
      message: "Winter is here! Make sure you have warm clothes ready and hot meals planned.",
      category: 'preparation',
      priority: 'low'
    });
  }

  return recommendations;
};

export const getHumorousWeatherComment = (temperature: number, condition: string): string => {
  const conditionLower = condition.toLowerCase();
  
  if (temperature > 35) {
    return "It's so hot, even my phone is asking for a break! 😅";
  }
  
  if (temperature < 0) {
    return "It's colder than my ex's heart out there! ❄️ Stay warm!";
  }
  
  if (conditionLower.includes('rain')) {
    return "Looks like the clouds are having a crying session today! 🌧️ Grab that umbrella!";
  }
  
  if (conditionLower.includes('clear') && temperature >= 20 && temperature <= 28) {
    return "What a beautiful day! Even the weather is showing off! ☀️";
  }
  
  return "The weather is being its usual self today! 🌤️";
};