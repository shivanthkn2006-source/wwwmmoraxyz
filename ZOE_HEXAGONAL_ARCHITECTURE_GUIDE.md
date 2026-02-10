# ZOE HEXAGONAL ARCHITECTURE GUIDE

## Overview

The Zoe Sovereign Core Platform now implements a **Hexagonal Architecture** (Ports and Adapters pattern) that decouples the core intelligence from all external I/O, making all current and future APIs replaceable without touching business logic.

## Architecture Components

### Domain Layer (`src/core/domain/`)
Contains the core business logic:
- **ECN (Emotion-Cognition Network)**: 5-layer emotional/cognitive analysis
- **CEPS (Cognitive-Emotional Predictive Synthesis)**: Predictive modeling
- **DHF VETO System**: Digital Human Freight protection rules
- **Sovereign Context Registry (SCR)**: Central state management

### Ports (`src/core/ports/`)
Define interfaces that adapters must implement:
- **LLM_Inference_Port**: Contract for all LLM providers
- **TTS_Service_Port**: Contract for Text-to-Speech services

### Adapters (`src/core/adapters/`)
Concrete implementations of ports:
- **Gemini_Adapter**: Google Gemini (2.5/3 Pro) - Active
- **Placeholder_TTS_Adapter**: Web Speech API - Active (temporary)
- **Exclusive_Voice_Adapter**: Reserved for future calm/soothing voice
- **Dreams_AI_Adapter**: Reserved for specialized dream interpretation

## ATLAS Sync Verification

### Text-Based Authorization Flow
For DHF Autonomy data points in the 20%-100% sync range:

1. If user is in **Hands-Free Mode** and VTT fails → **Verification_Fallback_Prompt** appears
2. User must TYPE: `I AUTHORIZE Zoe to use [data description] for [category] modeling.`
3. System displays: `DATA VERIFIED. The ECN now integrates this information.`
4. Immutable audit trail updated with ISO 27001 policy [POLICY-ID-004]

### Components
- `ATLASSyncVerification.tsx`: Modal component for text authorization
- `useATLASSync.ts`: Hook managing sync state and verification flow

## Database Tables

### `atlas_sync_authorizations`
Stores all text-based authorizations with:
- `authorization_keyword`: Must be "I AUTHORIZE"
- `authorization_statement`: Full user-typed statement
- `sync_percentage`: 20-100 range
- `verification_method`: voice | text_fallback | text_primary
- `compliance_policy_id`: ISO 27001 reference

### `zoe_adapter_registry`
Tracks active adapters for each port with health status and configuration.

## Swapping Adapters (Future)

To swap an adapter (e.g., replace Placeholder_TTS with Exclusive_Voice):

1. Implement new adapter class implementing `TTSServicePort`
2. Update `zoe_adapter_registry` table:
```sql
UPDATE zoe_adapter_registry 
SET is_active = false 
WHERE port_name = 'TTS_Service_Port' AND adapter_name = 'Placeholder_TTS_Adapter';

UPDATE zoe_adapter_registry 
SET is_active = true, priority = 1 
WHERE port_name = 'TTS_Service_Port' AND adapter_name = 'Exclusive_Voice_Adapter';
```
3. Zero changes required to ECN/DHF business logic!

## Compliance

- **SOC 2**: Immutable audit logging for all operations
- **ISO 27001**: Policy ID tracking for data authorizations
- **GDPR Ready**: User data isolation via RLS policies
