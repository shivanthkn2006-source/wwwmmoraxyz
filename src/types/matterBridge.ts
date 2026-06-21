// ═══════════════════════════════════════════════════════════════════════════════
// MATTER BRIDGE TYPE DEFINITIONS
// Complete type system for the Executive Action Engine
// ═══════════════════════════════════════════════════════════════════════════════

export type ActionCategory = 
  | 'calendar'
  | 'tasks'
  | 'communication'
  | 'smart_home'
  | 'financial'
  | 'data'
  | 'external'
  | 'system';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ActionType = 
  // Calendar
  | 'create_reminder'
  | 'schedule_event'
  // Tasks
  | 'create_task'
  | 'complete_task'
  // Communication
  | 'draft_email'
  | 'draft_sms'
  | 'send_message'
  | 'send_notification'
  // Smart Home
  | 'lock_door'
  | 'unlock_door'
  | 'turn_off_lights'
  | 'disable_alarm'
  // Financial
  | 'execute_payment'
  | 'execute_trade'
  // Data
  | 'save_insight'
  | 'update_profile'
  // System
  | 'run_platform_scan'
  | 'trigger_dream_synthesis';

export interface SovereigntyLeash {
  budget: {
    spendLimit: number;
    dailyLimit: number;
    tradeLimit: number;
    currency: string;
  };
  smartHome: {
    allowed: string[];
    forbidden: string[];
    requiresPresence: string[];
  };
  communication: {
    allowDraft: boolean;
    allowSend: boolean;
    allowSchedule: boolean;
    maxRecipients: number;
  };
  data: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    sensitiveFields: string[];
  };
}

export interface PermissionRequest {
  id: string;
  actionId: string;
  actionName: string;
  description: string;
  riskLevel: RiskLevel;
  budgetImpact?: number;
  reason: string;
  expiresAt: string;
  parameters: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  undoable: boolean;
  undoAction?: string;
  executionProof?: string;
  needsApprovalToSend?: boolean;
}

export interface MatterBridgeResponse {
  success: boolean;
  actionExecuted: boolean;
  divineActionReport?: string;
  requiresApproval: boolean;
  permissionRequest?: PermissionRequest;
  result?: ActionResult;
  processingMs: number;
  sovereignty: {
    withinLeash: boolean;
    dailySpent: number;
    dailyLimit: number;
  };
  error?: string;
}

export interface MatterAction {
  actionType: ActionType;
  parameters: Record<string, any>;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category?: ActionCategory;
}

export interface ExecutionContext {
  userId: string;
  userAutonomy: number;
  dailySpent: number;
  isUserPresent: boolean;
}

// Default sovereignty leash values
export const DEFAULT_SOVEREIGNTY_LEASH: SovereigntyLeash = {
  budget: {
    spendLimit: 50.00,
    dailyLimit: 200.00,
    tradeLimit: 100.00,
    currency: 'USD'
  },
  smartHome: {
    allowed: ['lock_door', 'turn_off_lights', 'adjust_thermostat', 'arm_away'],
    forbidden: ['unlock_door', 'disable_alarm', 'disarm_security', 'open_garage'],
    requiresPresence: ['unlock_door', 'open_garage']
  },
  communication: {
    allowDraft: true,
    allowSend: false,
    allowSchedule: true,
    maxRecipients: 10
  },
  data: {
    canRead: true,
    canWrite: true,
    canDelete: false,
    sensitiveFields: ['password', 'ssn', 'credit_card', 'bank_account']
  }
};

// Risk level colors for UI
export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' }
};

// Category icons
export const CATEGORY_ICONS: Record<ActionCategory, string> = {
  calendar: '📅',
  tasks: '✅',
  communication: '💬',
  smart_home: '🏠',
  financial: '💰',
  data: '📊',
  external: '🔗',
  system: '⚙️'
};
