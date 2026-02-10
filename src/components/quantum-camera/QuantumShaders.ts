// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Quantum Shaders
// GLSL Shaders for 2050 Cybernetic Eye Simulation
// Deep Void Blue Shadows + Stellar Gold Highlights + ACES Filmic
// ═══════════════════════════════════════════════════════════════════════════════

// Vertex shader for liquid displacement mesh
export const liquidDisplacementVertex = `
  uniform float uTime;
  uniform float uAudioBass;
  uniform float uAudioMid;
  uniform float uAudioTreble;
  uniform float uDisplacementIntensity;
  
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec3 vNormal;
  
  // Simplex noise function for organic displacement
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }
  
  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    vUv = uv;
    vNormal = normal;
    
    // Multi-frequency noise for organic ripples
    float noiseScale = 3.0;
    float timeScale = 0.5;
    
    // Bass creates large slow waves
    float bassWave = snoise(vec3(position.x * noiseScale * 0.5, position.y * noiseScale * 0.5, uTime * timeScale)) * uAudioBass;
    
    // Mid creates medium ripples
    float midWave = snoise(vec3(position.x * noiseScale, position.y * noiseScale, uTime * timeScale * 1.5)) * uAudioMid * 0.7;
    
    // Treble creates fine detail
    float trebleWave = snoise(vec3(position.x * noiseScale * 2.0, position.y * noiseScale * 2.0, uTime * timeScale * 2.5)) * uAudioTreble * 0.4;
    
    // Combine waves
    float displacement = (bassWave + midWave + trebleWave) * uDisplacementIntensity;
    vDisplacement = displacement;
    
    // Displace along normal (z-axis for plane)
    vec3 newPosition = position + vec3(0.0, 0.0, displacement * 0.1);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Fragment shader for 2050 color grading
export const quantumColorGradeFragment = `
  uniform sampler2D uVideoTexture;
  uniform float uTime;
  uniform float uColorGradeIntensity;
  uniform float uVoidBlueDepth;
  uniform float uStellarGoldIntensity;
  uniform float uFilmicExposure;
  uniform float uChromaticAberration;
  uniform float uVignetteStrength;
  uniform float uScanlineOpacity;
  uniform float uNoiseIntensity;
  uniform float uAudioVolume;
  
  varying vec2 vUv;
  varying float vDisplacement;
  
  // ACES Filmic Tone Mapping
  vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }
  
  // Deep Void Blue color for shadows
  vec3 deepVoidBlue = vec3(0.02, 0.05, 0.15);
  
  // Stellar Gold for highlights
  vec3 stellarGold = vec3(1.0, 0.85, 0.4);
  
  // Film grain noise
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Chromatic aberration (RGB shift at edges)
    float distFromCenter = length(uv - 0.5);
    float aberrationAmount = uChromaticAberration * distFromCenter * distFromCenter;
    
    vec2 uvR = uv + vec2(aberrationAmount, 0.0);
    vec2 uvB = uv - vec2(aberrationAmount, 0.0);
    
    float r = texture2D(uVideoTexture, uvR).r;
    float g = texture2D(uVideoTexture, uv).g;
    float b = texture2D(uVideoTexture, uvB).b;
    
    vec3 color = vec3(r, g, b);
    
    // Apply exposure
    color *= uFilmicExposure;
    
    // Calculate luminance
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    
    // Apply 2050 color grade
    // Push shadows to Deep Void Blue
    vec3 shadowColor = mix(color, deepVoidBlue, (1.0 - luminance) * uVoidBlueDepth);
    
    // Push highlights to Stellar Gold  
    vec3 highlightColor = mix(shadowColor, stellarGold, luminance * uStellarGoldIntensity * 0.5);
    
    // Blend based on intensity
    color = mix(color, highlightColor, uColorGradeIntensity);
    
    // Audio-reactive color boost
    float audioBoost = uAudioVolume * 0.3;
    color += vec3(0.0, 0.02, 0.05) * audioBoost; // Slight blue tint on voice
    
    // ACES Filmic Tone Mapping
    color = ACESFilm(color);
    
    // Vignette
    float vignette = 1.0 - smoothstep(0.4, 0.9, distFromCenter);
    vignette = mix(1.0, vignette, uVignetteStrength);
    color *= vignette;
    
    // Scanlines (cyberpunk aesthetic)
    float scanline = sin(vUv.y * 800.0 + uTime * 2.0) * 0.5 + 0.5;
    color -= scanline * uScanlineOpacity;
    
    // Film grain noise
    float noise = random(vUv + uTime * 0.1) * uNoiseIntensity;
    color += noise;
    
    // Displacement-based edge glow (audio reactive)
    float edgeGlow = abs(vDisplacement) * 2.0;
    color += stellarGold * edgeGlow * 0.2;
    
    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Simple pass-through vertex for full-screen quad
export const fullscreenQuadVertex = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
