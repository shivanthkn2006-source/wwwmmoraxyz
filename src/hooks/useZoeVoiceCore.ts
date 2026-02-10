import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// The "Zoe Omega" Command Structure - Ready Player One Style
export interface VRCoreCommand {
  category: 'navigation' | 'movement' | 'action' | 'control' | 'environment' | 'interaction' | 'creation';
  action: string;
  description: string;
  phrase: string[];
  voiceResponse: string;
}

export const VR_CORE_COMMANDS: VRCoreCommand[] = [
  // READY PLAYER ONE STYLE CREATION COMMANDS
  { 
    category: 'creation', 
    action: 'SPAWN_CITY_CYBERPUNK', 
    description: 'Construct Cyberpunk City', 
    phrase: ['build neon city', 'construct sector 7', 'load cyberpunk assets', 'spawn cyberpunk city'],
    voiceResponse: 'Initiating Cyberpunk City construction protocol...'
  },
  { 
    category: 'creation', 
    action: 'SPAWN_CITY_FUTURISTIC', 
    description: 'Build Futuristic Metropolis', 
    phrase: ['build future city', 'create metropolis', 'spawn utopia'],
    voiceResponse: 'Generating futuristic metropolis architecture...'
  },
  { 
    category: 'creation', 
    action: 'SPAWN_NATURE_FOREST', 
    description: 'Generate Forest Environment', 
    phrase: ['create forest', 'spawn trees', 'build nature', 'generate woods', 'make forest', 'add trees'],
    voiceResponse: 'Spawning natural forest environment...'
  },
  { 
    category: 'creation', 
    action: 'SPAWN_VEHICLE_CAR', 
    description: 'Spawn Vehicle', 
    phrase: ['spawn car', 'create vehicle', 'generate car', 'build car', 'add car', 'make car', 'spawn vehicle'],
    voiceResponse: 'Materializing vehicle in proximity...'
  },
  { 
    category: 'creation', 
    action: 'SPAWN_ROAD', 
    description: 'Create Road', 
    phrase: ['create road', 'build road', 'spawn road', 'make road', 'add road', 'generate highway', 'build highway'],
    voiceResponse: 'Constructing road infrastructure...'
  },
  { 
    category: 'action', 
    action: 'START_ALL_CARS', 
    description: 'Start All Vehicles', 
    phrase: ['start all cars', 'run all cars', 'drive cars', 'activate vehicles', 'cars go'],
    voiceResponse: 'Activating all vehicle engines...'
  },
  { 
    category: 'action', 
    action: 'STOP_ALL_CARS', 
    description: 'Stop All Vehicles', 
    phrase: ['stop all cars', 'park cars', 'stop vehicles', 'cars stop'],
    voiceResponse: 'All vehicles stopping...'
  },
  { 
    category: 'creation', 
    action: 'SPAWN_BUILDING', 
    description: 'Construct Building', 
    phrase: ['build building', 'create structure', 'spawn tower', 'construct skyscraper'],
    voiceResponse: 'Constructing architectural structure...'
  },
  // 360° ROTATION COMMANDS
  { 
    category: 'movement', 
    action: 'ROTATE_LEFT', 
    description: 'Rotate View Left 45°', 
    phrase: ['rotate left', 'turn left', 'look left', 'spin left'],
    voiceResponse: 'Rotating view left...'
  },
  { 
    category: 'movement', 
    action: 'ROTATE_RIGHT', 
    description: 'Rotate View Right 45°', 
    phrase: ['rotate right', 'turn right', 'look right', 'spin right'],
    voiceResponse: 'Rotating view right...'
  },
  { 
    category: 'movement', 
    action: 'ROTATE_180', 
    description: 'Turn Around 180°', 
    phrase: ['turn around', 'rotate 180', 'look behind', 'look back', 'about face'],
    voiceResponse: 'Executing 180 degree turn...'
  },
  { 
    category: 'movement', 
    action: 'ROTATE_360', 
    description: 'Full 360° Spin', 
    phrase: ['full spin', 'rotate 360', 'spin around', 'full rotation', 'look around'],
    voiceResponse: 'Initiating full rotation scan...'
  },
  
  // NAVIGATION COMMANDS
  { 
    category: 'navigation', 
    action: 'TELEPORT_HOME', 
    description: 'Return to Hub', 
    phrase: ['take me home', 'exit simulation', 'return to base', 'go home', 'teleport home'],
    voiceResponse: 'Initiating teleport sequence to home base...'
  },
  { 
    category: 'navigation', 
    action: 'TELEPORT_FORWARD', 
    description: 'Teleport Forward', 
    phrase: ['teleport forward', 'jump ahead', 'blink forward'],
    voiceResponse: 'Spatial displacement forward initiated...'
  },
  
  // MOVEMENT COMMANDS
  { 
    category: 'movement', 
    action: 'MOVEMENT_RUN', 
    description: 'Sprint Mode', 
    phrase: ['run fast', 'sprint', 'move quickly', 'speed up'],
    voiceResponse: 'Engaging sprint protocol...'
  },
  { 
    category: 'movement', 
    action: 'MOVEMENT_FLY', 
    description: 'Flight Mode', 
    phrase: ['fly high', 'take flight', 'ascend', 'hover up', 'fly above'],
    voiceResponse: 'Activating flight systems...'
  },
  { 
    category: 'movement', 
    action: 'MOVEMENT_GLIDE', 
    description: 'Glide Mode', 
    phrase: ['glide down', 'float', 'descend slowly', 'parachute'],
    voiceResponse: 'Engaging glide mechanism...'
  },
  
  // ENVIRONMENT COMMANDS
  { 
    category: 'environment', 
    action: 'SET_ATMOSPHERE_RAIN', 
    description: 'Weather: Neon Rain', 
    phrase: ['make it rain', 'set weather to storm', 'mood rain', 'start rain'],
    voiceResponse: 'Atmospheric modification: Rain activated...'
  },
  { 
    category: 'environment', 
    action: 'SET_ATMOSPHERE_CLEAR', 
    description: 'Weather: Clear Sky', 
    phrase: ['clear sky', 'sunny day', 'stop rain', 'bright weather'],
    voiceResponse: 'Atmospheric modification: Clear skies...'
  },
  { 
    category: 'environment', 
    action: 'SET_TIME_NIGHT', 
    description: 'Set Night Time', 
    phrase: ['make it night', 'set night', 'dark mode', 'nightfall'],
    voiceResponse: 'Temporal shift: Night mode engaged...'
  },
  { 
    category: 'environment', 
    action: 'SET_TIME_DAY', 
    description: 'Set Day Time', 
    phrase: ['make it day', 'set day', 'sunrise', 'daylight'],
    voiceResponse: 'Temporal shift: Day mode engaged...'
  },
  
  // CONTROL COMMANDS
  { 
    category: 'control', 
    action: 'SYSTEM_DIAGNOSTIC', 
    description: 'Run Omega Diagnostics', 
    phrase: ['check system', 'run diagnostics', 'status report', 'system check'],
    voiceResponse: 'Initiating Omega system diagnostics...'
  },
  { 
    category: 'control', 
    action: 'TOGGLE_HUD', 
    description: 'Toggle HUD Display', 
    phrase: ['toggle hud', 'show interface', 'hide interface', 'toggle display'],
    voiceResponse: 'HUD visibility toggled...'
  },
  { 
    category: 'control', 
    action: 'RESET_POSITION', 
    description: 'Reset Position', 
    phrase: ['reset position', 'go to origin', 'center me', 'reset view'],
    voiceResponse: 'Resetting spatial coordinates to origin...'
  },
  
  // INTERACTION COMMANDS
  { 
    category: 'interaction', 
    action: 'INTERACT_PICKUP', 
    description: 'Pick Up Object', 
    phrase: ['pick up', 'grab this', 'take object', 'hold this'],
    voiceResponse: 'Object acquisition in progress...'
  },
  { 
    category: 'interaction', 
    action: 'INTERACT_DROP', 
    description: 'Drop Object', 
    phrase: ['drop it', 'release object', 'let go', 'put down'],
    voiceResponse: 'Object released...'
  },
  { 
    category: 'interaction', 
    action: 'INTERACT_USE', 
    description: 'Use/Activate Object', 
    phrase: ['use this', 'activate', 'interact', 'engage'],
    voiceResponse: 'Activating object interaction...'
  },
  
  // ACTION COMMANDS
  { 
    category: 'action', 
    action: 'ACTION_REPAIR', 
    description: 'Repair Object', 
    phrase: ['fix this', 'repair object', 'restore', 'mend'],
    voiceResponse: 'Initiating repair protocol...'
  },
  { 
    category: 'action', 
    action: 'ACTION_DESTROY', 
    description: 'Demolish Object', 
    phrase: ['destroy this', 'demolish', 'remove object', 'delete'],
    voiceResponse: 'Demolition sequence initiated...'
  },
  { 
    category: 'action', 
    action: 'ACTION_DUPLICATE', 
    description: 'Clone Object', 
    phrase: ['copy this', 'duplicate', 'clone object', 'replicate'],
    voiceResponse: 'Object replication in progress...'
  },
  
  // GENESIS ENGINE - LEVEL 4 AUTONOMOUS AGENT COMMANDS
  { 
    category: 'control', 
    action: 'GENESIS_DIAGNOSTIC', 
    description: 'Run Genesis System Diagnostic', 
    phrase: ['run diagnostic', 'system scan', 'zoe diagnostic', 'health check', 'scan system'],
    voiceResponse: 'Initiating Genesis Engine diagnostic scan...'
  },
  { 
    category: 'control', 
    action: 'GENESIS_DEEP_SCAN', 
    description: 'Ultra Deep Platform Scan', 
    phrase: ['deep scan', 'ultra scan', 'full scan', 'complete diagnostic', 'analyze everything'],
    voiceResponse: 'Activating ultra deep scan protocol...'
  },
  { 
    category: 'control', 
    action: 'GENESIS_SELF_HEAL', 
    description: 'Self-Healing Mode', 
    phrase: ['fix yourself', 'self heal', 'repair system', 'auto fix', 'heal yourself'],
    voiceResponse: 'Engaging self-healing protocols...'
  },
  { 
    category: 'control', 
    action: 'GENESIS_PROTOCOL', 
    description: 'Execute Protocol Command', 
    phrase: ['initialize protocol', 'execute protocol', 'protocol ready player one', 'protocol cyberpunk', 'activate protocol'],
    voiceResponse: 'Protocol execution initiated...'
  },
  { 
    category: 'control', 
    action: 'GENESIS_STORY_MODE', 
    description: 'Initialize Story Mode', 
    phrase: ['story mode', 'start story', 'begin narrative', 'launch story'],
    voiceResponse: 'Initializing narrative experience...'
  },
  { 
    category: 'control', 
    action: 'GENESIS_LOCKDOWN', 
    description: 'Security Lockdown', 
    phrase: ['lockdown', 'secure mode', 'security lockdown', 'lock everything'],
    voiceResponse: 'Security lockdown engaged...'
  },
];

export type SystemStatus = 'idle' | 'listening' | 'processing' | 'executed' | 'error';

export const useZoeVoiceCore = () => {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<VRCoreCommand | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('idle');
  const [confidenceScore, setConfidenceScore] = useState(0);
  const recognitionRef = useRef<any>(null);

  // Browser Compatibility Check
  const SpeechRecognition = typeof window !== 'undefined' 
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition 
    : null;

  // Log command to DHF
  const logCommandToDHF = useCallback(async (command: VRCoreCommand, rawTranscript: string) => {
    if (!user) return;
    
    try {
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'vr_interaction',
        content_text: `VR Core Command: ${command.action} - "${rawTranscript}"`,
        zoe_state_json: {
          command: command.action,
          category: command.category,
          description: command.description,
          transcript: rawTranscript,
          confidence: confidenceScore
        },
        system_stability_score: 1.0
      });
    } catch (error) {
      console.error('DHF logging error:', error);
    }
  }, [user, confidenceScore]);

  // Process voice command through Zoe Logic
  const processCommand = useCallback((text: string, confidence: number = 0.9) => {
    setSystemStatus('processing');
    setConfidenceScore(confidence);
    
    const normalizedText = text.toLowerCase().trim();
    
    // 1. Exact Phrase Match - Ready Player One style
    const directMatch = VR_CORE_COMMANDS.find(cmd => 
      cmd.phrase.some(p => normalizedText.includes(p))
    );

    if (directMatch) {
      console.log(`[ZOE OMEGA]: Executing Protocol ${directMatch.action}`);
      setLastCommand(directMatch);
      setSystemStatus('executed');
      
      // Dispatch custom event for VR World to handle
      window.dispatchEvent(new CustomEvent('zoe-vr-core-command', {
        detail: {
          action: directMatch.action,
          category: directMatch.category,
          description: directMatch.description,
          voiceResponse: directMatch.voiceResponse
        }
      }));
      
      // Speak response
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(directMatch.voiceResponse);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        speechSynthesis.speak(utterance);
      }
      
      // Log to DHF
      logCommandToDHF(directMatch, text);
      
      toast.success(directMatch.description, {
        description: directMatch.voiceResponse
      });
      
      return directMatch;
    } else {
      // 2. Fallback - Unknown command
      console.log(`[ZOE OMEGA]: Analyzing unknown construct "${text}"...`);
      setSystemStatus('idle');
      
      toast.info('Command not recognized', {
        description: `"${text}" - Try saying a known command`
      });
      
      return null;
    }
  }, [logCommandToDHF]);

  // Start listening for voice commands
  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      console.error("Zoe VR: Voice hardware not detected on this cortical stack.");
      toast.error('Voice not supported', {
        description: 'Speech recognition is not available on this device'
      });
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Command -> Action style
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSystemStatus('listening');
    };
    
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0];
      const commandText = result.transcript.toLowerCase();
      const confidence = result.confidence || 0.9;
      
      setTranscript(commandText);
      processCommand(commandText, confidence);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setSystemStatus('error');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (systemStatus === 'listening') {
        setSystemStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognition, processCommand, systemStatus]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setSystemStatus('idle');
  }, []);

  // Get commands by category
  const getCommandsByCategory = useCallback((category: VRCoreCommand['category']) => {
    return VR_CORE_COMMANDS.filter(cmd => cmd.category === category);
  }, []);

  // Get all commands grouped
  const getAllCommandsGrouped = useCallback(() => {
    const categories: VRCoreCommand['category'][] = ['navigation', 'movement', 'action', 'control', 'environment', 'interaction', 'creation'];
    return categories.reduce((acc, category) => {
      acc[category] = getCommandsByCategory(category);
      return acc;
    }, {} as Record<VRCoreCommand['category'], VRCoreCommand[]>);
  }, [getCommandsByCategory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { 
    isListening, 
    transcript, 
    lastCommand, 
    startListening, 
    stopListening,
    systemStatus,
    confidenceScore,
    processCommand,
    getCommandsByCategory,
    getAllCommandsGrouped,
    commands: VR_CORE_COMMANDS
  };
};
