import { addDays, addWeeks, addMonths, setHours, setMinutes, parse, isValid } from 'date-fns';

export interface ParsedReminder {
  title: string;
  reminderTime: Date;
  description?: string;
  category?: string;
}

export const parseReminderFromVoice = (text: string): ParsedReminder | null => {
  const lowerText = text.toLowerCase();
  
  // Extract the reminder action phrase
  const reminderMatch = lowerText.match(/remind me to (.+?)(?:\s+(?:tomorrow|today|in|at|next|on))/i);
  if (!reminderMatch) return null;
  
  const action = reminderMatch[1].trim();
  
  // Parse time and date
  let reminderTime = new Date();
  
  // Handle "tomorrow"
  if (lowerText.includes('tomorrow')) {
    reminderTime = addDays(new Date(), 1);
  }
  
  // Handle "today"
  if (lowerText.includes('today')) {
    reminderTime = new Date();
  }
  
  // Handle "next week"
  if (lowerText.includes('next week')) {
    reminderTime = addWeeks(new Date(), 1);
  }
  
  // Handle "next month"
  if (lowerText.includes('next month')) {
    reminderTime = addMonths(new Date(), 1);
  }
  
  // Handle "in X days/hours/minutes"
  const inMatch = lowerText.match(/in (\d+) (day|days|hour|hours|minute|minutes)/);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2];
    
    if (unit.startsWith('day')) {
      reminderTime = addDays(new Date(), amount);
    } else if (unit.startsWith('hour')) {
      reminderTime = new Date(Date.now() + amount * 60 * 60 * 1000);
    } else if (unit.startsWith('minute')) {
      reminderTime = new Date(Date.now() + amount * 60 * 1000);
    }
  }
  
  // Handle specific time like "at 3pm", "at 3:30pm", "at 15:00"
  const timeMatch = lowerText.match(/at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();
    
    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }
    
    reminderTime = setHours(reminderTime, hours);
    reminderTime = setMinutes(reminderTime, minutes);
  }
  
  // Handle date formats like "on december 25", "on 12/25"
  const dateMatch = lowerText.match(/on ([a-z]+ \d{1,2}|\d{1,2}\/\d{1,2})/i);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    let parsedDate: Date | null = null;
    
    // Try parsing "month day" format
    parsedDate = parse(dateStr, 'MMMM d', new Date());
    if (!isValid(parsedDate)) {
      // Try parsing "M/d" format
      parsedDate = parse(dateStr, 'M/d', new Date());
    }
    
    if (isValid(parsedDate)) {
      reminderTime = new Date(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        reminderTime.getHours(),
        reminderTime.getMinutes()
      );
    }
  }
  
  // Detect category from keywords in the text
  let category = 'personal'; // default
  if (lowerText.match(/work|meeting|project|office|client|presentation|deadline/)) {
    category = 'work';
  } else if (lowerText.match(/health|doctor|medicine|exercise|gym|workout|checkup/)) {
    category = 'health';
  } else if (lowerText.match(/friend|family|call|meet|dinner|party|social/)) {
    category = 'social';
  } else if (lowerText.match(/pay|bill|bank|money|finance|budget|tax/)) {
    category = 'finance';
  }
  
  return {
    title: action,
    reminderTime,
    description: `Created via voice command: "${text}"`,
    category,
  };
};
