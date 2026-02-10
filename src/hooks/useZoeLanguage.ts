/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE LANGUAGE SYSTEM - Multi-Language Support with Auto-Detection
 * Zoe can speak and teach users in any world language
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect } from 'react';

// Supported languages with their configurations
export const SUPPORTED_LANGUAGES = {
  'en': { name: 'English', nativeName: 'English', speechCode: 'en-US', greeting: 'Hello' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN', greeting: 'नमस्ते' },
  'es': { name: 'Spanish', nativeName: 'Español', speechCode: 'es-ES', greeting: 'Hola' },
  'fr': { name: 'French', nativeName: 'Français', speechCode: 'fr-FR', greeting: 'Bonjour' },
  'de': { name: 'German', nativeName: 'Deutsch', speechCode: 'de-DE', greeting: 'Hallo' },
  'it': { name: 'Italian', nativeName: 'Italiano', speechCode: 'it-IT', greeting: 'Ciao' },
  'pt': { name: 'Portuguese', nativeName: 'Português', speechCode: 'pt-BR', greeting: 'Olá' },
  'ja': { name: 'Japanese', nativeName: '日本語', speechCode: 'ja-JP', greeting: 'こんにちは' },
  'ko': { name: 'Korean', nativeName: '한국어', speechCode: 'ko-KR', greeting: '안녕하세요' },
  'zh': { name: 'Chinese', nativeName: '中文', speechCode: 'zh-CN', greeting: '你好' },
  'ar': { name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-SA', greeting: 'مرحبا' },
  'ru': { name: 'Russian', nativeName: 'Русский', speechCode: 'ru-RU', greeting: 'Привет' },
  'ta': { name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN', greeting: 'வணக்கம்' },
  'te': { name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN', greeting: 'నమస్తే' },
  'ml': { name: 'Malayalam', nativeName: 'മലയാളം', speechCode: 'ml-IN', greeting: 'നമസ്കാരം' },
  'bn': { name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN', greeting: 'নমস্কার' },
  'mr': { name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN', greeting: 'नमस्कार' },
  'gu': { name: 'Gujarati', nativeName: 'ગુજરાતી', speechCode: 'gu-IN', greeting: 'નમસ્તે' },
  'kn': { name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN', greeting: 'ನಮಸ್ಕಾರ' },
  'pa': { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN', greeting: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ' },
  'th': { name: 'Thai', nativeName: 'ไทย', speechCode: 'th-TH', greeting: 'สวัสดี' },
  'vi': { name: 'Vietnamese', nativeName: 'Tiếng Việt', speechCode: 'vi-VN', greeting: 'Xin chào' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe', speechCode: 'tr-TR', greeting: 'Merhaba' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands', speechCode: 'nl-NL', greeting: 'Hallo' },
  'pl': { name: 'Polish', nativeName: 'Polski', speechCode: 'pl-PL', greeting: 'Cześć' },
  'sv': { name: 'Swedish', nativeName: 'Svenska', speechCode: 'sv-SE', greeting: 'Hej' },
  'id': { name: 'Indonesian', nativeName: 'Bahasa Indonesia', speechCode: 'id-ID', greeting: 'Halo' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// Patterns to detect language switch requests
const LANGUAGE_SWITCH_PATTERNS: Array<{ pattern: RegExp; language: LanguageCode }> = [
  // Hindi
  { pattern: /\b(do you know hindi|speak hindi|in hindi|hindi me|हिंदी)\b/i, language: 'hi' },
  { pattern: /\b(namaste|नमस्ते|kaise ho|कैसे हो)\b/i, language: 'hi' },
  // Spanish
  { pattern: /\b(do you know spanish|speak spanish|in spanish|en español|español)\b/i, language: 'es' },
  { pattern: /\b(hola|cómo estás|que tal)\b/i, language: 'es' },
  // French
  { pattern: /\b(do you know french|speak french|in french|en français|français)\b/i, language: 'fr' },
  { pattern: /\b(bonjour|comment allez-vous|salut)\b/i, language: 'fr' },
  // German
  { pattern: /\b(do you know german|speak german|in german|auf deutsch|deutsch)\b/i, language: 'de' },
  { pattern: /\b(guten tag|wie geht's)\b/i, language: 'de' },
  // Japanese
  { pattern: /\b(do you know japanese|speak japanese|in japanese|日本語)\b/i, language: 'ja' },
  { pattern: /\b(konnichiwa|こんにちは|arigatou|ありがとう)\b/i, language: 'ja' },
  // Korean
  { pattern: /\b(do you know korean|speak korean|in korean|한국어)\b/i, language: 'ko' },
  { pattern: /\b(annyeong|안녕하세요)\b/i, language: 'ko' },
  // Chinese
  { pattern: /\b(do you know chinese|speak chinese|in chinese|mandarin|中文)\b/i, language: 'zh' },
  { pattern: /\b(ni hao|你好|谢谢)\b/i, language: 'zh' },
  // Arabic
  { pattern: /\b(do you know arabic|speak arabic|in arabic|عربي)\b/i, language: 'ar' },
  { pattern: /\b(marhaba|مرحبا|shukran|شكرا)\b/i, language: 'ar' },
  // Russian
  { pattern: /\b(do you know russian|speak russian|in russian|по-русски)\b/i, language: 'ru' },
  { pattern: /\b(privet|привет|spasibo|спасибо)\b/i, language: 'ru' },
  // Tamil
  { pattern: /\b(do you know tamil|speak tamil|in tamil|தமிழ்)\b/i, language: 'ta' },
  { pattern: /\b(vanakkam|வணக்கம்)\b/i, language: 'ta' },
  // Telugu
  { pattern: /\b(do you know telugu|speak telugu|in telugu|తెలుగు)\b/i, language: 'te' },
  // Malayalam
  { pattern: /\b(do you know malayalam|speak malayalam|in malayalam|മലയാളം)\b/i, language: 'ml' },
  { pattern: /\b(namaskaram|നമസ്കാരം)\b/i, language: 'ml' },
  // Bengali
  { pattern: /\b(do you know bengali|speak bengali|in bengali|bangla|বাংলা)\b/i, language: 'bn' },
  // Portuguese
  { pattern: /\b(do you know portuguese|speak portuguese|in portuguese|português)\b/i, language: 'pt' },
  // Italian
  { pattern: /\b(do you know italian|speak italian|in italian|italiano)\b/i, language: 'it' },
  // English (switch back)
  { pattern: /\b(speak english|in english|switch to english|back to english)\b/i, language: 'en' },
  // Generic pattern: "speak in [language]"
  { pattern: /\bspeak(?:\s+to\s+me)?\s+in\s+(\w+)/i, language: 'en' }, // Will be parsed dynamically
  // Teach me pattern
  { pattern: /\bteach\s+me\s+(\w+)/i, language: 'en' }, // Will be parsed dynamically
];

const LANGUAGE_STORAGE_KEY = 'zoe_active_language';

export interface UseZoeLanguageReturn {
  currentLanguage: LanguageCode;
  languageConfig: typeof SUPPORTED_LANGUAGES[LanguageCode];
  setLanguage: (lang: LanguageCode) => void;
  detectLanguageSwitch: (text: string) => { detected: boolean; language?: LanguageCode; isTeachMode?: boolean };
  getLanguageSystemPrompt: () => string;
  getGreeting: (lang?: LanguageCode) => string;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  isTeachMode: boolean;
  setTeachMode: (enabled: boolean) => void;
}

export const useZoeLanguage = (): UseZoeLanguageReturn => {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  const [isTeachMode, setIsTeachMode] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      setCurrentLanguage(saved);
    }
  }, []);

  // Set language with persistence
  const setLanguage = useCallback((lang: LanguageCode) => {
    if (SUPPORTED_LANGUAGES[lang]) {
      setCurrentLanguage(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      console.log(`[ZoeLanguage] 🌐 Switched to ${SUPPORTED_LANGUAGES[lang].name}`);
    }
  }, []);

  // Detect language switch request from text
  const detectLanguageSwitch = useCallback((text: string): { detected: boolean; language?: LanguageCode; isTeachMode?: boolean } => {
    const lowerText = text.toLowerCase();

    // Check for teach mode
    const teachMatch = text.match(/\bteach\s+me\s+(\w+)/i);
    if (teachMatch) {
      const langName = teachMatch[1].toLowerCase();
      for (const [code, config] of Object.entries(SUPPORTED_LANGUAGES)) {
        if (config.name.toLowerCase() === langName || config.nativeName.toLowerCase() === langName) {
          return { detected: true, language: code as LanguageCode, isTeachMode: true };
        }
      }
    }

    // Check for "speak in [language]" pattern
    const speakMatch = text.match(/\bspeak(?:\s+to\s+me)?\s+in\s+(\w+)/i);
    if (speakMatch) {
      const langName = speakMatch[1].toLowerCase();
      for (const [code, config] of Object.entries(SUPPORTED_LANGUAGES)) {
        if (config.name.toLowerCase() === langName || config.nativeName.toLowerCase() === langName) {
          return { detected: true, language: code as LanguageCode };
        }
      }
    }

    // Check predefined patterns
    for (const { pattern, language } of LANGUAGE_SWITCH_PATTERNS) {
      if (pattern.test(text)) {
        return { detected: true, language };
      }
    }

    // Detect script-based languages from characters
    if (/[\u0900-\u097F]/.test(text)) return { detected: true, language: 'hi' }; // Devanagari (Hindi)
    if (/[\u0600-\u06FF]/.test(text)) return { detected: true, language: 'ar' }; // Arabic
    if (/[\u3040-\u30FF]/.test(text)) return { detected: true, language: 'ja' }; // Japanese
    if (/[\uAC00-\uD7AF]/.test(text)) return { detected: true, language: 'ko' }; // Korean
    if (/[\u4E00-\u9FFF]/.test(text)) return { detected: true, language: 'zh' }; // Chinese
    if (/[\u0B80-\u0BFF]/.test(text)) return { detected: true, language: 'ta' }; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return { detected: true, language: 'te' }; // Telugu
    if (/[\u0D00-\u0D7F]/.test(text)) return { detected: true, language: 'ml' }; // Malayalam
    if (/[\u0980-\u09FF]/.test(text)) return { detected: true, language: 'bn' }; // Bengali
    if (/[\u0400-\u04FF]/.test(text)) return { detected: true, language: 'ru' }; // Cyrillic (Russian)
    if (/[\u0E00-\u0E7F]/.test(text)) return { detected: true, language: 'th' }; // Thai

    return { detected: false };
  }, []);

  // Get system prompt for current language
  const getLanguageSystemPrompt = useCallback((): string => {
    const config = SUPPORTED_LANGUAGES[currentLanguage];
    
    if (currentLanguage === 'en') {
      return ''; // No special prompt for English
    }

    const teachModeInstructions = isTeachMode
      ? `You are also in TEACH MODE: Help the user learn ${config.name}. Include pronunciation tips, explain grammar, and teach common phrases.`
      : '';

    return `
═══ LANGUAGE MODE: ${config.name.toUpperCase()} ═══
You MUST respond primarily in ${config.name} (${config.nativeName}).
- Greet in ${config.name}: "${config.greeting}"
- Write your responses in ${config.name}
- You can include English translations in parentheses for key phrases
- Use culturally appropriate expressions and idioms
- If the user speaks in English, still respond in ${config.name} but keep it simple
${teachModeInstructions}
═══════════════════════════════════════════════════`;
  }, [currentLanguage, isTeachMode]);

  // Get greeting in specified language
  const getGreeting = useCallback((lang?: LanguageCode): string => {
    const targetLang = lang || currentLanguage;
    return SUPPORTED_LANGUAGES[targetLang]?.greeting || 'Hello';
  }, [currentLanguage]);

  return {
    currentLanguage,
    languageConfig: SUPPORTED_LANGUAGES[currentLanguage],
    setLanguage,
    detectLanguageSwitch,
    getLanguageSystemPrompt,
    getGreeting,
    supportedLanguages: SUPPORTED_LANGUAGES,
    isTeachMode,
    setTeachMode: setIsTeachMode,
  };
};

export default useZoeLanguage;
