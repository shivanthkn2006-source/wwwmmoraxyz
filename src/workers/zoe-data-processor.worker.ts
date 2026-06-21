/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE-NEXUS: SHADOW WORKER (Phase 3 - RIBs Equivalent)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE PROBLEM: Main thread handles UI + Brain + Map = iPhone crashes
 * THE SOLUTION: Move data processing to Web Worker (background thread)
 * 
 * THREAD SPLIT:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ Main Thread (UI)        │ Worker Thread (Shadow)               │
 * ├─────────────────────────┼─────────────────────────────────────────┤
 * │ Rendering pixels        │ Binary decoding                       │
 * │ Button clicks          │ Distance calculations                 │
 * │ Animation frames       │ Soulmate filtering                    │
 * │ User interactions      │ Significance scoring                  │
 * │                        │ Interpolation math                    │
 * │                        │ Stale user cleanup                    │
 * └─────────────────────────┴─────────────────────────────────────────┘
 * 
 * RESULT: UI stays at 60 FPS even when processing 5,000 signals
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES (Copied from binaryPulse.ts since workers can't import from main bundle)
// ═══════════════════════════════════════════════════════════════════════════════

interface BinaryUserPosition {
  userIdHash: number;
  userId?: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  status: 'offline' | 'online' | 'away' | 'busy';
  significanceScore: number;
  deltaLat?: number;
  avatarType: number;
}

interface BinaryTickPacket {
  packetType: 'delta' | 'full' | 'status';
  userCount: number;
  timestamp: number;
  users: BinaryUserPosition[];
  rawBytes: number;
  compressionRatio: number;
}

interface ProcessedUser {
  user_id: string;
  userIdHash: number;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status: 'online' | 'offline' | 'away' | 'busy';
  last_seen: number;
  significance_score: number;
  distance_from_me?: number;
  is_soulmate_candidate?: boolean;
}

interface WorkerMessage {
  type: 'DECODE_BINARY' | 'PROCESS_DELTAS' | 'CALCULATE_DISTANCES' | 'FILTER_SOULMATES' | 'CLEANUP_STALE' | 'INTERPOLATE' | 'PING';
  payload: any;
  requestId: string;
}

interface WorkerResponse {
  type: 'DECODED' | 'PROCESSED' | 'DISTANCES' | 'SOULMATES' | 'CLEANED' | 'INTERPOLATED' | 'PONG' | 'ERROR' | 'STATS';
  payload: any;
  requestId: string;
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const HEADER_SIZE = 6;
const USER_BLOCK_SIZE = 24;
const STALE_USER_TIMEOUT_MS = 60000;
const INTERPOLATION_FACTOR = 0.15;
const EARTH_RADIUS_KM = 6371;

const REVERSE_STATUS_MAP: Record<number, 'offline' | 'online' | 'away' | 'busy'> = {
  0: 'offline',
  1: 'online',
  2: 'away',
  3: 'busy',
};

const REVERSE_PACKET_TYPE_MAP: Record<number, 'delta' | 'full' | 'status'> = {
  0: 'delta',
  1: 'full',
  2: 'status',
};

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

let workerStats = {
  messagesProcessed: 0,
  binaryPacketsDecoded: 0,
  usersProcessed: 0,
  distanceCalculations: 0,
  interpolations: 0,
  cleanupOperations: 0,
  totalProcessingTimeMs: 0,
  averageProcessingTimeMs: 0,
  peakProcessingTimeMs: 0,
  lastProcessedAt: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// BASE64 DECODER (Self-contained for worker)
// ═══════════════════════════════════════════════════════════════════════════════

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BINARY DECODER (Moved from main thread)
// ═══════════════════════════════════════════════════════════════════════════════

function decodeTickPacket(buffer: ArrayBuffer): BinaryTickPacket {
  const view = new DataView(buffer);
  let offset = 0;
  
  // Header
  const packetType = REVERSE_PACKET_TYPE_MAP[view.getUint8(offset++)];
  const userCount = view.getUint8(offset++);
  const timestamp = view.getFloat32(offset, true) * 1000;
  offset += 4;
  
  // User blocks
  const users: BinaryUserPosition[] = [];
  
  for (let i = 0; i < userCount && offset + USER_BLOCK_SIZE <= buffer.byteLength; i++) {
    const userIdHash = view.getUint32(offset, true);
    offset += 4;
    
    const lat = view.getFloat32(offset, true);
    offset += 4;
    
    const lng = view.getFloat32(offset, true);
    offset += 4;
    
    const headingRaw = view.getInt16(offset, true);
    const heading = headingRaw === -1 ? null : headingRaw;
    offset += 2;
    
    const speedRaw = view.getUint16(offset, true);
    const speed = speedRaw === 0 ? null : speedRaw / 10;
    offset += 2;
    
    const status = REVERSE_STATUS_MAP[view.getUint8(offset++)] || 'online';
    const significanceScore = view.getUint8(offset++);
    
    const deltaLat = view.getFloat32(offset, true);
    offset += 4;
    
    const avatarType = view.getInt16(offset, true);
    offset += 2;
    
    users.push({
      userIdHash,
      lat,
      lng,
      heading,
      speed,
      status,
      significanceScore,
      deltaLat: deltaLat !== 0 ? deltaLat : undefined,
      avatarType,
    });
  }
  
  // Calculate compression ratio
  const estimatedJsonSize = userCount * 150;
  const binarySize = buffer.byteLength;
  const compressionRatio = estimatedJsonSize > 0 
    ? ((1 - binarySize / estimatedJsonSize) * 100) 
    : 0;
  
  workerStats.binaryPacketsDecoded++;
  workerStats.usersProcessed += userCount;
  
  return {
    packetType,
    userCount,
    timestamp,
    users,
    rawBytes: binarySize,
    compressionRatio,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAVERSINE DISTANCE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  workerStats.distanceCalculations++;
  return EARTH_RADIUS_KM * c * 1000; // Return meters
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERPOLATION (Smooth position transitions)
// ═══════════════════════════════════════════════════════════════════════════════

function interpolatePositions(
  existingUsers: Map<string, ProcessedUser>,
  newUsers: BinaryUserPosition[],
  myUserId: string,
  now: number
): ProcessedUser[] {
  const results: ProcessedUser[] = [];
  
  for (const bUser of newUsers) {
    const syntheticUserId = `hash_${bUser.userIdHash.toString(16)}`;
    
    // Skip self
    if (syntheticUserId === myUserId) continue;
    
    const existing = existingUsers.get(syntheticUserId);
    
    if (existing) {
      // Interpolate
      results.push({
        user_id: syntheticUserId,
        userIdHash: bUser.userIdHash,
        lat: existing.lat + (bUser.lat - existing.lat) * INTERPOLATION_FACTOR,
        lng: existing.lng + (bUser.lng - existing.lng) * INTERPOLATION_FACTOR,
        heading: bUser.heading ?? existing.heading,
        speed: bUser.speed ?? existing.speed,
        status: bUser.status,
        last_seen: now,
        significance_score: bUser.significanceScore,
      });
      workerStats.interpolations++;
    } else {
      // New user
      results.push({
        user_id: syntheticUserId,
        userIdHash: bUser.userIdHash,
        lat: bUser.lat,
        lng: bUser.lng,
        heading: bUser.heading ?? undefined,
        speed: bUser.speed ?? undefined,
        status: bUser.status,
        last_seen: now,
        significance_score: bUser.significanceScore,
      });
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STALE USER CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

function cleanupStaleUsers(users: ProcessedUser[], now: number): ProcessedUser[] {
  workerStats.cleanupOperations++;
  return users.filter(u => now - u.last_seen <= STALE_USER_TIMEOUT_MS);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOULMATE FILTERING (Find compatible users nearby)
// ═══════════════════════════════════════════════════════════════════════════════

interface SoulmateFilterParams {
  users: ProcessedUser[];
  myLat: number;
  myLng: number;
  maxDistanceKm: number;
  minSignificance: number;
}

function filterSoulmates(params: SoulmateFilterParams): ProcessedUser[] {
  const { users, myLat, myLng, maxDistanceKm, minSignificance } = params;
  
  return users
    .map(user => ({
      ...user,
      distance_from_me: calculateDistance(myLat, myLng, user.lat, user.lng),
    }))
    .filter(user => 
      user.distance_from_me! <= maxDistanceKm * 1000 &&
      user.significance_score >= minSignificance &&
      user.status === 'online'
    )
    .map(user => ({
      ...user,
      is_soulmate_candidate: true,
    }))
    .sort((a, b) => a.distance_from_me! - b.distance_from_me!);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULATE DISTANCES FROM MY POSITION
// ═══════════════════════════════════════════════════════════════════════════════

function calculateDistancesFromMe(
  users: ProcessedUser[],
  myLat: number,
  myLng: number
): ProcessedUser[] {
  return users.map(user => ({
    ...user,
    distance_from_me: calculateDistance(myLat, myLng, user.lat, user.lng),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PROCESSING PIPELINE (Decode + Interpolate + Cleanup in one call)
// ═══════════════════════════════════════════════════════════════════════════════

interface FullProcessPayload {
  base64Data: string;
  existingUsers: [string, ProcessedUser][];
  myUserId: string;
  myLat?: number;
  myLng?: number;
}

interface FullProcessResult {
  users: ProcessedUser[];
  decoded: BinaryTickPacket;
  nearbyCount: number;
  onlineCount: number;
}

function fullProcess(payload: FullProcessPayload): FullProcessResult {
  const { base64Data, existingUsers, myUserId, myLat, myLng } = payload;
  const now = Date.now();
  
  // Step 1: Decode binary
  const buffer = base64ToArrayBuffer(base64Data);
  const decoded = decodeTickPacket(buffer);
  
  // Step 2: Convert existing users to Map
  const existingMap = new Map<string, ProcessedUser>(existingUsers);
  
  // Step 3: Interpolate positions
  let users = interpolatePositions(existingMap, decoded.users, myUserId, now);
  
  // Step 4: Add existing users that weren't in this delta
  existingMap.forEach((user, id) => {
    if (!users.find(u => u.user_id === id)) {
      users.push(user);
    }
  });
  
  // Step 5: Cleanup stale users
  users = cleanupStaleUsers(users, now);
  
  // Step 6: Calculate distances if my position is known
  if (myLat !== undefined && myLng !== undefined) {
    users = calculateDistancesFromMe(users, myLat, myLng);
  }
  
  // Step 7: Count stats
  const nearbyCount = users.filter(u => (u.distance_from_me || Infinity) < 1000).length;
  const onlineCount = users.filter(u => u.status === 'online').length;
  
  return {
    users,
    decoded,
    nearbyCount,
    onlineCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const startTime = performance.now();
  const { type, payload, requestId } = event.data;
  
  workerStats.messagesProcessed++;
  
  let response: WorkerResponse;
  
  try {
    switch (type) {
      case 'PING':
        response = {
          type: 'PONG',
          payload: { 
            ready: true,
            stats: workerStats,
          },
          requestId,
          processingTimeMs: performance.now() - startTime,
        };
        break;
        
      case 'DECODE_BINARY':
        const buffer = base64ToArrayBuffer(payload.base64Data);
        const decoded = decodeTickPacket(buffer);
        response = {
          type: 'DECODED',
          payload: decoded,
          requestId,
          processingTimeMs: performance.now() - startTime,
        };
        break;
        
      case 'PROCESS_DELTAS':
        const result = fullProcess(payload);
        response = {
          type: 'PROCESSED',
          payload: result,
          requestId,
          processingTimeMs: performance.now() - startTime,
        };
        break;
        
      case 'CALCULATE_DISTANCES':
        const withDistances = calculateDistancesFromMe(
          payload.users,
          payload.myLat,
          payload.myLng
        );
        response = {
          type: 'DISTANCES',
          payload: withDistances,
          requestId,
          processingTimeMs: performance.now() - startTime,
        };
        break;
        
      case 'FILTER_SOULMATES':
        const soulmates = filterSoulmates(payload);
        response = {
          type: 'SOULMATES',
          payload: soulmates,
          requestId,
          processingTimeMs: performance.now() - startTime,
        };
        break;
        
      case 'CLEANUP_STALE':
        const cleaned = cleanupStaleUsers(payload.users, Date.now());
        response = {
          type: 'CLEANED',
          payload: cleaned,
          requestId,
          processingTimeMs: performance.now() - startTime,
        };
        break;
        
      case 'INTERPOLATE':
        const existingMap = new Map<string, ProcessedUser>(payload.existingUsers);
        const interpolated = interpolatePositions(
          existingMap,
          payload.newUsers,
          payload.myUserId,
          Date.now()
        );
        response = {
          type: 'INTERPOLATED',
          payload: interpolated,
          requestId,
          processingTimeMs: performance.now() - startTime,
        };
        break;
        
      default:
        response = {
          type: 'ERROR',
          payload: { message: `Unknown message type: ${type}` },
          requestId,
          processingTimeMs: performance.now() - startTime,
        };
    }
  } catch (error) {
    response = {
      type: 'ERROR',
      payload: { 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      requestId,
      processingTimeMs: performance.now() - startTime,
    };
  }
  
  // Update stats
  const processingTime = performance.now() - startTime;
  workerStats.totalProcessingTimeMs += processingTime;
  workerStats.averageProcessingTimeMs = workerStats.totalProcessingTimeMs / workerStats.messagesProcessed;
  workerStats.peakProcessingTimeMs = Math.max(workerStats.peakProcessingTimeMs, processingTime);
  workerStats.lastProcessedAt = Date.now();
  
  // Send response
  self.postMessage(response);
  
  // Periodically send stats (every 10 messages)
  if (workerStats.messagesProcessed % 10 === 0) {
    self.postMessage({
      type: 'STATS',
      payload: workerStats,
      requestId: 'stats_' + Date.now(),
      processingTimeMs: 0,
    });
  }
};

// Signal worker is ready
self.postMessage({
  type: 'PONG',
  payload: { ready: true, initialized: true },
  requestId: 'init',
  processingTimeMs: 0,
});

console.log('[SHADOW_WORKER] ZOE-NEXUS Shadow Worker initialized');
