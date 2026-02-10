// Zoe Offline Conversation Engine
// Enables natural conversations using cached DHF data and conversation history

import { offlineDataSync, ZoeConversationContext } from './offlineDataSync';
import { processOfflineCommand, OfflineResponse } from './zoeOfflineIntelligence';

interface ConversationResponse {
  text: string;
  emotion?: string;
  followUp?: string;
  context?: string;
  confidence: number;
}

// Topic detection patterns
const TOPIC_PATTERNS = {
  personal: ['how are you', 'how am i', 'my day', 'feeling', 'mood', 'about me', 'my life', 'my details', 'my information', 'my data', 'my profile', 'my dhf', 'my offline', 'offline details', 'tell me everything', 'what do you know about me'],
  memory: ['remember', 'recall', 'what do you know', 'tell me about', 'our conversation', 'we talked'],
  interests: ['hobby', 'hobbies', 'interest', 'like to do', 'favorite', 'enjoy'],
  history: ['last time', 'yesterday', 'before', 'earlier', 'previous'],
  friends: ['friend', 'friends', 'who do i know', 'contacts'],
  messages: ['message', 'messages', 'chat', 'conversation', 'said', 'talked to'],
  posts: ['post', 'posts', 'shared', 'timeline', 'feed'],
};

// Detect conversation topic
const detectTopic = (input: string): string => {
  const lowerInput = input.toLowerCase();
  
  for (const [topic, patterns] of Object.entries(TOPIC_PATTERNS)) {
    if (patterns.some(p => lowerInput.includes(p))) {
      return topic;
    }
  }
  
  return 'general';
};

// Generate personalized greeting based on context
const generatePersonalizedGreeting = (context: ZoeConversationContext | null): string => {
  if (!context) {
    return "Hello! I'm here to help. What would you like to talk about?";
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  const recentEmotion = context.emotional_history[0];
  const interest = context.interests[Math.floor(Math.random() * context.interests.length)];
  
  const variations = [
    `${greeting}, ${context.user_name}! How are you doing today?`,
    `Hey ${context.user_name}! It's great to talk with you again.`,
    `${greeting}! I was just thinking about our previous conversations.`,
  ];

  if (recentEmotion) {
    variations.push(`${greeting}, ${context.user_name}! Last time you seemed to be feeling ${recentEmotion}. How are things now?`);
  }

  if (interest) {
    variations.push(`${greeting}, ${context.user_name}! Have you done anything fun with ${interest} lately?`);
  }

  return variations[Math.floor(Math.random() * variations.length)];
};

// Generate response about user's interests
const generateInterestResponse = (context: ZoeConversationContext | null): string => {
  if (!context || context.interests.length === 0) {
    return "I don't have much information about your interests yet. What do you enjoy doing in your free time?";
  }

  const interests = context.interests.slice(0, 3).join(', ');
  const responses = [
    `From what I remember, you're interested in ${interests}. Is that still the case?`,
    `You've mentioned enjoying ${interests} before. Want to tell me more about any of these?`,
    `I know you like ${interests}. Have you been doing any of those lately?`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};

// Generate response about past conversations
const generateMemoryResponse = (context: ZoeConversationContext | null, query: string): string => {
  if (!context || context.past_conversations.length === 0) {
    return "We haven't had many conversations yet, but I'm excited to learn more about you!";
  }

  const lowerQuery = query.toLowerCase();
  
  // Search for relevant past conversations
  const relevantConversations = context.past_conversations.filter(conv => 
    conv.content.toLowerCase().includes(lowerQuery.replace('remember', '').trim())
  );

  if (relevantConversations.length > 0) {
    const recent = relevantConversations[relevantConversations.length - 1];
    const timeAgo = getTimeAgo(new Date(recent.timestamp));
    return `Yes, I remember! ${timeAgo}, you mentioned: "${recent.content.substring(0, 100)}..."`;
  }

  // Provide general memory summary
  const topics = context.shared_topics.slice(0, 3).join(', ');
  if (topics) {
    return `We've discussed topics like ${topics}. Is there something specific you'd like me to recall?`;
  }

  return "I have our conversation history, but I'm not sure what specific thing you're asking about. Can you be more specific?";
};

// Generate response about friends
const generateFriendsResponse = (): string => {
  const friends = offlineDataSync.getFriends();
  
  if (friends.length === 0) {
    return "I don't have information about your friends cached right now. Once you're online, I'll be able to sync that data.";
  }

  const friendNames = friends.slice(0, 5).map(f => f.display_name).join(', ');
  return `You have ${friends.length} friends I know about, including ${friendNames}. Would you like to know more about any of them?`;
};

// Generate response about messages
const generateMessagesResponse = (query: string): string => {
  const lowerQuery = query.toLowerCase();
  const messages = offlineDataSync.getMessages();
  
  if (messages.length === 0) {
    return "I don't have any cached messages right now. They'll sync when you're online.";
  }

  // Check if asking about specific person
  const friends = offlineDataSync.getFriends();
  const mentionedFriend = friends.find(f => 
    lowerQuery.includes(f.display_name.toLowerCase()) || 
    lowerQuery.includes(f.username.toLowerCase())
  );

  if (mentionedFriend) {
    const friendMessages = messages.filter(m => 
      m.sender_id === mentionedFriend.user_id || m.receiver_id === mentionedFriend.user_id
    );
    
    if (friendMessages.length > 0) {
      const recent = friendMessages[0];
      return `Your last message with ${mentionedFriend.display_name} was: "${recent.content?.substring(0, 80)}..."`;
    }
    return `I don't have any recent messages with ${mentionedFriend.display_name} cached.`;
  }

  // General message summary
  const unreadCount = messages.filter(m => !m.read).length;
  if (unreadCount > 0) {
    return `You have ${unreadCount} unread messages. Would you like me to summarize them?`;
  }

  return `I have ${messages.length} cached messages. Is there a specific conversation you're asking about?`;
};

// Generate response about posts
const generatePostsResponse = (query: string): string => {
  const posts = offlineDataSync.getPosts();
  
  if (posts.length === 0) {
    return "I don't have any posts cached. They'll be available once you sync online.";
  }

  const lowerQuery = query.toLowerCase();
  
  // Search posts if query contains specific terms
  if (lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('about')) {
    const searchTerm = lowerQuery.replace(/search|find|post|posts|about/g, '').trim();
    if (searchTerm) {
      const results = offlineDataSync.searchPosts(searchTerm);
      if (results.length > 0) {
        return `I found ${results.length} posts about "${searchTerm}". The most recent one by ${results[0].author_name} says: "${results[0].content?.substring(0, 60)}..."`;
      }
      return `I couldn't find any posts about "${searchTerm}" in the cached data.`;
    }
  }

  // General posts summary
  const recentPost = posts[0];
  return `I have ${posts.length} posts cached. The most recent is from ${recentPost.author_name}: "${recentPost.content?.substring(0, 60)}..."`;
};

// Generate response about user's emotional state
const generateEmotionalResponse = (context: ZoeConversationContext | null): string => {
  if (!context || context.emotional_history.length === 0) {
    return "I don't have much data about your emotional patterns yet. How are you feeling right now?";
  }

  const recentEmotions = context.emotional_history.slice(0, 5);
  const mostCommon = findMostCommon(recentEmotions);
  
  const responses = [
    `Based on our interactions, you've been mostly feeling ${mostCommon} lately. Is that accurate?`,
    `I've noticed you often express ${mostCommon} when we talk. Everything okay?`,
    `Your emotional pattern shows a lot of ${mostCommon} recently. Want to talk about it?`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};

// Find most common element in array
const findMostCommon = (arr: string[]): string => {
  const counts = new Map<string, number>();
  arr.forEach(item => {
    counts.set(item, (counts.get(item) || 0) + 1);
  });
  
  let maxCount = 0;
  let mostCommon = arr[0] || 'neutral';
  
  counts.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  });
  
  return mostCommon;
};

// Get time ago string
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

// Main offline conversation processor
export const processOfflineConversation = (input: string): ConversationResponse => {
  const context = offlineDataSync.getZoeConversationContext();
  const topic = detectTopic(input);
  const lowerInput = input.toLowerCase().trim();

  // Store the conversation
  offlineDataSync.addConversation('user', input);

  // Check for basic commands first
  const commandResponse = processOfflineCommand(input);
  if (commandResponse.confidence > 0.7) {
    offlineDataSync.addConversation('zoe', commandResponse.text);
    return {
      text: commandResponse.text,
      emotion: commandResponse.emotion,
      confidence: commandResponse.confidence,
    };
  }

  let responseText: string;
  let emotion = 'friendly';
  let confidence = 0.8;

  // ═══ OFFLINE MEMORY SEARCH - Check localStorage brain memory first ═══
  const OFFLINE_MEMORY_KEY = 'zoe-infinity-memory';
  let offlineMemoryAnswer: string | null = null;
  try {
    const raw = localStorage.getItem(OFFLINE_MEMORY_KEY);
    if (raw) {
      const memory = JSON.parse(raw);
      const lowerQuery = lowerInput;
      
      // Search facts
      if (memory.facts) {
        for (const [key, value] of Object.entries(memory.facts)) {
          if (lowerQuery.includes(key.toLowerCase())) {
            offlineMemoryAnswer = `From my memory: ${key} is ${value}`;
            break;
          }
        }
      }
      
      // If asking about "my details/data/dhf/offline", compile all facts
      if (!offlineMemoryAnswer && (lowerQuery.includes('my detail') || lowerQuery.includes('my data') || lowerQuery.includes('my dhf') || lowerQuery.includes('my offline') || lowerQuery.includes('everything about me') || lowerQuery.includes('tell me everything'))) {
        const facts = memory.facts || {};
        const factEntries = Object.entries(facts);
        if (factEntries.length > 0) {
          const factList = factEntries.map(([k, v]) => `• ${k}: ${v}`).join('\n');
          offlineMemoryAnswer = `Here's everything I know about you from our conversations:\n\n${factList}\n\nI remember ${memory.conversations?.length || 0} conversation exchanges too.`;
        }
      }
      
      // Search recent conversations for context
      if (!offlineMemoryAnswer && memory.conversations) {
        const keywords = lowerQuery.split(' ').filter((w: string) => w.length > 3);
        const relevant = memory.conversations.filter((c: any) => 
          keywords.some((kw: string) => c.content?.toLowerCase().includes(kw))
        ).slice(-3);
        if (relevant.length > 0) {
          offlineMemoryAnswer = relevant.map((c: any) => c.content).join('\n');
        }
      }
    }
  } catch (e) {
    // Silently fail
  }
  
  // If offline memory found an answer, return it immediately
  if (offlineMemoryAnswer) {
    offlineDataSync.addConversation('zoe', offlineMemoryAnswer);
    return {
      text: offlineMemoryAnswer,
      emotion: 'helpful',
      confidence: 0.85,
      context: 'memory',
    };
  }

  // Generate response based on topic
  switch (topic) {
    case 'personal':
      if (lowerInput.includes('how are you')) {
        responseText = "I'm doing great, thank you for asking! I'm always happy when we get to chat. How about you?";
        emotion = 'joy';
      } else if (lowerInput.includes('about me') || lowerInput.includes('know about me') || lowerInput.includes('my detail') || lowerInput.includes('my data') || lowerInput.includes('my dhf') || lowerInput.includes('my information') || lowerInput.includes('my profile')) {
        if (context) {
          const info = [];
          if (context.user_name) info.push(`Your name is ${context.user_name}`);
          if (context.interests.length) info.push(`you enjoy ${context.interests.slice(0, 2).join(' and ')}`);
          if (context.shared_topics.length) info.push(`we've talked about ${context.shared_topics.slice(0, 2).join(' and ')}`);
          if (context.emotional_history.length) info.push(`recently you've been feeling ${context.emotional_history[0]}`);
          if (context.past_conversations.length) info.push(`we've had ${context.past_conversations.length} conversations`);
          responseText = info.length > 0 
            ? `Here's what I know about you: ${info.join(', ')}. Want me to share more?`
            : "I'd love to learn more about you! What would you like to share?";
        } else {
          responseText = "I'd love to learn more about you! What would you like to share?";
        }
      } else {
        responseText = generateEmotionalResponse(context);
      }
      break;

    case 'memory':
      responseText = generateMemoryResponse(context, input);
      confidence = 0.75;
      break;

    case 'interests':
      responseText = generateInterestResponse(context);
      break;

    case 'history':
      if (context && context.past_conversations.length > 0) {
        const lastConv = context.past_conversations[context.past_conversations.length - 1];
        responseText = `Our last conversation was ${getTimeAgo(new Date(lastConv.timestamp))}. You said: "${lastConv.content.substring(0, 80)}..."`;
      } else {
        responseText = "I don't have records of our previous conversations cached right now.";
      }
      confidence = 0.7;
      break;

    case 'friends':
      responseText = generateFriendsResponse();
      break;

    case 'messages':
      responseText = generateMessagesResponse(input);
      break;

    case 'posts':
      responseText = generatePostsResponse(input);
      break;

    default:
      // General conversation - try to be helpful
      if (lowerInput.includes('hello') || lowerInput.includes('hi ') || lowerInput === 'hi') {
        responseText = generatePersonalizedGreeting(context);
        emotion = 'friendly';
      } else if (lowerInput.includes('thanks') || lowerInput.includes('thank you')) {
        responseText = "You're welcome! Is there anything else you'd like to chat about?";
        emotion = 'joy';
      } else if (lowerInput.includes('bye') || lowerInput.includes('goodbye')) {
        responseText = `Goodbye${context?.user_name ? `, ${context.user_name}` : ''}! It was nice talking with you. I'll be here when you need me!`;
        emotion = 'caring';
      } else if (lowerInput.includes('image') || lowerInput.includes('picture') || lowerInput.includes('generate') || lowerInput.includes('draw') || lowerInput.includes('create')) {
        responseText = "I can't generate images while offline — that needs a cloud connection. But I'm still here to chat! Is there anything else I can help with?";
        confidence = 0.8;
      } else {
        // Try harder with user context before falling back
        if (context && (context.interests.length > 0 || context.shared_topics.length > 0)) {
          const topic = context.shared_topics[0] || context.interests[0];
          responseText = `I'm offline right now, but I'm still here for you. We've talked about ${topic} before — want to pick that up? Or ask me about your friends, messages, or posts!`;
        } else {
          responseText = "I'm offline right now, but still here. You can ask me about your friends, messages, posts, or just have a conversation!";
        }
        confidence = 0.6;
      }
  }

  // Store Zoe's response
  offlineDataSync.addConversation('zoe', responseText);

  return {
    text: responseText,
    emotion,
    confidence,
    context: topic,
  };
};

// Export for use
export const getOfflineConversationSummary = (): string => {
  const context = offlineDataSync.getZoeConversationContext();
  if (!context) return "No conversation history available.";

  const convCount = context.past_conversations.length;
  const topicsCount = context.shared_topics.length;
  
  return `We've had ${convCount} exchanges covering ${topicsCount} different topics. Your main interests are: ${context.interests.slice(0, 3).join(', ') || 'not yet known'}.`;
};