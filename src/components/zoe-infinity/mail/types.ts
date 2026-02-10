/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Core types for the Agentic Mail System.
 * Designed for standalone deployment and future migration.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// GATEKEEPER SYSTEM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type GatekeeperVerdict = 
  | 'pending'      // Not yet analyzed
  | 'approved'     // Safe, from known sender
  | 'spam'         // Junk, auto-deleted
  | 'suspicious'   // Needs human review
  | 'newsletter'   // Bulk mail, summarizable
  | 'meeting'      // Calendar request
  | 'financial'    // Banking/payment related
  | 'personal'     // From contacts
  | 'work';        // Professional communication

export type MessagePriority = 'urgent' | 'high' | 'normal' | 'low';

export interface GatekeeperAction {
  type: 'book_meeting' | 'summarize' | 'reply' | 'archive' | 'delete' | 'snooze';
  description: string;
  payload?: Record<string, any>;
  autoExecute?: boolean; // If true, Zoe acts without approval
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIL MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MailMessage {
  id: string;
  
  // Sender info
  senderName: string;
  senderEmail: string;
  senderVerified: boolean; // Known contact / authenticated
  senderAvatar?: string;
  
  // Message content
  subject: string;
  preview: string;
  body?: string; // Full content (loaded on demand)
  htmlBody?: string;
  
  // Timestamps
  timestamp: Date;
  receivedAt: Date;
  readAt?: Date;
  
  // Status
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  
  // Gatekeeper analysis
  gatekeeperVerdict: GatekeeperVerdict;
  gatekeeperSummary?: string; // AI-generated summary
  gatekeeperAction?: GatekeeperAction;
  gatekeeperConfidence: number; // 0-1
  
  // Classification
  priority: MessagePriority;
  labels: string[];
  threadId?: string;
  replyToId?: string;
  
  // Attachments
  attachments?: MailAttachment[];
  
  // Security
  spamScore: number; // 0-1
  phishingIndicators: string[];
  encryptionStatus: 'none' | 'tls' | 'e2e' | 'ironclad';
  
  // DHF Integration
  dhfLinked?: boolean; // Linked to user's DHF profile
  emotionalContext?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: number; // 0-1
    importance: number; // 0-1
  };
}

export interface MailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
  scanned: boolean;
  safe: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIL FOLDER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MailFolder = 
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'starred'
  | 'archive'
  | 'spam'
  | 'trash'
  | 'newsletters'  // Auto-sorted by Gatekeeper
  | 'meetings'     // Calendar-related
  | 'financial';   // Banking/payment

export interface MailFolderStats {
  folder: MailFolder;
  totalCount: number;
  unreadCount: number;
  lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSE / DRAFT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComposeDraft {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments: File[];
  replyToId?: string;
  threadId?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Zoe assistance
  zoeAssisted: boolean;
  zoeSuggestions?: {
    subject?: string;
    body?: string;
    tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY BRIEFING TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface DailyBriefing {
  id: string;
  generatedAt: Date;
  
  // Summary stats
  totalNewMessages: number;
  spamBlocked: number;
  meetingsScheduled: number;
  actionRequired: number;
  
  // Categorized summaries
  urgentItems: MailMessage[];
  newsletterDigest: {
    source: string;
    summary: string;
    keyPoints: string[];
  }[];
  meetingRequests: {
    message: MailMessage;
    proposedTime?: Date;
    autoBooked: boolean;
  }[];
  
  // Zoe's voice summary (for TTS)
  voiceSummary: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VPN / IRONCLAD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface IroncladStatus {
  enabled: boolean;
  tunnelActive: boolean;
  encryptionLevel: 'standard' | 'high' | 'quantum';
  exitNode?: string;
  ipMasked: boolean;
  lastHandshake?: Date;
  bytesEncrypted: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MailIntegrationConfig {
  provider: 'gmail' | 'outlook' | 'imap' | 'custom';
  connected: boolean;
  email: string;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  errorMessage?: string;
}

export interface ZoeMailState {
  // Current view
  currentFolder: MailFolder;
  selectedMessageId?: string;
  
  // Data
  messages: MailMessage[];
  folders: MailFolderStats[];
  drafts: ComposeDraft[];
  
  // Status
  isLoading: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  
  // Gatekeeper
  gatekeeperActive: boolean;
  gatekeeperProcessing: number; // Messages being analyzed
  
  // Ironclad VPN
  ironclad: IroncladStatus;
  
  // Integration
  integration: MailIntegrationConfig | null;
  
  // Daily Briefing
  todaysBriefing?: DailyBriefing;
}
