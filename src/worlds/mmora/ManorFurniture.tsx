/**
 * Manor sitting-room furniture for M'Mora Village houses, after the owner's
 * reference photos: tan tufted leather sofa, two green leather armchairs,
 * dark carved coffee table with flowers, glass-front bookcase, gold
 * chandelier with candles, framed portraits, gold patterned rug and a carved
 * wooden fireplace surround. Shared materials/geometry, no downloads.
 */
import React from 'react';
import * as THREE from 'three';

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Dark green/navy field, gold borders, gold floral medallion. */
const rugTex = () => canvasTex(256, 192, (g) => {
  g.fillStyle = '#1d2a26'; g.fillRect(0, 0, 256, 192);
  g.fillStyle = '#b8893c'; g.fillRect(6, 6, 244, 180);
  g.fillStyle = '#1f2c33'; g.fillRect(16, 16, 224, 160);
  g.strokeStyle = '#d6aa55'; g.lineWidth = 3; g.strokeRect(24, 24, 208, 144);
  for (let i = 0; i < 26; i++) { // border flowers
    const x = 12 + (i % 13) * 19, y = i < 13 ? 11 : 181;
    g.fillStyle = i % 2 ? '#7a2e22' : '#e3c27a'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
  }
  g.save(); g.translate(128, 96);
  for (let k = 0; k < 12; k++) { // petals
    g.rotate(Math.PI / 6); g.fillStyle = k % 2 ? '#d6aa55' : '#a8743a';
    g.beginPath(); g.ellipse(0, -30, 9, 26, 0, 0, 7); g.fill();
  }
  g.fillStyle = '#5c8a8a'; g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill();
  g.fillStyle = '#e3c27a'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill();
  g.restore();
  for (const [x, y] of [[48, 44], [208, 44], [48, 148], [208, 148]]) { // corner scrolls
    g.strokeStyle = '#c9974a'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 12, 0, 5); g.stroke();
  }
});

const portraitTex = (seed: number) => canvasTex(64, 80, (g) => {
  const bg = g.createLinearGradient(0, 0, 0, 80); bg.addColorStop(0, '#2c2418'); bg.addColorStop(1, '#14100b');
  g.fillStyle = bg; g.fillRect(0, 0, 64, 80);
  g.fillStyle = seed % 2 ? '#6e2a2a' : '#1d2230'; // dress / coat
  g.beginPath(); g.ellipse(32, 74, 22, 22, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#c9a07e'; g.beginPath(); g.ellipse(32, 36, 10, 13, 0, 0, 7); g.fill();
  g.fillStyle = seed % 2 ? '#3a2416' : '#1a1410'; g.beginPath(); g.ellipse(32, 28, 12, 9, 0, Math.PI, 0); g.fill();
});

const bookTex = () => canvasTex(64, 32, (g) => {
  const cols = ['#5a2a1e', '#2a3a2a', '#6b5a3a', '#2a2a3e', '#7a4a20', '#3e2a1e'];
  for (let x = 0, i = 0; x < 64; i++) { const w = 3 + (i * 7) % 4; g.fillStyle = cols[i % 6]; g.fillRect(x, 4 + (i % 3), w, 28); x += w + 1; }
});

const M = {
  leather: new THREE.MeshStandardMaterial({ color: '#a8683a', roughness: 0.45, metalness: 0.05 }),
  leatherDark: new THREE.MeshStandardMaterial({ color: '#6a3e22', roughness: 0.5 }),
  green: new THREE.MeshStandardMaterial({ color: '#2f4a2a', roughness: 0.4 }),
  wood: new THREE.MeshStandardMaterial({ color: '#3a2214', roughness: 0.55 }),
  carved: new THREE.MeshStandardMaterial({ color: '#4e2c18', roughness: 0.6 }),
  gold: new THREE.MeshStandardMaterial({ color: '#c9a050', metalness: 0.85, roughness: 0.3 }),
  candle: new THREE.MeshStandardMaterial({ color: '#f1e7cf', emissive: '#ffcf8a', emissiveIntensity: 0.4 }),
  flame: new THREE.MeshBasicMaterial({ color: '#ffd27a' }),
  glass: new THREE.MeshStandardMaterial({ color: '#2a2f2a', transparent: true, opacity: 0.35, roughness: 0.1 }),
  books: new THREE.MeshStandardMaterial({ map: bookTex(), roughness: 0.9 }),
  rug: new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 }),
  cushion: new THREE.MeshStandardMaterial({ color: '#7a6a3a', roughness: 0.9 }),
  flowers: new THREE.MeshStandardMaterial({ color: '#8a5ab0', roughness: 0.8 }),
  vase: new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.4, metalness: 0.3 }),
  wallpaper: new THREE.MeshStandardMaterial({ color: '#3b5246', roughness: 0.9 }),
};
const PORTRAITS = [new THREE.MeshStandardMaterial({ map: portraitTex(0), roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: portraitTex(1), roughness: 0.8 })];

const B: React.FC<{ m: THREE.Material; p: [number, number, number]; s: [number, number, number]; r?: [number, number, number] }> = ({ m, p, s, r }) => (
  <mesh material={m} position={p} rotation={r}><boxGeometry args={s} /></mesh>
);

/** Tufted leather sofa, ~1.8 m wide, facing +z. */
const Sofa: React.FC = () => (
  <group>
    <B m={M.leather} p={[0, 0.32, 0]} s={[1.8, 0.24, 0.75]} />
    <B m={M.leather} p={[0, 0.72, -0.3]} s={[1.8, 0.6, 0.18]} />
    <B m={M.leather} p={[-0.88, 0.5, 0]} s={[0.16, 0.42, 0.78]} />
    <B m={M.leather} p={[0.88, 0.5, 0]} s={[0.16, 0.42, 0.78]} />
    <B m={M.carved} p={[0, 0.98, -0.32]} s={[1.9, 0.08, 0.14]} />
    {[-0.6, -0.2, 0.2, 0.6].map((x) => [0.6, 0.82].map((y) => (
      <mesh key={`${x}${y}`} material={M.leatherDark} position={[x + (y > 0.7 ? 0.2 : 0), y, -0.2]}><sphereGeometry args={[0.025, 6, 4]} /></mesh>
    )))}
    <B m={M.cushion} p={[-0.55, 0.6, -0.12]} s={[0.4, 0.34, 0.1]} r={[-0.2, 0.2, 0]} />
    {[[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.3], [0.8, 0.3]].map(([x, z]) => <B key={`${x}${z}`} m={M.carved} p={[x, 0.1, z]} s={[0.08, 0.2, 0.08]} />)}
  </group>
);

/** Green club armchair, facing +z. */
const Armchair: React.FC = () => (
  <group>
    <B m={M.green} p={[0, 0.3, 0]} s={[0.8, 0.3, 0.75]} />
    <B m={M.green} p={[0, 0.68, -0.3]} s={[0.8, 0.5, 0.18]} />
    <mesh material={M.green} position={[-0.38, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.75, 10]} /></mesh>
    <mesh material={M.green} position={[0.38, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.75, 10]} /></mesh>
    <B m={M.cushion} p={[0, 0.6, -0.16]} s={[0.36, 0.3, 0.08]} r={[-0.25, 0, 0]} />
  </group>
);

const CoffeeTable: React.FC = () => (
  <group>
    <B m={M.wood} p={[0, 0.42, 0]} s={[1.1, 0.07, 0.6]} />
    <B m={M.carved} p={[0, 0.34, 0]} s={[1.0, 0.1, 0.5]} />
    {[[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]].map(([x, z]) => <B key={`${x}${z}`} m={M.carved} p={[x, 0.17, z]} s={[0.07, 0.34, 0.07]} />)}
    <mesh material={M.vase} position={[0, 0.56, 0]}><cylinderGeometry args={[0.06, 0.08, 0.22, 8]} /></mesh>
    <mesh material={M.flowers} position={[0, 0.74, 0]}><icosahedronGeometry args={[0.14, 0]} /></mesh>
  </group>
);

/** Glass-front bookcase against a wall, facing +z. */
const Bookcase: React.FC = () => (
  <group>
    <B m={M.carved} p={[0, 1.1, 0]} s={[1.0, 2.2, 0.4]} />
    <B m={M.wood} p={[0, 2.26, 0.02]} s={[1.1, 0.12, 0.46]} />
    {[0.5, 1.05, 1.6].map((y) => <B key={y} m={M.books} p={[0, y + 0.18, 0.12]} s={[0.86, 0.34, 0.18]} />)}
    <B m={M.glass} p={[0, 1.15, 0.21]} s={[0.9, 1.7, 0.01]} />
    <B m={M.gold} p={[0, 1.15, 0.22]} s={[0.02, 1.7, 0.02]} />
  </group>
);

const Chandelier: React.FC = () => (
  <group>
    <mesh material={M.gold} position={[0, 0.3, 0]}><cylinderGeometry args={[0.01, 0.01, 0.6, 4]} /></mesh>
    <mesh material={M.gold} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.38, 0.02, 6, 20]} /></mesh>
    <mesh material={M.gold} position={[0, -0.05, 0]}><sphereGeometry args={[0.07, 8, 6]} /></mesh>
    {Array.from({ length: 6 }, (_, k) => {
      const a = (k / 6) * Math.PI * 2, x = Math.cos(a) * 0.38, z = Math.sin(a) * 0.38;
      return (
        <group key={k} position={[x, 0, z]}>
          <mesh material={M.candle} position={[0, 0.07, 0]}><cylinderGeometry args={[0.018, 0.018, 0.12, 6]} /></mesh>
          <mesh material={M.flame} position={[0, 0.16, 0]}><coneGeometry args={[0.014, 0.05, 5]} /></mesh>
        </group>
      );
    })}
  </group>
);

const Painting: React.FC<{ i: number; w?: number; h?: number }> = ({ i, w = 0.6, h = 0.75 }) => (
  <group>
    <B m={M.gold} p={[0, 0, 0]} s={[w + 0.1, h + 0.1, 0.04]} />
    <mesh material={PORTRAITS[i % 2]} position={[0, 0, 0.025]}><planeGeometry args={[w, h]} /></mesh>
  </group>
);

/** Carved wooden mantel to sit in front of the existing stone hearth (local, facing +z). */
export const CarvedMantel: React.FC = () => (
  <group>
    <B m={M.carved} p={[-0.72, 0.8, 0.3]} s={[0.18, 1.6, 0.14]} />
    <B m={M.carved} p={[0.72, 0.8, 0.3]} s={[0.18, 1.6, 0.14]} />
    <B m={M.wood} p={[0, 1.6, 0.32]} s={[1.9, 0.12, 0.3]} />
    <B m={M.carved} p={[0, 1.46, 0.31]} s={[1.6, 0.14, 0.12]} />
    <mesh material={M.gold} position={[-0.5, 1.75, 0.32]}><cylinderGeometry args={[0.04, 0.06, 0.18, 8]} /></mesh>
    <mesh material={M.candle} position={[0.5, 1.75, 0.32]}><cylinderGeometry args={[0.02, 0.02, 0.18, 6]} /></mesh>
  </group>
);

/**
 * Whole sitting room, in house-local space (room 5×5 m, back wall z=-2.5,
 * fireplace on the +x wall, door centred on z=+2.5 kept clear).
 */
export const ManorFurniture: React.FC = () => (
  <group>
    {/* green damask wallpaper above the panelling on back and left walls */}
    <mesh material={M.wallpaper} position={[0, 1.9, -2.37]}><planeGeometry args={[4.7, 1.4]} /></mesh>
    <mesh material={M.wallpaper} position={[-2.37, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[4.7, 2.6]} /></mesh>
    <mesh material={M.rug} position={[0.1, 0.025, -0.1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.2, 2.4]} /></mesh>
    <group position={[-1.9, 0, -0.3]} rotation={[0, Math.PI / 2, 0]}><Sofa /></group>
    <group position={[0.7, 0, 1.05]} rotation={[0, Math.PI * 0.85, 0]}><Armchair /></group>
    <group position={[1.15, 0, 0.35]} rotation={[0, -Math.PI * 0.62, 0]}><Armchair /></group>
    <group position={[-0.5, 0, -0.3]} rotation={[0, Math.PI / 2, 0]}><CoffeeTable /></group>
    <group position={[-1.75, 0, -2.15]}><Bookcase /></group>
    <group position={[0, 2.35, -0.2]}><Chandelier /></group>
    <group position={[1.2, 1.95, -2.34]}><Painting i={0} /></group>
    <group position={[-0.1, 2.0, -2.34]}><Painting i={1} w={0.5} h={0.6} /></group>
    <group position={[-2.34, 1.9, 0.2]} rotation={[0, Math.PI / 2, 0]}><Painting i={1} w={0.8} h={0.6} /></group>
    <pointLight position={[0, 2.1, -0.2]} intensity={0.7} distance={5} color="#ffd08a" />
  </group>
);
