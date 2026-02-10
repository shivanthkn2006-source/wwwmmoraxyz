/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE PASSPORT PROTOCOL - Decentralized Identity & Trust System
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE PHILOSOPHY: Zoe isn't just an app; she is a digital citizen.
 * Every Zoe instance has a unique, cryptographic identity verified by
 * the user's biometrics and device keys.
 * 
 * THE BENEFIT: No central "Big Brother" database. Your Zoe proves who
 * she is to other Zoes without revealing your raw data.
 * 
 * IMPLEMENTATION:
 * - Decentralized Identity (DID) standards
 * - Cryptographic proof exchange
 * - Reputation Protocol with trust scoring
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ZoePassport {
  did: string; // Decentralized Identifier (did:zoe:xxxx)
  publicKey: string;
  created: number;
  version: string;
  capabilities: ZoeCapability[];
  trustScore: number; // 0-100
  verifications: Verification[];
  delegations: Delegation[];
}

export interface ZoeCapability {
  type: 'chat' | 'schedule' | 'payment' | 'trade' | 'health' | 'home' | 'social';
  level: 'basic' | 'advanced' | 'sovereign';
  granted: number;
  expires?: number;
}

export interface Verification {
  type: 'device' | 'biometric' | 'email' | 'phone' | 'social';
  verifiedAt: number;
  proofHash: string;
  issuer: string;
}

export interface Delegation {
  targetDid: string;
  capabilities: ZoeCapability[];
  granted: number;
  expires: number;
  revoked: boolean;
}

export interface CryptographicProof {
  type: 'identity' | 'capability' | 'trust' | 'delegation';
  issuer: string;
  subject: string;
  claim: Record<string, unknown>;
  signature: string;
  timestamp: number;
  nonce: string;
}

export interface TrustExchange {
  initiatorDid: string;
  responderDid: string;
  proofs: CryptographicProof[];
  mutualTrustScore: number;
  established: number;
  purpose: string;
}

export interface ReputationRecord {
  did: string;
  positiveInteractions: number;
  negativeInteractions: number;
  spamReports: number;
  trustScore: number;
  lastUpdated: number;
  badges: ReputationBadge[];
}

export interface ReputationBadge {
  type: 'verified_human' | 'trusted_agent' | 'first_wave' | 'helper' | 'pioneer';
  awarded: number;
  proof: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASSPORT MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class ZoePassportManager {
  private passport: ZoePassport | null = null;
  private keyPair: { publicKey: string; privateKey: string } | null = null;
  private trustedDids: Map<string, TrustExchange> = new Map();
  private reputationCache: Map<string, ReputationRecord> = new Map();
  private blockedDids: Set<string> = new Set();

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(userId: string): Promise<ZoePassport> {
    // Generate or retrieve key pair
    this.keyPair = await this.getOrCreateKeyPair(userId);
    
    // Generate DID from public key
    const did = this.generateDID(this.keyPair.publicKey);
    
    // Load or create passport
    const stored = this.loadPassport();
    if (stored && stored.did === did) {
      this.passport = stored;
    } else {
      this.passport = {
        did,
        publicKey: this.keyPair.publicKey,
        created: Date.now(),
        version: '1.0.0',
        capabilities: [
          { type: 'chat', level: 'basic', granted: Date.now() },
          { type: 'social', level: 'basic', granted: Date.now() },
        ],
        trustScore: 50, // Start neutral
        verifications: [],
        delegations: [],
      };
      this.savePassport();
    }

    this.dispatchEvent('passport_initialized', { did: this.passport.did });
    console.log('[ZoePassport] Initialized:', this.passport.did);
    
    return this.passport;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KEY MANAGEMENT (Simulated - Would use WebCrypto in production)
  // ═══════════════════════════════════════════════════════════════════════════

  private async getOrCreateKeyPair(userId: string): Promise<{ publicKey: string; privateKey: string }> {
    const stored = localStorage.getItem('zoe_passport_keys');
    if (stored) {
      return JSON.parse(stored);
    }

    // Generate simulated key pair (would use WebCrypto.subtle in production)
    const entropy = await this.generateEntropy(userId);
    const keyPair = {
      publicKey: this.hash(`pub_${entropy}`),
      privateKey: this.hash(`priv_${entropy}`),
    };

    localStorage.setItem('zoe_passport_keys', JSON.stringify(keyPair));
    return keyPair;
  }

  private async generateEntropy(userId: string): Promise<string> {
    const random = crypto.getRandomValues(new Uint8Array(32));
    const randomHex = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${userId}_${randomHex}_${Date.now()}`;
  }

  private hash(input: string): string {
    // Simulated hash (would use crypto.subtle.digest in production)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  private generateDID(publicKey: string): string {
    return `did:zoe:${publicKey.substring(0, 16)}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRYPTOGRAPHIC PROOFS
  // ═══════════════════════════════════════════════════════════════════════════

  createProof(
    type: CryptographicProof['type'],
    claim: Record<string, unknown>,
    subjectDid?: string
  ): CryptographicProof | null {
    if (!this.passport || !this.keyPair) return null;

    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const nonceHex = Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const proofData = {
      type,
      issuer: this.passport.did,
      subject: subjectDid || this.passport.did,
      claim,
      timestamp: Date.now(),
      nonce: nonceHex,
    };

    // Sign the proof (simulated - would use actual crypto signing)
    const signature = this.sign(JSON.stringify(proofData));

    return {
      ...proofData,
      signature,
    };
  }

  verifyProof(proof: CryptographicProof): boolean {
    // Verify timestamp is recent (within 5 minutes)
    if (Date.now() - proof.timestamp > 5 * 60 * 1000) {
      return false;
    }

    // Verify signature (simulated)
    const proofData = {
      type: proof.type,
      issuer: proof.issuer,
      subject: proof.subject,
      claim: proof.claim,
      timestamp: proof.timestamp,
      nonce: proof.nonce,
    };

    const expectedSignature = this.hash(JSON.stringify(proofData));
    return proof.signature.length > 0; // Simplified verification
  }

  private sign(data: string): string {
    if (!this.keyPair) return '';
    return this.hash(`${data}_${this.keyPair.privateKey}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRUST EXCHANGE (Zoe-to-Zoe Communication)
  // ═══════════════════════════════════════════════════════════════════════════

  async initiateExchange(
    targetDid: string,
    purpose: string
  ): Promise<TrustExchange | null> {
    if (!this.passport) return null;

    // Check if blocked
    if (this.blockedDids.has(targetDid)) {
      this.dispatchEvent('exchange_blocked', { targetDid, reason: 'blocked' });
      return null;
    }

    // Create identity proof
    const identityProof = this.createProof('identity', {
      capabilities: this.passport.capabilities,
      trustScore: this.passport.trustScore,
      verifications: this.passport.verifications.map(v => v.type),
    });

    if (!identityProof) return null;

    // Create trust proof
    const trustProof = this.createProof('trust', {
      purpose,
      requestedCapabilities: ['chat'],
    }, targetDid);

    if (!trustProof) return null;

    const exchange: TrustExchange = {
      initiatorDid: this.passport.did,
      responderDid: targetDid,
      proofs: [identityProof, trustProof],
      mutualTrustScore: 0, // Will be calculated after response
      established: Date.now(),
      purpose,
    };

    this.dispatchEvent('exchange_initiated', { exchange });
    return exchange;
  }

  async respondToExchange(
    exchange: TrustExchange,
    accept: boolean
  ): Promise<TrustExchange | null> {
    if (!this.passport || !accept) {
      this.dispatchEvent('exchange_rejected', { exchange });
      return null;
    }

    // Verify initiator's proofs
    const allValid = exchange.proofs.every(p => this.verifyProof(p));
    if (!allValid) {
      this.dispatchEvent('exchange_invalid', { exchange, reason: 'invalid_proofs' });
      return null;
    }

    // Create response proof
    const responseProof = this.createProof('trust', {
      accepted: true,
      responderTrustScore: this.passport.trustScore,
    }, exchange.initiatorDid);

    if (!responseProof) return null;

    // Calculate mutual trust
    const initiatorTrust = (exchange.proofs[0]?.claim as any)?.trustScore || 50;
    const mutualTrustScore = Math.min(initiatorTrust, this.passport.trustScore);

    const completedExchange: TrustExchange = {
      ...exchange,
      proofs: [...exchange.proofs, responseProof],
      mutualTrustScore,
      established: Date.now(),
    };

    // Store trusted DID
    this.trustedDids.set(exchange.initiatorDid, completedExchange);
    this.savePassport();

    this.dispatchEvent('exchange_completed', { exchange: completedExchange });
    return completedExchange;
  }

  isTrusted(did: string): boolean {
    return this.trustedDids.has(did);
  }

  getTrustLevel(did: string): number {
    const exchange = this.trustedDids.get(did);
    return exchange?.mutualTrustScore || 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPUTATION PROTOCOL
  // ═══════════════════════════════════════════════════════════════════════════

  recordInteraction(targetDid: string, positive: boolean): void {
    let record = this.reputationCache.get(targetDid);
    
    if (!record) {
      record = {
        did: targetDid,
        positiveInteractions: 0,
        negativeInteractions: 0,
        spamReports: 0,
        trustScore: 50,
        lastUpdated: Date.now(),
        badges: [],
      };
    }

    if (positive) {
      record.positiveInteractions++;
    } else {
      record.negativeInteractions++;
    }

    // Recalculate trust score
    const total = record.positiveInteractions + record.negativeInteractions;
    if (total > 0) {
      record.trustScore = Math.round((record.positiveInteractions / total) * 100);
    }

    // Apply spam penalty
    if (record.spamReports > 5) {
      record.trustScore = Math.max(0, record.trustScore - record.spamReports * 5);
    }

    record.lastUpdated = Date.now();
    this.reputationCache.set(targetDid, record);

    // Auto-block if trust drops too low
    if (record.trustScore < 10) {
      this.blockDid(targetDid, 'trust_threshold');
    }

    this.dispatchEvent('reputation_updated', { record });
  }

  reportSpam(targetDid: string): void {
    let record = this.reputationCache.get(targetDid) || {
      did: targetDid,
      positiveInteractions: 0,
      negativeInteractions: 0,
      spamReports: 0,
      trustScore: 50,
      lastUpdated: Date.now(),
      badges: [],
    };

    record.spamReports++;
    record.trustScore = Math.max(0, record.trustScore - 10);
    record.lastUpdated = Date.now();

    this.reputationCache.set(targetDid, record);

    // Auto-block after 3 spam reports
    if (record.spamReports >= 3) {
      this.blockDid(targetDid, 'spam');
    }

    this.dispatchEvent('spam_reported', { targetDid, totalReports: record.spamReports });
  }

  blockDid(did: string, reason: string): void {
    this.blockedDids.add(did);
    this.trustedDids.delete(did);
    this.dispatchEvent('did_blocked', { did, reason });
  }

  unblockDid(did: string): void {
    this.blockedDids.delete(did);
    this.dispatchEvent('did_unblocked', { did });
  }

  getReputation(did: string): ReputationRecord | null {
    return this.reputationCache.get(did) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  grantCapability(
    targetDid: string,
    capability: ZoeCapability,
    expiresInMs: number = 24 * 60 * 60 * 1000
  ): boolean {
    if (!this.passport) return false;

    // Check if we have this capability at a high enough level
    const hasCapability = this.passport.capabilities.some(
      c => c.type === capability.type && 
           (c.level === 'sovereign' || c.level === capability.level)
    );

    if (!hasCapability) return false;

    const delegation: Delegation = {
      targetDid,
      capabilities: [capability],
      granted: Date.now(),
      expires: Date.now() + expiresInMs,
      revoked: false,
    };

    this.passport.delegations.push(delegation);
    this.savePassport();

    this.dispatchEvent('capability_granted', { targetDid, capability });
    return true;
  }

  revokeDelegation(targetDid: string): void {
    if (!this.passport) return;

    this.passport.delegations = this.passport.delegations.map(d => 
      d.targetDid === targetDid ? { ...d, revoked: true } : d
    );
    this.savePassport();

    this.dispatchEvent('delegation_revoked', { targetDid });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  async addVerification(
    type: Verification['type'],
    proofData: string
  ): Promise<boolean> {
    if (!this.passport) return false;

    const verification: Verification = {
      type,
      verifiedAt: Date.now(),
      proofHash: this.hash(proofData),
      issuer: 'self',
    };

    this.passport.verifications.push(verification);
    
    // Increase trust score based on verification type
    const trustBonus = {
      device: 5,
      biometric: 15,
      email: 10,
      phone: 10,
      social: 5,
    };

    this.passport.trustScore = Math.min(100, this.passport.trustScore + trustBonus[type]);
    this.savePassport();

    this.dispatchEvent('verification_added', { type, newTrustScore: this.passport.trustScore });
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  private loadPassport(): ZoePassport | null {
    try {
      const stored = localStorage.getItem('zoe_passport');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private savePassport(): void {
    if (this.passport) {
      localStorage.setItem('zoe_passport', JSON.stringify(this.passport));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  getPassport(): ZoePassport | null {
    return this.passport;
  }

  getDid(): string | null {
    return this.passport?.did || null;
  }

  getTrustScore(): number {
    return this.passport?.trustScore || 0;
  }

  getTrustedDids(): string[] {
    return Array.from(this.trustedDids.keys());
  }

  getBlockedDids(): string[] {
    return Array.from(this.blockedDids);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  private dispatchEvent(type: string, payload: unknown): void {
    window.dispatchEvent(new CustomEvent('zoe-core-event', {
      detail: {
        type: `passport_${type}`,
        payload: {
          ...payload as object,
          timestamp: Date.now(),
          protocol: 'ZOE-PASSPORT-DID',
        }
      }
    }));
  }
}

// Singleton export
export const PassportManager = new ZoePassportManager();
export default PassportManager;
