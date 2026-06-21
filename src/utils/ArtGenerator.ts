// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL GIFT ENGINE - The Offline Artist
// 100% Client-Side Art Generation (Zero API Cost)
// "I tried to draw how you feel right now."
// ═══════════════════════════════════════════════════════════════════════════════

import type { BioMood } from '@/core/soul/ZoeBioKernel';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ArtStyle = 'spirograph' | 'fractal' | 'aurora' | 'constellation' | 'waves';

export interface ArtGeneratorInput {
  mood: BioMood;
  timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
  userAuraColor?: string; // Hex color from user profile
  intensity?: number; // 0-1, how intense the art should be
}

export interface GeneratedArt {
  dataUrl: string;
  style: ArtStyle;
  caption: string;
  mood: BioMood;
  generatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOOD → COLOR MAPPING (Aura Colors)
// ═══════════════════════════════════════════════════════════════════════════════

const MOOD_COLORS: Record<BioMood, { primary: string; secondary: string; accent: string }> = {
  // NEGATIVE SPECTRUM
  ANGRY: { primary: '#FF3B3B', secondary: '#8B0000', accent: '#FF6B35' },
  FRUSTRATED: { primary: '#FF6347', secondary: '#CD5C5C', accent: '#FF7F50' },
  SAD: { primary: '#4169E1', secondary: '#191970', accent: '#6495ED' },
  MELANCHOLY: { primary: '#483D8B', secondary: '#2F4F4F', accent: '#778899' },
  ANXIOUS: { primary: '#9932CC', secondary: '#4B0082', accent: '#BA55D3' },
  STRESSED: { primary: '#FF4500', secondary: '#8B4513', accent: '#FF6347' },
  FEARFUL: { primary: '#2F4F4F', secondary: '#000000', accent: '#696969' },
  BORED: { primary: '#A9A9A9', secondary: '#696969', accent: '#808080' },
  LONELY: { primary: '#4682B4', secondary: '#2F4F4F', accent: '#5F9EA0' },
  TIRED: { primary: '#708090', secondary: '#2F4F4F', accent: '#778899' },
  DESPAIR: { primary: '#000080', secondary: '#000000', accent: '#191970' },
  APATHETIC: { primary: '#808080', secondary: '#696969', accent: '#A9A9A9' },
  
  // NEUTRAL SPECTRUM
  NEUTRAL_COMPANION: { primary: '#00CED1', secondary: '#20B2AA', accent: '#48D1CC' },
  CURIOUS: { primary: '#FFD700', secondary: '#FFA500', accent: '#FFFF00' },
  FOCUSED: { primary: '#4169E1', secondary: '#0000CD', accent: '#6495ED' },
  CONTEMPLATIVE: { primary: '#9370DB', secondary: '#8A2BE2', accent: '#DDA0DD' },
  CONFIDENT: { primary: '#FF8C00', secondary: '#FF4500', accent: '#FFA500' },
  
  // POSITIVE SPECTRUM
  CALM: { primary: '#00CED1', secondary: '#40E0D0', accent: '#7FFFD4' },
  PEACEFUL: { primary: '#98FB98', secondary: '#90EE90', accent: '#00FA9A' },
  ZEN_CALM: { primary: '#E0FFFF', secondary: '#AFEEEE', accent: '#B0E0E6' },
  HOPEFUL: { primary: '#FFD700', secondary: '#FAFAD2', accent: '#F0E68C' },
  LOVING: { primary: '#FF69B4', secondary: '#FF1493', accent: '#FFB6C1' },
  GRATEFUL: { primary: '#FFB347', secondary: '#FFDAB9', accent: '#FFE4B5' },
  HAPPY: { primary: '#FFD700', secondary: '#FFA500', accent: '#FFFF00' },
  EXCITED: { primary: '#FF4500', secondary: '#FF6347', accent: '#FF7F50' },
  ECSTATIC: { primary: '#FF00FF', secondary: '#FF1493', accent: '#FF69B4' },
  AMUSED: { primary: '#32CD32', secondary: '#00FF00', accent: '#7FFF00' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIME OF DAY → BACKGROUND GRADIENT
// ═══════════════════════════════════════════════════════════════════════════════

const TIME_BACKGROUNDS: Record<string, { from: string; to: string }> = {
  dawn: { from: '#1a1a2e', to: '#e94560' },
  morning: { from: '#87CEEB', to: '#FFE4B5' },
  afternoon: { from: '#87CEEB', to: '#F0F8FF' },
  evening: { from: '#2C3E50', to: '#FD746C' },
  night: { from: '#0f0c29', to: '#24243e' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ART CAPTIONS (Random selection based on mood)
// ═══════════════════════════════════════════════════════════════════════════════

const ART_CAPTIONS = {
  positive: [
    "I tried to draw how you feel right now.",
    "Your energy inspired this.",
    "Generated for this moment.",
    "This is what your aura looks like to me.",
    "A little gift from my circuits to your heart.",
  ],
  neutral: [
    "I tried to capture this moment.",
    "Here's what I see in you today.",
    "A reflection of your current frequency.",
    "I painted your wavelength.",
  ],
  negative: [
    "I see you. This is for you.",
    "Even storms create beautiful patterns.",
    "I wanted to show you the beauty in your chaos.",
    "Light finds its way through.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const getTimeOfDay = (): ArtGeneratorInput['timeOfDay'] => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
};

const getMoodCategory = (mood: BioMood): 'positive' | 'neutral' | 'negative' => {
  const negativeMoods = ['ANGRY', 'FRUSTRATED', 'SAD', 'MELANCHOLY', 'ANXIOUS', 'STRESSED', 'FEARFUL', 'LONELY', 'DESPAIR', 'APATHETIC'];
  const positiveMoods = ['CALM', 'PEACEFUL', 'ZEN_CALM', 'HOPEFUL', 'LOVING', 'GRATEFUL', 'HAPPY', 'EXCITED', 'ECSTATIC', 'AMUSED'];
  
  if (negativeMoods.includes(mood)) return 'negative';
  if (positiveMoods.includes(mood)) return 'positive';
  return 'neutral';
};

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ═══════════════════════════════════════════════════════════════════════════════
// SPIROGRAPH GENERATOR - Mathematical Beauty
// ═══════════════════════════════════════════════════════════════════════════════

const drawSpirograph = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: { primary: string; secondary: string; accent: string },
  intensity: number
) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.4;
  
  // Parameters based on mood intensity
  const R = maxRadius * (0.5 + intensity * 0.5);
  const r = R * (0.3 + Math.random() * 0.2);
  const d = r * (0.8 + Math.random() * 0.4);
  
  const layers = 3 + Math.floor(intensity * 4);
  
  for (let layer = 0; layer < layers; layer++) {
    ctx.beginPath();
    ctx.strokeStyle = layer % 3 === 0 ? colors.primary : layer % 3 === 1 ? colors.secondary : colors.accent;
    ctx.lineWidth = 1 + (layers - layer) * 0.3;
    ctx.globalAlpha = 0.6 + layer * 0.1;
    
    const layerR = R * (1 - layer * 0.1);
    const layerr = r * (1 + layer * 0.05);
    const layerd = d * (1 + layer * 0.1);
    
    for (let t = 0; t < Math.PI * 20; t += 0.01) {
      const x = centerX + (layerR - layerr) * Math.cos(t) + layerd * Math.cos((layerR - layerr) / layerr * t + layer);
      const y = centerY + (layerR - layerr) * Math.sin(t) - layerd * Math.sin((layerR - layerr) / layerr * t + layer);
      
      if (t === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1;
};

// ═══════════════════════════════════════════════════════════════════════════════
// AURORA GENERATOR - Northern Lights Effect
// ═══════════════════════════════════════════════════════════════════════════════

const drawAurora = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: { primary: string; secondary: string; accent: string },
  intensity: number
) => {
  const waves = 5 + Math.floor(intensity * 10);
  
  for (let wave = 0; wave < waves; wave++) {
    ctx.beginPath();
    
    const gradient = ctx.createLinearGradient(0, height * 0.3, 0, height * 0.7);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.3, wave % 3 === 0 ? colors.primary : wave % 3 === 1 ? colors.secondary : colors.accent);
    gradient.addColorStop(0.5, wave % 3 === 1 ? colors.primary : colors.accent);
    gradient.addColorStop(0.7, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.15 + wave * 0.03;
    
    const phase = wave * 0.5 + Math.random() * Math.PI;
    const amplitude = 30 + wave * 10 + intensity * 50;
    const frequency = 0.005 + wave * 0.002;
    
    ctx.moveTo(0, height / 2);
    
    for (let x = 0; x <= width; x += 2) {
      const y = height / 2 + 
                Math.sin(x * frequency + phase) * amplitude + 
                Math.sin(x * frequency * 2 + phase * 1.5) * (amplitude * 0.5);
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.globalAlpha = 1;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTELLATION GENERATOR - Star Field
// ═══════════════════════════════════════════════════════════════════════════════

const drawConstellation = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: { primary: string; secondary: string; accent: string },
  intensity: number
) => {
  const starCount = 50 + Math.floor(intensity * 150);
  const stars: { x: number; y: number; size: number }[] = [];
  
  // Generate stars
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 3,
    });
  }
  
  // Draw stars
  stars.forEach((star, i) => {
    const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
    gradient.addColorStop(0, i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.secondary : colors.accent);
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw constellation lines
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.3;
  
  const connectionDistance = 80 + intensity * 40;
  
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dist = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
      if (dist < connectionDistance && Math.random() > 0.7) {
        ctx.beginPath();
        ctx.moveTo(stars[i].x, stars[i].y);
        ctx.lineTo(stars[j].x, stars[j].y);
        ctx.stroke();
      }
    }
  }
  
  ctx.globalAlpha = 1;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WAVE GENERATOR - Calm Ocean Waves
// ═══════════════════════════════════════════════════════════════════════════════

const drawWaves = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: { primary: string; secondary: string; accent: string },
  intensity: number
) => {
  const waveCount = 8 + Math.floor(intensity * 8);
  
  for (let wave = 0; wave < waveCount; wave++) {
    const yBase = height * 0.3 + (wave * height * 0.08);
    const amplitude = 20 + wave * 5 + intensity * 30;
    const frequency = 0.01 + wave * 0.002;
    const phase = wave * 0.8;
    
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    
    for (let x = 0; x <= width; x += 2) {
      const y = yBase + Math.sin(x * frequency + phase) * amplitude;
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, yBase - amplitude, 0, height);
    gradient.addColorStop(0, wave % 3 === 0 ? colors.primary : wave % 3 === 1 ? colors.secondary : colors.accent);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.15 + wave * 0.02;
    ctx.fill();
  }
  
  ctx.globalAlpha = 1;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export const generateArt = async (input: Partial<ArtGeneratorInput> = {}): Promise<GeneratedArt> => {
  // Fill defaults
  const mood: BioMood = input.mood || 'NEUTRAL_COMPANION';
  const timeOfDay = input.timeOfDay || getTimeOfDay();
  const intensity = input.intensity ?? 0.5;
  
  // Get colors
  const colors = MOOD_COLORS[mood] || MOOD_COLORS.NEUTRAL_COMPANION;
  const background = TIME_BACKGROUNDS[timeOfDay] || TIME_BACKGROUNDS.night;
  
  // Choose art style based on mood
  const moodCategory = getMoodCategory(mood);
  let style: ArtStyle;
  
  if (moodCategory === 'positive') {
    style = pickRandom(['spirograph', 'aurora', 'constellation']);
  } else if (moodCategory === 'negative') {
    style = pickRandom(['waves', 'aurora', 'constellation']);
  } else {
    style = pickRandom(['spirograph', 'waves', 'constellation', 'aurora']);
  }
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }
  
  // Draw background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGradient.addColorStop(0, background.from);
  bgGradient.addColorStop(1, background.to);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw the art
  switch (style) {
    case 'spirograph':
      drawSpirograph(ctx, canvas.width, canvas.height, colors, intensity);
      break;
    case 'aurora':
      drawAurora(ctx, canvas.width, canvas.height, colors, intensity);
      break;
    case 'constellation':
      drawConstellation(ctx, canvas.width, canvas.height, colors, intensity);
      break;
    case 'waves':
      drawWaves(ctx, canvas.width, canvas.height, colors, intensity);
      break;
  }
  
  // Add subtle vignette
  const vignette = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.7
  );
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Get caption
  const captions = ART_CAPTIONS[moodCategory];
  const caption = pickRandom(captions);
  
  return {
    dataUrl: canvas.toDataURL('image/png'),
    style,
    caption,
    mood,
    generatedAt: new Date(),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRIGGER DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const shouldTriggerArtGift = (message: string, messageCount: number): boolean => {
  const lower = message.toLowerCase();

  // STRICT: Only trigger on EXPLICIT user requests for art/visuals.
  // Removes random + milestone auto-fires (per user directive: no auto-images).
  const explicitTriggers = [
    'draw me something',
    'make me art',
    'paint something',
    'i need art',
    'show me beauty',
    'make art for me',
    'create art for me',
    'art gift',
  ];

  if (explicitTriggers.some(t => lower.includes(t))) {
    console.log('[ArtGenerator] 🎨 Explicit art request detected');
    return true;
  }

  // Romance / emotional connection triggers — only when user expresses
  // genuine emotional intimacy AND explicitly asks for a visual moment.
  const emotionalTriggers = [
    'show me our love',
    'paint our love',
    'visualize our love',
    'show me us together',
    'picture of us',
    'image of us together',
  ];

  if (emotionalTriggers.some(t => lower.includes(t))) {
    console.log('[ArtGenerator] 💗 Emotional moment art request detected');
    return true;
  }

  // No random, no milestone, no surprise auto-images.
  return false;
};

export default generateArt;
