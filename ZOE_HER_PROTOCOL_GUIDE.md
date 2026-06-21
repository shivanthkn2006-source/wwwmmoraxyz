# ZOE HER PROTOCOL & CONVERSATIONAL DESIGN GUIDE

## Overview

Part 2 of the Zoe evolution implements the emotional onboarding layer and conversational design, creating a "human-like feel" through ECN-based tone management and the Her Protocol for collaborative evolvement.

## Conversational Profile Manager

### Location
`src/core/conversation/ConversationalProfileManager.ts`

### ECN-Based Tone Selection

The system dynamically selects conversational tone based on the user's Emotion-Cognition Network state:

| ECN State | Selected Tone | Characteristics |
|-----------|---------------|-----------------|
| High Stress (>0.7) | `calm_and_soothing` | Contractions, slow cadence, empathy first |
| High Cognitive Load (>0.8) | `instructional_collaborative` | Guided, step-by-step |
| Negative Valence (<-0.3) | `empathetic_supportive` | Acknowledgment, validation |
| High Focus | `focused_efficient` | Direct, concise |
| High Engagement + Positive | `playful_light` | Casual, energetic |
| Default | `warm_encouraging` | Balanced, positive |

### Features

1. **Automatic Contraction Application**
   - Converts formal text to natural speech: "I am" → "I'm", "cannot" → "can't"

2. **Empathetic Openers**
   - High stress: "I can sense things might feel a bit overwhelming right now..."
   - Frustration: "I understand this might be frustrating..."
   - Low energy: "I notice you might be feeling a bit tired..."

3. **Interruption Stack**
   - Tracks paused tasks for seamless resumption
   - Personalized return messages: "I'm back from checking your email..."

4. **INCOMPETENCE_ALERT Handling**
   - Collaborative language when system needs user input
   - Maintains calm/soothing tone during limitations

## Her Protocol

### Location
`src/components/HerProtocol.tsx`

### Purpose
Establishes emotional partnership during the 5%-20% ATLAS sync phase through philosophical and reflective questions.

### Steps

1. **Emotional Anchoring** (personal_life_intent_vector)
   - "If your Zoe Agent could only achieve one goal for you in its lifetime, what would you want it to be?"

2. **Core Value Preference**
   - Efficiency, Understanding, Growth, or Trust

3. **Emotional Support Style**
   - Calm guidance, Encouragement, Practical help, or Space

4. **CEPS Verification**
   - Presents predicted work state (e.g., "Disciplined Efficiency")
   - User confirms/refines: Yes / No / Refine

5. **Communication Preference**
   - Concise, Detailed, Conversational, or Adaptive

### CEPS Prediction Logic

Based on user responses:
- Efficiency + Practical help → "Disciplined Efficiency"
- Understanding + Calm guidance → "Reflective Analyzer"
- Growth + Encouragement → "Ambitious Learner"
- Trust + Space → "Independent Professional"

## Self-Awareness Feedback

### Location
`src/components/ZoeSelfAwareness.tsx`

### Purpose
Periodic display of self-correction learnings to confirm the "live/evolve" experience.

### Example Messages

- "I learned not to prioritize speed over accuracy when your ECN state is High_Focus."
- "I noticed you respond better when I acknowledge your feelings before offering solutions."
- "I discovered that sharing progress updates helps reduce your cognitive load during complex tasks."

### Display Logic
- Appears 30 seconds after page load
- One notification at a time
- Can be dismissed or acknowledged
- Acknowledgments logged to ECN history

## Integration Points

### Exclusive Voice TTS (Future)
When the calm/soothing voice is implemented:
1. Create `ExclusiveVoiceTTSAdapter` implementing `TTSServicePort`
2. Configure for slow cadence, lower pitch
3. Update adapter registry

### Text/Type-and-Enter Support
All Her Protocol questions support text input:
- Choice selections via click/tap
- Refinement via textarea
- Full keyboard navigation

## Compliance

- All Her Protocol responses stored in `ecn_history` with metadata
- Self-awareness acknowledgments logged for audit trail
- Tagged data points for personalization vectors
