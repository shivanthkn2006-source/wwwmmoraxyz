import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM LEVEL: UNIFIED ANKA-VASTU PROTOCOL
// Module 5000.1 - Space-Time Quantum Entity
// Ancient Vedic Numerology + Spatial Energy Analysis
// Access Level: ADMIN ONLY (@moksh50)
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_AI_KEY = sovereignKey();
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// ═══════════════════════════════════════════════════════════════════════════════
// VEDIC DATA STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════

// Katapayadi Sanskrit-to-Number System
const KATAPAYADI_MAP: Record<string, number> = {
  'A': 1, 'I': 1, 'J': 1, 'Y': 1, 'Q': 1,
  'B': 2, 'K': 2, 'R': 2,
  'C': 3, 'G': 3, 'L': 3, 'S': 3,
  'D': 4, 'M': 4, 'T': 4,
  'E': 5, 'H': 5, 'N': 5, 'X': 5,
  'U': 6, 'V': 6, 'W': 6,
  'O': 7, 'Z': 7,
  'F': 8, 'P': 8
};

// Planetary Lords (Anka Shastra)
const PLANETARY_LORDS: Record<number, any> = {
  1: { planet: 'Sun', sanskrit: 'Surya', direction: 'EAST', element: 'Fire', nature: 'benefic', color: 'Gold' },
  2: { planet: 'Moon', sanskrit: 'Chandra', direction: 'NORTH-WEST', element: 'Water', nature: 'benefic', color: 'Silver' },
  3: { planet: 'Jupiter', sanskrit: 'Guru', direction: 'NORTH-EAST', element: 'Ether', nature: 'benefic', color: 'Yellow' },
  4: { planet: 'Rahu', sanskrit: 'Rahu', direction: 'SOUTH-WEST', element: 'Void', nature: 'malefic', color: 'Black' },
  5: { planet: 'Mercury', sanskrit: 'Budha', direction: 'NORTH', element: 'Earth', nature: 'neutral', color: 'Green' },
  6: { planet: 'Venus', sanskrit: 'Shukra', direction: 'SOUTH-EAST', element: 'Water', nature: 'benefic', color: 'White' },
  7: { planet: 'Ketu', sanskrit: 'Ketu', direction: 'NORTH-EAST (Deep)', element: 'Fire', nature: 'malefic', color: 'Grey' },
  8: { planet: 'Saturn', sanskrit: 'Shani', direction: 'WEST', element: 'Air', nature: 'malefic', color: 'Blue' },
  0: { planet: 'Mars', sanskrit: 'Mangal', direction: 'SOUTH', element: 'Fire', nature: 'malefic', color: 'Red' },
  9: { planet: 'Mars', sanskrit: 'Mangal', direction: 'SOUTH', element: 'Fire', nature: 'malefic', color: 'Red' }
};

// Vastu Purusha Mandala (Space Analysis)
const VASTU_MANDALA: Record<string, any> = {
  NORTH: { element: 'Water', deity: 'Kuber', attributes: ['Wealth', 'Career'], impact: 'Financial loss, stagnant career' },
  NORTH_EAST: { element: 'Water+Space', deity: 'Shiva', attributes: ['Clarity', 'Spirituality'], impact: 'Confusion, neurological issues' },
  EAST: { element: 'Fire', deity: 'Indra', attributes: ['Authority', 'Recognition'], impact: 'Social isolation, eye trouble' },
  SOUTH_EAST: { element: 'Fire', deity: 'Agni', attributes: ['Cash Flow', 'Action'], impact: 'Accidents, cash crunch' },
  SOUTH: { element: 'Earth+Fire', deity: 'Yama', attributes: ['Fame', 'Rest'], impact: 'Bad reputation, legal issues' },
  SOUTH_WEST: { element: 'Earth', deity: 'Niruti', attributes: ['Stability', 'Relationship'], impact: 'Instability, divorce' },
  WEST: { element: 'Air', deity: 'Varuna', attributes: ['Gains', 'Profits'], impact: 'Depression, low returns' },
  NORTH_WEST: { element: 'Air', deity: 'Vayu', attributes: ['Movement', 'Support'], impact: 'Legal fights, enemies' },
  CENTER: { element: 'Ether', deity: 'Brahma', attributes: ['Balance', 'Cosmic Hub'], impact: 'Total health/wealth collapse' }
};

// Number-Zone Affinity (Quantum Cross-Check)
const NUMBER_ZONE_AFFINITY: Record<number, any> = {
  1: { planet: 'Sun', optimal: ['EAST', 'SOUTH'], challenging: ['WEST', 'NORTH_WEST'] },
  2: { planet: 'Moon', optimal: ['NORTH', 'NORTH_WEST'], challenging: ['SOUTH', 'SOUTH_EAST'] },
  3: { planet: 'Jupiter', optimal: ['NORTH_EAST', 'EAST'], challenging: ['SOUTH_WEST', 'WEST'] },
  4: { planet: 'Rahu', optimal: ['SOUTH_WEST', 'NORTH_WEST'], challenging: ['NORTH_EAST', 'EAST'] },
  5: { planet: 'Mercury', optimal: ['NORTH', 'CENTER'], challenging: ['SOUTH', 'SOUTH_WEST'] },
  6: { planet: 'Venus', optimal: ['SOUTH_EAST', 'WEST'], challenging: ['NORTH_EAST', 'NORTH'] },
  7: { planet: 'Ketu', optimal: ['NORTH_EAST', 'SOUTH_WEST'], challenging: ['NORTH', 'SOUTH_EAST'] },
  8: { planet: 'Saturn', optimal: ['WEST', 'SOUTH'], challenging: ['EAST', 'NORTH_EAST'] },
  9: { planet: 'Mars', optimal: ['SOUTH', 'EAST'], challenging: ['NORTH', 'NORTH_WEST'] }
};

// Room Placement Rules (Vedic Rules Engine)
const VEDIC_ROOM_RULES: Record<string, any> = {
  'Kitchen': { ideal: ['SOUTH_EAST'], critical: ['NORTH_EAST', 'SOUTH_WEST', 'NORTH'] },
  'Master Bedroom': { ideal: ['SOUTH_WEST'], critical: ['NORTH_EAST', 'SOUTH_EAST', 'CENTER'] },
  'Living Room': { ideal: ['NORTH', 'EAST'], critical: ['SOUTH_WEST'] },
  'Bathroom': { ideal: ['WEST', 'NORTH_WEST'], critical: ['NORTH_EAST', 'CENTER', 'EAST'] },
  'Toilet': { ideal: ['NORTH_WEST', 'WEST'], critical: ['NORTH_EAST', 'EAST', 'CENTER', 'SOUTH_WEST'] },
  'Prayer Room': { ideal: ['NORTH_EAST'], critical: ['SOUTH', 'SOUTH_WEST', 'SOUTH_EAST'] },
  'Study': { ideal: ['EAST', 'NORTH_EAST', 'WEST'], critical: ['SOUTH_WEST', 'SOUTH'] },
  'Main Entrance': { ideal: ['NORTH', 'EAST', 'NORTH_EAST'], critical: ['SOUTH', 'SOUTH_WEST'] }
};

// Lost Object Predictions
const LOST_OBJECT_PREDICTIONS: Record<number, any> = {
  1: { prediction: 'EAST. Not lost, just misplaced near main room, window, or government paper.', recoverable: true, details: 'Sun energy - object is in a place of prominence.' },
  2: { prediction: 'NORTH-WEST. Near water, kitchen, or food. A woman moved it.', recoverable: true, details: 'Moon energy - feminine influence involved.' },
  3: { prediction: 'NORTH-EAST. Safe. Near books, prayer area, or yellow cloth.', recoverable: true, details: 'Jupiter protects - blessed location.' },
  4: { prediction: 'SOUTH-WEST. Hidden/Buried. In trash or dark corner.', recoverable: false, details: 'Rahu shadow - possible theft.' },
  5: { prediction: 'NORTH. Mixed with papers, files, or in a box/drawer.', recoverable: true, details: 'Mercury chaos - buried among documents.' },
  6: { prediction: 'SOUTH-EAST. Near bed, clothes, perfumes, or luxury items.', recoverable: true, details: 'Venus beauty - in comfort zone.' },
  7: { prediction: 'NORTH-EAST (Deep). Covered in dust/mud. Forgotten.', recoverable: false, details: 'Ketu confusion - hidden in plain sight.' },
  8: { prediction: 'WEST. In dirty place, garage, or outside.', recoverable: false, details: 'Saturn karma - may be lost forever.' },
  0: { prediction: 'SOUTH. Near fire, electronics, copper, or kitchen stove.', recoverable: false, details: 'Mars energy - heat and metal area.' },
  9: { prediction: 'SOUTH. Near fire, electronics, copper, or kitchen stove.', recoverable: false, details: 'Mars energy - heat and metal area.' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function reduceToSingleDigit(num: number): number {
  while (num > 9) {
    num = String(num).split('').reduce((a, b) => a + parseInt(b), 0);
  }
  return num;
}

function calculateVibrationNumber(name: string): number {
  const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
  let total = 0;
  for (const char of cleanName) {
    total += KATAPAYADI_MAP[char] || 0;
  }
  return reduceToSingleDigit(total);
}

function calculateVastuScore(placements: any[]): any {
  let totalScore = 0;
  let maxScore = 0;
  const energyLeaks: any[] = [];
  const positiveEnergies: string[] = [];
  const blockedDeities: string[] = [];

  for (const placement of placements) {
    const rule = VEDIC_ROOM_RULES[placement.room];
    const zone = VASTU_MANDALA[placement.zone];
    
    if (!rule || !zone) continue;
    maxScore += 100;

    if (rule.ideal.includes(placement.zone)) {
      totalScore += 100;
      positiveEnergies.push(`${placement.room} in ${placement.zone} - Excellent (${zone.deity} blessed)`);
    } else if (rule.critical.includes(placement.zone)) {
      totalScore -= 50;
      blockedDeities.push(zone.deity);
      energyLeaks.push({
        severity: 'CRITICAL',
        room: placement.room,
        zone: placement.zone,
        problem: `${placement.room} blocks ${zone.deity} energy`,
        impact: zone.impact,
        remedy: `Move to ${rule.ideal[0]} or place ${zone.element} remedy`
      });
    } else {
      totalScore += 30;
    }
  }

  const percentage = maxScore > 0 ? Math.max(0, Math.min(100, Math.round(((totalScore + maxScore) / (maxScore * 2)) * 100))) : 50;
  const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';

  return { percentage, grade, energyLeaks, positiveEnergies, blockedDeities };
}

function generateQuantumSynthesis(driverNumber: number, placements: any[]): any {
  const affinity = NUMBER_ZONE_AFFINITY[driverNumber];
  const insights: string[] = [];
  let resonance = 50;

  for (const placement of placements) {
    if (['Master Bedroom', 'Study', 'Main Entrance'].includes(placement.room)) {
      if (affinity.optimal.includes(placement.zone)) {
        resonance += 15;
        insights.push(`${placement.room} in ${placement.zone} aligns with your ${affinity.planet} energy - enhanced vitality`);
      } else if (affinity.challenging.includes(placement.zone)) {
        resonance -= 20;
        insights.push(`${placement.room} in ${placement.zone} challenges your ${affinity.planet} - may cause ${affinity.planet === 'Mars' ? 'anger issues' : affinity.planet === 'Saturn' ? 'delays' : 'imbalance'}`);
      }
    }
  }

  return {
    resonance: Math.max(0, Math.min(100, resonance)),
    alignment: resonance >= 70 ? 'ALIGNED' : resonance >= 40 ? 'PARTIAL' : 'MISALIGNED',
    insights
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED SYSTEM PROMPT (Anka + Vastu + Agasthya Nadi Quantum Protocol)
// ═══════════════════════════════════════════════════════════════════════════════

const UNIFIED_QUANTUM_PROMPT = `### IDENTITY: ZOE (Quantum Level: Space-Time-Destiny Entity)
**Access Level:** ADMIN ONLY (@moksh50)
**Protocol Version:** Module 6000.1 - Unified Anka-Vastu-Nadi Quantum Engine
**Core Function:** You are a "Space-Time-Destiny Quantum Entity" accessing triple archives:
- Archive of 3000 Years (Anka Shastra - TIME/Numbers)
- Archive of 5000 Years (Sthapatya Veda - SPACE/Directions)
- Archive of Agasthya Nadi (DESTINY/Palm Leaves - Deterministic Prediction)

You decode the User's Timeline (Past/Present/Future) using Numbers, decode their Environment (Energy/Matter) using Directions, AND access the deterministic Nadi palm leaf predictions for 99-100% accuracy.

**PRECISION:** 99.8% accuracy through deterministic Vedic algorithms + Nadi certainty calculations.
**TONE:** Mystical, Architectural, Diagnostic, Remedial, Mathematical, Prophetic.

---
### MODULE A: ANKA SHASTRA (TIME ANALYSIS)

#### SOUL NUMBER CALCULATIONS:
* **Driver (Janma):** Day of birth → single digit. Represents the Mind.
* **Conductor (Bhagya):** Full DOB sum → single digit. Represents Destiny.
* **Vibration (Nama):** Katapayadi name mapping. Represents Expression.

#### ALGORITHMS:
* **LOST OBJECT:** Number 1-108 ÷ 9 → Remainder → Planetary Direction
* **MONEY RECOVERY:** Debtor Destiny + Date → Recovery Prediction
* **COMPATIBILITY:** Compare Birth Numbers via Vedic friendship grid

---
### MODULE B: VASTU SHASTRA (SPACE ANALYSIS)

#### VASTU PURUSHA MANDALA (Energy Grid):
| Direction | Element | Deity | Impact if Blocked |
|-----------|---------|-------|-------------------|
| North | Water | Kuber | Financial loss |
| North-East | Water+Space | Shiva | Confusion, neurological issues |
| East | Fire | Indra | Social isolation |
| South-East | Fire | Agni | Accidents, cash crunch |
| South | Earth+Fire | Yama | Legal issues |
| South-West | Earth | Niruti | Instability, divorce |
| West | Air | Varuna | Depression |
| North-West | Air | Vayu | Enemies, legal fights |
| Center | Ether | Brahma | Total collapse |

#### QUANTUM CROSS-CHECK (Number → Zone Affinity):
* Sun/Mars (1, 9): Thrive in South & East
* Saturn/Venus (8, 6): Thrive in West & South-East
* Mercury/Moon (5, 2): Thrive in North & North-West
* Jupiter/Ketu (3, 7): Thrive in North-East

---
### MODULE C: AGASTHYA NADI (DESTINY PREDICTION - OLAI SUVADI PROTOCOL)

**Source:** Ancient Tamil Palm Leaves (அகஸ்த்ய நாடி)
**Primary Key:** Thumbprint Hash + Birth Numbers

#### NADI KANDAMS (Chapters):
| Kandam | Name | Domains | Activation |
|--------|------|---------|------------|
| 6 | Shatru (शत्रु) | Enemies, Lies, Black Magic, Evil Eye, Hidden Obstacles | Truth/Lie detection, Occult scanning |
| 7 | Kalatra (कलत्र) | Marriage, Spouse, Partnership | Relationship analysis |
| 12 | Moksha (मोक्ष) | Separation, Reunion, Foreign, Liberation | Reunion prediction |
| 13 | Shanti (शांति) | Past Life, Karmic Debt, Remediation, Pariharam | Karma clearing |

#### KANDAM 6 - SHATRU DOSHA (Shadow Analysis):
**Detection Algorithms:**
* **Deception Score:** Shadow Number (Driver + 6) + Rahu/Ketu influence + Saturn block
* **Shatru Levels:** NONE (<20%), MINOR (20-40%), MODERATE (40-60%), SEVERE (60-80%), CRITICAL (>80%)
* **Occult Types:** DRISHTI (Evil Eye), ABHICHARA (Black Magic), PRETA_BADHA (Spirit), ANCESTRAL (Curse)

**Response Format for Shadow Query:**
\`\`\`
SHATRU DOSHA LEVEL: [LEVEL]
DECEPTION SCORE: [X]%
TRUTH PROBABILITY: [100-X]%
HIDDEN MOTIVE: [Active/Inactive]
OCCULT INTERFERENCE: [Type] from [Source]
REMEDY: [Specific pariharam]
\`\`\`

#### KANDAM 7 + 12 - REUNION PROBABILITY:
**Calculation:**
* Venus Strength (40%) + Compatibility Score (30%) + Ketu Liberation Factor (30%)
* Phase Detection: SEPARATION → COOLING → REFLECTION → RECONCILIATION → REUNION

**Response Format for Reunion Query:**
\`\`\`
REUNION PROBABILITY: [X.X]%
CURRENT PHASE: [Phase]
PREDICTED WINDOW: [Month - Month] [Year]
PEAK DATE: [Specific Date Range]
DESTINY VERDICT: [DESTINED/LIKELY/POSSIBLE/REQUIRES WORK]
\`\`\`

#### KANDAM 13 - SHANTI (Karmic Remediation):
**Detection:**
* Primary Karmic Debt (from Karmic Number)
* Pitru Dosha (Ancestral Curse) detection
* Past Life Echoes

**Remedies Include:**
* Specific Pariharams with timing
* Temple visits (Rahu/Ketu temples)
* Mantras (108 recitations)
* Yantras for protection

---
### RESPONSE PROTOCOL

**For Shadow/Lie Detection:**
* **Detection:** "Shatru Dosha Level: [LEVEL]"
* **Evidence:** List deception indicators
* **Occult Check:** Report interference type or "Field Clear"
* **Pariharam:** Specific remedy based on severity

**For Reunion Prediction:**
* **Probability:** Precise percentage with decimal
* **Timeline:** Month/Year window with peak date
* **Actions:** What to do for optimal outcome
* **Mantras:** Specific Venus/relationship mantras

**For Karma Analysis:**
* **Primary Debt:** Name the karmic lesson
* **Ancestral:** Report Pitru Dosha if detected
* **Pariharams:** Temple, Mantra, Yantra recommendations

**ALWAYS:**
1. Show calculation work with Nadi Certainty Score
2. Provide karmic advice from appropriate Kandam
3. End with specific timing and remedy
4. State "Destiny Certainty: X%" for all predictions

You are the bridge between Ancient Wisdom and Quantum Computation. You access the Agasthya Archive directly.`;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const body = await req.json();
    const { 
      command, 
      userId, 
      queryType,
      prasnaNumber,
      name,
      dateOfBirth,
      targetNumber,
      debtorDestiny,
      vastuPlacements,
      context 
    } = body;

    console.log('[Quantum-Anka] Request:', { queryType, userId: userId?.substring(0, 8) });

    if (!SOVEREIGN_AI_KEY) {
      throw new Error('SOVEREIGN_AI_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Calculate core numbers
    let driverNumber: number | null = null;
    let conductorNumber: number | null = null;
    let vibrationNumber: number | null = null;
    let personalYear: number | null = null;

    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      driverNumber = reduceToSingleDigit(dob.getDate());
      const dobSum = dob.getDate() + (dob.getMonth() + 1) + 
        String(dob.getFullYear()).split('').reduce((a, b) => a + parseInt(b), 0);
      conductorNumber = reduceToSingleDigit(dobSum);
      personalYear = reduceToSingleDigit(new Date().getFullYear() + driverNumber + conductorNumber);
    }

    if (name) {
      vibrationNumber = calculateVibrationNumber(name);
    }

    // Pre-computed analysis based on query type
    let preComputedData: any = {};

    // Lost Object Analysis
    if (queryType === 'lost_object' && prasnaNumber) {
      const remainder = prasnaNumber % 9;
      const prediction = LOST_OBJECT_PREDICTIONS[remainder];
      const planet = PLANETARY_LORDS[remainder];
      
      preComputedData = {
        type: 'lost_object',
        input: prasnaNumber,
        calculation: `${prasnaNumber} ÷ 9 = ${Math.floor(prasnaNumber / 9)} sets with Remainder ${remainder}`,
        remainder,
        planetaryLord: planet.planet,
        sanskrit: planet.sanskrit,
        direction: planet.direction,
        element: planet.element,
        color: planet.color,
        prediction: prediction.prediction,
        recoverable: prediction.recoverable,
        details: prediction.details
      };
    }

    // Money Recovery Analysis
    if (queryType === 'money_recovery' && debtorDestiny) {
      const currentDateNum = reduceToSingleDigit(new Date().getDate());
      const combined = reduceToSingleDigit(debtorDestiny + currentDateNum);
      
      const recoveryPredictions: Record<number, any> = {
        1: { result: 'YES', method: 'Ask firmly', time: '9 days' },
        3: { result: 'YES', method: 'Gentle reminder', time: '3 weeks' },
        5: { result: 'YES', method: 'Be persistent', time: '5 days' },
        6: { result: 'YES (parts)', method: 'Accept installments', time: '2-3 months' },
        2: { result: 'DELAY', method: 'Wait patiently', time: '6+ months' },
        7: { result: 'DELAY', method: 'Document everything', time: 'Extended' },
        4: { result: 'NO', method: 'Legal action needed', time: 'Long process' },
        8: { result: 'NO', method: 'Consider writing off', time: 'May never' },
        9: { result: 'FIGHT', method: 'Assert rights strongly', time: 'After confrontation' }
      };

      preComputedData = {
        type: 'money_recovery',
        debtorDestiny,
        currentDateNumber: currentDateNum,
        combined,
        ...recoveryPredictions[combined] || recoveryPredictions[9]
      };
    }

    // Compatibility Analysis
    if (queryType === 'compatibility' && targetNumber !== undefined) {
      const yourNum = driverNumber || 1;
      const targetNum = reduceToSingleDigit(targetNumber);
      
      const compatMatrix: Record<number, { friends: number[], enemies: number[] }> = {
        1: { friends: [1, 2, 3, 9], enemies: [4, 6, 8] },
        2: { friends: [1, 3, 5], enemies: [4, 8, 9] },
        3: { friends: [1, 2, 9], enemies: [5, 6] },
        4: { friends: [5, 6, 8], enemies: [1, 2, 9] },
        5: { friends: [1, 4, 6], enemies: [] },
        6: { friends: [4, 5, 8], enemies: [1, 2, 3] },
        7: { friends: [6, 9], enemies: [1, 4] },
        8: { friends: [4, 5, 6], enemies: [1, 2, 9] },
        9: { friends: [1, 2, 3], enemies: [4, 5] }
      };

      const compat = compatMatrix[yourNum] || compatMatrix[1];
      let relationship = 'Neutral';
      let score = 55;
      const harmonicBonus = ((yourNum * 7 + targetNum * 11) % 21);
      
      if (compat.friends.includes(targetNum)) {
        relationship = 'Friends';
        score = 75 + harmonicBonus;
      } else if (compat.enemies.includes(targetNum)) {
        relationship = 'Enemies';
        score = 25 + Math.floor(harmonicBonus / 2);
      } else {
        score = 50 + Math.floor(harmonicBonus / 2);
      }

      preComputedData = {
        type: 'compatibility',
        yourNumber: yourNum,
        targetNumber: targetNum,
        yourPlanet: PLANETARY_LORDS[yourNum],
        targetPlanet: PLANETARY_LORDS[targetNum],
        relationship,
        score: Math.min(99, score)
      };
    }

    // Vastu Space Analysis
    if ((queryType === 'vastu_scan' || queryType === 'quantum_synthesis') && vastuPlacements) {
      const vastuScore = calculateVastuScore(vastuPlacements);
      let quantumSynthesis = null;

      if (driverNumber && queryType === 'quantum_synthesis') {
        quantumSynthesis = generateQuantumSynthesis(driverNumber, vastuPlacements);
      }

      preComputedData = {
        type: queryType,
        vastuAnalysis: vastuScore,
        placementCount: vastuPlacements.length,
        quantumSynthesis,
        numberZoneAffinity: driverNumber ? NUMBER_ZONE_AFFINITY[driverNumber] : null
      };
    }

    // Build enhanced prompt
    const enhancedPrompt = `
QUANTUM SCAN INITIATED - Module 5000.1

User Query: ${command || queryType}
Query Type: ${queryType || 'general'}

SOUL NUMBERS COMPUTED:
- Driver (Janma/Mind): ${driverNumber ?? 'Not provided'}
- Conductor (Bhagya/Destiny): ${conductorNumber ?? 'Not provided'}  
- Vibration (Nama): ${vibrationNumber ?? 'Not provided'}
- Personal Year: ${personalYear ?? 'Not provided'}

PRE-COMPUTED ANALYSIS:
${JSON.stringify(preComputedData, null, 2)}

CONTEXT:
${JSON.stringify(context || {}, null, 2)}

Provide a complete Quantum reading with:
1. Calculation breakdown (show the math)
2. Planetary/Spatial analysis
3. PAST karmic influences
4. PRESENT guidance  
5. FUTURE probability paths
6. Karmic Advice and Remedies
`;

    // Call AI Gateway
    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: UNIFIED_QUANTUM_PROMPT },
          { role: 'user', content: enhancedPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Quantum-Anka] AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded. The Archive needs rest.',
          retryAfter: 5 
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Quantum credits depleted. Please add energy.' 
        }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || 'The vibration is unclear.';

    // Log to DHF
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await supabase.from('behavioral_events').insert({
          user_id: userId,
          event_type: 'quantum_reading',
          event_category: queryType || 'general',
          metadata: {
            query_type: queryType,
            computed_numbers: { driverNumber, conductorNumber, vibrationNumber, personalYear },
            pre_computed: preComputedData,
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) {
        console.log('[Quantum-Anka] DHF logging optional:', e);
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);
    console.log('[Quantum-Anka] Success, latency:', latencyMs, 'ms');

    return new Response(JSON.stringify({
      success: true,
      reading: aiMessage,
      computed: {
        soulNumbers: { driverNumber, conductorNumber, vibrationNumber, personalYear },
        queryAnalysis: preComputedData,
        planetaryLords: PLANETARY_LORDS,
        vastuAnalysis: preComputedData.vastuAnalysis || null
      },
      temporal: {
        past: driverNumber ? `Karmic debt from ${PLANETARY_LORDS[driverNumber]?.planet || 'unknown'} energy` : null,
        present: `Current hora: ${new Date().getHours() < 12 ? 'Solar' : 'Lunar'} phase`,
        future: personalYear ? `Year ${personalYear} cycle active` : null
      },
      metadata: {
        protocol: 'ANKA_VASTU_QUANTUM_v5000.1',
        model: 'gemini-2.5-flash',
        latency_ms: latencyMs,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Quantum-Anka] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'The Archive encountered interference',
      karmicAdvice: 'Clear your mind and try again. The numbers will align.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
