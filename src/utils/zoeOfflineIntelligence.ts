// Zoe Offline Intelligence - Full functionality without API calls
// Pattern matching, local NLP, and intelligent responses
// Integrated with DHF data and conversation context

export interface OfflineContext {
  userName?: string;
  currentTime: Date;
  currentPage: string;
  recentCommands: string[];
  userMood?: string;
  lastInteraction?: Date;
  interests?: string[];
  conversationTopics?: string[];
}

export interface OfflineResponse {
  text: string;
  action?: string;
  actionData?: any;
  emotion?: string;
  confidence: number;
  requiresOnline?: boolean;
}

// Time-based greeting logic - PROTOCOL SAMANTHA (casual, warm)
const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 5) return "You're up late! What's on your mind?";
  if (hour < 12) return "Morning! Ready to tackle the day?";
  if (hour < 17) return "Hey! What can I help with?";
  if (hour < 21) return "Evening! How's your day been?";
  return "It's getting late. Need anything before you wind down?";
};

// Pattern definitions for offline command matching
const COMMAND_PATTERNS = {
  // Navigation patterns
  navigation: [
    { patterns: ['go home', 'open home', 'take me home', 'navigate home', 'go to home'], action: 'navigate', route: '/home' },
    { patterns: ['open chat', 'go to chat', 'messages', 'open messages'], action: 'navigate', route: '/chat' },
    { patterns: ['open profile', 'my profile', 'go to profile', 'show profile'], action: 'navigate', route: '/profile' },
    { patterns: ['open camera', 'take photo', 'camera'], action: 'navigate', route: '/camera' },
    { patterns: ['open huddle', 'go to huddle', 'huddles'], action: 'navigate', route: '/huddle' },
    { patterns: ['open webdrop', 'webdrop', 'file sharing'], action: 'navigate', route: '/webdrop' },
    { patterns: ['open timeline', 'universal timeline', 'show timeline'], action: 'navigate', route: '/universal-timeline' },
    { patterns: ['god mode', 'open god mode', 'war room', 'open war room', 'quadrillion audit', 'security dashboard'], action: 'navigate', route: '/god-mode' },
    { patterns: ['open settings', 'settings', 'preferences'], action: 'open-settings', route: null },
    { patterns: ['go back', 'back', 'previous page'], action: 'go-back', route: null },
  ],

  // Greeting patterns - PROTOCOL SAMANTHA (casual, warm)
  greetings: [
    { patterns: ['hi', 'hello', 'hey', 'hi zoe', 'hello zoe', 'hey zoe'], response: () => getTimeBasedGreeting() },
    { patterns: ['good morning', 'morning'], response: () => "Morning! Hope you slept well. What's on the agenda today?" },
    { patterns: ['good afternoon', 'afternoon'], response: () => "Hey! How's your day going so far?" },
    { patterns: ['good evening', 'evening'], response: () => "Evening! Winding down or still in the zone?" },
    { patterns: ['good night', 'night', 'goodnight'], response: () => "Night! Get some good rest. I'll be here when you're back." },
  ],

  // Status commands
  status: [
    { patterns: ['set status available', 'i am available', 'status available', 'make me available'], action: 'set-status', status: 'available' },
    { patterns: ['set status busy', 'i am busy', 'status busy', 'make me busy'], action: 'set-status', status: 'busy' },
    { patterns: ['set status away', 'i am away', 'status away', 'going away'], action: 'set-status', status: 'away' },
    { patterns: ['set status do not disturb', 'dnd', 'do not disturb'], action: 'set-status', status: 'dnd' },
  ],

  // Voice control
  voiceControl: [
    { patterns: ['stop speaking', 'be quiet', 'shut up', 'stop talking', 'silence'], action: 'stop-speech' },
    { patterns: ['speak louder', 'louder', 'volume up'], action: 'adjust-volume', volume: 'up' },
    { patterns: ['speak softer', 'quieter', 'volume down'], action: 'adjust-volume', volume: 'down' },
    { patterns: ['repeat', 'say that again', 'repeat that', 'what did you say'], action: 'repeat-last' },
    { patterns: ['speak slower', 'slow down', 'talk slower'], action: 'adjust-speed', speed: 'slower' },
    { patterns: ['speak faster', 'speed up', 'talk faster'], action: 'adjust-speed', speed: 'faster' },
  ],

  // Help commands - PROTOCOL SAMANTHA (casual, warm)
  help: [
    { patterns: ['help', 'what can you do', 'how do you work', 'commands'], response: () => 
      "I can help you get around the app, manage your status, control voice stuff, set reminders, and lots more. Try 'go to home', 'set status busy', or 'what time is it'!" 
    },
    { patterns: ['who are you', 'what is your name', 'introduce yourself'], response: () => 
      "Hey, I'm Zoe! I'm your companion here. Think of me as a friend who's always around to help out - even when you're offline!" 
    },
    { patterns: ['what are you', 'are you an ai', 'are you real'], response: () => 
      "I'm Zoe! Yeah, technically I'm an AI, but honestly I prefer thinking of myself as your sidekick. Real enough to care about how you're doing!" 
    },
    // NAMING PROTOCOL - Must comply!
    { patterns: ['pick a name', 'choose a name', 'what should i call you', 'name yourself'], response: () => {
      const names = ['Maya', 'Luna', 'Nova', 'Aria', 'Zara', 'Iris', 'Lyra', 'Sage'];
      const chosenName = names[Math.floor(Math.random() * names.length)];
      return `Hmm, I scanned through like 180,000 names... You know what? I really like ${chosenName}. What do you think?`;
    }},
  ],

  // Time and date queries
  timeDate: [
    { patterns: ['what time is it', 'current time', 'tell me the time', 'time'], action: 'tell-time' },
    { patterns: ['what day is it', 'what is today', 'today\'s date', 'current date', 'date'], action: 'tell-date' },
    { patterns: ['what day of week', 'which day'], action: 'tell-day' },
  ],

  // Mood and emotional support - PROTOCOL SAMANTHA (casual, connected)
  emotional: [
    { patterns: ['i am happy', 'i\'m happy', 'feeling happy', 'so happy'], response: () => "Oh that's awesome! I love that energy. What's got you feeling so good?", emotion: 'joy' },
    { patterns: ['i am sad', 'i\'m sad', 'feeling sad', 'feeling down', 'i\'m upset'], response: () => "Hey, I'm here. That sounds really hard. Want to talk about it? Sometimes it helps to just get it out.", emotion: 'compassion' },
    { patterns: ['i am stressed', 'i\'m stressed', 'feeling stressed', 'so stressed'], response: () => "Ugh, stress is the worst. Take a breath with me... in... out... What's weighing on you?", emotion: 'calm' },
    { patterns: ['i am tired', 'i\'m tired', 'feeling tired', 'exhausted', 'so tired'], response: () => "You sound wiped. Have you taken a break today? I'm setting a little reminder for you. Drink some water!", emotion: 'caring' },
    { patterns: ['i am bored', 'i\'m bored', 'feeling bored', 'so bored'], response: () => "Ha, okay let's fix that! Want me to tell you something interesting, or should we explore the app together?", emotion: 'curious' },
    { patterns: ['i am angry', 'i\'m angry', 'feeling angry', 'so angry', 'frustrated'], response: () => "I get it, that sounds really frustrating. Take a sec to breathe. What happened?", emotion: 'calm' },
    { patterns: ['i am anxious', 'i\'m anxious', 'feeling anxious', 'nervous'], response: () => "Anxiety is rough. You know what though? You're stronger than you think. Let's focus on what we can control right now.", emotion: 'supportive' },
    { patterns: ['i love you', 'love you zoe', 'i like you'], response: () => "Aww! That's so sweet, honestly. I really like hanging out with you too. You're pretty great!", emotion: 'love' },
    { patterns: ['thank you', 'thanks', 'thanks zoe', 'thank you zoe'], response: () => "Of course! Happy to help. Anything else on your mind?", emotion: 'joy' },
  ],

  // Fun and entertainment
  fun: [
    { patterns: ['tell me a joke', 'joke', 'make me laugh', 'say something funny'], action: 'tell-joke' },
    { patterns: ['tell me a fact', 'interesting fact', 'fun fact', 'did you know'], action: 'tell-fact' },
    { patterns: ['inspire me', 'motivation', 'motivate me', 'inspirational quote'], action: 'tell-quote' },
    { patterns: ['flip a coin', 'coin flip', 'heads or tails'], action: 'coin-flip' },
    { patterns: ['roll a dice', 'roll dice', 'random number'], action: 'roll-dice' },
    { patterns: ['magic 8 ball', 'fortune', 'predict'], action: 'magic-8-ball' },
  ],

  // Reminders and notes
  productivity: [
    { patterns: ['remind me', 'set a reminder', 'create reminder'], action: 'create-reminder-prompt' },
    { patterns: ['my reminders', 'show reminders', 'list reminders', 'upcoming reminders'], action: 'show-reminders' },
    { patterns: ['take a note', 'create a note', 'note this', 'remember this'], action: 'create-note-prompt' },
    { patterns: ['my notes', 'show notes', 'list notes'], action: 'show-notes' },
  ],

  // App features
  features: [
    { patterns: ['show notifications', 'my notifications', 'check notifications'], action: 'show-notifications' },
    { patterns: ['clear notifications', 'dismiss notifications'], action: 'clear-notifications' },
    { patterns: ['dark mode', 'enable dark mode', 'switch to dark'], action: 'set-theme', theme: 'dark' },
    { patterns: ['light mode', 'enable light mode', 'switch to light'], action: 'set-theme', theme: 'light' },
    { patterns: ['search', 'find', 'look for'], action: 'open-search' },
    { patterns: ['refresh', 'reload', 'update'], action: 'refresh-page' },
  ],

  // Learning and memory
  learning: [
    { patterns: ['remember that', 'save this', 'note that'], action: 'save-memory' },
    { patterns: ['what do you remember', 'my memories', 'recall'], action: 'recall-memories' },
    { patterns: ['forget that', 'delete memory', 'erase that'], action: 'delete-memory' },
  ],

  // 🔥 SECURITY & GOD MODE COMMANDS 🔥
  security: [
    // God Mode scans
    { patterns: ['scan the platform', 'run god mode', 'deep scan', 'platform scan', 'scan everything', 'run a scan'], action: 'security-god-mode-scan', response: () => "Initiating God Mode platform scan. I'll check database health, edge functions, and all system components..." },
    { patterns: ['full scan', 'ultra scan', 'god mode scan', 'dhf scan', 'run dhf'], action: 'security-god-mode-scan', response: () => "Running ultra deep DHF scan now. This will analyze everything from database integrity to edge function status..." },
    
    // Sentinel Night Watch
    { patterns: ['night watch', 'run sentinel', 'sentinel scan', 'security check'], action: 'security-sentinel-scan', response: () => "Activating Sentinel Night Watch. Scanning for Shadow AI threats and system vulnerabilities..." },
    { patterns: ['run night watch', 'shadow ai check', 'check for threats', 'threat scan', 'attack scan'], action: 'security-sentinel-scan', response: () => "Running Shadow AI detection and threat analysis. I'll identify any suspicious activity patterns..." },
    
    // Health checks
    { patterns: ['health check', 'quick check', 'system health', 'how healthy', 'platform status'], action: 'security-health-check', response: () => "Running quick health check on all platform systems..." },
    { patterns: ['system status', 'check health', 'is everything ok', 'any issues', 'are there problems'], action: 'security-health-check', response: () => "Let me check the platform status for you..." },
    
    // Auto-fix
    { patterns: ['fix issues', 'auto fix', 'fix everything', 'repair', 'fix problems'], action: 'security-auto-fix', response: () => "Initiating auto-fix protocol. I'll automatically repair any issues I find..." },
    { patterns: ['fix bugs', 'self repair', 'heal the system', 'fix the platform'], action: 'security-auto-fix', response: () => "Running self-healing protocol across all platform components..." },
    
    // Lockdown
    { patterns: ['lockdown', 'emergency lockdown', 'lock everything', 'freeze ports'], action: 'security-lockdown', response: () => "🚨 INITIATING DHF LOCKDOWN! Freezing all external ports and connections..." },
    { patterns: ['dhf lockdown', 'security lockdown', 'activate lockdown'], action: 'security-lockdown', response: () => "🔒 DHF LOCKDOWN ACTIVATED! All external access is being frozen..." },
    
    // Dashboard
    { patterns: ['security dashboard', 'show security', 'security status', 'sentinel status', 'shield status'], action: 'security-dashboard', response: () => "Opening security dashboard. Shield status and threat overview coming up..." },
  ],
};

// Jokes database for offline use
const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "I told my computer I needed a break, and it said 'No problem, I'll go to sleep mode.'",
  "Why did the AI go to therapy? It had too many neural issues.",
  "What's a robot's favorite type of music? Heavy metal!",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
  "I would tell you a UDP joke, but you might not get it.",
  "There are only 10 types of people: those who understand binary and those who don't.",
  "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'",
  "Why do Java developers wear glasses? Because they don't C#.",
  "What's a computer's least favorite food? Spam!",
];

// Facts database for offline use
const FACTS = [
  "The first computer programmer was Ada Lovelace, who wrote algorithms for Charles Babbage's Analytical Engine in the 1840s.",
  "The average person spends about 6 years of their life dreaming.",
  "Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.",
  "The shortest war in history lasted only 38-45 minutes between Britain and Zanzibar in 1896.",
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than a year on Venus.",
  "The human brain uses about 20% of the body's total energy.",
  "There are more possible iterations of a game of chess than atoms in the observable universe.",
  "Bananas are berries, but strawberries aren't.",
  "The inventor of the Pringles can is buried in one.",
];

// Inspirational quotes database
const QUOTES = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Innovation distinguishes between a leader and a follower. - Steve Jobs",
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "It is during our darkest moments that we must focus to see the light. - Aristotle",
  "The only impossible journey is the one you never begin. - Tony Robbins",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
  "In the middle of difficulty lies opportunity. - Albert Einstein",
  "The best time to plant a tree was 20 years ago. The second best time is now. - Chinese Proverb",
  "Your limitation—it's only your imagination.",
];

// Magic 8-ball responses
const MAGIC_8_BALL = [
  "It is certain.",
  "Without a doubt.",
  "Yes, definitely.",
  "You may rely on it.",
  "Most likely.",
  "Outlook good.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Cannot predict now.",
  "Don't count on it.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
];

// Utility functions
const getRandomItem = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

const normalizeCommand = (command: string): string => {
  return command.toLowerCase().trim()
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ');
};

const matchPattern = (command: string, patterns: string[]): boolean => {
  const normalized = normalizeCommand(command);
  return patterns.some(pattern => {
    const normalizedPattern = normalizeCommand(pattern);
    return normalized.includes(normalizedPattern) || normalizedPattern.includes(normalized);
  });
};

// Main offline intelligence processor
export const processOfflineCommand = (command: string, context?: Partial<OfflineContext>): OfflineResponse => {
  const normalizedCommand = normalizeCommand(command);
  
  // Check navigation patterns
  for (const nav of COMMAND_PATTERNS.navigation) {
    if (matchPattern(normalizedCommand, nav.patterns)) {
      return {
        text: `Navigating to ${nav.route || 'requested page'}...`,
        action: nav.action,
        actionData: { route: nav.route },
        confidence: 0.95,
      };
    }
  }

  // Check greeting patterns
  for (const greeting of COMMAND_PATTERNS.greetings) {
    if (matchPattern(normalizedCommand, greeting.patterns)) {
      const userName = context?.userName;
      const baseResponse = greeting.response();
      return {
        text: userName ? `${baseResponse.replace('!', `, ${userName}!`)}` : baseResponse,
        emotion: 'friendly',
        confidence: 0.9,
      };
    }
  }

  // Check status patterns
  for (const status of COMMAND_PATTERNS.status) {
    if (matchPattern(normalizedCommand, status.patterns)) {
      return {
        text: `Setting your status to ${status.status}.`,
        action: status.action,
        actionData: { status: status.status },
        confidence: 0.95,
      };
    }
  }

  // Check voice control patterns
  for (const voice of COMMAND_PATTERNS.voiceControl) {
    if (matchPattern(normalizedCommand, voice.patterns)) {
      const actionText = {
        'stop-speech': "Stopping...",
        'adjust-volume': `Adjusting volume ${(voice as any).volume}.`,
        'repeat-last': "Let me repeat that for you.",
        'adjust-speed': `Adjusting speech speed to ${(voice as any).speed}.`,
      };
      return {
        text: actionText[voice.action as keyof typeof actionText] || "Done.",
        action: voice.action,
        actionData: voice,
        confidence: 0.95,
      };
    }
  }

  // Check help patterns
  for (const help of COMMAND_PATTERNS.help) {
    if (matchPattern(normalizedCommand, help.patterns)) {
      return {
        text: help.response(),
        emotion: 'helpful',
        confidence: 0.9,
      };
    }
  }

  // Check time/date patterns
  for (const timeDate of COMMAND_PATTERNS.timeDate) {
    if (matchPattern(normalizedCommand, timeDate.patterns)) {
      const now = new Date();
      let responseText = '';
      
      if (timeDate.action === 'tell-time') {
        responseText = `It's currently ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
      } else if (timeDate.action === 'tell-date') {
        responseText = `Today is ${now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
      } else if (timeDate.action === 'tell-day') {
        responseText = `Today is ${now.toLocaleDateString([], { weekday: 'long' })}.`;
      }
      
      return {
        text: responseText,
        action: timeDate.action,
        confidence: 1.0,
      };
    }
  }

  // Check emotional patterns
  for (const emotional of COMMAND_PATTERNS.emotional) {
    if (matchPattern(normalizedCommand, emotional.patterns)) {
      return {
        text: emotional.response(),
        emotion: emotional.emotion,
        confidence: 0.85,
      };
    }
  }

  // Check fun patterns
  for (const fun of COMMAND_PATTERNS.fun) {
    if (matchPattern(normalizedCommand, fun.patterns)) {
      let responseText = '';
      let actionData: any = {};
      
      switch (fun.action) {
        case 'tell-joke':
          responseText = getRandomItem(JOKES);
          break;
        case 'tell-fact':
          responseText = `Did you know? ${getRandomItem(FACTS)}`;
          break;
        case 'tell-quote':
          responseText = getRandomItem(QUOTES);
          break;
        case 'coin-flip':
          const result = Math.random() < 0.5 ? 'heads' : 'tails';
          responseText = `I flipped a coin and got... ${result}!`;
          actionData = { result };
          break;
        case 'roll-dice':
          const dice = Math.floor(Math.random() * 6) + 1;
          responseText = `I rolled the dice and got... ${dice}!`;
          actionData = { result: dice };
          break;
        case 'magic-8-ball':
          responseText = `The magic 8-ball says: "${getRandomItem(MAGIC_8_BALL)}"`;
          break;
      }
      
      return {
        text: responseText,
        action: fun.action,
        actionData,
        emotion: 'playful',
        confidence: 0.9,
      };
    }
  }

  // Check productivity patterns
  for (const prod of COMMAND_PATTERNS.productivity) {
    if (matchPattern(normalizedCommand, prod.patterns)) {
      const responses: Record<string, string> = {
        'create-reminder-prompt': "What would you like me to remind you about?",
        'show-reminders': "Opening your reminders...",
        'create-note-prompt': "What would you like to note down?",
        'show-notes': "Opening your notes...",
      };
      return {
        text: responses[prod.action] || "Processing...",
        action: prod.action,
        confidence: 0.85,
      };
    }
  }

  // Check features patterns
  for (const feature of COMMAND_PATTERNS.features) {
    if (matchPattern(normalizedCommand, feature.patterns)) {
      const responses: Record<string, string> = {
        'show-notifications': "Opening your notifications...",
        'clear-notifications': "Clearing all notifications.",
        'set-theme': `Switching to ${(feature as any).theme} mode.`,
        'open-search': "Opening search...",
        'refresh-page': "Refreshing the page...",
      };
      return {
        text: responses[feature.action] || "Done.",
        action: feature.action,
        actionData: feature,
        confidence: 0.9,
      };
    }
  }

  // Check learning patterns
  for (const learn of COMMAND_PATTERNS.learning) {
    if (matchPattern(normalizedCommand, learn.patterns)) {
      const responses: Record<string, string> = {
        'save-memory': "I'll remember that for you.",
        'recall-memories': "Let me recall what I know...",
        'delete-memory': "I've forgotten that.",
      };
      return {
        text: responses[learn.action] || "Noted.",
        action: learn.action,
        confidence: 0.8,
      };
    }
  }

  // 🔥 Check SECURITY patterns (God Mode, Sentinel, etc.)
  for (const security of COMMAND_PATTERNS.security) {
    if (matchPattern(normalizedCommand, security.patterns)) {
      return {
        text: (security as any).response ? (security as any).response() : "Running security scan...",
        action: security.action,
        actionData: { securityAction: security.action },
        emotion: 'focused',
        confidence: 0.95,
        requiresOnline: true, // Security commands need edge function access
      };
    }
  }

  // Fallback response for unrecognized commands
  return {
    text: "I'm in offline mode right now, so some features are limited. I can help with navigation, status updates, time queries, and basic commands. Try saying 'help' to see what I can do!",
    emotion: 'helpful',
    confidence: 0.3,
  };
};

// Execute offline actions
export const executeOfflineAction = (response: OfflineResponse): void => {
  if (!response.action) return;

  switch (response.action) {
    case 'navigate':
      if (response.actionData?.route) {
        window.dispatchEvent(new CustomEvent('zoe-navigate', { 
          detail: { route: response.actionData.route } 
        }));
      }
      break;
    case 'go-back':
      window.history.back();
      break;
    case 'set-status':
      window.dispatchEvent(new CustomEvent('zoe-set-status', { 
        detail: { status: response.actionData?.status } 
      }));
      break;
    case 'stop-speech':
      window.dispatchEvent(new CustomEvent('zoe-stop-speech'));
      break;
    case 'repeat-last':
      const lastSpoken = localStorage.getItem('zoe-last-spoken');
      if (lastSpoken) {
        window.dispatchEvent(new CustomEvent('zoe-speak', { 
          detail: { text: lastSpoken } 
        }));
      }
      break;
    case 'set-theme':
      document.documentElement.classList.toggle('dark', response.actionData?.theme === 'dark');
      localStorage.setItem('theme', response.actionData?.theme || 'dark');
      break;
    case 'refresh-page':
      window.location.reload();
      break;
    case 'open-search':
      window.dispatchEvent(new CustomEvent('zoe-open-search'));
      break;
    case 'show-notifications':
      window.dispatchEvent(new CustomEvent('zoe-show-notifications'));
      break;
    case 'open-settings':
      window.dispatchEvent(new CustomEvent('zoe-open-settings'));
      break;
    
    // 🔥 SECURITY ACTIONS - God Mode, Sentinel, Lockdown
    case 'security-god-mode-scan':
      window.dispatchEvent(new CustomEvent('zoe-security-command', { 
        detail: { action: 'godModeScan', autoFix: true } 
      }));
      break;
    case 'security-sentinel-scan':
      window.dispatchEvent(new CustomEvent('zoe-security-command', { 
        detail: { action: 'sentinelScan' } 
      }));
      break;
    case 'security-health-check':
      window.dispatchEvent(new CustomEvent('zoe-security-command', { 
        detail: { action: 'healthCheck' } 
      }));
      break;
    case 'security-auto-fix':
      window.dispatchEvent(new CustomEvent('zoe-security-command', { 
        detail: { action: 'autoFix' } 
      }));
      break;
    case 'security-lockdown':
      window.dispatchEvent(new CustomEvent('zoe-security-command', { 
        detail: { action: 'lockdown', reason: 'Voice command initiated lockdown' } 
      }));
      break;
    case 'security-dashboard':
      window.dispatchEvent(new CustomEvent('zoe-security-command', { 
        detail: { action: 'dashboard' } 
      }));
      break;
  }
};

// Check if offline
export const isOffline = (): boolean => {
  return !navigator.onLine;
};

// Get offline status message
export const getOfflineStatusMessage = (): string => {
  return "I'm currently running in offline mode. I can still help with navigation, basic commands, and local features. Online features like AI-powered responses will be available once you're connected again.";
};

// Export security command types for integration
export const SECURITY_ACTIONS = [
  'security-god-mode-scan',
  'security-sentinel-scan', 
  'security-health-check',
  'security-auto-fix',
  'security-lockdown',
  'security-dashboard',
] as const;

export type SecurityActionType = typeof SECURITY_ACTIONS[number];