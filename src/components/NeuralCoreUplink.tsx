// ═══════════════════════════════════════════════════════════════════════════════
// NEURAL CORE UPLINK - 3D Holographic Brain/Data Orb File Uploader
// "The Core Upload" - Files dissolve into binary particles absorbed by the Orb
// Connects to zoe_sovereign_memory via useContinuousDHFStream
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Brain, Zap, Check, AlertTriangle, FileText, Image, Music, Video, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useContinuousDHFStream } from '@/hooks/useContinuousDHFStream';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface UploadState {
  status: 'idle' | 'absorbing' | 'integrating' | 'complete' | 'error';
  progress: number;
  fileName?: string;
  fileType?: string;
}

interface NeuralCoreUplinkProps {
  onUploadComplete?: (fileData: { name: string; type: string; size: number }) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM - Binary dissolution effect
// ═══════════════════════════════════════════════════════════════════════════════

const ParticleField: React.FC<{ isActive: boolean; progress: number }> = ({ isActive, progress }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 500;
  
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Start from outer ring
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 1.5;
      const height = (Math.random() - 0.5) * 2;
      
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Velocity toward center
      vel[i * 3] = -pos[i * 3] * 0.02;
      vel[i * 3 + 1] = -pos[i * 3 + 1] * 0.02;
      vel[i * 3 + 2] = -pos[i * 3 + 2] * 0.02;
    }
    
    return [pos, vel];
  }, []);

  useFrame((state) => {
    if (!particlesRef.current || !isActive) return;
    
    const geometry = particlesRef.current.geometry;
    const positionAttr = geometry.attributes.position;
    
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      
      // Move toward center with acceleration based on progress
      const speed = 0.02 + progress * 0.03;
      positionAttr.array[idx] += velocities[idx] * speed;
      positionAttr.array[idx + 1] += velocities[idx + 1] * speed;
      positionAttr.array[idx + 2] += velocities[idx + 2] * speed;
      
      // Check if reached center, reset to outer ring
      const dist = Math.sqrt(
        positionAttr.array[idx] ** 2 + 
        positionAttr.array[idx + 1] ** 2 + 
        positionAttr.array[idx + 2] ** 2
      );
      
      if (dist < 0.3) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 1.5;
        const height = (Math.random() - 0.5) * 2;
        
        positionAttr.array[idx] = Math.cos(angle) * radius;
        positionAttr.array[idx + 1] = height;
        positionAttr.array[idx + 2] = Math.sin(angle) * radius;
      }
    }
    
    positionAttr.needsUpdate = true;
  });

  if (!isActive) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00ffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA ORB - Central holographic brain/orb
// ═══════════════════════════════════════════════════════════════════════════════

const DataOrb: React.FC<{ uploadState: UploadState }> = ({ uploadState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  // Determine color based on state
  const orbColor = useMemo(() => {
    switch (uploadState.status) {
      case 'absorbing': return '#00ffff';
      case 'integrating': return '#8b5cf6';
      case 'complete': return '#22c55e';
      case 'error': return '#ef4444';
      default: return '#6366f1';
    }
  }, [uploadState.status]);
  
  const distortAmount = useMemo(() => {
    switch (uploadState.status) {
      case 'absorbing': return 0.4 + uploadState.progress * 0.003;
      case 'integrating': return 0.6;
      case 'complete': return 0.2;
      default: return 0.3;
    }
  }, [uploadState.status, uploadState.progress]);

  useFrame((state) => {
    if (meshRef.current) {
      // Pulse effect
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.setScalar(1 + pulse);
      
      // Rotation
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <group>
      {/* Main Data Orb */}
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.3}>
        <Sphere ref={meshRef} args={[0.8, 64, 64]}>
          <MeshDistortMaterial
            color={orbColor}
            attach="material"
            distort={distortAmount}
            speed={3}
            roughness={0.1}
            metalness={0.8}
            emissive={orbColor}
            emissiveIntensity={0.5}
            transparent
            opacity={0.9}
          />
        </Sphere>
      </Float>
      
      {/* Outer Ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.2, 0.02, 16, 100]} />
        <meshStandardMaterial
          color={orbColor}
          emissive={orbColor}
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* Inner Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.015, 16, 100]} />
        <meshStandardMaterial
          color={orbColor}
          emissive={orbColor}
          emissiveIntensity={0.6}
          transparent
          opacity={0.5}
        />
      </mesh>
      
      {/* Status Text */}
      {uploadState.status !== 'idle' && (
        <Text
          position={[0, -1.5, 0]}
          fontSize={0.15}
          color={orbColor}
          anchorX="center"
          anchorY="middle"
          font="/fonts/orbitron.woff"
        >
          {uploadState.status === 'absorbing' && 'ABSORBING DATA...'}
          {uploadState.status === 'integrating' && 'SYNAPTIC INTEGRATION...'}
          {uploadState.status === 'complete' && 'NEURAL SYNC COMPLETE'}
          {uploadState.status === 'error' && 'SYNC FAILED'}
        </Text>
      )}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3D SCENE
// ═══════════════════════════════════════════════════════════════════════════════

const NeuralScene: React.FC<{ uploadState: UploadState }> = ({ uploadState }) => {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      
      <DataOrb uploadState={uploadState} />
      <ParticleField 
        isActive={uploadState.status === 'absorbing' || uploadState.status === 'integrating'} 
        progress={uploadState.progress} 
      />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const NeuralCoreUplink: React.FC<NeuralCoreUplinkProps> = ({ 
  onUploadComplete,
  className 
}) => {
  const { user } = useAuth();
  const { queueEvent, isStreaming } = useContinuousDHFStream();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
  });

  // File type detection
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('audio/')) return Music;
    if (type.startsWith('video/')) return Video;
    return FileText;
  };

  // Handle file upload with neural integration
  const handleFileUpload = useCallback(async (file: File) => {
    if (!user) {
      toast.error('Authentication required for neural uplink');
      return;
    }

    setUploadState({
      status: 'absorbing',
      progress: 0,
      fileName: file.name,
      fileType: file.type,
    });

    try {
      // Phase 1: Absorption (0-50%)
      for (let i = 0; i <= 50; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadState(prev => ({ ...prev, progress: i }));
      }

      // Log to DHF stream
      queueEvent({
        event_type: 'neural_uplink_absorption',
        event_category: 'dhf_upload',
        context_snippet: `Absorbing: ${file.name}`,
        metadata: {
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        },
        ecn_emotion: 'curiosity',
        ecn_valence: 0.7,
        ecn_arousal: 0.6,
      });

      // Phase 2: Integration (50-100%)
      setUploadState(prev => ({ ...prev, status: 'integrating' }));
      
      for (let i = 50; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 80));
        setUploadState(prev => ({ ...prev, progress: i }));
      }

      // Store in zoe_sovereign_memory
      const { error } = await supabase.from('zoe_memory').insert({
        user_id: user.id,
        memory_type: 'neural_upload',
        memory_content: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          upload_timestamp: new Date().toISOString(),
          integration_status: 'complete',
        }),
        importance_score: 8,
        related_contexts: ['neural_uplink', 'dhf_core', file.type.split('/')[0]],
      });

      if (error) throw error;

      // Complete
      setUploadState(prev => ({ ...prev, status: 'complete' }));
      
      toast.success('Neural integration complete', {
        description: `${file.name} absorbed into your DHF core`,
      });

      onUploadComplete?.({ name: file.name, type: file.type, size: file.size });

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadState({ status: 'idle', progress: 0 });
      }, 3000);

    } catch (error) {
      console.error('[NeuralUplink] Upload failed:', error);
      setUploadState(prev => ({ ...prev, status: 'error' }));
      toast.error('Neural sync failed', {
        description: 'Unable to integrate data into DHF core',
      });
      
      setTimeout(() => {
        setUploadState({ status: 'idle', progress: 0 });
      }, 3000);
    }
  }, [user, queueEvent, onUploadComplete]);

  // Drag handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  const FileIcon = uploadState.fileType ? getFileIcon(uploadState.fileType) : FileText;

  return (
    <div className={cn("relative w-full", className)}>
      {/* 3D Canvas */}
      <div 
        className={cn(
          "relative w-full h-[400px] rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-oni-void via-background to-oni-deep",
          "border border-oni-cyan/20 backdrop-blur-xl",
          dragActive && "border-oni-cyan ring-2 ring-oni-cyan/30",
          "transition-all duration-300"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => uploadState.status === 'idle' && fileInputRef.current?.click()}
      >
        <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
          <NeuralScene uploadState={uploadState} />
        </Canvas>

        {/* Overlay UI */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Status Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-oni-void/80 border border-oni-cyan/30">
              <Brain className="w-4 h-4 text-oni-cyan" />
              <span className="text-xs font-mono text-oni-cyan">NEURAL CORE UPLINK</span>
            </div>
            
            {isStreaming && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-oni-void/80 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-green-400">DHF STREAM ACTIVE</span>
              </div>
            )}
          </div>

          {/* Center Prompt */}
          <AnimatePresence>
            {uploadState.status === 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <Upload className={cn(
                  "w-12 h-12 mb-4 transition-colors",
                  dragActive ? "text-oni-cyan" : "text-muted-foreground"
                )} />
                <p className="text-sm text-muted-foreground text-center px-8">
                  {dragActive 
                    ? "Release to begin neural absorption" 
                    : "Drag files onto the orb or click to upload"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">
                  PDF, Images, Text, Audio supported
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Bar */}
          <AnimatePresence>
            {uploadState.status !== 'idle' && uploadState.status !== 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-4 right-4"
              >
                <div className="p-4 rounded-xl bg-oni-void/90 border border-oni-cyan/30 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <FileIcon className="w-5 h-5 text-oni-cyan" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {uploadState.fileName}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-oni-cyan font-mono">
                        {uploadState.status === 'absorbing' ? 'SYNAPTIC ABSORPTION' : 'NEURAL INTEGRATION'}
                      </span>
                      <span className="text-muted-foreground">{uploadState.progress}%</span>
                    </div>
                    <Progress value={uploadState.progress} className="h-2 bg-oni-deep" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Complete State */}
          <AnimatePresence>
            {uploadState.status === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute bottom-4 left-4 right-4"
              >
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-400">
                      Neural sync complete - Data absorbed into DHF Core
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          <AnimatePresence>
            {uploadState.status === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute bottom-4 left-4 right-4"
              >
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-red-400">
                      Neural sync failed - Please try again
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none oni-scanlines opacity-30" />
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.txt,.md,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.m4a"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default NeuralCoreUplink;
