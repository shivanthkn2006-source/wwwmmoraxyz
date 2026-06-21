// ═══════════════════════════════════════════════════════════════════════════════
// ZOE FEATURE DISCOVERY - Voice-Enabled Personalized Platform Discovery
// Helps users discover features based on their profession/interests
// Integrated with DHF Core for personalization and voice commands
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Sparkles, Mic, Volume2, ChevronRight, User, Palette, Heart, 
  Camera, Globe, Mountain, Briefcase, GraduationCap, Rocket,
  Music, Code, BookOpen, Video, Compass, Star, Zap, Brain
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { speakAsZoe } from '@/utils/zoeVoice';
import { motion, AnimatePresence } from 'framer-motion';

// ═══ PROFESSION/INTEREST DEFINITIONS ═══
export interface ProfessionProfile {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  features: FeatureRecommendation[];
  dailyTips: string[];
  voiceCommands: string[];
}

export interface FeatureRecommendation {
  id: string;
  name: string;
  description: string;
  route: string;
  voiceCommand: string;
  relevanceScore: number; // 1-10
}

// ═══ COMPREHENSIVE PROFESSION CATALOG ═══
export const PROFESSION_CATALOG: ProfessionProfile[] = [
  {
    id: 'graphic_designer',
    name: 'Graphic Designer',
    icon: <Palette className="w-5 h-5" />,
    description: 'Visual creativity and design tools',
    features: [
      { id: 'dreams_ai', name: 'Zoe Dreams AI', description: 'Generate stunning visuals with AI', route: '/zoe-dreams', voiceCommand: 'open zoe dreams', relevanceScore: 10 },
      { id: 'image_gen', name: 'Premium Image Generation', description: 'Create high-quality images', route: '/ai-companion', voiceCommand: 'generate image', relevanceScore: 9 },
      { id: 'vr_world', name: 'VR OMEGA World', description: '3D visualization and exploration', route: '/vr-world', voiceCommand: 'open vr world', relevanceScore: 8 },
      { id: 'timeline', name: 'Universal Timeline', description: 'Track your creative journey', route: '/timeline', voiceCommand: 'show my timeline', relevanceScore: 7 },
      { id: 'video_creation', name: 'Video Creation', description: 'Create video content', route: '/loops', voiceCommand: 'create video', relevanceScore: 8 },
    ],
    dailyTips: [
      'Use Zoe Dreams to explore new visual concepts',
      'Document your design process in the timeline',
      'Try VR World for 3D inspiration',
    ],
    voiceCommands: ['Zoe, inspire me', 'Zoe, generate a design', 'Zoe, show color palettes'],
  },
  {
    id: 'doctor',
    name: 'Doctor / Healthcare',
    icon: <Heart className="w-5 h-5" />,
    description: 'Health tracking and wellness features',
    features: [
      { id: 'emotion_tracker', name: 'Emotion Analytics', description: 'Track emotional well-being', route: '/ai-companion', voiceCommand: 'track my emotions', relevanceScore: 10 },
      { id: 'dhf_upload', name: 'DHF Health Upload', description: 'Upload health documents', route: '/dhf-upload', voiceCommand: 'upload health data', relevanceScore: 9 },
      { id: 'briefing', name: 'Daily Briefing', description: 'Health-aware morning briefing', route: '/briefing-preferences', voiceCommand: 'give me my briefing', relevanceScore: 8 },
      { id: 'reminders', name: 'Smart Reminders', description: 'Set health reminders', route: '/profile', voiceCommand: 'set a reminder', relevanceScore: 8 },
      { id: 'calendar', name: 'Calendar View', description: 'Schedule appointments', route: '/profile', voiceCommand: 'show my calendar', relevanceScore: 7 },
    ],
    dailyTips: [
      'Log your daily wellness check with Zoe',
      'Set medication or appointment reminders',
      'Use emotion tracking for stress management',
    ],
    voiceCommands: ['Zoe, how am I feeling today', 'Zoe, set a health reminder', 'Zoe, log my wellness'],
  },
  {
    id: 'content_creator',
    name: 'Content Creator',
    icon: <Video className="w-5 h-5" />,
    description: 'Content creation and social tools',
    features: [
      { id: 'video_loops', name: 'Video Loops', description: 'Create engaging short videos', route: '/loops', voiceCommand: 'create a video', relevanceScore: 10 },
      { id: 'post_creation', name: 'Smart Posts', description: 'AI-assisted content creation', route: '/home', voiceCommand: 'create a post', relevanceScore: 10 },
      { id: 'dreams_ai', name: 'Zoe Dreams AI', description: 'Generate thumbnails and graphics', route: '/zoe-dreams', voiceCommand: 'generate thumbnail', relevanceScore: 9 },
      { id: 'analytics', name: 'Content Analytics', description: 'Track your content performance', route: '/analytics', voiceCommand: 'show my analytics', relevanceScore: 8 },
      { id: 'huddle', name: 'Huddle Network', description: 'Connect with other creators', route: '/huddle', voiceCommand: 'find creators near me', relevanceScore: 7 },
    ],
    dailyTips: [
      'Use Zoe to brainstorm content ideas',
      'Create eye-catching thumbnails with Dreams AI',
      'Engage with your community through Huddle',
    ],
    voiceCommands: ['Zoe, give me content ideas', 'Zoe, create a post about...', 'Zoe, what should I post today'],
  },
  {
    id: 'social_media_manager',
    name: 'Social Media Manager',
    icon: <Globe className="w-5 h-5" />,
    description: 'Social management and scheduling',
    features: [
      { id: 'post_creation', name: 'Bulk Post Creation', description: 'Create multiple posts efficiently', route: '/home', voiceCommand: 'create posts', relevanceScore: 10 },
      { id: 'analytics', name: 'Social Analytics', description: 'Track engagement metrics', route: '/analytics', voiceCommand: 'show engagement', relevanceScore: 10 },
      { id: 'voice_macros', name: 'Voice Macros', description: 'Automate repetitive tasks', route: '/ai-companion', voiceCommand: 'create macro', relevanceScore: 9 },
      { id: 'calendar', name: 'Content Calendar', description: 'Plan and schedule content', route: '/profile', voiceCommand: 'show content calendar', relevanceScore: 9 },
      { id: 'trending', name: 'Trending Searches', description: 'Discover what\'s trending', route: '/search', voiceCommand: 'what\'s trending', relevanceScore: 8 },
    ],
    dailyTips: [
      'Set up voice macros for quick posting',
      'Review analytics every morning',
      'Use Zoe to monitor trends',
    ],
    voiceCommands: ['Zoe, schedule a post', 'Zoe, what\'s performing well', 'Zoe, automate my workflow'],
  },
  {
    id: 'phd_student',
    name: 'PhD Student / Researcher',
    icon: <GraduationCap className="w-5 h-5" />,
    description: 'Research and knowledge management',
    features: [
      { id: 'document_hub', name: 'Document Hub', description: 'Organize research documents', route: '/documents', voiceCommand: 'open my documents', relevanceScore: 10 },
      { id: 'dhf_upload', name: 'DHF Research Upload', description: 'Store research data securely', route: '/dhf-upload', voiceCommand: 'upload research', relevanceScore: 10 },
      { id: 'zoe_chat', name: 'Zoe Research Assistant', description: 'AI-powered research help', route: '/ai-companion', voiceCommand: 'help me research', relevanceScore: 9 },
      { id: 'timeline', name: 'Research Timeline', description: 'Track your research progress', route: '/timeline', voiceCommand: 'show research timeline', relevanceScore: 8 },
      { id: 'day_planner', name: 'Day Planner', description: 'Plan your research day', route: '/profile', voiceCommand: 'plan my day', relevanceScore: 8 },
    ],
    dailyTips: [
      'Use Zoe to summarize research papers',
      'Track your thesis progress in timeline',
      'Set writing goals with day planner',
    ],
    voiceCommands: ['Zoe, summarize this paper', 'Zoe, help me write', 'Zoe, what should I research'],
  },
  {
    id: 'scientist',
    name: 'Scientist',
    icon: <Rocket className="w-5 h-5" />,
    description: 'Scientific exploration and analysis',
    features: [
      { id: 'solar_system', name: 'Solar System Explorer', description: 'Explore celestial bodies', route: '/solar-system', voiceCommand: 'explore solar system', relevanceScore: 10 },
      { id: 'heliosphere', name: 'Heliosphere Explorer', description: 'Deep space visualization', route: '/heliosphere', voiceCommand: 'open heliosphere', relevanceScore: 9 },
      { id: 'zoe_intelligence', name: 'Zoe Intelligence', description: 'Advanced AI analysis', route: '/zoe-intelligence', voiceCommand: 'analyze data', relevanceScore: 9 },
      { id: 'dhf_upload', name: 'Data Upload', description: 'Store experimental data', route: '/dhf-upload', voiceCommand: 'upload data', relevanceScore: 8 },
      { id: 'vr_world', name: 'VR Visualization', description: '3D data visualization', route: '/vr-world', voiceCommand: 'visualize in 3d', relevanceScore: 8 },
    ],
    dailyTips: [
      'Use Solar System Explorer for astronomy research',
      'Visualize complex data in VR World',
      'Ask Zoe to explain scientific concepts',
    ],
    voiceCommands: ['Zoe, explain quantum physics', 'Zoe, show me Mars', 'Zoe, analyze my data'],
  },
  {
    id: 'traveler',
    name: 'Traveler / Explorer',
    icon: <Compass className="w-5 h-5" />,
    description: 'Travel planning and exploration',
    features: [
      { id: 'huddle', name: 'Huddle Map', description: 'Find friends and places', route: '/huddle', voiceCommand: 'show nearby places', relevanceScore: 10 },
      { id: 'vr_world', name: 'VR World Tours', description: 'Virtual travel experiences', route: '/vr-world', voiceCommand: 'take me to paris', relevanceScore: 9 },
      { id: 'timeline', name: 'Travel Timeline', description: 'Document your journeys', route: '/timeline', voiceCommand: 'show my travels', relevanceScore: 9 },
      { id: 'calendar', name: 'Trip Planner', description: 'Plan your adventures', route: '/profile', voiceCommand: 'plan my trip', relevanceScore: 8 },
      { id: 'weather', name: 'Weather Briefing', description: 'Travel weather updates', route: '/briefing-preferences', voiceCommand: 'what\'s the weather', relevanceScore: 8 },
    ],
    dailyTips: [
      'Use VR World to preview destinations',
      'Document memories in your timeline',
      'Connect with local travelers via Huddle',
    ],
    voiceCommands: ['Zoe, where should I travel', 'Zoe, show me destinations', 'Zoe, plan my adventure'],
  },
  {
    id: 'mountain_hiker',
    name: 'Mountain Hiker',
    icon: <Mountain className="w-5 h-5" />,
    description: 'Outdoor adventure and tracking',
    features: [
      { id: 'huddle', name: 'Trail Finder', description: 'Find hiking partners', route: '/huddle', voiceCommand: 'find hikers near me', relevanceScore: 10 },
      { id: 'weather', name: 'Mountain Weather', description: 'Altitude-aware forecasts', route: '/briefing-preferences', voiceCommand: 'mountain weather', relevanceScore: 10 },
      { id: 'timeline', name: 'Adventure Log', description: 'Track your hikes', route: '/timeline', voiceCommand: 'log my hike', relevanceScore: 9 },
      { id: 'vr_world', name: 'VR Trail Preview', description: 'Preview trails in VR', route: '/vr-world', voiceCommand: 'preview trail', relevanceScore: 8 },
      { id: 'reminders', name: 'Gear Reminders', description: 'Never forget equipment', route: '/profile', voiceCommand: 'remind me to pack', relevanceScore: 7 },
    ],
    dailyTips: [
      'Check weather before every hike',
      'Log your adventures for memories',
      'Connect with hiking community',
    ],
    voiceCommands: ['Zoe, weather for hiking', 'Zoe, find trails nearby', 'Zoe, log this summit'],
  },
  {
    id: 'vr_explorer',
    name: 'VR World Explorer',
    icon: <Globe className="w-5 h-5" />,
    description: 'Virtual reality experiences',
    features: [
      { id: 'vr_world', name: 'VR OMEGA World', description: 'Immersive VR environments', route: '/vr-world', voiceCommand: 'enter vr world', relevanceScore: 10 },
      { id: 'solar_system', name: 'Space VR', description: 'Explore space in VR', route: '/solar-system', voiceCommand: 'fly to jupiter', relevanceScore: 10 },
      { id: 'heliosphere', name: 'Deep Space VR', description: 'Beyond the solar system', route: '/heliosphere', voiceCommand: 'explore heliosphere', relevanceScore: 9 },
      { id: 'dreams_ai', name: 'VR Art Creation', description: 'Create VR art with AI', route: '/zoe-dreams', voiceCommand: 'create vr art', relevanceScore: 8 },
      { id: 'voice_commands', name: 'VR Voice Control', description: 'Control VR with voice', route: '/voice-commands', voiceCommand: 'vr voice commands', relevanceScore: 8 },
    ],
    dailyTips: [
      'Explore new VR worlds daily',
      'Use voice commands for hands-free control',
      'Create and share VR experiences',
    ],
    voiceCommands: ['Zoe, take me to space', 'Zoe, build something', 'Zoe, change environment'],
  },
  {
    id: 'artist',
    name: 'Artist / Creative',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Creative expression tools',
    features: [
      { id: 'dreams_ai', name: 'Zoe Dreams AI', description: 'AI art generation', route: '/zoe-dreams', voiceCommand: 'create art', relevanceScore: 10 },
      { id: 'video_creation', name: 'Video Art', description: 'Create video art', route: '/loops', voiceCommand: 'make video art', relevanceScore: 9 },
      { id: 'timeline', name: 'Art Portfolio', description: 'Showcase your work', route: '/timeline', voiceCommand: 'show my portfolio', relevanceScore: 9 },
      { id: 'vr_world', name: 'VR Gallery', description: 'Display art in VR', route: '/vr-world', voiceCommand: 'open my gallery', relevanceScore: 8 },
      { id: 'huddle', name: 'Artist Network', description: 'Connect with artists', route: '/huddle', voiceCommand: 'find artists', relevanceScore: 7 },
    ],
    dailyTips: [
      'Create something new every day',
      'Get AI inspiration from Dreams',
      'Share your art with the community',
    ],
    voiceCommands: ['Zoe, inspire me', 'Zoe, generate abstract art', 'Zoe, what should I create'],
  },
  {
    id: 'furniture_designer',
    name: 'Furniture Designer',
    icon: <Briefcase className="w-5 h-5" />,
    description: 'Design and visualization tools',
    features: [
      { id: 'vr_world', name: 'VR Showroom', description: 'Visualize furniture in 3D', route: '/vr-world', voiceCommand: 'open showroom', relevanceScore: 10 },
      { id: 'dreams_ai', name: 'Design Generator', description: 'Generate design concepts', route: '/zoe-dreams', voiceCommand: 'generate furniture design', relevanceScore: 10 },
      { id: 'document_hub', name: 'Design Documents', description: 'Store blueprints', route: '/documents', voiceCommand: 'open blueprints', relevanceScore: 8 },
      { id: 'timeline', name: 'Project Timeline', description: 'Track design projects', route: '/timeline', voiceCommand: 'show projects', relevanceScore: 7 },
      { id: 'huddle', name: 'Client Finder', description: 'Connect with clients', route: '/huddle', voiceCommand: 'find clients', relevanceScore: 7 },
    ],
    dailyTips: [
      'Prototype designs in VR World',
      'Generate concept variations with AI',
      'Document your design process',
    ],
    voiceCommands: ['Zoe, design a chair', 'Zoe, show in 3d', 'Zoe, modern furniture ideas'],
  },
  {
    id: 'musician',
    name: 'Musician / Producer',
    icon: <Music className="w-5 h-5" />,
    description: 'Music and audio creation',
    features: [
      { id: 'voice_library', name: 'Voice Library', description: 'Custom voice and sounds', route: '/voice-library', voiceCommand: 'open voice library', relevanceScore: 10 },
      { id: 'video_creation', name: 'Music Videos', description: 'Create music videos', route: '/loops', voiceCommand: 'create music video', relevanceScore: 9 },
      { id: 'dreams_ai', name: 'Album Art', description: 'Generate album artwork', route: '/zoe-dreams', voiceCommand: 'create album art', relevanceScore: 9 },
      { id: 'timeline', name: 'Music Journey', description: 'Track your music career', route: '/timeline', voiceCommand: 'show my music journey', relevanceScore: 7 },
      { id: 'huddle', name: 'Musician Network', description: 'Collaborate with artists', route: '/huddle', voiceCommand: 'find musicians', relevanceScore: 8 },
    ],
    dailyTips: [
      'Explore custom voice options',
      'Create visual content for your music',
      'Connect with other musicians',
    ],
    voiceCommands: ['Zoe, help me create', 'Zoe, album art for...', 'Zoe, find collaborators'],
  },
  {
    id: 'developer',
    name: 'Developer / Coder',
    icon: <Code className="w-5 h-5" />,
    description: 'Development and productivity tools',
    features: [
      { id: 'zoe_architect', name: 'Zoe Architect', description: 'AI code assistance', route: '/architect', voiceCommand: 'open architect', relevanceScore: 10 },
      { id: 'document_hub', name: 'Code Docs', description: 'Store documentation', route: '/documents', voiceCommand: 'open docs', relevanceScore: 9 },
      { id: 'voice_macros', name: 'Dev Macros', description: 'Automate dev tasks', route: '/ai-companion', voiceCommand: 'create dev macro', relevanceScore: 9 },
      { id: 'day_planner', name: 'Sprint Planner', description: 'Plan development sprints', route: '/profile', voiceCommand: 'plan my sprint', relevanceScore: 8 },
      { id: 'analytics', name: 'Dev Analytics', description: 'Track productivity', route: '/analytics', voiceCommand: 'show my productivity', relevanceScore: 7 },
    ],
    dailyTips: [
      'Use voice commands for hands-free coding',
      'Set up macros for repetitive tasks',
      'Plan your sprints with Zoe',
    ],
    voiceCommands: ['Zoe, explain this code', 'Zoe, create a component', 'Zoe, debug this'],
  },
  {
    id: 'student',
    name: 'Student',
    icon: <BookOpen className="w-5 h-5" />,
    description: 'Learning and study tools',
    features: [
      { id: 'zoe_chat', name: 'Study Assistant', description: 'AI tutoring', route: '/ai-companion', voiceCommand: 'help me study', relevanceScore: 10 },
      { id: 'document_hub', name: 'Study Materials', description: 'Organize notes', route: '/documents', voiceCommand: 'open my notes', relevanceScore: 10 },
      { id: 'calendar', name: 'Study Schedule', description: 'Plan study sessions', route: '/profile', voiceCommand: 'plan my study', relevanceScore: 9 },
      { id: 'reminders', name: 'Assignment Reminders', description: 'Never miss deadlines', route: '/profile', voiceCommand: 'remind me about homework', relevanceScore: 9 },
      { id: 'timeline', name: 'Learning Progress', description: 'Track your learning', route: '/timeline', voiceCommand: 'show my progress', relevanceScore: 7 },
    ],
    dailyTips: [
      'Ask Zoe to explain difficult concepts',
      'Set study reminders regularly',
      'Track your learning journey',
    ],
    voiceCommands: ['Zoe, explain...', 'Zoe, quiz me on...', 'Zoe, what should I study'],
  },
];

// ═══ UNIVERSAL FEATURES FOR ALL USERS ═══
export const UNIVERSAL_FEATURES = [
  { name: 'Voice Commands', description: 'Control everything with your voice', voiceCommand: 'Zoe, what can you do' },
  { name: 'Daily Briefing', description: 'Get your personalized morning briefing', voiceCommand: 'Zoe, give me my briefing' },
  { name: 'Day Planning', description: 'Plan your day with Zoe', voiceCommand: 'Zoe, plan my day' },
  { name: 'Emotion Tracking', description: 'Track and understand your emotions', voiceCommand: 'Zoe, how am I feeling' },
  { name: 'Evolution Sessions', description: 'Reflect and grow with Zoe', voiceCommand: 'Zoe, let\'s evolve' },
  { name: 'Memory Timeline', description: 'Your life in a timeline', voiceCommand: 'Zoe, show my timeline' },
  { name: 'Smart Reminders', description: 'Never forget anything', voiceCommand: 'Zoe, remind me to...' },
  { name: 'Huddle Network', description: 'Connect with people nearby', voiceCommand: 'Zoe, who\'s nearby' },
  { name: 'VR Exploration', description: 'Explore virtual worlds', voiceCommand: 'Zoe, open VR world' },
  { name: 'Dreams AI', description: 'Generate stunning visuals', voiceCommand: 'Zoe, create an image of...' },
  { name: 'Traffic Updates', description: 'Get real-time traffic info', voiceCommand: 'Zoe, traffic update' },
  { name: 'Weather Info', description: 'Weather forecasts', voiceCommand: 'Zoe, what\'s the weather' },
  { name: 'News Briefing', description: 'Stay updated', voiceCommand: 'Zoe, what\'s the news' },
];

// ═══ MAIN COMPONENT ═══
export const ZoeFeatureDiscovery: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialProfession?: string;
  voiceEnabled?: boolean;
}> = ({ isOpen, onClose, initialProfession, voiceEnabled = true }) => {
  const { user } = useAuth();
  const [selectedProfession, setSelectedProfession] = useState<ProfessionProfile | null>(null);
  const [userName, setUserName] = useState('');
  const [isNameStep, setIsNameStep] = useState(true);
  const [discoveredFeatures, setDiscoveredFeatures] = useState<FeatureRecommendation[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListeningForName, setIsListeningForName] = useState(false);

  // Voice input for name entry
  const startNameVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }

    window.dispatchEvent(new CustomEvent('zoe-voice-input-start'));
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListeningForName(true);
    recognition.onend = () => {
      setIsListeningForName(false);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    };
    recognition.onerror = () => {
      setIsListeningForName(false);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Clean up common prefixes
      const cleanName = transcript
        .replace(/^(my name is |i('m| am) |call me |it's )/i, '')
        .trim();
      setUserName(cleanName);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('[FeatureDiscovery] Failed to start voice input:', e);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    }
  }, []);
  // Load user name from DHF profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.display_name) {
          setUserName(profile.display_name);
          setIsNameStep(false);
        }

        // Check if profession is already stored
        const { data: dhfProfile } = await supabase
          .from('dhf_phoenix_profile')
          .select('vocabulary_signature')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (dhfProfile?.vocabulary_signature && typeof dhfProfile.vocabulary_signature === 'object') {
          const vocabSig = dhfProfile.vocabulary_signature as Record<string, unknown>;
          const storedProfession = vocabSig.profession as string | undefined;
          if (storedProfession) {
            const profession = PROFESSION_CATALOG.find(p => p.id === storedProfession);
            if (profession) {
              setSelectedProfession(profession);
              setDiscoveredFeatures(profession.features);
            }
          }
        }
      } catch (error) {
        console.log('[FeatureDiscovery] Error loading profile:', error);
      }
    };
    
    loadUserProfile();
  }, [user?.id]);

  // Handle initial profession from voice command
  useEffect(() => {
    if (initialProfession) {
      const profession = PROFESSION_CATALOG.find(
        p => p.id === initialProfession || 
        p.name.toLowerCase().includes(initialProfession.toLowerCase())
      );
      if (profession) {
        handleProfessionSelect(profession);
      }
    }
  }, [initialProfession]);

  const speakText = useCallback((text: string) => {
    if (!voiceEnabled) return;
    setIsSpeaking(true);
    speakAsZoe(
      text,
      undefined,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  }, [voiceEnabled]);

  const handleNameSubmit = async () => {
    if (!userName.trim() || !user?.id) return;
    
    try {
      // Save to profiles
      await supabase
        .from('profiles')
        .update({ display_name: userName.trim() })
        .eq('user_id', user.id);
      
      setIsNameStep(false);
      speakText(`Nice to meet you, ${userName}! Now, tell me about yourself. What do you do?`);
      
      // Log to behavioral events
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'feature_discovery_name',
        event_category: 'onboarding',
        metadata: { name: userName }
      });
    } catch (error) {
      console.error('[FeatureDiscovery] Error saving name:', error);
    }
  };

  const handleProfessionSelect = async (profession: ProfessionProfile) => {
    setSelectedProfession(profession);
    setDiscoveredFeatures(profession.features);
    
    if (!user?.id) return;
    
    try {
      // Save profession to DHF profile
      const { data: existing } = await supabase
        .from('dhf_phoenix_profile')
        .select('vocabulary_signature')
        .eq('user_id', user.id)
        .single();
      
      const currentVocab = (existing?.vocabulary_signature as Record<string, unknown>) || {};
      
      await supabase
        .from('dhf_phoenix_profile')
        .upsert({
          user_id: user.id,
          vocabulary_signature: {
            ...currentVocab,
            profession: profession.id,
            profession_name: profession.name,
            discovered_at: new Date().toISOString()
          }
        }, { onConflict: 'user_id' });
      
      // Speak introduction
      const intro = `Perfect, ${userName || 'friend'}! As a ${profession.name}, I've curated ${profession.features.length} powerful features for you. ${profession.dailyTips[0]}. Would you like me to walk you through each one?`;
      speakText(intro);
      
      // Log event
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'profession_selected',
        event_category: 'feature_discovery',
        metadata: { profession: profession.id, profession_name: profession.name }
      });
    } catch (error) {
      console.error('[FeatureDiscovery] Error saving profession:', error);
    }
  };

  const explainFeature = (feature: FeatureRecommendation) => {
    speakText(`${feature.name}: ${feature.description}. You can say "${feature.voiceCommand}" to access this feature.`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 overflow-y-auto"
      >
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className={cn(
                  "w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center",
                  isSpeaking && "animate-pulse"
                )}>
                  <Brain className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {isNameStep ? 'Welcome! Let\'s Get to Know Each Other' : 
                 selectedProfession ? `Features for ${selectedProfession.name}` :
                 'What Do You Do?'}
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                {isNameStep ? 'Zoe DHF will personalize your experience' :
                 selectedProfession ? 'Curated features based on your profession' :
                 'Select your profession or interest to discover relevant features'}
              </p>
            </CardHeader>

            <CardContent>
              {/* Name Step */}
              {isNameStep && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex gap-2">
                    <Input
                      placeholder="What's your name?"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                      className="text-lg"
                    />
                    {voiceEnabled && (
                      <Button 
                        variant="outline" 
                        onClick={startNameVoiceInput}
                        className={cn(isListeningForName && "bg-primary/20 border-primary animate-pulse")}
                      >
                        <Mic className={cn("w-4 h-4", isListeningForName && "text-primary")} />
                      </Button>
                    )}
                    <Button onClick={handleNameSubmit} disabled={!userName.trim()}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  {voiceEnabled && (
                    <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                      <Mic className="w-4 h-4" /> {isListeningForName ? 'Listening... Say your name' : 'Tap mic or say "Zoe, my name is..."'}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Profession Selection */}
              {!isNameStep && !selectedProfession && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {PROFESSION_CATALOG.map((profession) => (
                        <Button
                          key={profession.id}
                          variant="outline"
                          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary"
                          onClick={() => handleProfessionSelect(profession)}
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {profession.icon}
                          </div>
                          <span className="text-sm font-medium">{profession.name}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                  {voiceEnabled && (
                    <p className="text-sm text-muted-foreground text-center mt-4 flex items-center justify-center gap-2">
                      <Mic className="w-4 h-4" /> Say "Zoe, I'm a graphic designer" or your profession
                    </p>
                  )}
                </motion.div>
              )}

              {/* Feature Discovery */}
              {selectedProfession && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-3">
                      {discoveredFeatures.map((feature, idx) => (
                        <motion.div
                          key={feature.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <Card className="p-4 hover:bg-primary/5 cursor-pointer" onClick={() => explainFeature(feature)}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{feature.name}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {feature.relevanceScore}/10
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                                <p className="text-xs text-primary mt-2 flex items-center gap-1">
                                  <Mic className="w-3 h-3" /> "{feature.voiceCommand}"
                                </p>
                              </div>
                              <Button variant="ghost" size="icon">
                                <Volume2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Daily Tips */}
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-primary" /> Daily Tips for You
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {selectedProfession.dailyTips.map((tip, idx) => (
                        <li key={idx}>• {tip}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Voice Commands */}
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Mic className="w-4 h-4 text-primary" /> Try These Voice Commands
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfession.voiceCommands.map((cmd, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {cmd}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setSelectedProfession(null)}>
                      Change Profession
                    </Button>
                    <Button onClick={onClose} className="flex-1">
                      Start Exploring
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Universal Features Section */}
          {selectedProfession && (
            <Card className="mt-4 border-muted">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Universal Features for Everyone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {UNIVERSAL_FEATURES.map((feature, idx) => (
                    <div key={idx} className="p-2 text-sm">
                      <span className="font-medium">{feature.name}</span>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Close Button */}
          <div className="text-center mt-4">
            <Button variant="ghost" onClick={onClose}>
              {voiceEnabled ? 'Say "Zoe, close" or click to exit' : 'Close'}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZoeFeatureDiscovery;
