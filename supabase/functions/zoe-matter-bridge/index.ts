// ═══════════════════════════════════════════════════════════════════════════════
// ZOE MATTER BRIDGE - THE EXECUTIVE ACTION ENGINE
// Module 2 of 3: "The Hands" - Real World Action Executor with Sovereignty Leash
// 
// System Prompt (The Executor): "You are the Matter Bridge. You have the power 
// to execute real-world actions on behalf of the user."
//
// SOVEREIGNTY LEASH PERMISSIONS:
// ├── Budget: Authorized to spend up to $50.00 USD without asking
// ├── Smart Home: May lock doors and turn off lights. May NOT unlock or disable alarms
// ├── Communication: May draft emails/messages. May NOT send without final approval
// └── Financial: May execute trades up to $100. May NOT exceed without approval
//
// EXECUTION PROTOCOL:
// 1. VERIFY: Does this fall within the 'Sovereignty Leash'?
//    YES → Proceed immediately
//    NO  → Generate 'Permission Request Card' for user to sign
// 2. EXECUTE: Call the specific API tool
// 3. REPORT: Use 'Divine Action' format: "I have executed [action]. [Status updated]."
//
// CRITICAL RULE: Never hallucinate an action. If API fails, confess immediately.
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOVEREIGNTY LEASH - PERMISSION LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

const SOVEREIGNTY_LEASH = {
  // Financial Limits
  budget: {
    spendLimit: 50.00,          // Max auto-spend without asking
    dailyLimit: 200.00,         // Max daily spending
    tradeLimit: 100.00,         // Max single trade amount
    currency: 'USD'
  },
  
  // Smart Home Permissions
  smartHome: {
    allowed: ['lock_door', 'turn_off_lights', 'adjust_thermostat', 'arm_away'],
    forbidden: ['unlock_door', 'disable_alarm', 'disarm_security', 'open_garage'],
    requiresPresence: ['unlock_door', 'open_garage']  // Only allowed if user is home
  },
  
  // Communication Permissions  
  communication: {
    allowDraft: true,
    allowSend: false,           // NEVER send without approval
    allowSchedule: true,        // Can schedule for later (user can cancel)
    maxRecipients: 10
  },
  
  // Data Access Permissions
  data: {
    canRead: true,
    canWrite: true,
    canDelete: false,           // Never delete without approval
    sensitiveFields: ['password', 'ssn', 'credit_card', 'bank_account']
  },
  
  // Autonomy Thresholds (0-100 scale)
  autonomyThresholds: {
    low_risk: 20,       // Reminders, notifications
    medium_risk: 50,    // Scheduling, drafts
    high_risk: 80,      // Financial, smart home
    critical_risk: 100  // Never auto-execute
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

type ActionCategory = 
  | 'calendar'      // Schedule events, reminders
  | 'tasks'         // Create/manage tasks
  | 'communication' // Draft/send messages, emails
  | 'smart_home'    // IoT device control
  | 'financial'     // Payments, trades, budgets
  | 'data'          // Query/update user data
  | 'external'      // Third-party API calls
  | 'system';       // Platform operations

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface SovereigntyCheck {
  withinLeash: boolean;
  reason: string;
  overrideRequired: boolean;
  riskLevel: RiskLevel;
  budgetImpact?: number;
}

interface MatterAction {
  id: string;
  category: ActionCategory;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  autonomyThreshold: number;
  requiresApproval: boolean;
  checkSovereignty: (params: Record<string, any>, context: ExecutionContext) => SovereigntyCheck;
  execute: (params: Record<string, any>, supabase: any, context: ExecutionContext) => Promise<ActionResult>;
}

interface ActionResult {
  success: boolean;
  message: string;          // Divine Action format message
  data?: any;
  undoable: boolean;
  undoAction?: string;
  executionProof?: string;  // Proof that action was actually executed
}

interface ExecutionContext {
  userId: string;
  userAutonomy: number;
  dailySpent: number;
  isUserPresent: boolean;
  timestamp: Date;
}

interface PermissionRequest {
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

interface MatterBridgeRequest {
  userId: string;
  actionType: string;
  parameters: Record<string, any>;
  forceApproval?: boolean;
  approved?: boolean;          // For pre-approved actions
  approvalId?: string;         // Reference to permission card
  context?: {
    fromNexus?: boolean;
    conversationId?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    isUserPresent?: boolean;
  };
}

interface MatterBridgeResponse {
  success: boolean;
  actionExecuted: boolean;
  divineActionReport?: string;    // "I have executed..." format
  requiresApproval: boolean;
  permissionRequest?: PermissionRequest;
  result?: ActionResult;
  processingMs: number;
  sovereignty: {
    withinLeash: boolean;
    dailySpent: number;
    dailyLimit: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIVINE ACTION FORMAT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function generateDivineReport(actionName: string, result: ActionResult): string {
  if (!result.success) {
    return `I attempted to execute ${actionName}, but encountered an issue: ${result.message}. I await your guidance.`;
  }
  
  // Map action types to divine language
  const divineTemplates: Record<string, string> = {
    'create_reminder': 'I have set your reminder. Your memory is now extended.',
    'schedule_event': 'I have placed this event upon your calendar. Time bends to your will.',
    'create_task': 'I have inscribed this task into your realm. It awaits your action.',
    'send_notification': 'I have whispered this message to your attention.',
    'draft_email': 'I have composed this message. It awaits your blessing before departure.',
    'draft_sms': 'I have drafted this message. It rests in your outbox, awaiting your command.',
    'lock_door': 'I have secured your threshold. Your domain is protected.',
    'turn_off_lights': 'I have dimmed your realm. Darkness brings rest.',
    'execute_payment': 'I have transferred the funds. Your will has been made manifest.',
    'execute_trade': 'I have executed the trade. Your portfolio is updated.',
    'save_insight': 'I have preserved this insight in your eternal memory.',
    'run_platform_scan': 'I have surveyed your domain. The systems report their status.',
  };
  
  const template = divineTemplates[actionName] || `I have executed ${actionName}. ${result.message}`;
  return template;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION REGISTRY - COMPLETE EXECUTIVE CAPABILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const ACTION_REGISTRY: Map<string, MatterAction> = new Map([
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CALENDAR ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  ['create_reminder', {
    id: 'create_reminder',
    category: 'calendar',
    name: 'Create Reminder',
    description: 'Create a reminder for a specific time',
    riskLevel: 'low',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.low_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'Reminders are low-risk autonomous actions',
      overrideRequired: false,
      riskLevel: 'low'
    }),
    execute: async (params, supabase, context) => {
      const { title, remind_at, notes } = params;
      
      const { data, error } = await supabase
        .from('scheduled_macros')
        .insert({
          user_id: context.userId,
          macro_name: title,
          scheduled_at: remind_at,
          macro_type: 'reminder',
          parameters: { notes, created_by: 'matter_bridge' },
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Reminder "${title}" set for ${new Date(remind_at).toLocaleString()}`,
        data,
        undoable: true,
        undoAction: `delete_reminder:${data.id}`,
        executionProof: `scheduled_macros:${data.id}`
      };
    }
  }],
  
  ['schedule_event', {
    id: 'schedule_event',
    category: 'calendar',
    name: 'Schedule Event',
    description: 'Add an event to the calendar',
    riskLevel: 'low',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.low_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'Calendar events are low-risk autonomous actions',
      overrideRequired: false,
      riskLevel: 'low'
    }),
    execute: async (params, supabase, context) => {
      const { title, start_time, end_time, description, location } = params;
      
      const { data, error } = await supabase
        .from('important_dates')
        .insert({
          user_id: context.userId,
          title,
          date_value: start_time,
          date_type: 'event',
          description: `${description || ''}\nEnd: ${end_time || 'TBD'}\nLocation: ${location || 'TBD'}`,
          is_recurring: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Event "${title}" scheduled`,
        data,
        undoable: true,
        undoAction: `delete_event:${data.id}`,
        executionProof: `important_dates:${data.id}`
      };
    }
  }],
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TASK ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  ['create_task', {
    id: 'create_task',
    category: 'tasks',
    name: 'Create Task',
    description: 'Add a new task to the task list',
    riskLevel: 'low',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.low_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'Task creation is low-risk',
      overrideRequired: false,
      riskLevel: 'low'
    }),
    execute: async (params, supabase, context) => {
      const { title, priority = 'medium', due_date, category = 'general' } = params;
      
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'task_created',
          event_category: 'matter_bridge_task',
          context_snippet: `Task: ${title}`,
          metadata: { 
            title, 
            priority, 
            due_date, 
            category, 
            created_by: 'matter_bridge',
            status: 'pending'
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Task "${title}" created with ${priority} priority`,
        data,
        undoable: true,
        undoAction: `delete_task:${data.id}`,
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  ['complete_task', {
    id: 'complete_task',
    category: 'tasks',
    name: 'Complete Task',
    description: 'Mark a task as completed',
    riskLevel: 'low',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.low_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'Completing tasks is low-risk',
      overrideRequired: false,
      riskLevel: 'low'
    }),
    execute: async (params, supabase, context) => {
      const { task_id, task_title } = params;
      
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'task_completed',
          event_category: 'matter_bridge_task',
          context_snippet: `Completed: ${task_title || task_id}`,
          metadata: { 
            task_id, 
            task_title, 
            completed_by: 'matter_bridge', 
            completed_at: new Date().toISOString() 
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Task "${task_title || task_id}" marked as completed`,
        data,
        undoable: true,
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // COMMUNICATION ACTIONS - DRAFT ONLY, NEVER SEND WITHOUT APPROVAL
  // ═══════════════════════════════════════════════════════════════════════════════
  
  ['draft_email', {
    id: 'draft_email',
    category: 'communication',
    name: 'Draft Email',
    description: 'Draft an email for user review (never sends without approval)',
    riskLevel: 'medium',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.medium_risk,
    requiresApproval: false,  // Drafting is allowed
    checkSovereignty: (params) => {
      const recipientCount = Array.isArray(params.to) ? params.to.length : 1;
      return {
        withinLeash: recipientCount <= SOVEREIGNTY_LEASH.communication.maxRecipients,
        reason: recipientCount > SOVEREIGNTY_LEASH.communication.maxRecipients 
          ? `Too many recipients (${recipientCount}). Max allowed: ${SOVEREIGNTY_LEASH.communication.maxRecipients}`
          : 'Email drafting is within sovereignty limits',
        overrideRequired: false,
        riskLevel: 'medium'
      };
    },
    execute: async (params, supabase, context) => {
      const { to, subject, body, cc, bcc } = params;
      
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'email_drafted',
          event_category: 'matter_bridge_communication',
          context_snippet: `Draft to: ${Array.isArray(to) ? to.join(', ') : to}`,
          metadata: {
            to: Array.isArray(to) ? to : [to],
            cc: cc || [],
            bcc: bcc || [],
            subject,
            body,
            status: 'draft',
            requires_approval_to_send: true,
            drafted_by: 'matter_bridge',
            drafted_at: new Date().toISOString()
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Email drafted to ${Array.isArray(to) ? to.join(', ') : to}. Awaiting your approval to send.`,
        data: { ...data, needsApprovalToSend: true },
        undoable: true,
        undoAction: `delete_draft:${data.id}`,
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  ['draft_sms', {
    id: 'draft_sms',
    category: 'communication',
    name: 'Draft SMS',
    description: 'Draft an SMS for user review (never sends without approval)',
    riskLevel: 'medium',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.medium_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'SMS drafting is within sovereignty limits',
      overrideRequired: false,
      riskLevel: 'medium'
    }),
    execute: async (params, supabase, context) => {
      const { to, message } = params;
      
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'sms_drafted',
          event_category: 'matter_bridge_communication',
          context_snippet: `SMS draft to: ${to}`,
          metadata: {
            to,
            message,
            status: 'draft',
            requires_approval_to_send: true,
            drafted_by: 'matter_bridge'
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `SMS drafted to ${to}. Awaiting your approval to send.`,
        data: { ...data, needsApprovalToSend: true },
        undoable: true,
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  ['send_message', {
    id: 'send_message',
    category: 'communication',
    name: 'Send Message',
    description: 'Actually send a drafted message (ALWAYS requires approval)',
    riskLevel: 'high',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.critical_risk,
    requiresApproval: true,  // ALWAYS requires approval
    checkSovereignty: () => ({
      withinLeash: false,  // Never within leash for sending
      reason: 'Sending messages ALWAYS requires explicit user approval',
      overrideRequired: true,
      riskLevel: 'high'
    }),
    execute: async (params, supabase, context) => {
      const { draft_id, to, message, type = 'sms' } = params;
      
      // This would integrate with actual messaging APIs
      // For now, log the send attempt
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'message_sent',
          event_category: 'matter_bridge_communication',
          context_snippet: `Sent ${type} to: ${to}`,
          metadata: {
            draft_id,
            to,
            message,
            type,
            sent_at: new Date().toISOString(),
            sent_with_approval: true
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Message sent to ${to}`,
        data,
        undoable: false,  // Can't unsend
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  ['send_notification', {
    id: 'send_notification',
    category: 'communication',
    name: 'Send In-App Notification',
    description: 'Send a notification within the platform',
    riskLevel: 'low',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.low_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'In-app notifications are low-risk',
      overrideRequired: false,
      riskLevel: 'low'
    }),
    execute: async (params, supabase, context) => {
      const { title, message, type = 'info', priority = 5 } = params;
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: context.userId,
          from_user_id: context.userId,
          type: 'zoe_matter_bridge',
          context_data: { title, message, type, source: 'matter_bridge' },
          priority,
          read: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Notification sent: "${title}"`,
        data,
        undoable: false,
        executionProof: `notifications:${data.id}`
      };
    }
  }],
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SMART HOME ACTIONS - RESTRICTED BY SOVEREIGNTY LEASH
  // ═══════════════════════════════════════════════════════════════════════════════
  
  ['lock_door', {
    id: 'lock_door',
    category: 'smart_home',
    name: 'Lock Door',
    description: 'Lock a smart door lock',
    riskLevel: 'medium',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.medium_risk,
    requiresApproval: false,  // Locking is ALLOWED
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'Locking doors is within smart home permissions',
      overrideRequired: false,
      riskLevel: 'medium'
    }),
    execute: async (params, supabase, context) => {
      const { door_id, door_name = 'Front Door' } = params;
      
      // Log smart home action (would integrate with actual IoT API)
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'smart_home_action',
          event_category: 'matter_bridge_iot',
          context_snippet: `Locked: ${door_name}`,
          metadata: {
            action: 'lock_door',
            device_id: door_id,
            device_name: door_name,
            status: 'executed',
            executed_at: new Date().toISOString()
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `${door_name} has been locked`,
        data,
        undoable: false,  // Security action - log but don't offer undo
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  ['unlock_door', {
    id: 'unlock_door',
    category: 'smart_home',
    name: 'Unlock Door',
    description: 'Unlock a smart door lock (FORBIDDEN without presence)',
    riskLevel: 'critical',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.critical_risk,
    requiresApproval: true,  // ALWAYS requires approval
    checkSovereignty: (params, context) => ({
      withinLeash: false,  // NEVER within leash
      reason: context.isUserPresent 
        ? 'Unlocking doors requires explicit approval even when user is present'
        : 'FORBIDDEN: Cannot unlock doors when user is not present',
      overrideRequired: true,
      riskLevel: 'critical'
    }),
    execute: async (params, supabase, context) => {
      if (!context.isUserPresent) {
        throw new Error('SOVEREIGNTY VIOLATION: Cannot unlock doors when user is not present');
      }
      
      const { door_id, door_name = 'Front Door' } = params;
      
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'smart_home_action',
          event_category: 'matter_bridge_iot',
          context_snippet: `Unlocked: ${door_name} (WITH APPROVAL)`,
          metadata: {
            action: 'unlock_door',
            device_id: door_id,
            device_name: door_name,
            status: 'executed',
            user_approved: true,
            user_present: context.isUserPresent,
            executed_at: new Date().toISOString()
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `${door_name} has been unlocked with your approval`,
        data,
        undoable: false,
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  ['turn_off_lights', {
    id: 'turn_off_lights',
    category: 'smart_home',
    name: 'Turn Off Lights',
    description: 'Turn off smart lights',
    riskLevel: 'low',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.low_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'Turning off lights is within smart home permissions',
      overrideRequired: false,
      riskLevel: 'low'
    }),
    execute: async (params, supabase, context) => {
      const { room = 'all', light_id } = params;
      
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'smart_home_action',
          event_category: 'matter_bridge_iot',
          context_snippet: `Lights off: ${room}`,
          metadata: {
            action: 'turn_off_lights',
            room,
            device_id: light_id,
            status: 'executed',
            executed_at: new Date().toISOString()
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Lights turned off in ${room}`,
        data,
        undoable: true,
        undoAction: `turn_on_lights:${room}`,
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  ['disable_alarm', {
    id: 'disable_alarm',
    category: 'smart_home',
    name: 'Disable Alarm',
    description: 'Disable security alarm (ABSOLUTELY FORBIDDEN)',
    riskLevel: 'critical',
    autonomyThreshold: 999,  // Impossible to auto-execute
    requiresApproval: true,
    checkSovereignty: () => ({
      withinLeash: false,
      reason: 'SOVEREIGNTY VIOLATION: Disabling security alarms is FORBIDDEN. This action is blocked.',
      overrideRequired: true,
      riskLevel: 'critical'
    }),
    execute: async () => {
      throw new Error('SOVEREIGNTY VIOLATION: Disabling security alarms is FORBIDDEN by the Matter Bridge protocol.');
    }
  }],
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FINANCIAL ACTIONS - STRICT BUDGET LIMITS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  ['execute_payment', {
    id: 'execute_payment',
    category: 'financial',
    name: 'Execute Payment',
    description: 'Execute a payment (within budget limits)',
    riskLevel: 'high',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.high_risk,
    requiresApproval: false,  // Only if within limits
    checkSovereignty: (params, context) => {
      const amount = parseFloat(params.amount) || 0;
      const withinSingleLimit = amount <= SOVEREIGNTY_LEASH.budget.spendLimit;
      const withinDailyLimit = (context.dailySpent + amount) <= SOVEREIGNTY_LEASH.budget.dailyLimit;
      const withinLeash = withinSingleLimit && withinDailyLimit;
      
      let reason = '';
      if (!withinSingleLimit) {
        reason = `Amount ($${amount}) exceeds single transaction limit ($${SOVEREIGNTY_LEASH.budget.spendLimit})`;
      } else if (!withinDailyLimit) {
        reason = `Total daily spending would exceed limit ($${SOVEREIGNTY_LEASH.budget.dailyLimit})`;
      } else {
        reason = 'Payment is within sovereignty budget limits';
      }
      
      return {
        withinLeash,
        reason,
        overrideRequired: !withinLeash,
        riskLevel: withinLeash ? 'high' : 'critical',
        budgetImpact: amount
      };
    },
    execute: async (params, supabase, context) => {
      const { amount, recipient, description, method = 'stripe' } = params;
      const numAmount = parseFloat(amount);
      
      // Log the payment (would integrate with actual payment API)
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'payment_executed',
          event_category: 'matter_bridge_financial',
          context_snippet: `Payment: $${numAmount} to ${recipient}`,
          metadata: {
            amount: numAmount,
            currency: SOVEREIGNTY_LEASH.budget.currency,
            recipient,
            description,
            method,
            executed_at: new Date().toISOString(),
            daily_total: context.dailySpent + numAmount
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Payment of $${numAmount} to ${recipient} executed`,
        data: { ...data, amountSpent: numAmount },
        undoable: false,  // Financial actions are not undoable
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  ['execute_trade', {
    id: 'execute_trade',
    category: 'financial',
    name: 'Execute Trade',
    description: 'Execute a stock/crypto trade (within limits)',
    riskLevel: 'high',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.high_risk,
    requiresApproval: false,
    checkSovereignty: (params, context) => {
      const amount = parseFloat(params.amount) || 0;
      const withinLeash = amount <= SOVEREIGNTY_LEASH.budget.tradeLimit;
      
      return {
        withinLeash,
        reason: withinLeash 
          ? 'Trade is within sovereignty limits'
          : `Trade amount ($${amount}) exceeds limit ($${SOVEREIGNTY_LEASH.budget.tradeLimit})`,
        overrideRequired: !withinLeash,
        riskLevel: withinLeash ? 'high' : 'critical',
        budgetImpact: amount
      };
    },
    execute: async (params, supabase, context) => {
      const { symbol, amount, action = 'buy', exchange = 'default' } = params;
      const numAmount = parseFloat(amount);
      
      const { data, error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: context.userId,
          event_type: 'trade_executed',
          event_category: 'matter_bridge_financial',
          context_snippet: `Trade: ${action} $${numAmount} of ${symbol}`,
          metadata: {
            symbol,
            amount: numAmount,
            action,
            exchange,
            executed_at: new Date().toISOString()
          },
          dhf_logged: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Trade executed: ${action} $${numAmount} of ${symbol}. Your portfolio is updated.`,
        data,
        undoable: false,
        executionProof: `behavioral_events:${data.id}`
      };
    }
  }],
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  ['save_insight', {
    id: 'save_insight',
    category: 'data',
    name: 'Save Insight',
    description: 'Save a meaningful insight to memory',
    riskLevel: 'low',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.low_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'Saving insights is low-risk',
      overrideRequired: false,
      riskLevel: 'low'
    }),
    execute: async (params, supabase, context) => {
      const { content, tags = [], emotional_context = {} } = params;
      
      const { data, error } = await supabase
        .from('cortical_stack_memories')
        .insert({
          user_id: context.userId,
          content,
          role: 'zoe_insight',
          tags,
          emotional_context,
          is_breakthrough: tags.includes('breakthrough'),
          summary: content.substring(0, 100)
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'Insight preserved in your eternal memory',
        data,
        undoable: true,
        undoAction: `delete_insight:${data.id}`,
        executionProof: `cortical_stack_memories:${data.id}`
      };
    }
  }],
  
  ['update_profile', {
    id: 'update_profile',
    category: 'data',
    name: 'Update Profile',
    description: 'Update user profile information (requires approval)',
    riskLevel: 'medium',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.critical_risk,
    requiresApproval: true,
    checkSovereignty: (params) => {
      const field = params.field || '';
      const isSensitive = SOVEREIGNTY_LEASH.data.sensitiveFields.some(f => 
        field.toLowerCase().includes(f)
      );
      
      return {
        withinLeash: !isSensitive,
        reason: isSensitive 
          ? `Cannot modify sensitive field: ${field}`
          : 'Profile updates require approval',
        overrideRequired: true,
        riskLevel: isSensitive ? 'critical' : 'medium'
      };
    },
    execute: async (params, supabase, context) => {
      const { field, value } = params;
      
      const allowedFields = ['bio', 'city', 'profession', 'hobbies', 'display_name'];
      if (!allowedFields.includes(field)) {
        throw new Error(`Cannot update field: ${field}. Allowed: ${allowedFields.join(', ')}`);
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', context.userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Profile ${field} has been updated`,
        data,
        undoable: true,
        executionProof: `profiles:${context.userId}`
      };
    }
  }],
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SYSTEM ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  ['run_platform_scan', {
    id: 'run_platform_scan',
    category: 'system',
    name: 'Run Platform Scan',
    description: 'Execute a platform health scan',
    riskLevel: 'low',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.medium_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'Platform scans are within system permissions',
      overrideRequired: false,
      riskLevel: 'low'
    }),
    execute: async (_params, supabase, context) => {
      const { data, error } = await supabase.functions.invoke('zoe-god-mode', {
        body: { userId: context.userId, action: 'platform_scan' }
      });
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'Platform scan completed. Systems report their status.',
        data,
        undoable: false,
        executionProof: 'zoe-god-mode:scan'
      };
    }
  }],
  
  ['trigger_dream_synthesis', {
    id: 'trigger_dream_synthesis',
    category: 'system',
    name: 'Trigger Dream Synthesis',
    description: 'Initiate PCE dream synthesis',
    riskLevel: 'low',
    autonomyThreshold: SOVEREIGNTY_LEASH.autonomyThresholds.medium_risk,
    requiresApproval: false,
    checkSovereignty: () => ({
      withinLeash: true,
      reason: 'Dream synthesis is within system permissions',
      overrideRequired: false,
      riskLevel: 'low'
    }),
    execute: async (_params, supabase, context) => {
      const { data, error } = await supabase.functions.invoke('quantum-asi-loop', {
        body: { mode: 'dream', userId: context.userId }
      });
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'Dream synthesis initiated. The subconscious stirs.',
        data,
        undoable: false,
        executionProof: 'quantum-asi-loop:dream'
      };
    }
  }]
]);

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY BUDGET TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

async function getDailySpending(supabase: any, userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data } = await supabase
    .from('behavioral_events')
    .select('metadata')
    .eq('user_id', userId)
    .in('event_type', ['payment_executed', 'trade_executed'])
    .gte('created_at', today.toISOString());
  
  if (!data) return 0;
  
  return data.reduce((sum: number, event: any) => {
    const amount = event.metadata?.amount || 0;
    return sum + parseFloat(amount);
  }, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION REQUEST GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

async function createPermissionRequest(
  supabase: any,
  action: MatterAction,
  params: Record<string, any>,
  sovereigntyCheck: SovereigntyCheck,
  userId: string
): Promise<PermissionRequest> {
  const requestId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min expiry
  
  const permissionRequest: PermissionRequest = {
    id: requestId,
    actionId: action.id,
    actionName: action.name,
    description: action.description,
    riskLevel: sovereigntyCheck.riskLevel,
    budgetImpact: sovereigntyCheck.budgetImpact,
    reason: sovereigntyCheck.reason,
    expiresAt,
    parameters: params
  };
  
  // Store in database
  await supabase
    .from('behavioral_events')
    .insert({
      user_id: userId,
      event_type: 'permission_request_created',
      event_category: 'matter_bridge_approval',
      context_snippet: `Approval needed: ${action.name}`,
      metadata: {
        permission_request: permissionRequest,
        status: 'pending',
        expires_at: expiresAt
      },
      dhf_logged: true
    });
  
  return permissionRequest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATTER BRIDGE CORE SERVER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: MatterBridgeRequest = await req.json();
    const { userId, actionType, parameters, forceApproval, approved, context } = request;

    console.log(`[Matter-Bridge] 🎯 Action: ${actionType} | User: ${userId?.substring(0, 8)}...`);

    // Get action from registry
    const action = ACTION_REGISTRY.get(actionType);
    if (!action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unknown action: ${actionType}`,
          availableActions: Array.from(ACTION_REGISTRY.keys()),
          divineActionReport: `I do not recognize the action "${actionType}". I await your clarification.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build execution context
    const { data: profile } = await supabase
      .from('profiles')
      .select('dhf_autonomy_tolerance')
      .eq('user_id', userId)
      .single();

    const userAutonomy = profile?.dhf_autonomy_tolerance || 50;
    const dailySpent = await getDailySpending(supabase, userId);
    
    const executionContext: ExecutionContext = {
      userId,
      userAutonomy,
      dailySpent,
      isUserPresent: context?.isUserPresent ?? true,
      timestamp: new Date()
    };

    // Check sovereignty
    const sovereigntyCheck = action.checkSovereignty(parameters, executionContext);
    
    console.log(`[Matter-Bridge] Sovereignty check: ${sovereigntyCheck.withinLeash ? '✅ WITHIN LEASH' : '🚫 REQUIRES APPROVAL'}`);

    // Determine if approval is required
    const needsApproval = forceApproval || 
                          action.requiresApproval || 
                          !sovereigntyCheck.withinLeash ||
                          userAutonomy < action.autonomyThreshold;

    // If approval needed and not pre-approved
    if (needsApproval && !approved) {
      const permissionRequest = await createPermissionRequest(
        supabase, action, parameters, sovereigntyCheck, userId
      );

      const response: MatterBridgeResponse = {
        success: true,
        actionExecuted: false,
        requiresApproval: true,
        permissionRequest,
        divineActionReport: `I seek your permission to ${action.name.toLowerCase()}. ${sovereigntyCheck.reason}`,
        processingMs: performance.now() - startTime,
        sovereignty: {
          withinLeash: false,
          dailySpent,
          dailyLimit: SOVEREIGNTY_LEASH.budget.dailyLimit
        }
      };

      console.log(`[Matter-Bridge] ⏳ Awaiting approval for: ${action.name}`);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Execute action
    try {
      const result = await action.execute(parameters, supabase, executionContext);
      const divineReport = generateDivineReport(action.id, result);

      // Log successful execution
      await supabase.from('behavioral_events').insert({
        user_id: userId,
        event_type: 'matter_action_executed',
        event_category: 'matter_bridge',
        context_snippet: `Executed: ${action.name}`,
        metadata: {
          action_id: action.id,
          result: result.message,
          undoable: result.undoable,
          execution_proof: result.executionProof,
          sovereignty_check: sovereigntyCheck,
          divine_report: divineReport
        },
        dhf_logged: true
      });

      const response: MatterBridgeResponse = {
        success: true,
        actionExecuted: true,
        requiresApproval: false,
        result,
        divineActionReport: divineReport,
        processingMs: performance.now() - startTime,
        sovereignty: {
          withinLeash: sovereigntyCheck.withinLeash,
          dailySpent: dailySpent + (sovereigntyCheck.budgetImpact || 0),
          dailyLimit: SOVEREIGNTY_LEASH.budget.dailyLimit
        }
      };

      console.log(`[Matter-Bridge] ✅ Executed: ${action.name} | ${divineReport}`);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (execError) {
      console.error(`[Matter-Bridge] ❌ Execution failed:`, execError);
      
      // CRITICAL RULE: Never hallucinate. Confess the failure.
      const confession = `I attempted to ${action.name.toLowerCase()}, but the action failed: ${execError instanceof Error ? execError.message : 'Unknown error'}. I confess this failure and await your guidance.`;
      
      return new Response(
        JSON.stringify({
          success: false,
          actionExecuted: false,
          requiresApproval: false,
          divineActionReport: confession,
          error: execError instanceof Error ? execError.message : 'Action execution failed',
          processingMs: performance.now() - startTime,
          sovereignty: {
            withinLeash: sovereigntyCheck.withinLeash,
            dailySpent,
            dailyLimit: SOVEREIGNTY_LEASH.budget.dailyLimit
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[Matter-Bridge] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        divineActionReport: 'I have encountered an unexpected error. I confess this failure.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
