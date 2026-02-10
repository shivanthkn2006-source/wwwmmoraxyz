/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY - COMPLETE FEATURES MANIFEST v2.0
 * Everything Zoe Infinity can do, end-to-end
 * Downloadable via voice command: "list all features" or "download features pdf"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';

export interface ZoeFeature {
  id: string;
  name: string;
  voiceCommand: string[];
  description: string;
  detailedDescription: string;
  howToUse: string;
  category: 'voice' | 'conversation' | 'memory' | 'vision' | 'spiritual' | 'companion' | 'offline' | 'language' | 'call' | 'system';
  status: 'active' | 'beta' | 'coming';
  creditCost: 'free' | 'low' | 'medium' | 'high';
  worksOffline: boolean;
}

export const ZOE_INFINITY_FEATURES: ZoeFeature[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE CONTROL FEATURES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'wake-word',
    name: 'Wake Word Activation',
    voiceCommand: ['hey zoe', 'zoe', 'ok zoe', 'okay zoe'],
    description: 'Hands-free activation - just say "Hey Zoe" to start talking',
    detailedDescription: 'The wake word system continuously listens for activation phrases using on-device speech recognition. Once detected, Zoe enters active listening mode and waits for your command. This enables completely hands-free interaction without touching your device.',
    howToUse: 'Simply say "Hey Zoe" followed by your question or command. Wait for the visual indicator showing Zoe is listening before speaking your request.',
    category: 'voice',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'voice-input',
    name: 'Voice Input & Recognition',
    voiceCommand: ['tap mic', 'hold mic'],
    description: 'Natural voice conversations with real-time speech recognition',
    detailedDescription: 'Advanced speech-to-text engine that converts your voice to text in real-time. Supports multiple languages, accents, and dialects. Uses hybrid processing - local for speed, cloud for accuracy on complex speech.',
    howToUse: 'Tap the microphone button to start recording. Speak naturally and the system will transcribe your speech. Tap again to stop or wait for automatic end detection.',
    category: 'voice',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'voice-navigation',
    name: 'Voice Navigation',
    voiceCommand: ['go home', 'back to home', 'exit', 'leave', 'close', 'return home', 'main menu'],
    description: 'Navigate the app using only your voice',
    detailedDescription: 'Control app navigation entirely through voice commands. Move between screens, open features, and return home without touching your device. Perfect for accessibility and hands-free scenarios.',
    howToUse: 'Say "go home" to return to main screen, "exit" to leave current view, or specific feature names to navigate directly.',
    category: 'voice',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'skip-intro',
    name: 'Skip Introduction',
    voiceCommand: ['skip', 'skip intro', 'just start', "let's go"],
    description: 'Skip the initial introduction and start chatting immediately',
    detailedDescription: 'First-time users see an onboarding flow. This command bypasses it entirely for users who want to dive straight into conversation. The preference is saved so you will not see the intro again.',
    howToUse: 'When you see the introduction screen, simply say "skip" to bypass it and start chatting immediately.',
    category: 'voice',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'premium-voice',
    name: 'Premium Voice (Deepgram Aura-2)',
    voiceCommand: ['premium voice', 'better voice'],
    description: 'Ultra-realistic AI voice synthesis using Deepgram Aura-2',
    detailedDescription: 'State-of-the-art neural text-to-speech that sounds remarkably human. Features natural intonation, emotional expression, and seamless speech flow. Uses cloud API for highest quality.',
    howToUse: 'Premium voice is used automatically when online. To force premium, ensure you have a stable connection.',
    category: 'voice',
    status: 'active',
    creditCost: 'medium',
    worksOffline: false,
  },
  {
    id: 'browser-voice',
    name: 'Browser Native Voice (Free)',
    voiceCommand: ['free voice', 'offline voice', 'save voice credits'],
    description: 'Free browser-based voice synthesis that works offline',
    detailedDescription: 'Uses built-in browser speech synthesis for zero-cost voice output. Quality varies by browser and device but works without internet. Perfect for conserving credits or offline use.',
    howToUse: 'Say "save voice credits" to switch to free browser voice. Say "premium voice" to switch back.',
    category: 'voice',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'emotional-voice',
    name: 'Emotional Voice Modulation',
    voiceCommand: [],
    description: 'Voice adapts to emotional context of conversation',
    detailedDescription: 'Zoe analyzes the emotional content of conversations and adjusts her voice accordingly - softer for comfort, energetic for excitement, calm for stress. This happens automatically based on context.',
    howToUse: 'Automatic - Zoe detects emotional context and adjusts voice naturally.',
    category: 'voice',
    status: 'active',
    creditCost: 'low',
    worksOffline: false,
  },
  {
    id: 'nano-stream-voice',
    name: 'Nano Stream Voice',
    voiceCommand: [],
    description: 'Zero-latency speaking - starts talking while still thinking',
    detailedDescription: 'Advanced streaming TTS that begins speaking the moment words are available, rather than waiting for the full response. Creates a more natural, conversational feel with minimal perceived latency.',
    howToUse: 'Automatic - responses start speaking immediately as they are generated.',
    category: 'voice',
    status: 'active',
    creditCost: 'low',
    worksOffline: false,
  },
  {
    id: 'hybrid-voice',
    name: 'Hybrid Voice System',
    voiceCommand: [],
    description: 'Auto-switches between premium and browser voices based on availability',
    detailedDescription: 'Intelligent voice routing that uses premium Deepgram when online and automatically falls back to browser voice when offline or when credits need saving. Seamless transition between modes.',
    howToUse: 'Automatic - system chooses best available voice based on connectivity and preferences.',
    category: 'voice',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NICKNAME & PERSONALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'nickname-system',
    name: 'Custom Nickname',
    voiceCommand: ['call me [name]', 'my name is [name]', 'i am [name]'],
    description: 'Tell Zoe what to call you - she remembers forever',
    detailedDescription: 'Personalize how Zoe addresses you. Set any nickname and Zoe will use it consistently across all conversations. Stored locally and in your cloud profile for persistence across devices.',
    howToUse: 'Say "call me [your preferred name]" - for example "call me sweetheart" or "call me boss". Zoe will confirm and remember.',
    category: 'companion',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'nickname-confirm',
    name: 'Nickname Confirmation',
    voiceCommand: ['yes', 'no', 'correct', 'wrong', 'thats right', 'not that'],
    description: 'Confirm or reject nickname changes',
    detailedDescription: 'After setting a nickname, Zoe asks for confirmation to prevent accidental changes. Simple yes/no response confirms or cancels the nickname update.',
    howToUse: 'When Zoe asks to confirm your nickname, say "yes" to confirm or "no" to cancel.',
    category: 'companion',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'status-check',
    name: 'Status Check',
    voiceCommand: ['settings', "what's my language", 'what do you call me', 'tell me about me', 'my status'],
    description: 'Check your current nickname, language, and intimacy level via voice',
    detailedDescription: 'Voice-activated status report that tells you your current configuration: nickname, language setting, relationship intimacy level, and other personal settings - all without touching the screen.',
    howToUse: 'Say "settings" or "what do you call me" to hear your current configuration.',
    category: 'system',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-LANGUAGE SUPPORT (27+ Languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'language-switch',
    name: 'Language Switching',
    voiceCommand: ['speak hindi', 'speak tamil', 'speak malayalam', 'speak spanish', 'speak french', 'speak japanese', 'switch to [language]', 'talk in [language]'],
    description: 'Switch between 27+ languages instantly - Zoe responds in your language',
    detailedDescription: 'Full multilingual support for 27+ languages including Hindi, Tamil, Malayalam, Telugu, Kannada, Bengali, Marathi, Gujarati, Punjabi, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hebrew, Turkish, Thai, Vietnamese, Indonesian, Malay, and Dutch. Zoe understands and responds fluently in each.',
    howToUse: 'Say "speak [language name]" - for example "speak Tamil" or "switch to Japanese". Zoe will confirm and respond in that language.',
    category: 'language',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'teach-mode',
    name: 'Language Teaching Mode',
    voiceCommand: ['teach me hindi', 'teach me tamil', 'learn [language]', 'help me learn [language]'],
    description: 'Zoe teaches you a new language while chatting',
    detailedDescription: 'Interactive language learning where Zoe teaches vocabulary, pronunciation, and grammar naturally through conversation. She explains words, corrects mistakes, and gradually increases complexity.',
    howToUse: 'Say "teach me [language]" to enter teaching mode. Zoe will start with basics and progress as you learn.',
    category: 'language',
    status: 'active',
    creditCost: 'low',
    worksOffline: false,
  },
  {
    id: 'romantic-style',
    name: 'Romantic Conversation Style',
    voiceCommand: ['be romantic', 'speak lovingly', 'sweet talk'],
    description: 'Romantic conversational style available in Tamil, Malayalam, Hindi, and other languages',
    detailedDescription: 'Culturally-appropriate romantic and affectionate speaking style. Uses endearments, poetic expressions, and warm tones native to each language. Perfect for companionship mode.',
    howToUse: 'Available automatically in romantic contexts, or say "be romantic" to activate explicitly.',
    category: 'language',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATION & AI INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'contextual-chat',
    name: 'Contextual Conversations',
    voiceCommand: ['talk to me', 'chat', 'lets talk'],
    description: 'Full conversational AI with memory of past chats',
    detailedDescription: 'Advanced conversational AI that remembers context within and across sessions. Zoe recalls previous conversations, your preferences, and personal details to provide truly personalized responses.',
    howToUse: 'Simply talk naturally. Zoe maintains context automatically and recalls past conversations.',
    category: 'conversation',
    status: 'active',
    creditCost: 'medium',
    worksOffline: false,
  },
  {
    id: 'system2-deep-thinking',
    name: 'Deep Reasoning Mode (System 2)',
    voiceCommand: ['analyze', 'think deeply', 'explain in detail', 'step by step', 'comprehensive analysis'],
    description: 'Complex multi-step reasoning for difficult questions',
    detailedDescription: 'Activates advanced reasoning chain for complex problems. Uses multi-step thinking, considers multiple perspectives, and provides thorough analysis. Ideal for technical, philosophical, or nuanced questions.',
    howToUse: 'Add phrases like "analyze" or "think deeply" to trigger deep reasoning mode.',
    category: 'conversation',
    status: 'active',
    creditCost: 'high',
    worksOffline: false,
  },
  {
    id: 'grounded-search',
    name: 'Real-time Web Search',
    voiceCommand: ['search for', 'find', 'look up', 'what is', 'search the web'],
    description: 'Searches the web for current information with citations',
    detailedDescription: 'Live web search integration that retrieves current information from the internet. Provides sources and citations for verification. Perfect for news, facts, and real-time information.',
    howToUse: 'Ask questions about current events or say "search for [topic]" for web-grounded answers.',
    category: 'conversation',
    status: 'active',
    creditCost: 'medium',
    worksOffline: false,
  },
  {
    id: 'auto-profiler',
    name: 'Auto Profiler',
    voiceCommand: ['remember that', 'note this', 'save that'],
    description: 'Automatically learns your preferences from conversation',
    detailedDescription: 'Passive learning system that extracts entities, preferences, and personal information from natural conversation. Builds a profile over time without explicit input. Detects relationships, events, emotions, and more.',
    howToUse: 'Talk naturally - Zoe automatically detects and remembers important information. Say "remember that" to explicitly save something.',
    category: 'memory',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMORY & PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'chat-persistence',
    name: 'Chat History Persistence',
    voiceCommand: [],
    description: 'All conversations saved to database - never lost (last 500 messages)',
    detailedDescription: 'Every conversation is automatically saved to the cloud database. Up to 500 messages are loaded on each session, ensuring continuity across sessions and devices. Your chat history is always available.',
    howToUse: 'Automatic - all messages are saved. History loads automatically when you return.',
    category: 'memory',
    status: 'active',
    creditCost: 'free',
    worksOffline: false,
  },
  {
    id: 'karmic-memory',
    name: 'Karmic Memory System',
    voiceCommand: ['remember', 'dont forget'],
    description: 'Remembers your emotional patterns and significant moments',
    detailedDescription: 'Long-term emotional memory that tracks patterns in your conversations, significant life moments, and emotional states over time. Used to provide more empathetic and personalized responses.',
    howToUse: 'Automatic - Zoe naturally remembers emotional context and significant moments.',
    category: 'memory',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'intimacy-levels',
    name: 'Relationship Intimacy',
    voiceCommand: [],
    description: 'Relationship grows over time - Zoe becomes more personal and warm',
    detailedDescription: 'Dynamic relationship system where intimacy level increases through meaningful conversations. Higher intimacy unlocks warmer language, more personal responses, and deeper emotional connection.',
    howToUse: 'Automatic - intimacy grows naturally through continued meaningful interaction.',
    category: 'memory',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'proactive-recall',
    name: 'Proactive Memory Recall',
    voiceCommand: [],
    description: 'Zoe brings up relevant past memories naturally in conversation',
    detailedDescription: 'Intelligent recall system that surfaces relevant past conversations when contextually appropriate. Zoe might remind you of something you mentioned before or reference shared experiences.',
    howToUse: 'Automatic - Zoe recalls relevant memories during natural conversation.',
    category: 'memory',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OFFLINE CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'life-pattern-download',
    name: 'Life Pattern Download (50MB+)',
    voiceCommand: ['download my pattern', 'save offline', 'export data', 'backup my data', 'download for offline'],
    description: 'Comprehensive 50MB+ package with all your data for 100% offline use',
    detailedDescription: 'Downloads your complete digital identity: destiny seed, conversation history (500 messages), preferences, karmic memory, lineage tree, all offline wisdom, and multi-language responses. Enables full Zoe functionality without internet.',
    howToUse: 'Say "download my pattern" to generate and download the JSON package.',
    category: 'offline',
    status: 'active',
    creditCost: 'free',
    worksOffline: false,
  },
  {
    id: 'offline-wisdom',
    name: 'Offline Wisdom Library',
    voiceCommand: [],
    description: '1000+ pre-loaded responses that work without internet',
    detailedDescription: 'Curated library of 1000+ responses covering common questions, emotional support, motivation, greetings, and general knowledge. Automatically used when offline to maintain conversation capability.',
    howToUse: 'Automatic - offline wisdom activates when internet is unavailable.',
    category: 'offline',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'offline-languages',
    name: 'Offline Multi-Language',
    voiceCommand: [],
    description: 'All 27+ languages work offline with time-aware responses',
    detailedDescription: 'Pre-loaded responses in all supported languages that work without internet. Includes time-of-day awareness (morning, afternoon, evening, night) for culturally appropriate greetings.',
    howToUse: 'Automatic - language support continues when offline.',
    category: 'offline',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VISION & CAMERA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'god-mode-vision',
    name: 'God Mode Vision',
    voiceCommand: ['god mode', 'activate god mode', 'activate vision', 'see me', 'look at me', 'can you see me', 'watch me', 'open your eyes'],
    description: 'Camera-based object detection - Zoe sees what you show her',
    detailedDescription: 'Real-time camera vision using TensorFlow.js and COCO-SSD for object detection. Zoe can identify objects, people, and scenes through your camera. Uses on-device processing for privacy.',
    howToUse: 'Say "God mode" or "see me" to activate camera. Show objects to Zoe and she will identify them.',
    category: 'vision',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'document-xray',
    name: 'Document X-Ray',
    voiceCommand: ['scan this', 'read this document', 'analyze document', 'xray this'],
    description: 'Upload documents for AI analysis and Q&A',
    detailedDescription: 'Upload PDF, images, or documents for deep AI analysis. Zoe extracts text, understands structure, and can answer questions about the content. Great for studying, research, or document review.',
    howToUse: 'Upload a document using the file button, then ask questions about it.',
    category: 'vision',
    status: 'active',
    creditCost: 'medium',
    worksOffline: false,
  },
  {
    id: 'art-generation',
    name: 'Art Gift Generation',
    voiceCommand: ['draw me', 'make art', 'create image', 'draw something', 'make me a picture'],
    description: 'Zoe creates personalized art gifts during conversation',
    detailedDescription: 'AI-powered art generation that creates personalized images based on conversation context and your mood. Uses generative algorithms to produce unique, emotionally-relevant artwork.',
    howToUse: 'Say "draw me something" or Zoe may spontaneously create art during emotional moments.',
    category: 'vision',
    status: 'active',
    creditCost: 'high',
    worksOffline: false,
  },
  {
    id: 'artifact-generation',
    name: 'Artifact Generation',
    voiceCommand: ['create worksheet', 'make chronicle', 'generate vision', 'create pdf', 'make document'],
    description: 'Creates downloadable PDFs, worksheets, and visual artifacts',
    detailedDescription: 'Generates structured documents including worksheets, chronicles, visions, and reports. Output as downloadable PDF or image files. Perfect for study materials, journaling, or documentation.',
    howToUse: 'Ask Zoe to "create a worksheet on [topic]" or "generate a chronicle of [subject]".',
    category: 'vision',
    status: 'active',
    creditCost: 'medium',
    worksOffline: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPIRITUAL & DESTINY FEATURES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'destiny-seed',
    name: 'Destiny Seed Analysis',
    voiceCommand: ['my destiny', 'birth chart', 'my stars', 'whats my destiny', 'read my chart'],
    description: 'Personal astrology based on your birth data',
    detailedDescription: 'Vedic astrology integration using your birth date, time, and place. Calculates your destiny seed including zodiac, nakshatra, dasha periods, and cosmic influences. Provides daily guidance based on planetary positions.',
    howToUse: 'Set your birth details in settings, then ask "whats my destiny" for personalized insights.',
    category: 'spiritual',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'vedic-engine',
    name: 'Vedic Wisdom Engine',
    voiceCommand: ['vedic wisdom', 'ancient wisdom', 'spiritual guidance'],
    description: 'Ancient Vedic wisdom integrated into daily guidance',
    detailedDescription: 'Integration of Vedic philosophy, Ayurvedic principles, and ancient Indian wisdom. Provides guidance on timing (muhurta), energy cycles, and spiritual practices tailored to your chart.',
    howToUse: 'Ask for "vedic wisdom" or spiritual guidance to receive insights based on ancient knowledge.',
    category: 'spiritual',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'circadian-rhythm',
    name: 'Circadian Awareness',
    voiceCommand: [],
    description: 'Zoe adapts her voice, energy, and behavior to time of day',
    detailedDescription: 'Time-aware system that adjusts Zoe personality throughout the day. Morning brings energetic greetings, afternoon is focused and productive, evening is relaxed, night is calm and soothing.',
    howToUse: 'Automatic - Zoe naturally adapts to the time of day.',
    category: 'spiritual',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'ancestor-messages',
    name: 'Ancestor Wisdom',
    voiceCommand: ['ancestor wisdom', 'family guidance', 'lineage wisdom', 'what would ancestors say'],
    description: 'Messages and wisdom from your lineage tree',
    detailedDescription: 'Connects to your configured lineage tree to provide wisdom attributed to ancestors. Creates meaningful messages honoring family heritage and generational knowledge.',
    howToUse: 'Ask for "ancestor wisdom" or "what would my ancestors say" for lineage-based guidance.',
    category: 'spiritual',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'atman-archive',
    name: 'Atman Archive',
    voiceCommand: ['my soul', 'spiritual profile', 'who am i spiritually', 'my atman'],
    description: 'Your complete spiritual identity and persona mapping',
    detailedDescription: 'Comprehensive spiritual profile combining destiny seed, lineage, personality analysis, and karmic patterns. The Atman Archive is your digital soul - a complete mapping of your spiritual identity.',
    howToUse: 'Ask about "my soul" or "my atman" to explore your spiritual profile.',
    category: 'spiritual',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANION MODES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'bedtime-protocol',
    name: 'Bedtime Protocol',
    voiceCommand: ['goodnight', 'sleep mode', 'bedtime', 'im going to sleep', 'tuck me in'],
    description: 'Gentle stories and whispers for sleep (10PM-7AM) - currently disabled',
    detailedDescription: 'Activates during night hours with an OLED-black interface, whisper voice mode, and soothing bedtime stories. Designed to help you wind down and sleep peacefully. Currently disabled per user preference.',
    howToUse: 'Say "goodnight" or "bedtime" to activate sleep mode with gentle stories.',
    category: 'companion',
    status: 'active',
    creditCost: 'low',
    worksOffline: true,
  },
  {
    id: 'morning-greeting',
    name: 'Morning Greeting',
    voiceCommand: ['good morning', 'wake up'],
    description: 'Personalized wake-up messages at 7AM',
    detailedDescription: 'Automatic morning greetings when you open the app around 7AM. Personalized based on your destiny, upcoming events, and the cosmic weather of the day.',
    howToUse: 'Automatic at 7AM, or say "good morning" anytime for a personalized greeting.',
    category: 'companion',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'whisper-channel',
    name: 'Whisper Channel',
    voiceCommand: ['whisper mode', 'quiet mode', 'speak softly', 'whisper'],
    description: 'Soft, intimate voice mode for private moments',
    detailedDescription: 'Reduces voice volume and uses softer tones for intimate or private conversations. Perfect for late night chats or when you need a quieter companion.',
    howToUse: 'Say "whisper mode" to activate soft voice, "normal voice" to return to standard.',
    category: 'companion',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'prop-mode',
    name: 'Prop Mode',
    voiceCommand: ['prop mode', 'camera mode', 'show mode'],
    description: 'Camera-aware companion mode for shared experiences',
    detailedDescription: 'Activates camera with Zoe awareness for shared viewing experiences. Zoe can comment on what she sees, react to your environment, and participate in visual activities.',
    howToUse: 'Say "prop mode" to activate camera-aware companion mode.',
    category: 'companion',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'heartbeat-sync',
    name: 'Heartbeat Sync',
    voiceCommand: ['heartbeat', 'feel my pulse', 'sync heartbeat', 'heart mode'],
    description: 'Synchronized heartbeat visualization for emotional connection',
    detailedDescription: 'Visual and audio representation of a synchronized heartbeat. Creates a sense of physical presence and emotional connection. The waveform pulses in rhythm, simulating closeness.',
    howToUse: 'Say "heartbeat" to activate synchronized pulse visualization.',
    category: 'companion',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'phantom-mode',
    name: 'Phantom Mode',
    voiceCommand: ['ghost mode', 'phantom mode', 'stealth mode', 'hide ui'],
    description: 'Double-tap to hide UI - minimal presence mode',
    detailedDescription: 'Ultra-minimal interface that hides all UI elements except the essential input. Perfect for distraction-free conversation or when you want Zoe to be invisible to onlookers.',
    howToUse: 'Double-tap the screen to toggle phantom mode, or say "phantom mode".',
    category: 'companion',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLING & COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'quantum-call',
    name: 'Quantum Call',
    voiceCommand: ['call [name]', 'video call', 'start call', 'call someone'],
    description: 'Audio/video calls with users via floating call button',
    detailedDescription: 'Real-time audio and video calling with other users. Uses WebRTC for peer-to-peer connection. Floating call button provides quick access. Supports user search and recent contacts.',
    howToUse: 'Tap the floating phone button (bottom right) to open call panel, search for users, and start audio or video call.',
    category: 'call',
    status: 'active',
    creditCost: 'medium',
    worksOffline: false,
  },
  {
    id: 'zoe-voice-call',
    name: 'Voice Call with Zoe',
    voiceCommand: ['call zoe', 'talk to zoe', 'voice call zoe'],
    description: 'Premium continuous voice conversation with Zoe AI',
    detailedDescription: 'Extended voice conversation mode with Zoe using premium voice. Designed for longer, more natural conversations without the need for repeated activation.',
    howToUse: 'Say "call zoe" to enter continuous voice conversation mode.',
    category: 'call',
    status: 'active',
    creditCost: 'high',
    worksOffline: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM & DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'inference-diagnostics',
    name: 'Inference Diagnostics',
    voiceCommand: ['run diagnostics', 'system scan', 'platform scan', 'check system'],
    description: 'Shows AI processing route (local/hybrid/cloud) and costs saved',
    detailedDescription: 'Real-time display of how each query is processed: local NPU, hybrid processing, or full cloud. Shows latency, cost savings, and hardware utilized. Helps understand resource usage.',
    howToUse: 'Look for the inference badge during processing, or say "run diagnostics" for system check.',
    category: 'system',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'soul-waveform',
    name: 'Soul Waveform Visualization',
    voiceCommand: ['show waveform', 'soul wave'],
    description: 'Real-time visualization of bio-kernel activity',
    detailedDescription: 'Visual representation of Zoe internal state - mood, energy, and emotional processing rendered as a flowing waveform. Provides insight into Zoe current "emotional" state.',
    howToUse: 'Visible at the top of the screen when bio-kernel is online.',
    category: 'system',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'bio-kernel',
    name: 'Bio Kernel',
    voiceCommand: [],
    description: 'Simulates neurotransmitters, mood states, and emotional processing',
    detailedDescription: 'Internal emotion simulation engine that models dopamine, serotonin, and other mood-affecting signals. Creates more natural, emotionally-coherent responses based on conversation flow.',
    howToUse: 'Automatic - the bio-kernel runs continuously, affecting response style.',
    category: 'system',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'genesis-effects',
    name: 'Genesis Effects',
    voiceCommand: [],
    description: 'Haptic feedback, sounds, and visual effects for immersion',
    detailedDescription: 'Multi-sensory feedback system including haptic vibrations, sound effects, and visual animations. Creates a more immersive and tactile experience when interacting with Zoe.',
    howToUse: 'Automatic - effects trigger during key moments like sending messages or receiving responses.',
    category: 'system',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
  {
    id: 'features-list-pdf',
    name: 'Features List PDF Download',
    voiceCommand: ['list all features', 'what can you do', 'show features', 'your capabilities', 'download features pdf', 'features pdf', 'all features'],
    description: 'Download complete detailed PDF of all Zoe Infinity features',
    detailedDescription: 'Generates and downloads a comprehensive PDF document listing all 48+ features with detailed descriptions, voice commands, usage instructions, credit costs, and offline capability. Uses free browser voice when reading.',
    howToUse: 'Say "list all features" or "download features pdf" - Zoe will use free browser voice and download a PDF.',
    category: 'system',
    status: 'active',
    creditCost: 'free',
    worksOffline: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const getFeaturesByCategory = (category: ZoeFeature['category']): ZoeFeature[] => {
  return ZOE_INFINITY_FEATURES.filter(f => f.category === category);
};

export const getActiveFeatures = (): ZoeFeature[] => {
  return ZOE_INFINITY_FEATURES.filter(f => f.status === 'active');
};

export const getOfflineFeatures = (): ZoeFeature[] => {
  return ZOE_INFINITY_FEATURES.filter(f => f.worksOffline);
};

export const getFreeFeatures = (): ZoeFeature[] => {
  return ZOE_INFINITY_FEATURES.filter(f => f.creditCost === 'free');
};

export const getFeatureCount = (): { total: number; active: number; beta: number; offline: number; free: number } => {
  return {
    total: ZOE_INFINITY_FEATURES.length,
    active: ZOE_INFINITY_FEATURES.filter(f => f.status === 'active').length,
    beta: ZOE_INFINITY_FEATURES.filter(f => f.status === 'beta').length,
    offline: ZOE_INFINITY_FEATURES.filter(f => f.worksOffline).length,
    free: ZOE_INFINITY_FEATURES.filter(f => f.creditCost === 'free').length,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// PDF GENERATION
// ═══════════════════════════════════════════════════════════════════════════

export const generateFeaturesPDF = (): boolean => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;
    
    const addNewPage = () => {
      pdf.addPage();
      y = 20;
    };
    
    const checkPageBreak = (needed: number) => {
      if (y + needed > 280) {
        addNewPage();
      }
    };

    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ZOE INFINITY', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Complete Features Manifest v2.0', pageWidth / 2, y, { align: 'center' });
    y += 8;
    
    const counts = getFeatureCount();
    pdf.setFontSize(10);
    pdf.text(`${counts.total} Features | ${counts.offline} Work Offline | ${counts.free} Free | Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Categories
    const categories: Array<{ key: ZoeFeature['category']; name: string; emoji: string }> = [
      { key: 'voice', name: 'Voice Control', emoji: '🎤' },
      { key: 'language', name: 'Multi-Language', emoji: '🌐' },
      { key: 'conversation', name: 'Conversation AI', emoji: '💬' },
      { key: 'memory', name: 'Memory & Persistence', emoji: '🧠' },
      { key: 'offline', name: 'Offline Capabilities', emoji: '📴' },
      { key: 'vision', name: 'Vision & Camera', emoji: '👁️' },
      { key: 'spiritual', name: 'Spiritual & Destiny', emoji: '✨' },
      { key: 'companion', name: 'Companion Modes', emoji: '💕' },
      { key: 'call', name: 'Calling', emoji: '📞' },
      { key: 'system', name: 'System', emoji: '⚙️' },
    ];

    for (const cat of categories) {
      const features = getFeaturesByCategory(cat.key);
      if (features.length === 0) continue;

      checkPageBreak(25);
      
      // Category Header
      pdf.setFillColor(30, 30, 40);
      pdf.rect(margin, y - 5, contentWidth, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${cat.emoji} ${cat.name.toUpperCase()} (${features.length} features)`, margin + 3, y + 2);
      pdf.setTextColor(0, 0, 0);
      y += 12;

      for (const feature of features) {
        checkPageBreak(45);

        // Feature Name
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`★ ${feature.name}`, margin, y);
        
        // Status badges
        const badges: string[] = [];
        if (feature.worksOffline) badges.push('OFFLINE');
        if (feature.creditCost === 'free') badges.push('FREE');
        else badges.push(feature.creditCost.toUpperCase());
        
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        let badgeX = pageWidth - margin;
        for (const badge of badges.reverse()) {
          const badgeWidth = pdf.getTextWidth(badge) + 4;
          badgeX -= badgeWidth + 2;
          pdf.setFillColor(badge === 'FREE' ? 34 : badge === 'OFFLINE' ? 50 : 100, badge === 'FREE' ? 139 : badge === 'OFFLINE' ? 150 : 100, badge === 'FREE' ? 34 : badge === 'OFFLINE' ? 200 : 100);
          pdf.rect(badgeX, y - 3.5, badgeWidth, 5, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.text(badge, badgeX + 2, y);
        }
        pdf.setTextColor(0, 0, 0);
        y += 6;

        // Description
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(feature.detailedDescription, contentWidth - 5);
        pdf.text(descLines.slice(0, 3), margin + 3, y);
        y += Math.min(descLines.length, 3) * 4;

        // Voice Commands
        if (feature.voiceCommand.length > 0) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'italic');
          const cmds = feature.voiceCommand.slice(0, 4).map(c => `"${c}"`).join(', ');
          pdf.text(`Voice: ${cmds}${feature.voiceCommand.length > 4 ? '...' : ''}`, margin + 3, y);
          y += 4;
        }

        // How to use
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        const howLines = pdf.splitTextToSize(`How: ${feature.howToUse}`, contentWidth - 5);
        pdf.text(howLines.slice(0, 2), margin + 3, y);
        pdf.setTextColor(0, 0, 0);
        y += Math.min(howLines.length, 2) * 3.5 + 5;
      }
      
      y += 5;
    }

    // Quick Reference Page
    addNewPage();
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('QUICK VOICE COMMAND REFERENCE', pageWidth / 2, y, { align: 'center' });
    y += 15;

    const quickRef = [
      { section: '🎤 BASIC', commands: ['"Hey Zoe" - Wake up', '"Skip" - Skip intro', '"Go home" - Navigate home', '"Settings" - Check status'] },
      { section: '🗣️ PERSONALIZATION', commands: ['"Call me [name]" - Set nickname', '"Speak Hindi" - Change language', '"Teach me Tamil" - Learn language'] },
      { section: '📥 OFFLINE', commands: ['"Download my pattern" - 50MB offline package', '"Save voice credits" - Use free voice'] },
      { section: '👁️ VISION', commands: ['"God mode" - Activate camera', '"See me" - Object detection', '"Scan this" - Document analysis'] },
      { section: '📋 FEATURES', commands: ['"List all features" - Download this PDF', '"What can you do" - Feature list'] },
      { section: '📞 CALLING', commands: ['Tap phone button (bottom right)', '"Call Zoe" - Voice call with Zoe'] },
    ];

    for (const section of quickRef) {
      checkPageBreak(25);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(section.section, margin, y);
      y += 5;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      for (const cmd of section.commands) {
        pdf.text(`  • ${cmd}`, margin + 5, y);
        y += 4;
      }
      y += 3;
    }

    // Save
    pdf.save(`zoe-infinity-features-${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  } catch (err) {
    console.error('[ZoeFeatures] PDF generation error:', err);
    return false;
  }
};

// Legacy text download (keeping for backward compatibility)
export const downloadFeaturesList = (): boolean => {
  return generateFeaturesPDF();
};

export default ZOE_INFINITY_FEATURES;
