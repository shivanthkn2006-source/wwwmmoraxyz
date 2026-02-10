// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY ARTIFACT MINTER - Crystallize Zoe skills/memories into tradeable artifacts
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshTransmissionMaterial, Environment } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as THREE from 'three';

// 3D Crystal Component
const DataCrystal: React.FC<{ rarity: string; isSpinning: boolean }> = ({ rarity, isSpinning }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const getCrystalColor = () => {
    switch (rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#9D4EDD';
      case 'rare': return '#00D9FF';
      default: return '#00FF88';
    }
  };

  useFrame((state) => {
    if (meshRef.current && isSpinning) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} scale={1.5}>
      <octahedronGeometry args={[1, 0]} />
      <MeshTransmissionMaterial
        backside
        samples={16}
        thickness={0.5}
        chromaticAberration={0.5}
        anisotropy={0.3}
        distortion={0.3}
        distortionScale={0.5}
        temporalDistortion={0.1}
        color={getCrystalColor()}
        attenuationDistance={0.5}
        attenuationColor={getCrystalColor()}
      />
    </mesh>
  );
};

interface LegacyArtifactMinterProps {
  isOpen: boolean;
  onClose: () => void;
  agentStats: {
    skill_creativity: number;
    skill_logic: number;
    skill_empathy: number;
    skill_security: number;
    experience_level: number;
  } | null;
}

export const LegacyArtifactMinter: React.FC<LegacyArtifactMinterProps> = ({
  isOpen,
  onClose,
  agentStats
}) => {
  const { user } = useAuth();
  const [artifactName, setArtifactName] = useState('');
  const [artifactDescription, setArtifactDescription] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('creativity');
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  const skills = [
    { key: 'creativity', label: 'Creativity', color: 'text-pink-400', value: agentStats?.skill_creativity || 0 },
    { key: 'logic', label: 'Logic', color: 'text-cyan-400', value: agentStats?.skill_logic || 0 },
    { key: 'empathy', label: 'Empathy', color: 'text-purple-400', value: agentStats?.skill_empathy || 0 },
    { key: 'security', label: 'Security', color: 'text-yellow-400', value: agentStats?.skill_security || 0 }
  ];

  const calculateRarity = useCallback(() => {
    const skill = skills.find(s => s.key === selectedSkill);
    const value = skill?.value || 0;
    const level = agentStats?.experience_level || 1;
    
    const score = (value * 0.7) + (level * 0.03);
    
    if (score >= 0.9) return 'legendary';
    if (score >= 0.7) return 'epic';
    if (score >= 0.5) return 'rare';
    return 'common';
  }, [selectedSkill, agentStats, skills]);

  const rarity = calculateRarity();

  const handleMint = async () => {
    if (!user?.id || !artifactName.trim()) {
      toast.error('Please enter an artifact name');
      return;
    }

    setIsMinting(true);

    try {
      const skill = skills.find(s => s.key === selectedSkill);
      
      const { error } = await supabase
        .from('legacy_artifacts')
        .insert({
          creator_id: user.id,
          owner_id: user.id,
          artifact_type: 'skill_crystal',
          artifact_name: artifactName.trim(),
          artifact_description: artifactDescription.trim() || null,
          skill_boost: {
            [selectedSkill]: Math.round((skill?.value || 0.5) * 0.1 * 100) / 100
          },
          rarity,
          is_tradeable: true,
          dhf_verified: true
        });

      if (error) throw error;

      // Log to DHF
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'artifact_minted',
        event_category: 'agentic_economy',
        metadata: {
          artifact_name: artifactName,
          skill: selectedSkill,
          rarity
        },
        dhf_logged: true
      });

      setMintSuccess(true);
      toast.success('Artifact crystallized successfully!');
      
      setTimeout(() => {
        setMintSuccess(false);
        setArtifactName('');
        setArtifactDescription('');
        onClose();
      }, 2000);
    } catch (err) {
      console.error('[ArtifactMinter] Mint failed:', err);
      toast.error('Failed to mint artifact');
    } finally {
      setIsMinting(false);
    }
  };

  const getRarityColor = () => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'epic': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
      case 'rare': return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
      default: return 'text-green-400 border-green-400/30 bg-green-400/10';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              "relative w-full max-w-lg p-6 rounded-2xl",
              "bg-gradient-to-br from-card via-card to-primary/5",
              "border border-primary/30"
            )}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-foreground font-orbitron">
                Legacy Artifact Minter
              </h2>
              <p className="text-xs text-muted-foreground">
                Crystallize your Zoe's skills into tradeable artifacts
              </p>
            </div>

            {/* 3D Crystal Preview */}
            <div className="h-48 mb-4 rounded-xl overflow-hidden bg-black/30">
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }>
                <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                  <DataCrystal rarity={rarity} isSpinning={!isMinting} />
                  <OrbitControls enableZoom={false} autoRotate={false} />
                  <Environment preset="city" />
                </Canvas>
              </Suspense>
            </div>

            {/* Rarity badge */}
            <div className="flex justify-center mb-4">
              <span className={cn(
                "px-3 py-1 text-xs font-mono uppercase rounded-full border",
                getRarityColor()
              )}>
                {rarity} Artifact
              </span>
            </div>

            {/* Skill selector */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-2 block">Skill to Crystallize</label>
              <div className="grid grid-cols-4 gap-2">
                {skills.map(skill => (
                  <button
                    key={skill.key}
                    onClick={() => setSelectedSkill(skill.key)}
                    className={cn(
                      "p-2 rounded-lg text-xs font-medium transition-all",
                      "border",
                      selectedSkill === skill.key
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-card/50 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <div className={skill.color}>{skill.label}</div>
                    <div className="text-[10px] opacity-70">{Math.round(skill.value * 100)}%</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Artifact name */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1 block">Artifact Name</label>
              <Input
                value={artifactName}
                onChange={(e) => setArtifactName(e.target.value)}
                placeholder="Crystal of Logic..."
                className="bg-card/50 border-border"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
              <Textarea
                value={artifactDescription}
                onChange={(e) => setArtifactDescription(e.target.value)}
                placeholder="A fragment of learned wisdom..."
                className="bg-card/50 border-border h-16 resize-none"
              />
            </div>

            {/* Mint button */}
            <Button
              onClick={handleMint}
              disabled={isMinting || !artifactName.trim() || mintSuccess}
              className={cn(
                "w-full h-11",
                "bg-gradient-to-r from-primary to-accent",
                "hover:from-primary/90 hover:to-accent/90",
                "disabled:opacity-50"
              )}
            >
              {mintSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Crystallized!
                </>
              ) : isMinting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Crystallizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Mint Artifact
                </>
              )}
            </Button>

            {/* DHF verification notice */}
            <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-muted-foreground">
              <Lock className="w-3 h-3" />
              DHF Verified • Only you can mint from your skills
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LegacyArtifactMinter;
