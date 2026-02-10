// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HEXAGONAL ARCHITECTURE - ADAPTERS INDEX
// Central export for all adapter implementations
// ═══════════════════════════════════════════════════════════════════════════════

// LLM Adapters
export * from './GeminiAdapter';

// TTS Adapters
export * from './PlaceholderTTSAdapter';
export * from './GeminiTTSAdapter';
export * from './DreamsAITTSAdapter';

// External Ontology Adapter
export * from './ExternalOntologyAdapter';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ADAPTER STATUS (as of Jan 3, 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ✅ ACTIVE ADAPTERS:
 * - GeminiAdapter: Primary LLM (Gemini 2.5 Flash)
 * - PlaceholderTTSAdapter: Web Speech API fallback
 * - GeminiTTSAdapter: 27-Emotion Voice Generation
 * - DreamsAITTSAdapter: Dream narration voice (NEW)
 * - ExternalOntologyAdapter: Multi-entity consciousness bridge
 * 
 * 🔜 PENDING ADAPTERS:
 * - ExclusiveVoiceTTSAdapter: Premium calm/soothing Zoe voice
 * 
 * All adapters implement Hexagonal Architecture ports for hot-swappable integration.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
