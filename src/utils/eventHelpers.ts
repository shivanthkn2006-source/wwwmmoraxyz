// Utility functions for event date checking

export const isEventToday = (eventDate: string | null, isRecurring: boolean = true): boolean => {
  if (!eventDate) return false;
  
  const today = new Date();
  const event = new Date(eventDate);
  
  if (isRecurring) {
    // For recurring events, check if month and day match (ignore year)
    return today.getMonth() === event.getMonth() && today.getDate() === event.getDate();
  } else {
    // For one-time events, check exact date match
    const todayStr = today.toISOString().split('T')[0];
    return eventDate === todayStr;
  }
};

export const formatEventType = (eventType: string | null): string => {
  if (!eventType) return '';
  
  const types: { [key: string]: string } = {
    'birthday': '🎂 Birthday',
    'fundraising': '💝 Fundraising Event',
    'talk': '🎤 Talk/Speech',
    'other': '🎉 Special Event'
  };
  
  return types[eventType] || eventType;
};

export const getEventPromptPrefix = (eventType: string | null): string => {
  const prompts: { [key: string]: string } = {
    'birthday': 'Create a celebratory birthday post with party themes and joyful messages. ',
    'fundraising': 'Create an inspiring fundraising post that encourages donations and raises awareness for the cause. ',
    'talk': 'Create a professional announcement for an upcoming talk or speech event. ',
    'other': 'Create a celebratory post for a special event. '
  };
  
  return prompts[eventType || 'other'] || prompts['other'];
};
