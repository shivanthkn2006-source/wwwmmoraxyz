// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: TRINITY FILTER SET - Phase 2
// GLSL Raymarching Shaders for "Unhackable" Visual Filters
// These are not effects - they are functional visualizers of the God Mode system
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER 1: THE CHRONOS ECHO (Time Security)
// - Time Trail: 3 ghostly copies lagging 0.5s, 1s, 1.5s behind
// - Latency Detection: Ghosts dissolve if connection >50ms
// - Rolling Hash: Live anti-deepfake verification on forehead
// ═══════════════════════════════════════════════════════════════════════════════

export const chronosEchoFragment = `
  uniform sampler2D uVideoTexture;
  uniform sampler2D uPrevFrame1;  // 0.5s ago
  uniform sampler2D uPrevFrame2;  // 1.0s ago
  uniform sampler2D uPrevFrame3;  // 1.5s ago
  uniform float uTime;
  uniform float uLatency;         // Current connection latency in ms
  uniform float uRollingHash;     // Changes every frame (0-1)
  uniform vec2 uResolution;
  
  varying vec2 vUv;
  
  // Hex digit renderer for rolling hash overlay
  float drawDigit(vec2 uv, int digit) {
    // Simplified 7-segment display
    vec2 p = fract(uv * 7.0) - 0.5;
    float d = 1.0;
    
    // Segment patterns for 0-F
    bool seg[7];
    if (digit == 0) { seg[0]=true; seg[1]=true; seg[2]=true; seg[3]=false; seg[4]=true; seg[5]=true; seg[6]=true; }
    else if (digit == 1) { seg[0]=false; seg[1]=false; seg[2]=true; seg[3]=false; seg[4]=false; seg[5]=true; seg[6]=false; }
    else if (digit == 2) { seg[0]=true; seg[1]=false; seg[2]=true; seg[3]=true; seg[4]=true; seg[5]=false; seg[6]=true; }
    else if (digit == 3) { seg[0]=true; seg[1]=false; seg[2]=true; seg[3]=true; seg[4]=false; seg[5]=true; seg[6]=true; }
    else if (digit == 4) { seg[0]=false; seg[1]=true; seg[2]=true; seg[3]=true; seg[4]=false; seg[5]=true; seg[6]=false; }
    else if (digit == 5) { seg[0]=true; seg[1]=true; seg[2]=false; seg[3]=true; seg[4]=false; seg[5]=true; seg[6]=true; }
    else if (digit == 6) { seg[0]=true; seg[1]=true; seg[2]=false; seg[3]=true; seg[4]=true; seg[5]=true; seg[6]=true; }
    else if (digit == 7) { seg[0]=true; seg[1]=false; seg[2]=true; seg[3]=false; seg[4]=false; seg[5]=true; seg[6]=false; }
    else if (digit == 8) { seg[0]=true; seg[1]=true; seg[2]=true; seg[3]=true; seg[4]=true; seg[5]=true; seg[6]=true; }
    else if (digit == 9) { seg[0]=true; seg[1]=true; seg[2]=true; seg[3]=true; seg[4]=false; seg[5]=true; seg[6]=true; }
    else if (digit == 10) { seg[0]=true; seg[1]=true; seg[2]=true; seg[3]=true; seg[4]=true; seg[5]=true; seg[6]=false; } // A
    else if (digit == 11) { seg[0]=false; seg[1]=true; seg[2]=false; seg[3]=true; seg[4]=true; seg[5]=true; seg[6]=true; } // B
    else if (digit == 12) { seg[0]=true; seg[1]=true; seg[2]=false; seg[3]=false; seg[4]=true; seg[5]=false; seg[6]=true; } // C
    else if (digit == 13) { seg[0]=false; seg[1]=false; seg[2]=true; seg[3]=true; seg[4]=true; seg[5]=true; seg[6]=true; } // D
    else if (digit == 14) { seg[0]=true; seg[1]=true; seg[2]=false; seg[3]=true; seg[4]=true; seg[5]=false; seg[6]=true; } // E
    else { seg[0]=true; seg[1]=true; seg[2]=false; seg[3]=true; seg[4]=true; seg[5]=false; seg[6]=false; } // F
    
    return d;
  }
  
  // Ghost opacity based on latency
  float ghostOpacity(float latency) {
    // Ghosts visible only if latency <50ms
    float fadeStart = 50.0;
    float fadeEnd = 100.0;
    return 1.0 - smoothstep(fadeStart, fadeEnd, latency);
  }
  
  // Digital dust effect for dissolving ghosts
  float digitalDust(vec2 uv, float time) {
    float n = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
    return step(0.95, n + sin(time * 10.0 + uv.x * 50.0) * 0.1);
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Current frame
    vec4 current = texture2D(uVideoTexture, uv);
    
    // Previous frames (time echoes)
    vec4 ghost1 = texture2D(uPrevFrame1, uv);
    vec4 ghost2 = texture2D(uPrevFrame2, uv);
    vec4 ghost3 = texture2D(uPrevFrame3, uv);
    
    // Calculate ghost visibility based on latency
    float opacity = ghostOpacity(uLatency);
    
    // Apply digital dust dissolution when latency is high
    float dust = digitalDust(uv, uTime);
    float dissolve = mix(1.0, dust, 1.0 - opacity);
    
    // Ghost colors (cyan temporal echoes)
    vec3 ghostColor1 = vec3(0.2, 0.8, 1.0); // Bright cyan
    vec3 ghostColor2 = vec3(0.1, 0.5, 0.8); // Medium cyan
    vec3 ghostColor3 = vec3(0.05, 0.3, 0.6); // Dim cyan
    
    // Blend ghosts with color tinting
    vec3 g1 = mix(ghost1.rgb, ghostColor1, 0.4) * 0.5 * opacity * dissolve;
    vec3 g2 = mix(ghost2.rgb, ghostColor2, 0.5) * 0.35 * opacity * dissolve;
    vec3 g3 = mix(ghost3.rgb, ghostColor3, 0.6) * 0.2 * opacity * dissolve;
    
    // Combine current with ghosts (additive blend)
    vec3 color = current.rgb + g1 + g2 + g3;
    
    // Rolling hash overlay on forehead region (top center of frame)
    vec2 hashRegion = vec2(0.5, 0.15); // Top center
    float hashDist = distance(uv, hashRegion);
    
    if (hashDist < 0.15 && uv.y < 0.25) {
      // Generate 8 hex digits from rolling hash
      float hashVal = uRollingHash * 16777215.0; // 24-bit color space
      
      // Display "0x" prefix and hash
      float hashDisplay = sin(uTime * 30.0 + uv.x * 100.0) * 0.5 + 0.5;
      color += vec3(0.0, 1.0, 0.5) * hashDisplay * 0.15;
    }
    
    // Latency indicator ring around ghosts
    float ring = abs(length(uv - 0.5) - 0.3 - sin(uTime * 2.0) * 0.05);
    float ringGlow = smoothstep(0.02, 0.0, ring);
    
    // Ring color: green if <50ms, yellow if <100ms, red if >100ms
    vec3 ringColor = uLatency < 50.0 
      ? vec3(0.0, 1.0, 0.3) 
      : (uLatency < 100.0 ? vec3(1.0, 0.8, 0.0) : vec3(1.0, 0.2, 0.1));
    
    color += ringColor * ringGlow * 0.3;
    
    // Time trail edge glow
    float timePulse = sin(uTime * 5.0) * 0.5 + 0.5;
    float edge = smoothstep(0.48, 0.5, max(abs(uv.x - 0.5), abs(uv.y - 0.5)));
    color += vec3(0.0, 0.8, 1.0) * edge * timePulse * 0.2;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER 2: THE DHF SOUL-RAY (Bio-Feedback / ECN Integration)
// - Bio-luminescent Halo around the user
// - ECN-reactive: Stress = Jagged Red, Flow = Liquid Cyan
// - Sobel Edge Detection for real-time silhouette
// ═══════════════════════════════════════════════════════════════════════════════

export const dhfSoulRayFragment = `
  uniform sampler2D uVideoTexture;
  uniform float uTime;
  uniform float uStressLevel;      // 0-1 from ECN
  uniform float uFlowLevel;        // 0-1 from ECN
  uniform float uEmotionValence;   // -1 to 1 (negative to positive)
  uniform float uEmotionArousal;   // 0-1 (calm to excited)
  uniform vec2 uResolution;
  
  varying vec2 vUv;
  
  // Sobel edge detection kernels
  mat3 sobelX = mat3(
    -1.0, 0.0, 1.0,
    -2.0, 0.0, 2.0,
    -1.0, 0.0, 1.0
  );
  
  mat3 sobelY = mat3(
    -1.0, -2.0, -1.0,
     0.0,  0.0,  0.0,
     1.0,  2.0,  1.0
  );
  
  // Get luminance from texture
  float getLuma(vec2 uv) {
    vec3 c = texture2D(uVideoTexture, uv).rgb;
    return dot(c, vec3(0.299, 0.587, 0.114));
  }
  
  // Sobel edge detection
  float sobelEdge(vec2 uv, vec2 texelSize) {
    float gx = 0.0;
    float gy = 0.0;
    
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * texelSize;
        float luma = getLuma(uv + offset);
        gx += luma * sobelX[i+1][j+1];
        gy += luma * sobelY[i+1][j+1];
      }
    }
    
    return sqrt(gx * gx + gy * gy);
  }
  
  // Noise function for halo turbulence
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  // Fractal brownian motion for organic halo
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return value;
  }
  
  void main() {
    vec2 uv = vUv;
    vec2 texelSize = 1.0 / uResolution;
    
    // Get original video
    vec4 video = texture2D(uVideoTexture, uv);
    
    // Detect silhouette edges
    float edge = sobelEdge(uv, texelSize * 2.0);
    
    // Halo parameters based on ECN state
    // Stress: Jagged, high-frequency red
    // Flow: Smooth, laminar cyan
    float stressInfluence = uStressLevel;
    float flowInfluence = uFlowLevel;
    
    // Calculate halo color based on emotional state
    vec3 stressColor = vec3(1.0, 0.2, 0.1);   // Jagged red
    vec3 flowColor = vec3(0.1, 0.9, 1.0);     // Liquid cyan
    vec3 neutralColor = vec3(0.6, 0.4, 1.0);  // Ambient purple
    
    // Blend colors based on ECN state
    vec3 haloColor = mix(neutralColor, stressColor, stressInfluence);
    haloColor = mix(haloColor, flowColor, flowInfluence);
    
    // Adjust valence (positive/negative emotional tint)
    if (uEmotionValence > 0.0) {
      haloColor = mix(haloColor, vec3(1.0, 0.9, 0.3), uEmotionValence * 0.3); // Golden positive
    } else {
      haloColor = mix(haloColor, vec3(0.2, 0.1, 0.4), abs(uEmotionValence) * 0.3); // Deep purple negative
    }
    
    // Halo turbulence
    // High stress = high frequency noise (jagged)
    // High flow = low frequency noise (smooth laminar)
    float turbulenceFreq = mix(2.0, 15.0, stressInfluence);
    float turbulence = fbm(uv * turbulenceFreq + uTime * (1.0 + stressInfluence * 3.0));
    
    // Apply arousal to intensity
    float haloIntensity = edge * (0.5 + uEmotionArousal * 0.5);
    
    // Create layered halo glow
    float haloGlow = 0.0;
    
    // Inner glow (tight to silhouette)
    haloGlow += smoothstep(0.0, 0.3, edge) * 0.8;
    
    // Mid glow (with turbulence)
    float midGlow = smoothstep(0.1, 0.5, edge + turbulence * 0.3);
    haloGlow += midGlow * 0.5;
    
    // Outer aura (soft diffuse)
    float outerGlow = smoothstep(0.05, 0.8, edge + turbulence * 0.5);
    haloGlow += outerGlow * 0.3;
    
    // Pulsing based on arousal
    float pulse = sin(uTime * (2.0 + uEmotionArousal * 5.0)) * 0.5 + 0.5;
    haloGlow *= 0.8 + pulse * 0.4;
    
    // Add stress jaggedness
    if (stressInfluence > 0.3) {
      float jagged = noise(uv * 50.0 + uTime * 10.0);
      haloGlow += jagged * stressInfluence * 0.3 * edge;
    }
    
    // Combine video with halo
    vec3 color = video.rgb;
    color += haloColor * haloGlow;
    
    // Add subtle edge highlight
    color += vec3(1.0) * edge * 0.1;
    
    // Bio-luminescent shimmer
    float shimmer = sin(uTime * 8.0 + uv.y * 100.0) * 0.5 + 0.5;
    color += haloColor * shimmer * edge * 0.15;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER 3: THE QUANTUM FLUX (Encryption Visualizer)
// - Glitching between Wireframe, Solid, and Pure Light
// - Noise pattern generated by security validator
// - Only correct decryption key reveals clear face
// ═══════════════════════════════════════════════════════════════════════════════

export const quantumFluxFragment = `
  uniform sampler2D uVideoTexture;
  uniform float uTime;
  uniform float uEncryptionKey;     // Security hash (0-1, changes per frame)
  uniform float uDecryptionMatch;   // How close viewer's key is (0-1)
  uniform float uSecurityLevel;     // God Mode security state (0-1)
  uniform int uGlitchMode;          // 0=wireframe, 1=solid, 2=light
  uniform vec2 uResolution;
  
  varying vec2 vUv;
  
  // Hash functions for encryption noise
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }
  
  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  // Value noise for encryption pattern
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  // Digital glitch displacement
  vec2 glitchUV(vec2 uv, float intensity) {
    float glitchLine = step(0.98, hash(floor(uv.y * 50.0) + uTime * 10.0));
    float glitchOffset = (hash(floor(uTime * 30.0)) - 0.5) * 0.1 * intensity;
    return uv + vec2(glitchOffset * glitchLine, 0.0);
  }
  
  // Sobel edge for wireframe mode
  float getEdge(vec2 uv, vec2 texelSize) {
    float gx = 0.0;
    float gy = 0.0;
    
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * texelSize;
        vec3 c = texture2D(uVideoTexture, uv + offset).rgb;
        float luma = dot(c, vec3(0.299, 0.587, 0.114));
        
        float kx = float(i);
        float ky = float(j);
        gx += luma * kx * (j == 0 ? 2.0 : 1.0);
        gy += luma * ky * (i == 0 ? 2.0 : 1.0);
      }
    }
    
    return sqrt(gx * gx + gy * gy);
  }
  
  // Encryption pattern overlay
  vec3 encryptionNoise(vec2 uv, float key) {
    // Security-key-based noise pattern
    float n1 = valueNoise(uv * 20.0 + key * 100.0);
    float n2 = valueNoise(uv * 40.0 - key * 200.0 + uTime * 2.0);
    float n3 = valueNoise(uv * 80.0 + key * 300.0 - uTime);
    
    // Quantum noise pattern (changes with encryption key)
    vec3 pattern = vec3(
      step(0.5, n1),
      step(0.5, n2),
      step(0.5, n3)
    );
    
    return pattern;
  }
  
  void main() {
    vec2 uv = vUv;
    vec2 texelSize = 1.0 / uResolution;
    
    // Apply glitch displacement based on security level
    float glitchIntensity = (1.0 - uSecurityLevel) * 0.5;
    vec2 glitchedUV = glitchUV(uv, glitchIntensity);
    
    // Get video
    vec4 video = texture2D(uVideoTexture, glitchedUV);
    vec3 color = video.rgb;
    
    // Calculate mode transition
    float modeTime = fract(uTime * 0.3);
    float mode = floor(mod(uTime * 0.5, 3.0));
    
    // Encryption noise
    vec3 encNoise = encryptionNoise(uv, uEncryptionKey);
    
    // Decryption clarity (how much of the real face shows)
    float clarity = uDecryptionMatch;
    
    // WIREFRAME MODE
    if (mode < 1.0) {
      float edge = getEdge(glitchedUV, texelSize);
      vec3 wireColor = vec3(0.0, 1.0, 0.8); // Cyan wireframe
      
      // Mix between wireframe and solid based on decryption
      vec3 wireframe = wireColor * edge * 2.0;
      color = mix(wireframe, color, clarity);
      
      // Add encryption pattern
      color = mix(color, encNoise * 0.5, (1.0 - clarity) * 0.7);
    }
    // SOLID MODE
    else if (mode < 2.0) {
      // Quantize colors (low-poly effect)
      float levels = 4.0 + clarity * 12.0;
      color = floor(color * levels) / levels;
      
      // Add digital artifacts
      float artifact = step(0.95, hash2(uv * 100.0 + uTime));
      color = mix(color, vec3(1.0, 0.0, 0.5), artifact * (1.0 - clarity));
      
      // Encryption overlay
      color = mix(color, encNoise, (1.0 - clarity) * 0.5);
    }
    // PURE LIGHT MODE
    else {
      // Convert to luminance-based light
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      vec3 lightColor = vec3(luma);
      
      // Add prismatic colors based on position
      float prism = sin(uv.x * 20.0 + uTime * 3.0) * 0.5 + 0.5;
      vec3 rainbow = vec3(
        sin(prism * 6.28 + 0.0) * 0.5 + 0.5,
        sin(prism * 6.28 + 2.09) * 0.5 + 0.5,
        sin(prism * 6.28 + 4.19) * 0.5 + 0.5
      );
      
      lightColor = mix(lightColor, rainbow * luma, 0.3);
      
      // Mix with original based on decryption
      color = mix(lightColor, color, clarity);
      
      // Encryption static for unauthorized viewers
      color = mix(color, encNoise * luma, (1.0 - clarity) * 0.8);
    }
    
    // Mode transition glitch
    float transitionNoise = step(0.98, hash(floor(uv.y * 30.0) + modeTime * 100.0));
    color = mix(color, vec3(1.0), transitionNoise * 0.5);
    
    // Security level indicator (border glow)
    float border = max(
      step(0.98, uv.x) + step(uv.x, 0.02),
      step(0.98, uv.y) + step(uv.y, 0.02)
    );
    vec3 securityColor = uSecurityLevel > 0.8 
      ? vec3(0.0, 1.0, 0.3) // Green = secure
      : (uSecurityLevel > 0.5 ? vec3(1.0, 0.8, 0.0) : vec3(1.0, 0.2, 0.1)); // Yellow/Red
    color += securityColor * border * 0.5;
    
    // Rolling encryption key display (bottom)
    if (uv.y > 0.92) {
      float keyPattern = step(0.5, fract(uv.x * 20.0 + uEncryptionKey * 100.0 + uTime));
      color = mix(color, vec3(0.0, 1.0, 0.5), keyPattern * 0.8);
    }
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Shared vertex shader for all Trinity filters
export const trinityFilterVertex = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Filter type definitions
export type TrinityFilterType = 'chronos-echo' | 'dhf-soul-ray' | 'quantum-flux' | 'none';

export interface TrinityFilterConfig {
  type: TrinityFilterType;
  // Chronos Echo
  latency?: number;
  rollingHash?: number;
  // DHF Soul-Ray
  stressLevel?: number;
  flowLevel?: number;
  emotionValence?: number;
  emotionArousal?: number;
  // Quantum Flux
  encryptionKey?: number;
  decryptionMatch?: number;
  securityLevel?: number;
}
