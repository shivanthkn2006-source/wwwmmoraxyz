/**
 * VR Voice Guide - Deepgram Aura-2 (aura-2-janus-en) Narration System
 * =====================================================================
 * Provides contextual voice narration in the VR OMEGA World:
 * - Welcome greeting on entry
 * - Animal identification when nearby
 * - Building names as player approaches
 * - NPC/avatar interaction narration
 * - Distance callouts to mountains/landmarks
 * - Conversational avatar dialogue
 * 
 * All voice output uses speakAsZoe → Deepgram aura-2-janus-en
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { speakAsZoe } from '@/utils/zoeVoice';
import { isVRAudioUnlocked, VR_AUDIO_LOCK_EVENT, VR_AUDIO_UNLOCK_EVENT } from '@/lib/vrAudioGate';

// Cooldowns to prevent voice spam (ms)
const ANIMAL_COOLDOWN = 12_000;
const BUILDING_COOLDOWN = 10_000;
const NPC_COOLDOWN = 8_000;
const DISTANCE_COOLDOWN = 20_000;
const WELCOME_DELAY = 2_500;

interface VoiceGuideOptions {
  isActive: boolean;
  hasSatelliteEntryCompleted: boolean;
}

export const useVRVoiceGuide = ({ isActive, hasSatelliteEntryCompleted }: VoiceGuideOptions) => {
  const lastAnimalCallout = useRef<Record<string, number>>({});
  const lastBuildingCallout = useRef<Record<string, number>>({});
  const lastNPCCallout = useRef<Record<string, number>>({});
  const lastDistanceCallout = useRef<number>(0);
  const welcomeSpoken = useRef(false);
  const isSpeaking = useRef(false);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => isVRAudioUnlocked());

  useEffect(() => {
    const handleUnlock = () => setAudioUnlocked(true);
    const handleLock = () => setAudioUnlocked(false);

    window.addEventListener(VR_AUDIO_UNLOCK_EVENT, handleUnlock);
    window.addEventListener(VR_AUDIO_LOCK_EVENT, handleLock);

    return () => {
      window.removeEventListener(VR_AUDIO_UNLOCK_EVENT, handleUnlock);
      window.removeEventListener(VR_AUDIO_LOCK_EVENT, handleLock);
    };
  }, []);

  // ─── Welcome Greeting ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !hasSatelliteEntryCompleted || !audioUnlocked || welcomeSpoken.current) return;
    welcomeSpoken.current = true;

    const timer = setTimeout(() => {
      speakAsZoe(
        'Welcome to the VR World. I am Zoe, your voice guide. ' +
        'I will narrate buildings, animals, and landmarks as you explore. ' +
        'Use W A S D to move, or say Zoe mountain view to navigate.'
      );
    }, WELCOME_DELAY);

    return () => clearTimeout(timer);
  }, [isActive, hasSatelliteEntryCompleted, audioUnlocked]);

  // Reset welcome on deactivation
  useEffect(() => {
    if (!isActive) {
      welcomeSpoken.current = false;
    }
  }, [isActive]);

  // ─── Animal Narration ─────────────────────────────────────────────────
  const narrateAnimal = useCallback((animalType: string, animalId: string, distance: number) => {
    if (!isActive || !audioUnlocked || isSpeaking.current) return;
    const now = Date.now();
    if (now - (lastAnimalCallout.current[animalId] || 0) < ANIMAL_COOLDOWN) return;
    lastAnimalCallout.current[animalId] = now;

    const descriptions: Record<string, string> = {
      lion: 'A lion is nearby. The king of the jungle, majestic and powerful.',
      tiger: 'A tiger is passing by. Look at its beautiful orange and black stripes.',
      bear: 'A bear is walking close. A strong and gentle forest dweller.',
      deer: 'A deer is grazing nearby. Graceful and alert.',
      bird: 'A bird is flying overhead. Listen to its beautiful song.',
      elephant: 'An elephant is approaching. The gentle giant of the wild.',
      wolf: 'A wolf is prowling nearby. A wise and loyal pack animal.',
      rabbit: 'A rabbit is hopping around. Quick and adorable.',
    };

    const desc = descriptions[animalType] || `A ${animalType} is nearby.`;
    const distText = distance > 10 ? ` About ${Math.round(distance)} meters away.` : '';

    isSpeaking.current = true;
    speakAsZoe(
      desc + distText,
      () => {},
      () => { isSpeaking.current = false; }
    );
  }, [isActive, audioUnlocked]);

  // ─── Building Narration ────────────────────────────────────────────────
  const narrateBuilding = useCallback((buildingType: string, buildingId: string) => {
    if (!isActive || !audioUnlocked || isSpeaking.current) return;
    const now = Date.now();
    if (now - (lastBuildingCallout.current[buildingId] || 0) < BUILDING_COOLDOWN) return;
    lastBuildingCallout.current[buildingId] = now;

    const names: Record<string, string> = {
      house: 'You are near a residential house.',
      apartment: 'This is an apartment complex.',
      office: 'An office tower stands before you.',
      hospital: 'This is the city hospital. A place of healing.',
      school: 'You are passing a school building.',
      shop: 'A retail shop is nearby.',
      park: 'Welcome to the city park. A green space for relaxation.',
      factory: 'An industrial factory is ahead.',
      restaurant: 'A restaurant is here. Smells delicious.',
      stadium: 'The grand stadium. It can hold thousands of spectators.',
      fire_station: 'This is the fire station. Always ready to respond.',
      police_station: 'The police station. Keeping the city safe.',
      gym: 'A fitness gym. Stay strong.',
      religious: 'A place of worship and reflection.',
      cultural: 'A cultural center. Art and heritage live here.',
      cafe: 'A cozy café is nearby. Perfect for a coffee break.',
      hotel_5star: 'A luxurious five star hotel stands before you. World class hospitality.',
      highrise: 'A towering high rise building. An impressive skyscraper.',
      church: 'A beautiful church with its iconic cross reaching toward the sky.',
      temple: 'A sacred temple with a golden dome. A place of spiritual reflection.',
      commercial: 'A commercial building in the business district.',
    };

    const desc = names[buildingType] || `You are near a ${buildingType.replace('_', ' ')} building.`;

    isSpeaking.current = true;
    speakAsZoe(
      desc,
      () => {},
      () => { isSpeaking.current = false; }
    );
  }, [isActive, audioUnlocked]);

  // ─── NPC / Avatar Narration ────────────────────────────────────────────
  const narrateNPC = useCallback((npcName: string, npcId: string, personality: string) => {
    if (!isActive || !audioUnlocked || isSpeaking.current) return;
    const now = Date.now();
    if (now - (lastNPCCallout.current[npcId] || 0) < NPC_COOLDOWN) return;
    lastNPCCallout.current[npcId] = now;

    const greetings: Record<string, string> = {
      friendly: `${npcName} waves at you. They seem friendly and happy to see you.`,
      busy: `${npcName} is walking quickly. They seem busy and focused.`,
      explorer: `${npcName} is exploring the area. A fellow adventurer.`,
      racer: `${npcName} is sprinting past. They love speed.`,
    };

    const desc = greetings[personality] || `You have encountered ${npcName}.`;

    isSpeaking.current = true;
    speakAsZoe(
      desc,
      () => {},
      () => { isSpeaking.current = false; }
    );
  }, [isActive, audioUnlocked]);

  // ─── Distance / Landmark Narration ─────────────────────────────────────
  const narrateDistance = useCallback((landmarkName: string, distanceMeters: number) => {
    if (!isActive || !audioUnlocked || isSpeaking.current) return;
    const now = Date.now();
    if (now - lastDistanceCallout.current < DISTANCE_COOLDOWN) return;
    lastDistanceCallout.current = now;

    const dist = Math.round(distanceMeters);
    let text: string;

    if (dist < 50) {
      text = `You are very close to ${landmarkName}. Just ${dist} meters away.`;
    } else if (dist < 200) {
      text = `${landmarkName} is ${dist} meters ahead.`;
    } else if (dist < 1000) {
      text = `${landmarkName} is about ${dist} meters in the distance.`;
    } else {
      text = `${landmarkName} is approximately ${(dist / 1000).toFixed(1)} kilometers away.`;
    }

    isSpeaking.current = true;
    speakAsZoe(
      text,
      () => {},
      () => { isSpeaking.current = false; }
    );
  }, [isActive, audioUnlocked]);

  // ─── Conversational Avatar Interaction ─────────────────────────────────
  const narrateConversation = useCallback((speakerName: string, topic: string) => {
    if (!isActive || !audioUnlocked || isSpeaking.current) return;

    const conversations: Record<string, string[]> = {
      greeting: [
        `${speakerName} says: Hey there, welcome to our world.`,
        `${speakerName} says: Nice to meet you, explorer.`,
        `${speakerName} says: Hello! The view from the mountains is amazing today.`,
      ],
      directions: [
        `${speakerName} says: The mountains are to the north. You should visit the summit.`,
        `${speakerName} says: Head east for the cycling trail. It is a great ride.`,
        `${speakerName} says: The city center has some impressive buildings to explore.`,
      ],
      weather: [
        `${speakerName} says: Beautiful day today, is it not?`,
        `${speakerName} says: I heard a storm might be coming. Stay safe out there.`,
      ],
    };

    const options = conversations[topic] || conversations.greeting || [`${speakerName} acknowledges you.`];
    const text = options[Math.floor(Math.random() * options.length)];

    isSpeaking.current = true;
    speakAsZoe(
      text,
      () => {},
      () => { isSpeaking.current = false; }
    );
  }, [isActive, audioUnlocked]);

  // ─── Generic Voice Guide Announcement ──────────────────────────────────
  const announce = useCallback((text: string) => {
    if (!isActive || !audioUnlocked || isSpeaking.current) return;
    isSpeaking.current = true;
    speakAsZoe(
      text,
      () => {},
      () => { isSpeaking.current = false; }
    );
  }, [isActive, audioUnlocked]);

  return {
    narrateAnimal,
    narrateBuilding,
    narrateNPC,
    narrateDistance,
    narrateConversation,
    announce,
  };
};

export default useVRVoiceGuide;
