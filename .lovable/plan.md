

# Exporting Zoe Infinity to a New Lovable Project

## Why This is Needed

Lovable redirects all non-primary domains to the primary domain at the edge/CDN level. Since `mmora.xyz` is primary, `myzoe.xyz` always redirects there before any JavaScript runs. The **only fix** is a separate Lovable project for `myzoe.xyz`.

## What Needs to Be Copied

Zoe Infinity is deeply embedded in the M'mora codebase. Here is the complete dependency map:

### Pages (2 files)
- `src/pages/ZoeInfinity.tsx` (gate entry)
- `src/pages/ZoeInfinityUnlocked.tsx` (main 2683-line page)
- `src/pages/ZoeInfinityAuth.tsx` (standalone auth)

### Components
- `src/components/zoe-infinity/` (entire folder -- 24+ files including mail/)
- `src/components/quantum/QuantumCallModal.tsx` + related quantum components
- `src/components/BrainLoader.tsx`
- `src/components/SystemFailureBoundary.tsx`
- `src/components/resleeve/` (if Re-Sleeve panel is used)
- `src/components/ui/` (all shadcn UI primitives -- button, input, toast, etc.)

### Hooks (~60+ Zoe Infinity-specific hooks)
Key ones include:
- `useZoeInfinityBrain`, `useHybridVoice`, `useNanoStreamVoice`, `useNanoReflexArt`
- `usePhantomMode`, `useGenesisEffects`, `useAtmanArchive`, `useDestinyCompanion`
- `useVedicEngine`, `useCircadianRhythm`, `useKarmicMemory`, `useZoeBioKernel`
- `useVirtualHormones`, `useVoiceOrchestrator`, `useZoePersonalityMatrix`
- `useZoeOfflineCore`, `useZoeInitiative`, `useZoeNickname`, `useZoeLanguage`
- `useZoeLocalContext`, `useIntuitionEngine`, `useBehavioralTelemetry`
- `useConversationalOnboarding`, `useWakeWord`, `useAutoProfiler`
- Plus ~40 more referenced in ZoeInfinityUnlocked.tsx

### Core Modules
- `src/core/inference/` (GeminiNano, InferenceOptimizer)
- `src/core/speech/` (StreamToStreamBridge, SpeculativeSpeechProtocol)
- `src/core/slm/` (OfflineSLMEngine, GemmaMediaPipeEngine, NanoReflexProtocol)
- `src/core/ports/` (LLMInferencePort, TTSServicePort)
- `src/core/security/ConstitutionalKernel.ts`
- `src/core/soul/`, `src/core/memory/`, `src/core/zoe/`, etc.

### Services
- `src/services/ZoeAutoMailService.ts`
- `src/services/ZoeBackgroundProcessor.ts`
- `src/services/ZeroThermalProtocol.ts`
- `src/services/HapticSymbiosis.ts`

### Utilities (~30+ files)
- `src/utils/zoeVoice.ts`, `voiceExperienceLock.ts`, `conversationNamespaces.ts`
- `src/utils/ArtGenerator.ts`, `nameGenerator.ts`, `weatherHelpers.ts`
- `src/utils/crossBrowserCompat.ts`, `safariBrowserFixes.ts`
- `src/utils/assistantVoice.ts`, `offlineVoice.ts`, and more

### Data
- `src/data/ZoeInfinityFeatures.ts`
- `src/data/offline_wisdom.json`

### Database (IndexedDB)
- `src/db/OfflineDB.ts` (Dexie.js offline storage)

### Auth & Supabase
- `src/lib/auth.tsx` (AuthProvider)
- `src/integrations/supabase/client.ts` (auto-generated in new project)
- `src/integrations/supabase/types.ts` (auto-generated)

### Contexts
- `src/contexts/TimeSimulationContext.tsx`
- `src/contexts/DeviceTierContext.tsx`
- `src/contexts/AutoHealContext.tsx`
- `src/contexts/LiquidUniverseContext.tsx`
- `src/contexts/ShapeShifterContext.tsx`

### Edge Functions (Zoe Infinity specific)
- `supabase/functions/zoe-infinity-brain/`
- `supabase/functions/zoe-infinity-chat/`
- `supabase/functions/zoe-infinity-vision/`
- `supabase/functions/edge-tts/`
- `supabase/functions/lovable-tts/`
- `supabase/functions/realtime-voice/`
- `supabase/functions/zoe-realtime-voice/`
- `supabase/functions/mail-sentinel/`
- `supabase/functions/ironclad-relay/`
- `supabase/functions/zoe-artifact-generator/`
- `supabase/functions/zoe-document-xray/`
- `supabase/functions/zoe-god-mode/`
- `supabase/functions/_shared/` (shared utilities)

### Database Tables Required
- `zoe_infinity_messages`
- `profiles` (for user data)
- Any other tables referenced by edge functions

---

## Step-by-Step Export Process

### Step 1: Create New Lovable Project
- Go to your Lovable workspace
- Click "New Project"
- Name it "Zoe Infinity" or "MyZoe"
- Enable Lovable Cloud on it

### Step 2: Copy the Codebase
Since Lovable doesn't have a built-in "extract module" feature, the fastest approach:

**Option A -- GitHub Export (Recommended)**
1. Connect this M'mora project to GitHub (Settings > GitHub)
2. Clone the repo locally
3. Remove all non-Zoe-Infinity files
4. Simplify `App.tsx` to only have the Zoe Infinity route as `/`
5. Push to a new GitHub repo
6. Connect the new Lovable project to that repo

**Option B -- Remix + Delete**
1. Remix this entire project (Settings > Remix)
2. In the remixed project, delete all M'mora-specific pages, components, and routes
3. Simplify the router to show Zoe Infinity as the root `/`

**Option C -- Prompt-Based (if no GitHub)**
1. In the new project, paste the key files one at a time via prompts
2. This will take many credits given the volume (~200+ files)

### Step 3: Simplify Routing in New Project
The new project's `App.tsx` becomes extremely simple:

```text
/ --> ZoeInfinityAuth (if not logged in)
/ --> ZoeInfinity (if logged in)
```

No domain router needed. No M'mora routes. Just Zoe.

### Step 4: Recreate Database Schema
Run the same migrations for `zoe_infinity_messages` and `profiles` tables in the new project's Cloud backend.

### Step 5: Recreate Edge Functions
Copy the Zoe-specific edge functions into the new project's `supabase/functions/` directory.

### Step 6: Connect Domain
In the new project: Settings > Domains > Add `myzoe.xyz` and `www.myzoe.xyz` as Primary domain.

### Step 7: Configure Secrets
Copy over any secrets (Deepgram API key, etc.) to the new project's Cloud secrets.

---

## Recommendation

**Option B (Remix + Delete)** is the fastest path that doesn't require GitHub or spending credits copying files manually. You remix the project in one click, then strip out everything that isn't Zoe Infinity. The database schema, edge functions, and secrets carry over automatically with the remix.

After the remix:
1. Delete all non-Zoe pages and M'mora components
2. Simplify App.tsx to root = Zoe Infinity
3. Connect `myzoe.xyz` as the Primary domain
4. Done -- `myzoe.xyz` loads only Zoe Infinity

