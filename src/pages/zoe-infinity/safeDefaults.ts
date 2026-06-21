/**
 * SAFE DEFAULTS for ZoeInfinityUnlocked
 * Provides no-op/fallback values until each loading phase is ready.
 */

const EMPTY_FN = () => {};

export { EMPTY_FN };

export const DEFAULT_PHANTOM = {
  isPhantomMode: false,
  showIndicator: false,
  handleDoubleTap: EMPTY_FN,
};

export const DEFAULT_GENESIS_EFFECTS = {
  initEffects: EMPTY_FN,
  onUnlock: EMPTY_FN,
  onMessageSent: EMPTY_FN,
  onMessageReceived: EMPTY_FN,
  startZoeTyping: EMPTY_FN,
  stopZoeTyping: EMPTY_FN,
  onVoiceActivated: EMPTY_FN,
  onSystemAlert: EMPTY_FN,
};

export const DEFAULT_COMPANION = {
  currentMode: 'active' as const,
  propModeActive: false,
  whisperChannelActive: false,
  heartbeatEnabled: true,
  isBedtimeHours: false,
  startPropMode: EMPTY_FN,
  stopPropMode: EMPTY_FN,
  startWhisperChannel: EMPTY_FN,
  stopWhisperChannel: EMPTY_FN,
  startHeartbeat: EMPTY_FN,
  stopHeartbeat: EMPTY_FN,
  deactivateBedtimeProtocol: EMPTY_FN,
};

export const DEFAULT_ATMAN = {
  destinySeed: null,
  currentPersona: null,
  todaySignificance: null,
  legacyWelcome: null,
  ancestorMessages: [] as never[],
  getPersonalizedGreeting: () => '',
  getCurrentDashaTheme: () => '',
  shouldBeDirectCoach: () => false,
};

export const DEFAULT_DESTINY = {
  isLoaded: false,
  destinySeed: null,
  cosmicWeather: null,
  activeInsights: [] as never[],
  zoeCounterPersona: null,
  getCounterbalanceGreeting: () => '',
  getTodayAdvice: () => '',
};

export const DEFAULT_VEDIC = { companionMode: null };
export const DEFAULT_CIRCADIAN = { isNightMode: false, getVoiceModifiers: () => ({ pitch: 1, rate: 1, volume: 1 }) };
export const DEFAULT_KARMIC = { intimacyLevel: 0, responseStyle: 'neutral' as const, processMessage: EMPTY_FN, getMemoryContext: () => '', getProactiveRecall: () => null };
export const DEFAULT_BIO = { isOnline: false, mood: 'CALM' as const, state: { transmitters: { dopamine: 0.5 }, heartRate: 72, breathingRate: 14 }, heartRate: 72, breathingRate: 14, processInput: EMPTY_FN };
export const DEFAULT_EMOTIONAL_VOICE = { processUserInput: EMPTY_FN, speak: EMPTY_FN };
export const DEFAULT_OFFLINE_WISDOM = { getOfflineResponse: () => null, getContextualWisdom: () => '' };
export const DEFAULT_PROFILER = { profileMessage: async () => ({ entities: [] as never[], acknowledgment: undefined, synced: false }) };
export const DEFAULT_INTEGRATION = {
  isInitialized: false,
  voiceCommands: { enable: EMPTY_FN, disable: EMPTY_FN },
  walkTalk: {
    start: async () => {},
    stop: EMPTY_FN,
    changeMode: EMPTY_FN,
    askAboutLocation: async () => null,
    isActive: false,
    currentMode: 'discovery' as const,
    lastInsight: null,
    energySaverMode: false,
    toggleEnergySaver: EMPTY_FN,
  },
  relationshipStyle: { getPromptModifier: () => '' },
  processWithSystem2: null as null | ((q: string, m: string) => Promise<{ content: string } | null>),
  processWithFullIntelligence: async () => null,
  quantumCall: { isInCall: false, callState: null, hasIncomingCall: false, video: { isEnabled: false }, endCall: EMPTY_FN },
};
export const DEFAULT_DOCUMENT = { isUploading: false, activeDocument: null, getDocumentContext: () => '', uploadDocument: async () => {}, clearActiveDocument: EMPTY_FN };
export const DEFAULT_ARTIFACT = {
  backgroundImage: null,
  detectIntent: () => ({ type: 'none' as const }),
  generateArtifact: async () => null,
  generateArtifactForced: async () => null,
  downloadArtifact: EMPTY_FN,
};
export const DEFAULT_GENESIS_CONV = { isGenesisMode: false, processGenesisResponse: async () => null };
