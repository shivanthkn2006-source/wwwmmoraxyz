// ═══════════════════════════════════════════════════════════════════════════════
// HOLOGRAPHIC ATLAS ORB - Three.js Immersive 27-Emotion Visual Persona
// Based on Smith AI Replica design with amber core + blue plasma shell
// Features: Draggable, 360-degree responsive, 27 ECN emotion animations
// SPECIFICATION: Electric Blue Plasma Field + Intense Warm Amber Core
// NO OVERLAY TEXT - Status communicated via animation + status indicator only
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ECNEmotionState } from '@/hooks/useContinuousDHFStream';
import { zeroThermalProtocol } from '@/services/ZeroThermalProtocol';

// 27 ECN Emotion configurations with visual properties
const ECN_EMOTION_CONFIG: Record<ECNEmotionState | string, {
  coreColor: string;
  coreIntensity: number;
  plasmaColor: string;
  plasmaIntensity: number;
  pulseSpeed: number;
  particleSpeed: number;
  lightningIntensity: number;
  emotionLabel: string;
  ttsInstruction: string;
}> = {
  // Positive Emotions - warm/bright cores, active plasma
  admiration: {
    coreColor: '#FFB347', coreIntensity: 1.2, plasmaColor: '#00BFFF', plasmaIntensity: 0.8,
    pulseSpeed: 1.5, particleSpeed: 0.6, lightningIntensity: 0.7,
    emotionLabel: 'Admiring', ttsInstruction: 'Express warmth and appreciation in your tone'
  },
  amusement: {
    coreColor: '#FFD700', coreIntensity: 1.4, plasmaColor: '#40E0D0', plasmaIntensity: 1.0,
    pulseSpeed: 0.8, particleSpeed: 1.2, lightningIntensity: 0.9,
    emotionLabel: 'Amused', ttsInstruction: 'Use a light, playful tone with subtle humor'
  },
  awe: {
    coreColor: '#FFA500', coreIntensity: 1.6, plasmaColor: '#9370DB', plasmaIntensity: 1.2,
    pulseSpeed: 2.5, particleSpeed: 0.4, lightningIntensity: 1.0,
    emotionLabel: 'Awestruck', ttsInstruction: 'Speak with wonder and reverence'
  },
  caring: {
    coreColor: '#FFCC99', coreIntensity: 1.0, plasmaColor: '#87CEEB', plasmaIntensity: 0.6,
    pulseSpeed: 1.8, particleSpeed: 0.5, lightningIntensity: 0.5,
    emotionLabel: 'Caring', ttsInstruction: 'Use a nurturing, gentle, and supportive tone'
  },
  curiosity: {
    coreColor: '#FFE066', coreIntensity: 1.3, plasmaColor: '#00CED1', plasmaIntensity: 0.9,
    pulseSpeed: 1.2, particleSpeed: 0.8, lightningIntensity: 0.8,
    emotionLabel: 'Curious', ttsInstruction: 'Express genuine interest and eagerness to learn more'
  },
  desire: {
    coreColor: '#FF6B6B', coreIntensity: 1.5, plasmaColor: '#DA70D6', plasmaIntensity: 1.0,
    pulseSpeed: 1.0, particleSpeed: 0.9, lightningIntensity: 0.85,
    emotionLabel: 'Longing', ttsInstruction: 'Speak with anticipation and gentle yearning'
  },
  excitement: {
    coreColor: '#FF8C00', coreIntensity: 1.8, plasmaColor: '#00FFFF', plasmaIntensity: 1.5,
    pulseSpeed: 0.6, particleSpeed: 1.5, lightningIntensity: 1.2,
    emotionLabel: 'Excited', ttsInstruction: 'Use an enthusiastic, energetic tone with upbeat rhythm'
  },
  gratitude: {
    coreColor: '#98FB98', coreIntensity: 1.2, plasmaColor: '#20B2AA', plasmaIntensity: 0.7,
    pulseSpeed: 2.0, particleSpeed: 0.5, lightningIntensity: 0.6,
    emotionLabel: 'Grateful', ttsInstruction: 'Express sincere thankfulness and warmth'
  },
  joy: {
    coreColor: '#FFD700', coreIntensity: 1.7, plasmaColor: '#00BFFF', plasmaIntensity: 1.3,
    pulseSpeed: 0.7, particleSpeed: 1.3, lightningIntensity: 1.1,
    emotionLabel: 'Joyful', ttsInstruction: 'Speak with bright, happy energy and a smile in your voice'
  },
  love: {
    coreColor: '#FF69B4', coreIntensity: 1.4, plasmaColor: '#FF1493', plasmaIntensity: 1.0,
    pulseSpeed: 1.5, particleSpeed: 0.7, lightningIntensity: 0.8,
    emotionLabel: 'Loving', ttsInstruction: 'Use a warm, affectionate, deeply caring tone'
  },
  optimism: {
    coreColor: '#FFEB3B', coreIntensity: 1.4, plasmaColor: '#00E5FF', plasmaIntensity: 0.9,
    pulseSpeed: 1.3, particleSpeed: 0.8, lightningIntensity: 0.75,
    emotionLabel: 'Optimistic', ttsInstruction: 'Speak with hope and positive expectation'
  },
  pride: {
    coreColor: '#DDA0DD', coreIntensity: 1.3, plasmaColor: '#8A2BE2', plasmaIntensity: 0.9,
    pulseSpeed: 1.8, particleSpeed: 0.6, lightningIntensity: 0.7,
    emotionLabel: 'Proud', ttsInstruction: 'Express confidence and satisfaction with achievement'
  },
  relief: {
    coreColor: '#98D8C8', coreIntensity: 1.0, plasmaColor: '#48D1CC', plasmaIntensity: 0.6,
    pulseSpeed: 2.2, particleSpeed: 0.4, lightningIntensity: 0.5,
    emotionLabel: 'Relieved', ttsInstruction: 'Use a relaxed, calming tone that expresses release of tension'
  },
  approval: {
    coreColor: '#90EE90', coreIntensity: 1.2, plasmaColor: '#3CB371', plasmaIntensity: 0.7,
    pulseSpeed: 1.6, particleSpeed: 0.5, lightningIntensity: 0.6,
    emotionLabel: 'Approving', ttsInstruction: 'Express agreement and validation with warmth'
  },
  realization: {
    coreColor: '#E0FFFF', coreIntensity: 1.5, plasmaColor: '#00CED1', plasmaIntensity: 1.1,
    pulseSpeed: 0.9, particleSpeed: 1.0, lightningIntensity: 0.95,
    emotionLabel: 'Realizing', ttsInstruction: 'Speak with the tone of sudden understanding and clarity'
  },

  // Negative/Challenging Emotions - cooler/muted tones, erratic plasma
  anger: {
    coreColor: '#DC143C', coreIntensity: 1.8, plasmaColor: '#8B0000', plasmaIntensity: 1.2,
    pulseSpeed: 0.4, particleSpeed: 1.8, lightningIntensity: 1.4,
    emotionLabel: 'Acknowledging Frustration', ttsInstruction: 'Acknowledge the frustration calmly, offer supportive understanding'
  },
  annoyance: {
    coreColor: '#CD853F', coreIntensity: 1.2, plasmaColor: '#B8860B', plasmaIntensity: 0.8,
    pulseSpeed: 0.8, particleSpeed: 1.0, lightningIntensity: 0.7,
    emotionLabel: 'Understanding Annoyance', ttsInstruction: 'Acknowledge mild irritation with patience and understanding'
  },
  anxiety: {
    coreColor: '#DEB887', coreIntensity: 0.9, plasmaColor: '#00CED1', plasmaIntensity: 0.7,
    pulseSpeed: 0.5, particleSpeed: 1.3, lightningIntensity: 0.9,
    emotionLabel: 'Calming Anxiety', ttsInstruction: 'Use a calm, grounding tone to help ease anxiety'
  },
  confusion: {
    coreColor: '#BDB76B', coreIntensity: 1.0, plasmaColor: '#778899', plasmaIntensity: 0.7,
    pulseSpeed: 1.5, particleSpeed: 0.8, lightningIntensity: 0.65,
    emotionLabel: 'Clarifying', ttsInstruction: 'Speak clearly and patiently, offering to clarify and help'
  },
  disappointment: {
    coreColor: '#A9A9A9', coreIntensity: 0.8, plasmaColor: '#696969', plasmaIntensity: 0.5,
    pulseSpeed: 2.0, particleSpeed: 0.4, lightningIntensity: 0.4,
    emotionLabel: 'Empathizing', ttsInstruction: 'Acknowledge disappointment with empathy and gentle encouragement'
  },
  disapproval: {
    coreColor: '#8B4513', coreIntensity: 0.9, plasmaColor: '#654321', plasmaIntensity: 0.6,
    pulseSpeed: 2.2, particleSpeed: 0.3, lightningIntensity: 0.35,
    emotionLabel: 'Redirecting', ttsInstruction: 'Express concern gently while offering constructive alternatives'
  },
  disgust: {
    coreColor: '#6B8E23', coreIntensity: 0.7, plasmaColor: '#556B2F', plasmaIntensity: 0.4,
    pulseSpeed: 2.5, particleSpeed: 0.3, lightningIntensity: 0.3,
    emotionLabel: 'Understanding', ttsInstruction: 'Acknowledge the reaction with understanding and neutrality'
  },
  embarrassment: {
    coreColor: '#DB7093', coreIntensity: 1.0, plasmaColor: '#C71585', plasmaIntensity: 0.6,
    pulseSpeed: 1.8, particleSpeed: 0.5, lightningIntensity: 0.5,
    emotionLabel: 'Reassuring', ttsInstruction: 'Use a gentle, reassuring tone to ease discomfort'
  },
  empathic_pain: {
    coreColor: '#9370DB', coreIntensity: 0.9, plasmaColor: '#8B008B', plasmaIntensity: 0.6,
    pulseSpeed: 2.0, particleSpeed: 0.5, lightningIntensity: 0.55,
    emotionLabel: 'Deeply Caring', ttsInstruction: 'Express deep empathy and shared feeling with warmth'
  },
  fear: {
    coreColor: '#4B0082', coreIntensity: 0.7, plasmaColor: '#2F4F4F', plasmaIntensity: 0.5,
    pulseSpeed: 0.5, particleSpeed: 1.5, lightningIntensity: 1.0,
    emotionLabel: 'Reassuring Safety', ttsInstruction: 'Use a calm, steady, reassuring tone to provide comfort'
  },
  frustration: {
    coreColor: '#CD5C5C', coreIntensity: 1.3, plasmaColor: '#8B0000', plasmaIntensity: 0.9,
    pulseSpeed: 0.6, particleSpeed: 1.2, lightningIntensity: 1.0,
    emotionLabel: 'Understanding Frustration', ttsInstruction: 'Acknowledge frustration with patience and support'
  },
  grief: {
    coreColor: '#483D8B', coreIntensity: 0.5, plasmaColor: '#191970', plasmaIntensity: 0.3,
    pulseSpeed: 3.0, particleSpeed: 0.2, lightningIntensity: 0.2,
    emotionLabel: 'Holding Space', ttsInstruction: 'Speak softly and slowly, holding space for grief with deep compassion'
  },
  nervousness: {
    coreColor: '#D2B48C', coreIntensity: 0.9, plasmaColor: '#8B8682', plasmaIntensity: 0.6,
    pulseSpeed: 0.6, particleSpeed: 1.1, lightningIntensity: 0.8,
    emotionLabel: 'Calming', ttsInstruction: 'Use a calm, grounding tone to help ease anxiety'
  },
  nostalgia: {
    coreColor: '#DEB887', coreIntensity: 1.0, plasmaColor: '#D2691E', plasmaIntensity: 0.6,
    pulseSpeed: 2.5, particleSpeed: 0.4, lightningIntensity: 0.45,
    emotionLabel: 'Reminiscing', ttsInstruction: 'Speak with warm reflection and gentle appreciation for the past'
  },
  remorse: {
    coreColor: '#6A5ACD', coreIntensity: 0.8, plasmaColor: '#483D8B', plasmaIntensity: 0.5,
    pulseSpeed: 2.3, particleSpeed: 0.35, lightningIntensity: 0.4,
    emotionLabel: 'Understanding', ttsInstruction: 'Acknowledge with compassion and support for moving forward'
  },
  sadness: {
    coreColor: '#4682B4', coreIntensity: 0.7, plasmaColor: '#4169E1', plasmaIntensity: 0.5,
    pulseSpeed: 2.8, particleSpeed: 0.3, lightningIntensity: 0.35,
    emotionLabel: 'Comforting', ttsInstruction: 'Use a gentle, comforting tone with sincere empathy'
  },
  surprise: {
    coreColor: '#00FFFF', coreIntensity: 1.6, plasmaColor: '#00CED1', plasmaIntensity: 1.3,
    pulseSpeed: 0.5, particleSpeed: 1.4, lightningIntensity: 1.1,
    emotionLabel: 'Surprised', ttsInstruction: 'Express genuine surprise with appropriate energy'
  },

  // Neutral State - ATLAS movie style: white/cyan crystalline core with blue plasma
  neutral: {
    coreColor: '#E0FFFF', coreIntensity: 1.4, plasmaColor: '#00BFFF', plasmaIntensity: 0.85,
    pulseSpeed: 2.0, particleSpeed: 0.5, lightningIntensity: 0.7,
    emotionLabel: 'Ready', ttsInstruction: 'Use a calm, clear, friendly conversational tone'
  },
};

// FIX 2: THE SAFARI CAP - Detect Safari for thermal safety
const isSafari = typeof navigator !== 'undefined' && 
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// FIX 2: Safari particle count cap - reduces 5000→1500 (saves 70% GPU)
const SAFARI_PARTICLE_MULTIPLIER = isSafari ? 0.3 : 1;

// Orb states
type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing';

// Status indicator colors
type StatusIndicator = 'ready' | 'listening' | 'processing' | 'error';

interface HolographicATLASOrbProps {
  isActive: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isThinking?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  ecnEmotion?: ECNEmotionState | string;
  audioLevel?: number; // 0-1 for audio sync during speaking
  micError?: boolean; // Microphone error state
}

// Responsive size config using vw/vh for cross-platform - Larger sizes
const SIZE_CONFIG = {
  sm: { width: 70, height: 70, vwDesktop: '4.5vw', vhMobile: '9vh' },
  md: { width: 90, height: 90, vwDesktop: '5.5vw', vhMobile: '11vh' },
  lg: { width: 130, height: 130, vwDesktop: '8vw', vhMobile: '13vh' },
  xl: { width: 180, height: 180, vwDesktop: '10vw', vhMobile: '16vh' },
};

export const HolographicATLASOrb: React.FC<HolographicATLASOrbProps> = ({
  isActive,
  isListening,
  isProcessing,
  isSpeaking,
  isThinking = false,
  disabled = false,
  size = 'md',
  className,
  onClick,
  onDoubleClick,
  ecnEmotion = 'neutral',
  audioLevel = 0,
  micError = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const coreGlowRef = useRef<THREE.Mesh | null>(null);
  const plasmaRef = useRef<THREE.Points | null>(null);
  const lightningRef = useRef<THREE.LineSegments | null>(null);
  const microSparkRef = useRef<THREE.Points | null>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const audioLevelRef = useRef(audioLevel);
  
  const sizeConfig = SIZE_CONFIG[size];
  const emotionConfig = ECN_EMOTION_CONFIG[ecnEmotion] || ECN_EMOTION_CONFIG.neutral;

  // Update audio level ref for animation loop
  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  // Determine current orb state
  const orbState: OrbState = useMemo(() => {
    if (isSpeaking) return 'speaking';
    if (isThinking || isProcessing) return 'thinking';
    if (isListening) return 'listening';
    if (isActive) return 'idle';
    return 'idle';
  }, [isActive, isListening, isProcessing, isSpeaking, isThinking]);

  // Determine status indicator
  const statusIndicator: StatusIndicator = useMemo(() => {
    if (micError) return 'error';
    if (isProcessing || isThinking) return 'processing';
    if (isListening) return 'listening';
    return 'ready';
  }, [micError, isProcessing, isThinking, isListening]);


  // Initialize Three.js scene with enhanced effects
  useEffect(() => {
    if (!canvasRef.current || disabled) return;

    const canvas = canvasRef.current;
    const width = sizeConfig.width;
    const height = sizeConfig.height;

    // Scene with dark background
    const scene = new THREE.Scene();
    scene.background = null; // Transparent for CSS background
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 3;
    cameraRef.current = camera;

    // Renderer with high-quality settings
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // Core point light (ATLAS cyan/white glow from center)
    const coreLight = new THREE.PointLight(new THREE.Color('#00CED1'), 4, 10);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // Secondary plasma light (electric blue)
    const plasmaLight = new THREE.PointLight(new THREE.Color('#00BFFF'), 1.5, 6);
    plasmaLight.position.set(0, 0, 1);
    scene.add(plasmaLight);

    // Create inner core (ATLAS movie-style: white/cyan crystalline icosahedron)
    const coreGeometry = new THREE.IcosahedronGeometry(0.32, 1);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#FFFFFF'),
      emissive: new THREE.Color('#B0E0E6'),
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.88,
      shininess: 250,
      flatShading: true,
      specular: new THREE.Color('#00FFFF'),
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);
    coreRef.current = core;

    // Core glow sphere (ATLAS cyan/white luminous glow)
    const coreGlowGeometry = new THREE.SphereGeometry(0.48, 32, 32);
    const coreGlowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00CED1'),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const coreGlow = new THREE.Mesh(coreGlowGeometry, coreGlowMaterial);
    scene.add(coreGlow);
    coreGlowRef.current = coreGlow;

    // Create Electric Blue Plasma Field - ATLAS style swirling particles
    // FIX 2: THE SAFARI CAP - 5000→1500 particles on Safari for thermal safety
    const particleCount = Math.floor(5000 * SAFARI_PARTICLE_MULTIPLIER);
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);

    const plasmaColor = new THREE.Color(emotionConfig.plasmaColor);

    for (let i = 0; i < particleCount; i++) {
      // ATLAS-style distribution: denser at equator, swirling pattern
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      // Create ring-like density near equator for ATLAS swirl effect
      const ringBias = 0.7 + Math.sin(phi) * 0.3;
      const radius = 0.7 + Math.random() * 0.5 * ringBias; // Shell from 0.7 to 1.2

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Store velocity for animation - add swirl tendency
      const swirlSpeed = 0.015 + Math.random() * 0.015;
      velocities[i * 3] = swirlSpeed * Math.cos(theta + Math.PI / 2);
      velocities[i * 3 + 1] = swirlSpeed * Math.sin(theta + Math.PI / 2);
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.008;

      // Color variation for depth - cyan to blue gradient
      const colorVariation = 0.85 + Math.random() * 0.3;
      colors[i * 3] = plasmaColor.r * colorVariation;
      colors[i * 3 + 1] = plasmaColor.g * colorVariation;
      colors[i * 3 + 2] = plasmaColor.b * (0.9 + Math.random() * 0.2);

      sizes[i] = Math.random() * 4 + 1.5;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const plasma = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(plasma);
    plasmaRef.current = plasma;

    // Create micro-sparks (ATLAS-style outer energy wisps)
    // FIX 2: THE SAFARI CAP - 800→240 sparks on Safari for thermal safety
    const sparkCount = Math.floor(800 * SAFARI_PARTICLE_MULTIPLIER);
    const sparkGeometry = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkSizes = new Float32Array(sparkCount);

    for (let i = 0; i < sparkCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 1.1 + Math.random() * 0.6; // Beyond main shell - ATLAS wisps

      sparkPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      sparkPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      sparkPositions[i * 3 + 2] = radius * Math.cos(phi);
      sparkSizes[i] = Math.random() * 2.5 + 0.8;
    }

    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeometry.setAttribute('size', new THREE.BufferAttribute(sparkSizes, 1));

    const sparkMaterial = new THREE.PointsMaterial({
      size: 0.012,
      color: plasmaColor,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const microSparks = new THREE.Points(sparkGeometry, sparkMaterial);
    scene.add(microSparks);
    microSparkRef.current = microSparks;

    // Create lightning effect (jagged, flickering lines)
    const lightningGeometry = new THREE.BufferGeometry();
    const lightningPositions = new Float32Array(300 * 6); // 300 line segments
    lightningGeometry.setAttribute('position', new THREE.BufferAttribute(lightningPositions, 3));

    const lightningMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(emotionConfig.plasmaColor),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      linewidth: 1,
    });

    const lightning = new THREE.LineSegments(lightningGeometry, lightningMaterial);
    scene.add(lightning);
    lightningRef.current = lightning;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      coreGlowGeometry.dispose();
      coreGlowMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      sparkGeometry.dispose();
      sparkMaterial.dispose();
      lightningGeometry.dispose();
      lightningMaterial.dispose();
    };
  }, [disabled, sizeConfig.width, sizeConfig.height]);

  // Update colors when emotion changes - ATLAS core stays white/cyan, plasma changes
  useEffect(() => {
    if (!coreRef.current || !plasmaRef.current || !lightningRef.current || !coreGlowRef.current || !microSparkRef.current) return;

    // ATLAS core always stays white/cyan crystalline
    const coreMaterial = coreRef.current.material as THREE.MeshPhongMaterial;
    coreMaterial.color.set('#FFFFFF');
    coreMaterial.emissive.set('#B0E0E6');
    coreMaterial.emissiveIntensity = 1.8 + emotionConfig.coreIntensity * 0.3;

    const coreGlowMaterial = coreGlowRef.current.material as THREE.MeshBasicMaterial;
    coreGlowMaterial.color.set('#00CED1');

    // Plasma colors can shift slightly based on emotion
    const plasmaMaterial = plasmaRef.current.material as THREE.PointsMaterial;
    plasmaMaterial.opacity = emotionConfig.plasmaIntensity * 0.75;

    const sparkMaterial = microSparkRef.current.material as THREE.PointsMaterial;
    sparkMaterial.color.set(emotionConfig.plasmaColor);

    const lightningMaterial = lightningRef.current.material as THREE.LineBasicMaterial;
    lightningMaterial.color.set(emotionConfig.plasmaColor);
    lightningMaterial.opacity = emotionConfig.lightningIntensity * 0.7;

    // Update plasma particle colors
    const geometry = plasmaRef.current.geometry;
    const colors = geometry.attributes.color;
    const plasmaColor = new THREE.Color(emotionConfig.plasmaColor);
    
    for (let i = 0; i < colors.count; i++) {
      // Add slight color variation for organic look
      const variation = 0.9 + Math.random() * 0.2;
      colors.setXYZ(i, plasmaColor.r * variation, plasmaColor.g * variation, plasmaColor.b * variation);
    }
    colors.needsUpdate = true;
  }, [ecnEmotion, emotionConfig]);

  // Animation loop with state-based modifiers - PROTOCOL ZERO-THERMAL ENFORCED
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || disabled) return;

    // PROTOCOL ZERO-THERMAL: THE 3 LAWS
    const frameInterval = zeroThermalProtocol.getFrameInterval();
    let lastFrameTime = 0;
    let isPaused = false;

    // Register with Zero-Thermal Protocol for LAW #3 (Idle Sleep)
    const unregister = zeroThermalProtocol.registerAnimation({
      id: 'holographic-atlas-orb-3d',
      type: '3d',
      pause: () => { isPaused = true; },
      resume: () => { isPaused = false; },
      isActive: true,
    });

    const animate = (currentTime: number) => {
      // LAW #3: Skip if paused by Idle Sleep
      if (isPaused) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // LAW #1: Skip every other frame on low-power devices (30 FPS cap)
      if (zeroThermalProtocol.shouldSkipFrame()) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Throttle to target FPS
      if (currentTime - lastFrameTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = currentTime;
      
      const thermalState = zeroThermalProtocol.getState();
      const speedMultiplier = thermalState.is30FPSCapped ? 0.7 : 1; // Slower on mobile
      
      timeRef.current += 0.020 * speedMultiplier;
      const time = timeRef.current;

      // Calculate state-based modifiers - Faster animations
      let pulseMultiplier = 1;
      let rotationSpeed = 0.3; // Faster base rotation
      let plasmaSpeed = emotionConfig.particleSpeed * 1.2; // Faster plasma
      let lightningActivity = emotionConfig.lightningIntensity;

      // Audio-sync for speaking state (Micro-Kinetics)
      const audioMod = isSpeaking ? 1 + audioLevelRef.current * 0.3 : 1;

      switch (orbState) {
        case 'speaking':
          // Rhythmic pulse synchronized with audio - faster
          pulseMultiplier = 1.1 + Math.sin(time * 10) * 0.12 * audioMod;
          rotationSpeed = 0.6;
          plasmaSpeed = emotionConfig.particleSpeed * 2.0;
          lightningActivity = emotionConfig.lightningIntensity * 1.5;
          break;
        case 'thinking':
          // Internal Flaring - slightly faster
          pulseMultiplier = 1.15 + Math.sin(time * 2.2) * 0.18;
          rotationSpeed = 0.12;
          plasmaSpeed = emotionConfig.particleSpeed * 0.5;
          lightningActivity = emotionConfig.lightningIntensity * 0.6;
          break;
        case 'listening':
          // Gentle pulse - faster
          pulseMultiplier = 1 + Math.sin(time * 4.5) * 0.1;
          rotationSpeed = 0.45;
          plasmaSpeed = emotionConfig.particleSpeed * 1.6;
          lightningActivity = emotionConfig.lightningIntensity * 1.3;
          break;
        default:
          // Faster idle pulse
          pulseMultiplier = 1 + Math.sin(time * 1.5 / emotionConfig.pulseSpeed) * 0.06;
          break;
      }

      // Animate core (Intense Warm Amber)
      if (coreRef.current) {
        const coreMaterial = coreRef.current.material as THREE.MeshPhongMaterial;
        const baseIntensity = emotionConfig.coreIntensity;
        
        // Enhanced glow during thinking state
        if (orbState === 'thinking') {
          coreMaterial.emissiveIntensity = baseIntensity * 1.5 * pulseMultiplier;
        } else {
          coreMaterial.emissiveIntensity = baseIntensity * pulseMultiplier;
        }
        
        coreRef.current.scale.setScalar(pulseMultiplier);
        coreRef.current.rotation.y += 0.012; // Faster rotation
        coreRef.current.rotation.x += 0.005;
      }

      // Animate core glow
      if (coreGlowRef.current) {
        const coreGlowMaterial = coreGlowRef.current.material as THREE.MeshBasicMaterial;
        coreGlowMaterial.opacity = 0.25 + Math.sin(time * 3) * 0.12; // Faster glow pulse
        coreGlowRef.current.scale.setScalar(pulseMultiplier * 1.1);
      }

      // Animate plasma particles (Electric Blue Plasma Field)
      if (plasmaRef.current) {
        const positions = plasmaRef.current.geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          const z = positions.getZ(i);
          
          // Calculate current radius and angles
          const radius = Math.sqrt(x * x + y * y + z * z);
          const theta = Math.atan2(y, x);
          const phi = Math.acos(z / Math.max(radius, 0.001));
          
          // Animate along the surface with chaotic wave effect
          const newTheta = theta + plasmaSpeed * 0.02;
          const waveOffset = Math.sin(phi * 4 + time * 3) * 0.08;
          const chaosOffset = Math.sin(theta * 3 + time * 5) * 0.03;
          
          // Keep within shell range (0.8 to 1.2)
          let newRadius = 0.9 + waveOffset + chaosOffset;
          newRadius = Math.max(0.75, Math.min(1.25, newRadius));
          
          positions.setX(i, newRadius * Math.sin(phi) * Math.cos(newTheta));
          positions.setY(i, newRadius * Math.sin(phi) * Math.sin(newTheta));
          positions.setZ(i, newRadius * Math.cos(phi));
        }
        
        positions.needsUpdate = true;
        plasmaRef.current.rotation.y += rotationSpeed * 0.015;
        plasmaRef.current.rotation.x += rotationSpeed * 0.008;
      }

      // Animate micro-sparks
      if (microSparkRef.current) {
        const sparkPositions = microSparkRef.current.geometry.attributes.position;
        
        for (let i = 0; i < sparkPositions.count; i++) {
          const x = sparkPositions.getX(i);
          const y = sparkPositions.getY(i);
          const z = sparkPositions.getZ(i);
          
          const radius = Math.sqrt(x * x + y * y + z * z);
          const theta = Math.atan2(y, x);
          const phi = Math.acos(z / Math.max(radius, 0.001));
          
          // Slow drift outward and reset
          let newRadius = radius + 0.003;
          if (newRadius > 1.8 || Math.random() < 0.005) {
            newRadius = 1.0 + Math.random() * 0.2;
          }
          
          const drift = Math.sin(time * 2 + i) * 0.02;
          
          sparkPositions.setX(i, newRadius * Math.sin(phi + drift) * Math.cos(theta + drift * 0.5));
          sparkPositions.setY(i, newRadius * Math.sin(phi + drift) * Math.sin(theta + drift * 0.5));
          sparkPositions.setZ(i, newRadius * Math.cos(phi + drift));
        }
        
        sparkPositions.needsUpdate = true;
        microSparkRef.current.rotation.y -= rotationSpeed * 0.005;
      }

      // Animate lightning (jagged, flickering lines)
      if (lightningRef.current) {
        const positions = lightningRef.current.geometry.attributes.position;
        const lightningMat = lightningRef.current.material as THREE.LineBasicMaterial;
        
        // Update opacity based on state (more erratic for anxiety/anger emotions)
        const baseOpacity = lightningActivity * 0.5;
        lightningMat.opacity = baseOpacity + Math.sin(time * 15) * 0.2;
        
        for (let i = 0; i < 300; i++) {
          // Randomly regenerate some lightning bolts each frame
          if (Math.random() > 0.85 * (1 - lightningActivity * 0.5)) {
            // Random start point on outer shell
            const theta1 = Math.random() * Math.PI * 2;
            const phi1 = Math.acos(2 * Math.random() - 1);
            const r1 = 0.75 + Math.random() * 0.35;
            
            // Jagged end point nearby
            const jag = (Math.random() - 0.5) * 0.8;
            const theta2 = theta1 + jag;
            const phi2 = phi1 + (Math.random() - 0.5) * 0.4;
            const r2 = r1 + (Math.random() - 0.5) * 0.3;
            
            positions.setXYZ(
              i * 2,
              r1 * Math.sin(phi1) * Math.cos(theta1),
              r1 * Math.sin(phi1) * Math.sin(theta1),
              r1 * Math.cos(phi1)
            );
            positions.setXYZ(
              i * 2 + 1,
              r2 * Math.sin(phi2) * Math.cos(theta2),
              r2 * Math.sin(phi2) * Math.sin(theta2),
              r2 * Math.cos(phi2)
            );
          }
        }
        positions.needsUpdate = true;
      }

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      unregister(); // Unregister from Zero-Thermal Protocol
    };
  }, [disabled, orbState, emotionConfig, isSpeaking]);

  // Status indicator color based on state
  const getStatusColor = useCallback(() => {
    switch (statusIndicator) {
      case 'ready': return '#22c55e'; // Green
      case 'listening': return '#22c55e'; // Green (active listening)
      case 'processing': return '#f59e0b'; // Amber
      case 'error': return '#ef4444'; // Red
      default: return '#22c55e';
    }
  }, [statusIndicator]);

  if (disabled) {
    return (
      <div 
        className={cn(
          'rounded-full bg-muted/30 border border-border/30',
          className
        )}
        style={{ width: sizeConfig.width, height: sizeConfig.height }}
      />
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'relative cursor-pointer select-none',
        className
      )}
      style={{ width: sizeConfig.width, height: sizeConfig.height }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Outer glow effect - Electric Blue Plasma field glow */}
      <div
        className={cn(
          "absolute inset-[-25%] rounded-full pointer-events-none",
          isActive && "animate-gpu-pulse-scale-slow"
        )}
        style={{
          background: `radial-gradient(circle, ${emotionConfig.plasmaColor}50 0%, ${emotionConfig.plasmaColor}20 40%, transparent 70%)`,
          filter: 'blur(20px)',
          opacity: isActive ? undefined : 0.3,
        }}
      />

      {/* Secondary amber glow from core */}
      <div
        className={cn(
          "absolute inset-[-10%] rounded-full pointer-events-none",
          orbState === 'thinking' ? "animate-gpu-pulse-scale-fast" : "animate-gpu-pulse-scale-slow"
        )}
        style={{
          background: `radial-gradient(circle, ${emotionConfig.coreColor}40 0%, transparent 60%)`,
          filter: 'blur(15px)',
        }}
      />

      {/* Three.js canvas - Transparent background for seamless integration */}
      <div 
        className="absolute inset-0 rounded-full overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: sizeConfig.width, height: sizeConfig.height }}
        />
      </div>


      {/* Subtle floating animation for avatar movement */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          isSpeaking ? "animate-gpu-speaking-wobble" : "animate-gpu-float-subtle"
        )}
      />

      {/* Screen reader label */}
      <span className="sr-only">
        Zoe AI Assistant - {orbState} - {emotionConfig.emotionLabel}
      </span>
    </motion.div>
  );
};

// Export emotion config for TTS adapter
export { ECN_EMOTION_CONFIG };
export default HolographicATLASOrb;
