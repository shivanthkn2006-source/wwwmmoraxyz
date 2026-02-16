# 🔬 ZOE PLATFORM — COMPLETE ROOT SCAN REPORT
### Generated: February 16, 2026

---

## 1. PAGES (Routes) — 7 Total

| File | Route | Purpose |
|------|-------|---------|
| `ZoeInfinity.tsx` | `/` | Main app (home) |
| `ZoeInfinityAuth.tsx` | `/auth` | Alt auth page |
| `ZoeInfinityMail.tsx` | `/mail` | Mail system |
| `ZoeInfinityUnlocked.tsx` | `/unlocked` | Unlocked mode |
| `AuthPage.tsx` | `/login` `/signup` | Authentication |
| `PasswordRecoveryPage.tsx` | `/password-recovery` | Password reset |
| `NotFound.tsx` | `*` | 404 page |

---

## 2. CONTEXTS (Global Providers) — 9 Total

| Context | Purpose | Status |
|---------|---------|--------|
| `ZoeContext` | Core Zoe AI state, chat, orchestrator | ✅ Active |
| `LiquidUniverseContext` | Adaptive UI theming/morphing | ✅ Active |
| `ShapeShifterContext` | Layout adaptation engine | ✅ Active |
| `AutoHealContext` | Self-healing error recovery | ✅ Active |
| `DeviceTierContext` | Device capability detection | ✅ Active |
| `CorticalStackContext` | Memory/conversation persistence | ✅ Active |
| `GlobalMediaContext` | Media playback state | ✅ Active |
| `TimeSimulationContext` | Time-based simulation | ✅ Active |
| `VelvetRopeContext` | Premium gating/tier access | ✅ Active |

---

## 3. COMPONENTS — 200+ Files

### Top-Level Components (~160 standalone .tsx files)

#### Core AI / Zoe
- ZoeOrb, ZoeChat, ZoeAssistant, GlobalZoeAssistant
- ZoeOrbConversationPanel, ZoeOrbSonicMode, ZoeOrbIcon
- ZoeCompactChatInput, ZoeSettings, ZoeVoiceSettings
- ZoeDiagnosticsPanel, ZoeIntelligenceDashboard
- ZoeSelfAwareness, ZoeSelfCorrection, ZoeSessionCoach
- ZoeReasoningTrace, ZoeFeatureDiscovery, ZoeGoalCreator
- ZoeIdentityCalibration, ZoeInterpretiveAI, ZoeDreamsAI
- ZoeUniversalArchitect, ZoeAgentPanel, ZoeAgentIcon
- ZoeOfflineStatus, ZoeHuddleAssistant

#### Social / Feed
- PostCard, PostModal, PostsGrid, CommentSection
- FriendCard, FriendRequestCard, UserMentionInput
- UserSearchModal, UserRecommendationCard, Leaderboard
- DuetStitchRecorder, ExternalShareBridge
- LoopVideoItem, FullScreenVideoPlayer

#### Navigation / Layout
- BottomNavigation, HamburgerMenu, AnimatedHamburgerButton
- ResponsiveLayout, ProtectedRoute, AdminRoute
- SearchBar, SettingsSearchCommand

#### DHF / Identity
- ATLASSyncVerification, ATLASZoeOrb, HolographicATLASOrb
- DHFUploadDashboard, DHFStackCheckIn
- DHFDeviceIntelligenceDashboard, BehavioralQuestionnaire
- FaceLoginModal, FaceVerificationSetup

#### VR / 3D
- VROMEGAWorld, SolarSystemExplorer, VRVoiceCommandsPanel

#### Notifications / Activity
- NotificationPanel, NotificationMenu, NotificationBadgeOverlay
- ActivityTracker, UserActivityDashboard

#### Economy / Gamification
- EconomyWallet, BadgeDisplay, BadgeChallenges
- BadgeCollectionsDisplay, BadgeComparisonModal
- ChallengeSeasonDisplay, AchievementMilestones, TierGateWrapper

#### Other Major Components
- AIAuditPanel, AIFilterPanel, AIVideoEffects, AREffectsPanel
- AppArchitectureBlueprint, BrainLoader, BreakTheIceGate
- BriefingPreferences, BusinessServiceRegistration
- CalendarView, ComprehensiveDocumentationCenter
- ConversationExport, CoreUnificationCeremony
- DayPlannerDiary, DigitalOntologyTestSuite
- EmotionAnalytics, EmotionTracker, EventSetupModal
- FeatureAnalyticsDashboard, FeedbackCollectionPanel
- GenesisOmniBox, GodModePanel, HandsFreeIndicator
- HeliosphereTutorial, HerProtocol, Huddle
- ImageViewer, IndiaMap, InterestRecommendations
- LifePatternStatus, LoginQueueSystem, MemoryTimeline
- NetworkStatusIndicator, NeuralCoreUplink
- OfflineModeOverlay, OfflineStatusDashboard
- OnboardingTour, OpenStreetMapView
- PermissionDashboard, PlatformHealthMonitor
- PremiumImageGeneration, PrivateTimelinesSheet
- QuantumCallUI, RelationshipManager, RemindersManager
- SearchAnalyticsDashboard, SecuritySettingsPage
- ServiceAIAgent, SmartFeatureRecommendations
- SolarSystemExplorer, SovereignQuickAccess
- TimelineContentDisplay, TimelineSearchBar
- UniversalAgenticTimeline, UniversalDocumentHub
- UniversalSymbolsGuide, UserPersonalTimeline
- VideoCreationModal, VoiceCommandsSettings
- VoiceLibraryBrowser, VoiceMacroManager
- WorldRegionSelector

### Component Subdirectories (30 folders)

| Directory | Count | Purpose |
|-----------|-------|---------|
| `ui/` | ~40+ | shadcn base UI primitives |
| `zoe-infinity/` | 23 | Infinity mode UI (InfinityStream, InfinityInput, GhostOrb, SoulWaveform, etc.) |
| `zoe-infinity/mail/` | 10+ | MailStream, MailCompose, VoiceComposer, MailSidebar, GatekeeperOrb, Ironclad VPN |
| `selfiecity/` | 16 | Globe, pins, feed, uploader, map, voice overlay |
| `quantum/` | 13 | Quantum calls, Agasthya scanner, biometrics, holographics |
| `phoenix/` | 5 | DHF Phoenix profile, legacy mode, mirror test |
| `nexus/` | 6 | Agent economy, job board, deployments, artifacts |
| `admin/` | ~3 | Admin panels |
| `agasthya/` | ~3 | Vedic/Nadi scanning |
| `anima/` | ~3 | Interest matching |
| `asi/` | ~3 | ASI dashboards |
| `atlas/` | ~3 | Atlas data views |
| `auth/` | 3 | StarfieldBackground, VoiceCitadelLogin, VoiceOrb |
| `career/` | ~3 | Career engine |
| `core/` | 2 | ZoeCoreUnifiedProvider |
| `evolution/` | ~2 | Evolution tracking |
| `genesis/` | ~3 | Genesis onboarding |
| `holo/` | ~2 | Holographic UI |
| `identity/` | ~2 | Identity calibration |
| `kronos/` | ~3 | Timeline engine |
| `merchant/` | ~3 | Merchant/brand tools |
| `mmora/` | ~5 | MMORA social features |
| `performance/` | ~3 | Performance monitors |
| `profile/` | ~5 | Profile components |
| `quantum-camera/` | ~3 | Camera AI features |
| `resleeve/` | ~2 | Re-sleeve system |
| `security/` | ~3 | Security panels |
| `temporal/` | ~2 | Time-based features |
| `vr/` | ~5 | VR world components |
| `zoe/` | 2 | ZoeDHFStatusDashboard |

---

## 4. HOOKS — 310 Total

### Zoe Core AI (70+)
useZoeCoreIntelligence, useZoeCoreUnified, useZoeIntelligence, useZoeOrchestrator, useZoeGodMode, useZoeASI, useZoeASISelfRepair, useZoeQuantumASIBridge, useZoeQuantumBridge, useZoeQuantumCall, useZoeQuantumLevel, useZoePentarchy, useZoeSelfAwareness, useZoeSelfHealer, useZoeUnifiedSelfHealer, useZoeMonitor, useZoeProtocolMonitor, useZoeChainOfThought, useZoeSystem2Cortex, useZoeDiagnostics, useZoeDeepScan, useZoeRapport, useZoeNickname, useZoeLanguage, useZoePersonalization, useZoePersonalityMatrix, useZoeRelationshipStyle, useZoeSovereignCore, useZoeSovereignCommand, useZoeSovereignBonding, useZoeSovereignVoice, useZoeGenesisMode, useZoeGenesisManifesto, useZoeSessionPersistence, useZoeSessionSync, useZoeLocalContext, useZoeMemory, useZoeBackgroundTasks, useZoeInitiative, useZoeProactiveMessaging, useZoeProactiveNotifications, useZoeProactiveNotificationsCore, useZoeProactiveVision, useZoeVisionGreeting, useZoeChatVision, useZoePerception, useZoeMediaAccess, useZoeOmegaCoreIntegration, useZoeOmegaIntegrity, useZoeExternalSync, useZoePassport, useZoeReSleeve, useZoeSleepTracker, useZoeTubeSight, useZoeProfileAnalysis, useZoeProfileAutoFill, useZoeDiscoveryCommands, useZoeSecurityCommands, useZoeSentinel, useZoeMatterBridge, useZoeNexus, useZoeNexusStream, useZoeNexusWallet, useZoeBioKernel, useZoeBiologicalVoice, useZoeInfinityAgent, useZoeInfinityAudio, useZoeInfinityBrain, useZoeInfinityIntegration, useZoeInfinityMail, useZoeInfinityPhases, useZoeActivationSequence, useZoeOrbRealtimeFeeds, useZoeOrbSelfieCitySearch, useZoeOrbUserMessaging, useZoeHandsFreeMessageReader, useZoeWalkTalk, useZoeCivilizationEngine, useZoeDreamer, useZoeMultiAgent, useZoeServerMiracles, useZoeSmartVoice, useZoeDHFAuthorization, useZoeDHFCore, useZoeAgent

### Voice / Audio (25+)
useZoeVoice, useZoeVoiceCore, useZoeVoiceCommands, useZoeVoiceInput, useZoeAudio, useNativeZoeVoice, useAlwaysOnVoice, useHybridVoice, useEmotionalVoice, useAdvancedVoiceCommands, useVoiceOrchestrator, useVoiceCitadel, useVoiceCitadelOrchestrator, useVoiceCitadelStatus, useVoiceIntelligence, useVoiceNotifications, useVoiceNoteRecorder, useVoiceShortcuts, useVoiceBioResonance, useNanoStreamVoice, useSpeculativeSpeech, useEnhancedWakeWord, useWakeWord, useVADGatedVoice, useGeminiTTS, useHandsFreeConversation, useSpatialAudio, useHuddleZoeCommands

### DHF / ECN / Identity (15+)
useDHFAutonomy, useDHFDataHealthScanner, useDHFVisualization, useContinuousDHFStream, useSoulCodex, useATLASSync, useMindMerge, useBioTelemetry, useBioCitadel, useBackgroundHarvest, useBehavioralTelemetry, useDebouncedTelemetry, usePhoenixEngine

### Offline / Performance (15+)
useOfflineManager, useOfflineSync, useOfflineDataSync, useOfflineMessages, useOfflineSLM, useZoeOffline, useZoeOfflineCore, useZoeOfflineLanguages, useZeroPointOffline, useMobileOfflineOptimizations, usePerformanceMonitoring, usePerformanceGovernor, useGraphicsOptimizer, useThermalGovernor, useMemoryLeakPlumber, useStorageHygiene

### VR (10+)
useResponsiveVR, useVRCapabilities, useVRAutoFix, useVRSafariFix, useVRDHFLearning, useVRDHFNervousSystem, useVRSensorIntegration, useVRSpeakingToOrb, useVRUniversalController, useVRVoiceCommands, useUniversalVRSupport, useDeviceOrientationControls

### Selfie City (6)
useSelfieCitySearch, useSelfieCityStore, useSelfieCitySovereign, useSelfieCityVoice, useSelfieCityVoiceLayer, useZoeSelfieCityCommands

### Social / Feed (10+)
useFriendRequests, useFriendshipSync, useLeaderboard, useGamification, useBadgeChallenges, useBadgeCollections, useChallengeSeasons, useAchievementMilestones, useFeedPrioritization, useViralContentEngine

### Economy / Agent (5+)
useAgenticWorkforce, useAgenticArchitecture, useZoeAgent, useZoeNexusWallet, useCDSPPaymentRails

### Device / Sensors (10+)
use-mobile, useDeviceTier, useDeviceFormFactor, useDeviceSensors, useHapticFeedback, useWebGLCapabilities, useWebGLCleanup, useCameraDevices, useAdvancedGamepadController, useDeviceOrientationControls

### Utility / Misc (30+)
use-toast, useNetworkStatus, useOnboarding, useTutorial, useSoundDesign, useTextAutoScaler, useLazyModules, useAutoScroll, useAutoFix, useMediaUpload, useLiveVideoRecorder, useImageSearch, useSavedSearches, useSearchAnalytics, useTrendingSearches, useAutoSaveNotes, useAutoProfiler, useAutoPhantom, useNotificationBatching, useNotificationSettings, useDesktopNotifications, useMenuNotifications, useNewUserNotifications, useUserNotifications, useUserOnlineNotifications, useReminderNotifications, useImportantNotificationAnnouncements, useSmartNotifications, useDivineNotifications, useOnlinePresence, useMultiplayerPresence, useSessionHeartbeat, useActivityTracking, useDailyBriefing, useMorningBriefing, useConversationalOnboarding, useRealTimeChat, useChatHistory, useCompanionMode

### Specialized Engines (20+)
useGenesisEngine, useGenesisConversation, useGenesisEffects, useGenesisImprint, useGenesisIntro, useGenesisMutation, useIntuitionEngine, useKronosTimeline, useTimelineArchitect, useTimelineContent, useTimelineProgress, usePrivateTimelines, useKarmicMemory, useCircadianRhythm, useDigitalDopamine, useVirtualHormones, useNudgeEngine, useEdgeBrain, usePhantomBrain, usePhantomMode, useGhostNetwork, useShadowSentinel, useShadowWorker, useSatelliteShield, useIcebergProtocol, useSwarmIntelligence, useLocalIntelligence, useLocalLLM, useInferenceOptimizer, useSpeculativeDecoding, useMmoraAgent, useMmoraAudio, useAkashicGraph, useAtmanArchive, useVedicComputation, useVedicEngine, usePolyglotCulture, useDestinyCompanion, useTemporalRadar

---

## 5. EDGE FUNCTIONS (Backend APIs) — 96 Total

### AI / Chat Functions (20)
| Function | Purpose | Status |
|----------|---------|--------|
| `zoe-chat` | Primary Zoe chat (Lovable AI) | ✅ Active |
| `zoe-infinity-chat` | Infinity mode chat | ✅ Active |
| `zoe-infinity-brain` | Deep reasoning engine | ✅ Active |
| `zoe-infinity-vision` | Vision/image analysis | ✅ Active |
| `zoe-core-intelligence` | Core AI inference | ✅ Active |
| `zoe-core-executor` | Core execution pipeline | ✅ Active |
| `zoe-god-mode` | God mode processing | ✅ Active |
| `zoe-multiagent` | Multi-agent orchestration | ✅ Active |
| `zoe-agent` | Agent task execution | ✅ Active |
| `zoe-chain-of-thought` | Chain-of-thought reasoning | ✅ Active |
| `zoe-self-awareness-core` | Self-awareness engine | ✅ Active |
| `zoe-system2-cortex` | System 2 (slow thinking) | ✅ Active |
| `zoe-perception` | Perception/context analysis | ✅ Active |
| `ai-companion-chat` | Companion chat | ✅ Active |
| `generate-text` | Text generation | ✅ Active |
| `process-zoe-thought` | Thought processing | ✅ Active |
| `parent-zoe-executor` | Parent Zoe brain | ✅ Active |
| `quantum-asi-loop` | ASI processing loop | ✅ Active |
| `quantum-pentarchy-swarm` | 5-agent swarm | ✅ Active |
| `ollama-proxy` | Local Ollama (api.myzoe.xyz) | 🔴 DNS pending |

### Voice / TTS Functions (5)
| Function | Purpose | Status |
|----------|---------|--------|
| `zoe-voice` | Voice response generation | ✅ Active |
| `zoe-realtime-voice` | Real-time voice streaming | ✅ Active |
| `realtime-voice` | Alt voice endpoint | ✅ Active |
| `lovable-tts` | TTS via Lovable AI | ✅ Active |
| `edge-tts` | Edge TTS | 🟡 Fallback |
| `assemblyai-tts` | AssemblyAI TTS | 🟡 Fallback |

### Media / Vision Functions (8)
| Function | Purpose | Status |
|----------|---------|--------|
| `generate-image` | Image generation | ✅ Active |
| `edit-image` | Image editing | ✅ Active |
| `ai-video-transform` | Video AI effects | ✅ Active |
| `apply-ai-filter` | AI photo filters | ✅ Active |
| `analyze-face-emotion` | Face emotion detection | ✅ Active |
| `face-verification` | Face ID verification | ✅ Active |
| `process-live-video` | Live video processing | ✅ Active |
| `selfie-city-vision` | Selfie City AI vision | ✅ Active |

### Mail / Communication Functions (5)
| Function | Purpose | Status |
|----------|---------|--------|
| `mail-sentinel` | Email AI sentinel | ✅ Active |
| `ironclad-relay` | Encrypted mail relay | ✅ Active |
| `zoe-auto-mail-generator` | Auto email generation | ✅ Active |
| `zoe-send-message` | Message sending | ✅ Active |
| `admin-send-notice` | Admin notifications | ✅ Active |

### DHF / ECN / Analysis Functions (10)
| Function | Purpose | Status |
|----------|---------|--------|
| `ecn-analysis-processor` | ECN emotion processing | ✅ Active |
| `behavioral-event-stream` | Behavioral event ingestion | ✅ Active |
| `dhf-visualization` | DHF data visualization | ✅ Active |
| `veto-embedding-check` | Veto system embeddings | ✅ Active |
| `atlas-gatekeeper` | Atlas access control | ✅ Active |
| `process-dhf-asset` | DHF asset processing | ✅ Active |
| `dream-foundry` | Synthetic data generation | ✅ Active |
| `zoe-dreamer-agent` | Dream analysis agent | ✅ Active |
| `zoe-document-xray` | Document analysis | ✅ Active |
| `analyze-legal-doc` | Legal doc analysis | ✅ Active |

### Security / Monitoring Functions (6)
| Function | Purpose | Status |
|----------|---------|--------|
| `zoe-sentinel` | Security monitoring | ✅ Active |
| `zoe-security-validator` | Security validation | ✅ Active |
| `zoe-sovereign-heartbeat` | Heartbeat/keepalive | ✅ Active |
| `zoe-health-check` | Health monitoring | ✅ Active |
| `security-operations` | Security ops | ✅ Active |
| `moderate-content` | Content moderation | ✅ Active |

### Selfie City Functions (7)
| Function | Purpose | Status |
|----------|---------|--------|
| `selfie-city-post` | Post processing | ✅ Active |
| `selfie-city-search` | Location search | ✅ Active |
| `selfie-city-vision` | Vision analysis | ✅ Active |
| `selfie-city-brand-learning` | Brand learning | ✅ Active |
| `selfie-city-on-route` | On-route features | ✅ Active |
| `selfie-city-premium-detect` | Premium detection | ✅ Active |
| `selfie-value-calculator` | Value scoring | ✅ Active |

### Audit / Diagnostics Functions (7)
| Function | Purpose | Status |
|----------|---------|--------|
| `platform-diagnostics` | Platform analysis | ✅ Active |
| `raa-code-debugger` | RAA code debugging | ✅ Active |
| `raa-conversion-audit` | Conversion auditing | ✅ Active |
| `quadrillion-audit` | Audit system | ✅ Active |
| `request-ai-audit` | AI audit requests | ✅ Active |
| `run-ai-audit-job` | AI audit execution | ✅ Active |
| `get-audit-report` | Audit report generation | ✅ Active |

### Utility / Infrastructure Functions (15+)
| Function | Purpose | Status |
|----------|---------|--------|
| `track-activity` | Activity tracking | ✅ Active |
| `divine-notification` | Smart notifications | ✅ Active |
| `genesis-launch-nudge` | Onboarding nudges | ✅ Active |
| `check-reminders` | Reminder checks | ✅ Active |
| `execute-scheduled-macros` | Scheduled macros | ✅ Active |
| `identify-song` | Song ID (ACRCloud) | ✅ Active |
| `transcribe-audio` | Audio transcription | ✅ Active |
| `analyze-youtube` | YouTube analysis | ✅ Active |
| `get-mapbox-token` | Mapbox token proxy | ✅ Active |
| `get-user-location` | Location services | ✅ Active |
| `geo-stream-optimizer` | Geo optimization | ✅ Active |
| `storage-cleaner` | Storage maintenance | ✅ Active |
| `score-post-relevance` | Post scoring | ✅ Active |
| `get-job-status` | Job status | ✅ Active |
| `phantom-router` | Phantom mode routing | ✅ Active |
| `vedic-ephemeris` | Vedic calculations | ✅ Active |

### Specialized Functions (13)
| Function | Purpose | Status |
|----------|---------|--------|
| `zoe-pentarchy-core` | 5-agent swarm core | ✅ Active |
| `zoe-nexus-oversoul` | Economy oversoul | ✅ Active |
| `zoe-quantum-anka` | Quantum processing | ✅ Active |
| `zoe-genesis-cron` | Genesis scheduled | ✅ Active |
| `zoe-genesis-cron-batch` | Genesis batch | ✅ Active |
| `zoe-walk-talk` | Walk & talk mode | ✅ Active |
| `zoe-external-sync` | External sync | ✅ Active |
| `zoe-artifact-generator` | Artifact creation | ✅ Active |
| `zoe-service-ai` | Service AI agent | ✅ Active |
| `zoe-matter-bridge` | IoT/smart home | ✅ Active |
| `zoe-profile-analyzer` | Profile analysis | ✅ Active |
| `zoe-identity-calibration` | Identity calibration | ✅ Active |
| `zoe-universal-architect` | Architecture gen | ✅ Active |
| `zoe-truth-scribe` | Fact verification | ✅ Active |
| `zoe-silent-scribe` | Background logging | ✅ Active |
| `pce-agent-nightly` | Nightly tasks | ✅ Active |

---

## 6. SECRETS (API Keys) — 11 Total

| Secret | Service | Status |
|--------|---------|--------|
| `LOVABLE_API_KEY` | Lovable AI Gateway | ✅ Active (system-managed) |
| `OLLAMA_ENDPOINT` | Local Ollama (api.myzoe.xyz) | 🔴 DNS not resolving |
| `MAPBOX_PUBLIC_TOKEN` | Mapbox Maps | ✅ Configured |
| `ACRCLOUD_ACCESS_KEY` | ACRCloud Song ID | ✅ Configured |
| `ACRCLOUD_ACCESS_SECRET` | ACRCloud Song ID | ✅ Configured |
| `ACRCLOUD_HOST` | ACRCloud Song ID | ✅ Configured |
| `ASSEMBLYAI_API_KEY` | AssemblyAI Transcription | ✅ Configured |
| `DEEPGRAM_API_KEY` | Deepgram Transcription | ✅ Configured |
| `TWILIO_ACCOUNT_SID` | Twilio Communications | ✅ Configured |
| `TWILIO_AUTH_TOKEN` | Twilio Communications | ✅ Configured |
| `TWILIO_PHONE_NUMBER` | Twilio Communications | ✅ Configured |

---

## 7. HEXAGONAL ARCHITECTURE

### Ports (`src/core/ports/`)
| Port | Contract |
|------|----------|
| `LLMInferencePort` | All LLM providers |
| `TTSServicePort` | All TTS providers |

### Adapters (`src/core/adapters/`)
| Adapter | Port | Status |
|---------|------|--------|
| `GeminiAdapter` | LLM Inference | ✅ Active |
| `PlaceholderTTSAdapter` | TTS Service | ✅ Active (Web Speech API) |
| `GeminiTTSAdapter` | TTS Service | 🟡 Available, not primary |
| `DreamsAITTSAdapter` | TTS Service | 🟡 Reserved, not implemented |
| `ExternalOntologyAdapter` | External | 🟡 Available, not active |

### Core Modules (`src/core/`)
| Module | Purpose |
|--------|---------|
| `zoe/ParentZoeCore` | Universal Brain (Gemini 2.5 Pro) |
| `zoe/SubZoeSwarm` | Specialist Cells (Gemini 2.5 Flash) |
| `zoe/PersonalSubZoe` | Personal companion agent |
| `zoe/UniversalFoundry` | Dream Foundry synthetic data |
| `zoe/UniversalCalculator` | Cosmic/time calculator |
| `zoe/ZoeDHFOrchestrator` | God Mode controller |
| `zoe/ZoeBiologicalVoice` | Zero-cost TTS/STT |
| `economy/ZoeNexusWallet` | Economic sovereignty |
| `ASIRootConnector` | ASI bridge connector |
| `QuantumASIBridge` | Quantum ASI bridge |
| `UnifiedModuleHub` | Module unification |
| `domain/SovereignContextRegistry` | Central state |

### Core Subdirectories (28 modules)
adapters, agentic, agents, asi, audio, conversation, culture, destiny, domain, economy, education, genesis, harvest, inference, latency, llm, matter, memory, orchestrator, ports, quantum, security, slm, soul, speech, ssm, wisdom, zoe

---

## 8. UTILITIES (`src/utils/`) — 65 Files

### Platform Infrastructure
platformCleanupManager, platformDiagnostics, platformOptimizer, platformPerformanceOptimizer, crossBrowserCompat, safariBrowserFixes, databasePoolManager, supabasePooler, storageCleanupScheduler

### Offline
offlineDataSync, offlineVoice, zoeOfflineCache, zoeOfflineConversation, zoeOfflineIntelligence

### Voice / Audio
assistantVoice, audioHelpers, voiceAnnouncementQueue, voiceExperienceLock, voiceTextCleaner, zoeVoice, zoeActivationSound, processVoiceCommand, notificationSounds

### Media
imageOptimization, mediaCompression, videoCompressor

### AI / Intelligence
zoeResponseGenerator, zoeLearningSystem, zoeMediaAccess, edgeBrainMatchmaking, edgeBrainSentiment, languageDetection

### Export / PDF Generation
comprehensiveDocumentationExport, conversationExport, godModeAuditExport, platformAuditPdfGenerator, zoeInfinityRootScanPdf, rootScanExport, zoeArchitectureBlueprint, mmoraArchitectureBlueprintGenerator, vrUserManualGenerator, earLinkBlueprintPdfGenerator, careerDivinityPdf

### Data / State
cqrsLayer, deltaSyncVault, invisibleVault, jsonValidator, conversationNamespaces, errorBoundaryLogger

### UI / UX
chameleonCode, featureNavigation, greetingHelpers, nameGenerator, vibrationPatterns, notificationThemes, reminderParser, textAutoScaler (implied via hook)

### Geo / Location
cityHelpers, trafficHelpers, weatherHelpers, weatherRecommendations, worldCities, worldLocations, eventHelpers

### Security / Permissions
unifiedPermissionManager, micPermissionManager, mobilePlatformDetection

---

## 9. LIB (`src/lib/`) — 8 Files

| File | Purpose |
|------|---------|
| `auth.tsx` | Authentication system (session, refresh, proactive token) |
| `resilientSupabase.ts` | Resilient DB client with retry logic |
| `safeOperations.ts` | Safe operation wrappers |
| `versionCheck.ts` | Version/stale bundle detection |
| `homeRefresh.ts` | Home page refresh logic |
| `platformPurge.ts` | Platform cache purge |
| `binaryPulse.ts` | Binary pulse system |
| `utils.ts` | General utilities (cn, etc.) |

---

## 10. DATABASE — 216 Migrations, 60+ Tables

### Key Tables
achievement_milestones, achievement_progress, agasthya_scan_sessions, agentic_earnings, ai_companion_messages, artifact_transfers, atlas_sync_authorizations, audit_reports, badge_challenges, badge_collections, badge_shares, behavioral_events, behavioral_fingerprints, biometric_auth_events, brand_accounts, brand_campaigns, brand_deals, brand_sponsorship_alerts, campaign_claims, challenge_seasons, comment_likes, cortical_stack_memories, daily_pulse_scores, dhf_active_construct, dhf_asset_logs, dhf_ghost_interactions, dhf_learning_history, dhf_lockdown_events, dhf_phoenix_profile, dhf_relationship_matrix, dhf_soul_codex, dhf_stack_sessions, divine_notifications, ecn_analysis_queue, ecn_history, emotion_logs, exodus_mentorships, face_login_attempts, friend_requests, friendships, job_queue, latency_benchmarks, legacy_artifacts, leaderboard_stats (materialized view), mmora_memories, notifications, page_views, platform_health_logs, post_comments, post_ratings, posts, profiles, quantum_call_signals, security_logs, selfie_city_pins, shadow_ban_status, user_activity_log, user_badges, user_collection_progress, user_roles, user_sessions, user_tier_limits, zoe_adapter_registry, zoe_agent_deployments, zoe_agent_stats, zoe_command_history, zoe_core_integrity, zoe_document_learnings, zoe_job_market, zoe_relationship_context, zoe_response_feedback, zoe_skill_uploads, zoe_sovereign_memory, zoe_veto_log

### Database Functions — 40+
accept_friend_request, append_merged_mind_entity, apply_zoe_feedback, auto_check_shadow_ban_trigger, award_resonance_points, calculate_agent_success_probability, calculate_cognitive_access, calculate_phoenix_sync_score, calculate_user_points, calculate_zoe_tone, can_insert_session, check_behavioral_shift, check_collection_completion, check_face_login_rate_limit, check_feature_limit, check_shadow_ban_threshold, check_user_activity_freshness, cleanup_expired_call_signals, cleanup_expired_notifications, cleanup_old_activity_logs, cleanup_old_face_login_attempts, cleanup_stale_sessions, complete_agent_deployment, cqrs_cache_invalidation_trigger, cqrs_command_log_event, cqrs_query_zoe_state, deduct_resonance_points, detect_behavioral_anomaly, detect_relationship_style, get_daily_notification_count, get_dhf_quantum_state, get_latest_ecn_fast, get_leaderboard, get_tier_from_points, get_upcoming_important_dates, get_user_activity_summary, get_user_tenant_id, get_zoe_adaptive_prompt, get_zoe_sovereign_state, get_zoe_stability_score, handle_new_user, has_premium_access, has_role, refresh_leaderboard_stats, search_mmora_memories, update_comment_replies_count, update_dhf_timestamp, update_emotional_state_timestamp

---

## 11. INSTALLED DEPENDENCIES — 55 Packages

### Core Framework
react, react-dom, react-router-dom, vite, typescript, tailwindcss, tailwindcss-animate, tailwind-merge

### UI Libraries
shadcn (all @radix-ui/* packages), lucide-react, framer-motion, sonner, vaul, cmdk, embla-carousel-react, recharts, react-resizable-panels, react-day-picker, input-otp, next-themes

### 3D / VR
three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing

### Maps / Geo
leaflet, react-leaflet, @react-leaflet/core, mapbox-gl, d3-geo, d3-selection, d3-zoom

### AI / ML
@tensorflow/tfjs, @tensorflow-models/coco-ssd, @mediapipe/tasks-genai

### Data / State
@tanstack/react-query, zustand, dexie (IndexedDB), zod

### Backend
@supabase/supabase-js

### Mobile
@capacitor/core, @capacitor/cli, @capacitor/android

### Utilities
date-fns, class-variance-authority, clsx, react-hook-form, @hookform/resolvers, jspdf, pdfjs-dist, react-to-print, react-helmet-async, vite-plugin-pwa, vitest

---

## 12. IDLE / NOT FULLY CONNECTED

| Item | Status | Issue |
|------|--------|-------|
| `ollama-proxy` → api.myzoe.xyz | 🔴 IDLE | DNS not resolving — Cloudflare tunnel not configured |
| `DreamsAITTSAdapter` | 🟡 IDLE | Reserved, not implemented |
| `ExternalOntologyAdapter` | 🟡 IDLE | Available, not active |
| `GeminiTTSAdapter` | 🟡 IDLE | Available, not primary |
| `assemblyai-tts` edge function | 🟡 IDLE | Configured but rarely invoked |
| `edge-tts` edge function | 🟡 IDLE | Available fallback |
| Twilio integration | 🟡 IDLE | Keys configured, quantum call UI exists but may not be live |
| Deepgram integration | 🟡 IDLE | Key configured, transcription available |

---

## 13. RECOMMENDATIONS

### 🔴 Critical
1. **Fix `api.myzoe.xyz` DNS** — Sovereign Mode is completely blocked
2. **Security audit** — Run full RLS policy scan on 60+ tables

### 🟡 Optimization
3. **Consolidate edge functions** — 96 is very high; merge related ones (e.g., 6 selfie-city → 1 with action routing)
4. **Prune idle adapters** — Implement or remove DreamsAI/ExternalOntology placeholders
5. **Hook consolidation** — 310 hooks is extreme; many thin wrappers could be merged
6. **Migration squash** — 216 migrations; consider squashing for cleaner history
7. **Bundle size audit** — TensorFlow, Three.js, Leaflet, Mapbox, Recharts all installed; verify lazy-loading

### 🟢 Future
8. **Test coverage** — No test files detected; critical paths need tests
9. **Activate Twilio** — Quantum Call UI exists but integration may be incomplete
10. **Activate Deepgram** — Key configured, could replace/supplement AssemblyAI

---

**Scan Status:** ✅ Complete  
**Platform Health:** 🟡 Operational (Sovereign Mode blocked by DNS)  
**Total Files Scanned:** 700+  
**Total DB Migrations:** 216  
**Total Edge Functions:** 96  
**Total Hooks:** 310  
**Total Components:** 200+  
