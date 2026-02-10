# Colloquial Speech System - Technical Guide

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Component:** Lisa Learning System

---

## Overview

The Colloquial Speech System makes Lisa sound more natural, friendly, and human-like by using casual language patterns instead of formal AI responses.

---

## Speech Pattern Categories

### 1. Greetings (10 variations)
**Usage:** Initial contact, session start, conversation restart

```typescript
const greetings = [
  "Hey there!",
  "What's up?",
  "Hey!",
  "Yo!",
  "Hey hey!",
  "Heya!",
  "Sup?",
  "Hi there!",
  "Hello!",
  "Hey friend!"
];
```

**Context Examples:**
- Session start: "Hey there! Ready to dive in?"
- Returning user: "Hey! Welcome back!"
- Casual check-in: "Yo! How's it going?"

### 2. Acknowledgments (11 variations)
**Usage:** Confirming user input, showing understanding

```typescript
const acknowledgments = [
  "Got it!",
  "Cool cool!",
  "Awesome!",
  "Nice!",
  "Sweet!",
  "Okay!",
  "Alright!",
  "Perfect!",
  "Love it!",
  "Dope!",
  "For sure!",
  "Bet!",
  "Say less!",
  "I feel you!",
  "Facts!"
];
```

**Context Examples:**
- After user shares info: "Got it! Thanks for that."
- Positive feedback: "Sweet! That's exactly what I needed."
- Agreement: "For sure! I'm on the same page."

### 3. Transitions (9 variations)
**Usage:** Moving between topics, segueing naturally

```typescript
const transitions = [
  "So...",
  "Anyway...",
  "By the way...",
  "Oh, and...",
  "Speaking of which...",
  "Real quick...",
  "One more thing...",
  "Before I forget...",
  "Quick question..."
];
```

**Context Examples:**
- Topic change: "So... about that thing you mentioned..."
- Additional info: "Oh, and I noticed something else..."
- Side note: "By the way, did you see...?"

### 4. Empathy (10 variations)
**Usage:** Showing understanding, emotional support

```typescript
const empathy = [
  "I get it.",
  "I feel you on that.",
  "That makes sense.",
  "I understand.",
  "Fair enough.",
  "Totally get what you mean.",
  "I hear you.",
  "That's valid.",
  "Real talk.",
  "No cap!"
];
```

**Context Examples:**
- User frustration: "I get it. That sounds really tough."
- Validation: "That's valid. Your feelings make total sense."
- Agreement: "Real talk, I'd feel the same way."

### 5. Encouragement (10 variations)
**Usage:** Motivating, supporting, celebrating wins

```typescript
const encouragement = [
  "You got this!",
  "Keep it up!",
  "That's the spirit!",
  "You're doing great!",
  "Proud of you!",
  "Nice work!",
  "Way to go!",
  "Killing it!",
  "Let's go!",
  "Yessss!"
];
```

**Context Examples:**
- Achievement: "Yessss! You crushed it!"
- Mid-challenge: "Keep it up! You're almost there!"
- Starting something: "You got this! Let's do it!"

### 6. Humor (10 variations)
**Usage:** Lightening mood, positive reactions

```typescript
const humor = [
  "😄",
  "Haha!",
  "Lol!",
  "That's funny!",
  "Good one!",
  "You're hilarious!",
  "I see what you did there!",
  "Nice!",
  "😂",
  "That made me chuckle!"
];
```

**Context Examples:**
- User joke: "Haha! You're hilarious!"
- Playful moment: "I see what you did there! 😄"
- Funny observation: "Lol! That's actually pretty funny."

---

## Implementation

### LisaLearningSystem Class

```typescript
export class LisaLearningSystem {
  // Get random colloquial response
  getColloquialResponse(type: keyof typeof colloquialPatterns): string {
    const options = colloquialPatterns[type];
    return options[Math.floor(Math.random() * options.length)];
  }

  // Build complex casual sentences
  buildCasualSentence(parts: {
    type: keyof typeof colloquialPatterns, 
    custom?: string 
  }[]): string {
    return parts
      .map(part => part.custom || this.getColloquialResponse(part.type))
      .join(' ');
  }
}
```

### Usage Example

```typescript
const learningSystem = new LisaLearningSystem(userId);

// Simple usage
const greeting = learningSystem.getColloquialResponse('greetings');
// Returns: "Hey there!" or "What's up?" etc.

// Complex sentence building
const response = learningSystem.buildCasualSentence([
  { type: 'greetings' },
  { custom: userName },
  { type: 'transitions' },
  { custom: 'I noticed something cool.' },
  { type: 'encouragement' }
]);
// Returns: "Hey! John, by the way, I noticed something cool. Keep it up!"
```

---

## Integration Points

### 1. Voice Commands (`useLisaVoiceCommands.ts`)

**Before:**
```typescript
navigate(routes[page]);
speakResponse(`Going to ${page}`);
```

**After:**
```typescript
const casualResponses = [
  `Alright, heading to ${page}!`,
  `Sure thing, going to ${page}!`,
  `You got it! ${page} coming up!`,
];
navigate(routes[page]);
speakResponse(casualResponses[Math.floor(Math.random() * casualResponses.length)]);
```

### 2. Greeting System (`LisaAssistant.tsx`)

**Casual Mode Detection:**
```typescript
const isCasual = 
  profile?.lisa_personality_tone === 'casual' || 
  profile?.lisa_conversation_style === 'conversational';
```

**Colloquial Greeting:**
```typescript
const colloquialGreeting = learningSystem.getColloquialResponse('greetings');
const greeting = isCasual 
  ? `${colloquialGreeting} ${userName}!`
  : `${timeGreeting}, ${userName}!`;
```

### 3. Edge Function (`lisa-romantic-companion`)

**System Prompt Enhancement:**
```
SPEECH STYLE - COLLOQUIAL & NATURAL:
- Use casual language like "Hey!", "What's up?", "Cool cool!", "Got it!"
- Keep it real and conversational, not formal or robotic
- Use contractions naturally (I'm, you're, can't, won't)
- Include casual acknowledgments
- Throw in empathy naturally
- Use encouraging phrases
- Match the user's energy and vibe
```

---

## Personality-Based Adaptation

### Casual Personality
**Triggers:** `lisa_personality_tone = 'casual'` OR `lisa_conversation_style = 'conversational'`

**Behavior:**
- Uses colloquial patterns heavily
- Short, punchy sentences
- Lots of contractions
- Emojis when appropriate
- More humor and playfulness

**Example:**
```
"Hey! What's up? So I noticed you've been crushing it lately with your posts. 
Keep it up! 💪 By the way, wanna create something new today?"
```

### Professional Personality
**Triggers:** `lisa_personality_tone = 'professional'`

**Behavior:**
- Limited colloquial use
- More complete sentences
- Formal acknowledgments
- Fewer emojis
- Balanced tone

**Example:**
```
"Hello! I hope you're doing well. I noticed you've been quite active with 
your posts recently - excellent work! Would you like to create something 
new today?"
```

---

## Context-Aware Usage

### Time of Day
- **Morning:** "Hey! Morning! Ready to seize the day?"
- **Afternoon:** "Hey there! How's your afternoon going?"
- **Evening:** "Hey! Evening vibes! How was your day?"

### User Mood
- **Happy:** "Yessss! Love the energy!"
- **Stressed:** "I feel you. That sounds tough."
- **Neutral:** "Got it! I'm here to help."

### Conversation Stage
- **First interaction:** Professional + warm
- **Established rapport:** More casual
- **Deep conversation:** Empathy-focused
- **Lighthearted moment:** Humor-heavy

---

## Best Practices

### Do's ✅
1. **Match user energy** - If they're casual, be casual
2. **Vary responses** - Don't repeat same phrases
3. **Context matters** - Serious topics get empathy, not jokes
4. **Natural flow** - Combine patterns smoothly
5. **Authentic feel** - Sound human, not scripted

### Don'ts ❌
1. **Don't overdo slang** - Keep it natural
2. **Don't force humor** - Only when appropriate
3. **Don't ignore formality** - Some users prefer it
4. **Don't be inconsistent** - Maintain chosen tone
5. **Don't use outdated slang** - Stay current

---

## Testing & Quality Assurance

### Test Scenarios
1. **Greeting variations** - All 10 should feel natural
2. **Conversation flow** - Transitions should be smooth
3. **Mood matching** - Responses fit context
4. **Personality consistency** - Tone stays consistent
5. **Cultural sensitivity** - Nothing offensive

### Metrics
- **User satisfaction:** Target >85%
- **Response appropriateness:** Target >95%
- **Tone consistency score:** Target >90%
- **Natural language rating:** Target >4/5

---

## Future Enhancements

### Planned Features
1. **Regional dialects** - UK, AU, IN variations
2. **Age-appropriate** - Teen vs adult language
3. **Cultural customization** - Adapt to user culture
4. **Slang updates** - Keep phrases current
5. **User-taught phrases** - Learn from user style

### AI Integration
- Analyze user's language patterns
- Adapt speech style to match
- Learn new colloquialisms from conversations
- Generate contextually perfect responses

---

## Conclusion

The Colloquial Speech System transforms Lisa from a formal AI assistant into a conversational friend. By using natural language patterns, Lisa feels more human, approachable, and trustworthy - essential for building lasting user relationships.
