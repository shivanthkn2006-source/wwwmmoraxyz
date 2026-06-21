// ═══════════════════════════════════════════════════════════════════════════════
// AGENT SKILL RADAR - Cyberpunk radar chart showing Zoe's proficiency
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface AgentSkillRadarProps {
  creativity: number;
  logic: number;
  empathy: number;
  security: number;
  size?: number;
}

export const AgentSkillRadar: React.FC<AgentSkillRadarProps> = ({
  creativity,
  logic,
  empathy,
  security,
  size = 200
}) => {
  const center = size / 2;
  const maxRadius = size / 2 - 30;
  
  const skills = useMemo(() => [
    { name: 'Creativity', value: creativity, angle: -90, color: 'hsl(var(--omega-pink))' },
    { name: 'Logic', value: logic, angle: 0, color: 'hsl(var(--omega-cyan))' },
    { name: 'Empathy', value: empathy, angle: 90, color: 'hsl(var(--omega-purple))' },
    { name: 'Security', value: security, angle: 180, color: 'hsl(var(--omega-gold))' }
  ], [creativity, logic, empathy, security]);

  const getPointPosition = (angle: number, value: number) => {
    const radians = (angle * Math.PI) / 180;
    const radius = maxRadius * value;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians)
    };
  };

  const polygonPoints = skills
    .map(skill => {
      const pos = getPointPosition(skill.angle, skill.value);
      return `${pos.x},${pos.y}`;
    })
    .join(' ');

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background rings */}
        {[0.25, 0.5, 0.75, 1].map((level, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={maxRadius * level}
            fill="none"
            stroke="hsl(var(--omega-cyan) / 0.1)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Axis lines */}
        {skills.map((skill, i) => {
          const endPos = getPointPosition(skill.angle, 1);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endPos.x}
              y2={endPos.y}
              stroke="hsl(var(--omega-cyan) / 0.2)"
              strokeWidth="1"
            />
          );
        })}

        {/* Skill polygon with glow */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          points={polygonPoints}
          fill="hsl(var(--omega-cyan) / 0.15)"
          stroke="hsl(var(--omega-cyan))"
          strokeWidth="2"
          filter="url(#glow)"
        />

        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Skill points */}
        {skills.map((skill, i) => {
          const pos = getPointPosition(skill.angle, skill.value);
          return (
            <motion.circle
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
              cx={pos.x}
              cy={pos.y}
              r="6"
              fill={skill.color}
              filter="url(#glow)"
            />
          );
        })}
      </svg>

      {/* Labels */}
      {skills.map((skill, i) => {
        const labelPos = getPointPosition(skill.angle, 1.2);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="absolute text-xs font-mono text-center"
            style={{
              left: labelPos.x - 40,
              top: labelPos.y - 10,
              width: 80,
              color: skill.color
            }}
          >
            <div className="font-semibold">{skill.name}</div>
            <div className="text-[10px] opacity-70">{Math.round(skill.value * 100)}%</div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AgentSkillRadar;
