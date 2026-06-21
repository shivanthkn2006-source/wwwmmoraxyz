// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI: QUANTUM THOUGHT VISUALIZATION UI
// 3D Holographic Brain with 5 Pentarchy Nodes + Truth Meter
// 2120-Style Quantum Processing Display
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Sphere, Line, OrbitControls, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface AgentNode {
  id: string;
  name: string;
  label: string;
  position: [number, number, number];
  color: string;
  status: 'idle' | 'scanning' | 'complete' | 'dissent';
  confidence: number;
}

interface QuantumThoughtProps {
  isProcessing: boolean;
  agentStatuses?: Record<string, { status: string; confidence: number }>;
  overallConfidence?: number;
  currentPhase?: string;
  onComplete?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D PENTARCHY BRAIN NODE
// ═══════════════════════════════════════════════════════════════════════════════

interface BrainNodeProps {
  node: AgentNode;
  isActive: boolean;
}

function BrainNode({ node, isActive }: BrainNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      if (isActive || node.status === 'scanning') {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });
  
  const color = useMemo(() => {
    switch (node.status) {
      case 'scanning': return '#00FFFF';
      case 'complete': return '#00FF88';
      case 'dissent': return '#FF6B6B';
      default: return node.color;
    }
  }, [node.status, node.color]);
  
  const emissiveIntensity = node.status === 'scanning' ? 2 : node.status === 'complete' ? 1 : 0.3;
  
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group position={node.position}>
        {/* Core sphere */}
        <Sphere
          ref={meshRef}
          args={[0.3, 32, 32]}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={emissiveIntensity}
            transparent
            opacity={0.9}
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>
        
        {/* Outer glow ring */}
        {(isActive || node.status === 'scanning') && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.5, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        )}
        
        {/* Label */}
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.15}
          color={hovered ? '#FFFFFF' : '#AAAAAA'}
          anchorX="center"
          anchorY="middle"
        >
          {node.name}
        </Text>
        
        {/* Status indicator */}
        {node.status === 'scanning' && (
          <Text
            position={[0, -0.5, 0]}
            fontSize={0.08}
            color="#00FFFF"
            anchorX="center"
          >
            {node.label}
          </Text>
        )}
        
        {/* Confidence display */}
        {node.status === 'complete' && (
          <Text
            position={[0, -0.5, 0]}
            fontSize={0.1}
            color="#00FF88"
            anchorX="center"
          >
            {Math.round(node.confidence)}%
          </Text>
        )}
      </group>
    </Float>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEURAL CONNECTIONS (Lines between nodes)
// ═══════════════════════════════════════════════════════════════════════════════

interface NeuralConnectionsProps {
  nodes: AgentNode[];
  activeConnections: [number, number][];
}

function NeuralConnections({ nodes, activeConnections }: NeuralConnectionsProps) {
  return (
    <>
      {activeConnections.map(([fromIdx, toIdx], i) => {
        const from = nodes[fromIdx];
        const to = nodes[toIdx];
        if (!from || !to) return null;
        
        const isActive = from.status === 'scanning' || to.status === 'scanning';
        
        return (
          <Line
            key={`connection-${i}`}
            points={[from.position, to.position]}
            color={isActive ? '#00FFFF' : '#333366'}
            lineWidth={isActive ? 2 : 1}
            transparent
            opacity={isActive ? 0.8 : 0.3}
          />
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CENTRAL SYNTHESIZER CORE
// ═══════════════════════════════════════════════════════════════════════════════

interface CentralCoreProps {
  isProcessing: boolean;
  phase: string;
}

function CentralCore({ isProcessing, phase }: CentralCoreProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (coreRef.current) {
      coreRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      coreRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      
      if (isProcessing) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        coreRef.current.scale.setScalar(scale);
      }
    }
  });
  
  return (
    <Float speed={1} floatIntensity={0.3}>
      <group>
        {/* Central icosahedron */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial
            color="#8B5CF6"
            emissive="#8B5CF6"
            emissiveIntensity={isProcessing ? 1.5 : 0.5}
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>
        
        {/* Inner glow */}
        <Sphere args={[0.3, 32, 32]}>
          <meshStandardMaterial
            color="#C084FC"
            emissive="#C084FC"
            emissiveIntensity={isProcessing ? 2 : 0.5}
            transparent
            opacity={0.5}
          />
        </Sphere>
        
        {/* Phase label */}
        <Text
          position={[0, -1, 0]}
          fontSize={0.12}
          color="#C084FC"
          anchorX="center"
        >
          {phase}
        </Text>
      </group>
    </Float>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D BRAIN SCENE
// ═══════════════════════════════════════════════════════════════════════════════

interface BrainSceneProps {
  nodes: AgentNode[];
  isProcessing: boolean;
  phase: string;
}

function BrainScene({ nodes, isProcessing, phase }: BrainSceneProps) {
  // All possible connections between nodes
  const allConnections: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 2], [1, 3], [1, 4],
    [2, 3], [2, 4],
    [3, 4]
  ];
  
  return (
    <>
      {/* Background stars */}
      <Stars radius={50} depth={50} count={1000} factor={2} fade speed={1} />
      
      {/* Ambient and point lights */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#8B5CF6" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00FFFF" />
      
      {/* Central synthesizer */}
      <CentralCore isProcessing={isProcessing} phase={phase} />
      
      {/* Neural connections */}
      <NeuralConnections nodes={nodes} activeConnections={allConnections} />
      
      {/* Pentarchy nodes */}
      {nodes.map((node, idx) => (
        <BrainNode 
          key={node.id} 
          node={node} 
          isActive={isProcessing && node.status === 'scanning'}
        />
      ))}
      
      {/* Camera controls */}
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 3}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTH METER BADGE
// ═══════════════════════════════════════════════════════════════════════════════

interface TruthMeterProps {
  confidence: number;
  isVisible: boolean;
}

function TruthMeter({ confidence, isVisible }: TruthMeterProps) {
  const getConfidenceColor = () => {
    if (confidence >= 95) return 'from-emerald-500 to-emerald-400';
    if (confidence >= 80) return 'from-blue-500 to-cyan-400';
    if (confidence >= 60) return 'from-yellow-500 to-orange-400';
    return 'from-red-500 to-pink-400';
  };
  
  const getConfidenceLabel = () => {
    if (confidence >= 95) return 'QUANTUM VERIFIED';
    if (confidence >= 80) return 'HIGH CERTAINTY';
    if (confidence >= 60) return 'MODERATE CONFIDENCE';
    return 'PROBABILITY RANGE';
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          className="flex items-center gap-3 px-4 py-2 rounded-full bg-background/80 backdrop-blur-lg border border-primary/30"
        >
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getConfidenceColor()} flex items-center justify-center`}>
            {confidence >= 80 ? (
              <CheckCircle2 className="w-6 h-6 text-white" />
            ) : (
              <AlertCircle className="w-6 h-6 text-white" />
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {getConfidenceLabel()}
            </span>
            <span className={`text-2xl font-bold bg-gradient-to-r ${getConfidenceColor()} bg-clip-text text-transparent`}>
              {confidence.toFixed(1)}%
            </span>
          </div>
          
          <div className="ml-2 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs text-primary">Calculated Reality</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNING STATUS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

interface ScanningStatusProps {
  nodes: AgentNode[];
}

function ScanningStatus({ nodes }: ScanningStatusProps) {
  const activeNode = nodes.find(n => n.status === 'scanning');
  
  return (
    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 justify-center">
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            scale: node.status === 'scanning' ? 1.05 : 1
          }}
          className={`
            px-3 py-1.5 rounded-full text-xs font-medium
            transition-all duration-300
            ${node.status === 'scanning' 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
              : node.status === 'complete'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-muted/50 text-muted-foreground'
            }
          `}
        >
          {node.status === 'scanning' ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              {node.label}
            </span>
          ) : node.status === 'complete' ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              {node.name} ✓
            </span>
          ) : (
            node.name
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_NODES: AgentNode[] = [
  { id: 'historian', name: 'CHRONOS', label: 'Scanning Ancient Wisdom...', position: [-1.5, 1, 0], color: '#FFD700', status: 'idle', confidence: 0 },
  { id: 'astronomer', name: 'STELLA', label: 'Calculating Star Charts...', position: [1.5, 1, 0], color: '#00BFFF', status: 'idle', confidence: 0 },
  { id: 'psychologist', name: 'PSYCHE', label: 'Analyzing Emotions...', position: [-1.5, -0.5, 0.8], color: '#FF69B4', status: 'idle', confidence: 0 },
  { id: 'strategist', name: 'ATHENA', label: 'Computing Probabilities...', position: [1.5, -0.5, 0.8], color: '#32CD32', status: 'idle', confidence: 0 },
  { id: 'synthesizer', name: 'UNITY', label: 'Synthesizing Truth...', position: [0, -1.2, -0.5], color: '#9370DB', status: 'idle', confidence: 0 }
];

export function QuantumThoughtVisualization({
  isProcessing,
  agentStatuses = {},
  overallConfidence = 0,
  currentPhase = 'IDLE',
  onComplete
}: QuantumThoughtProps) {
  const [nodes, setNodes] = useState<AgentNode[]>(DEFAULT_NODES);
  const [scanSequence, setScanSequence] = useState(0);
  const [showTruthMeter, setShowTruthMeter] = useState(false);
  
  // Simulate scanning sequence when processing
  useEffect(() => {
    if (!isProcessing) {
      setScanSequence(0);
      setShowTruthMeter(false);
      setNodes(DEFAULT_NODES);
      return;
    }
    
    // Animate through each agent
    const sequence = [
      { idx: 0, delay: 0 },     // Historian
      { idx: 1, delay: 500 },   // Astronomer  
      { idx: 2, delay: 1000 },  // Psychologist
      { idx: 3, delay: 1500 },  // Strategist
      { idx: 4, delay: 2500 }   // Synthesizer
    ];
    
    const timeouts: NodeJS.Timeout[] = [];
    
    sequence.forEach(({ idx, delay }) => {
      // Start scanning
      timeouts.push(setTimeout(() => {
        setNodes(prev => prev.map((node, i) => ({
          ...node,
          status: i === idx ? 'scanning' : (i < idx ? 'complete' : 'idle'),
          confidence: i < idx ? 70 + Math.random() * 25 : 0
        })));
        setScanSequence(idx);
      }, delay));
      
      // Complete scanning (except synthesizer)
      if (idx < 4) {
        timeouts.push(setTimeout(() => {
          setNodes(prev => prev.map((node, i) => ({
            ...node,
            status: i === idx ? 'complete' : node.status,
            confidence: i === idx ? 70 + Math.random() * 25 : node.confidence
          })));
        }, delay + 800));
      }
    });
    
    // Show truth meter after all complete
    timeouts.push(setTimeout(() => {
      setNodes(prev => prev.map(node => ({
        ...node,
        status: 'complete',
        confidence: 70 + Math.random() * 25
      })));
      setShowTruthMeter(true);
      onComplete?.();
    }, 4000));
    
    return () => timeouts.forEach(clearTimeout);
  }, [isProcessing, onComplete]);
  
  // Update nodes from external agent statuses
  useEffect(() => {
    if (Object.keys(agentStatuses).length > 0) {
      setNodes(prev => prev.map(node => {
        const status = agentStatuses[node.id];
        if (status) {
          return {
            ...node,
            status: status.status === 'complete' ? 'complete' : 
                   status.status === 'scanning' ? 'scanning' : 'idle',
            confidence: status.confidence * 100
          };
        }
        return node;
      }));
    }
  }, [agentStatuses]);
  
  const currentPhaseLabel = useMemo(() => {
    if (!isProcessing) return 'AWAITING QUERY';
    const activeNode = nodes.find(n => n.status === 'scanning');
    return activeNode?.label || currentPhase || 'SYNTHESIZING...';
  }, [isProcessing, nodes, currentPhase]);
  
  return (
    <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 border border-primary/20">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className={`w-5 h-5 ${isProcessing ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium text-foreground">
            Quantum Pentarchy Core
          </span>
        </div>
        
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium
          ${isProcessing 
            ? 'bg-primary/20 text-primary border border-primary/30' 
            : 'bg-muted text-muted-foreground'
          }
        `}>
          {isProcessing ? 'PROCESSING' : 'STANDBY'}
        </div>
      </div>
      
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <BrainScene 
          nodes={nodes} 
          isProcessing={isProcessing}
          phase={currentPhaseLabel}
        />
      </Canvas>
      
      {/* Scanning status */}
      {isProcessing && <ScanningStatus nodes={nodes} />}
      
      {/* Truth Meter */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
        <TruthMeter 
          confidence={overallConfidence || nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length}
          isVisible={showTruthMeter && !isProcessing}
        />
      </div>
    </div>
  );
}

export default QuantumThoughtVisualization;
