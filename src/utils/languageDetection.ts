// Language detection and multi-language support for Lisa

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  speechRecognitionCode: string;
  ttsVoices: string[];
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English',
    speechRecognitionCode: 'en-US',
    ttsVoices: ['alloy', 'nova', 'shimmer'],
  },
  {
    code: 'en-GB',
    name: 'English (UK)',
    nativeName: 'English',
    speechRecognitionCode: 'en-GB',
    ttsVoices: ['alloy', 'echo'],
  },
  {
    code: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',
    speechRecognitionCode: 'es-ES',
    ttsVoices: ['nova', 'shimmer'],
  },
  {
    code: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    speechRecognitionCode: 'fr-FR',
    ttsVoices: ['alloy', 'shimmer'],
  },
  {
    code: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    speechRecognitionCode: 'de-DE',
    ttsVoices: ['alloy', 'echo'],
  },
  {
    code: 'it-IT',
    name: 'Italian',
    nativeName: 'Italiano',
    speechRecognitionCode: 'it-IT',
    ttsVoices: ['nova', 'shimmer'],
  },
  {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português',
    speechRecognitionCode: 'pt-BR',
    ttsVoices: ['nova', 'alloy'],
  },
  {
    code: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    speechRecognitionCode: 'ja-JP',
    ttsVoices: ['alloy', 'shimmer'],
  },
  {
    code: 'ko-KR',
    name: 'Korean',
    nativeName: '한국어',
    speechRecognitionCode: 'ko-KR',
    ttsVoices: ['nova', 'alloy'],
  },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '中文',
    speechRecognitionCode: 'zh-CN',
    ttsVoices: ['alloy', 'shimmer'],
  },
  {
    code: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    speechRecognitionCode: 'hi-IN',
    ttsVoices: ['nova', 'shimmer'],
  },
  {
    code: 'ar-SA',
    name: 'Arabic',
    nativeName: 'العربية',
    speechRecognitionCode: 'ar-SA',
    ttsVoices: ['alloy', 'echo'],
  },
];

export const getLanguageConfig = (languageCode: string): LanguageConfig | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
};

export const detectLanguageFromText = (text: string): string => {
  // Simple heuristic-based language detection
  // In production, you'd use a proper language detection library
  
  const lowerText = text.toLowerCase();
  
  // Check for common words in different languages
  const patterns = {
    'es-ES': /\b(hola|gracias|por favor|buenos días|adiós|cómo|qué)\b/i,
    'fr-FR': /\b(bonjour|merci|s'il vous plaît|au revoir|comment|quoi)\b/i,
    'de-DE': /\b(hallo|danke|bitte|auf wiedersehen|wie|was)\b/i,
    'it-IT': /\b(ciao|grazie|per favore|arrivederci|come|cosa)\b/i,
    'pt-BR': /\b(olá|obrigado|por favor|tchau|como|o que)\b/i,
    'ja-JP': /[\u3040-\u309F\u30A0-\u30FF]/,
    'ko-KR': /[\uAC00-\uD7AF]/,
    'zh-CN': /[\u4E00-\u9FFF]/,
    'hi-IN': /[\u0900-\u097F]/,
    'ar-SA': /[\u0600-\u06FF]/,
  };

  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(lowerText)) {
      return lang;
    }
  }

  // Default to English
  return 'en-US';
};

export const getBrowserLanguage = (): string => {
  const browserLang = navigator.language || 'en-US';
  
  // Check if we support this language directly
  if (SUPPORTED_LANGUAGES.some(lang => lang.code === browserLang)) {
    return browserLang;
  }
  
  // Try to match just the language part (e.g., 'en' from 'en-AU')
  const langCode = browserLang.split('-')[0];
  const matchingLang = SUPPORTED_LANGUAGES.find(lang => 
    lang.code.startsWith(langCode)
  );
  
  return matchingLang?.code || 'en-US';
};

export const getGreetingInLanguage = (languageCode: string): string => {
  const greetings: Record<string, string> = {
    'en-US': 'Hello',
    'en-GB': 'Hello',
    'es-ES': 'Hola',
    'fr-FR': 'Bonjour',
    'de-DE': 'Hallo',
    'it-IT': 'Ciao',
    'pt-BR': 'Olá',
    'ja-JP': 'こんにちは',
    'ko-KR': '안녕하세요',
    'zh-CN': '你好',
    'hi-IN': 'नमस्ते',
    'ar-SA': 'مرحبا',
  };
  
  return greetings[languageCode] || 'Hello';
};