// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL WISDOM - IBM INTELLIGENCE INTEGRATION
// The Data -> Information -> Knowledge -> Wisdom Pyramid
// 
// Based on IBM's AI complexity model:
// - Humans define the WHAT (Macro Goal) - The Purpose/North Star
// - AI figures out the HOW (Micro Goal) - The Daily Actions
// 
// Before any action, Zoe performs a WISDOM CHECK:
// "Does this Micro-action serve the Macro-goal?"
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Macro Goal - The "WHY" (User-Defined, Never Changed by AI)
 * These are the North Star goals that guide all decisions
 */
export interface MacroGoal {
  id: string;
  userId: string;
  title: string;                          // "Retire by 45"
  purpose: string;                        // The deeper why: "Financial freedom to travel with family"
  targetDate?: Date;                      // Optional deadline
  domain: GoalDomain;                     // Financial, Health, Career, Relationships, etc.
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'achieved' | 'paused' | 'abandoned';
  milestones: MacroMilestone[];           // Major checkpoints
  emotionalAnchors: string[];             // "Seeing my kids grow without financial stress"
  createdAt: Date;
  updatedAt: Date;
  isLocked: boolean;                      // AI cannot modify if true
}

export interface MacroMilestone {
  id: string;
  title: string;
  targetDate?: Date;
  progress: number;                       // 0-100
  completed: boolean;
  completedAt?: Date;
}

/**
 * Micro Goal - The "HOW" (AI-Generated from Macro Goals)
 * These are the daily/weekly actionable tasks
 */
export interface MicroGoal {
  id: string;
  userId: string;
  parentMacroId: string;                  // Links to MacroGoal
  title: string;                          // "Save ₹500 today"
  description: string;                    // Detailed action
  actionType: MicroActionType;
  priority: 'now' | 'today' | 'this_week' | 'this_month';
  effort: 'trivial' | 'quick' | 'moderate' | 'significant';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  wisdomScore: number;                    // 0-100: How well this serves the macro goal
  wisdomReasoning: string;                // "This ₹500 adds 0.01% toward retirement corpus"
  estimatedImpact: number;                // Contribution toward macro goal (0-100)
  suggestedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export type GoalDomain = 
  | 'financial'
  | 'health'
  | 'career'
  | 'relationships'
  | 'learning'
  | 'creativity'
  | 'spiritual'
  | 'lifestyle'
  | 'travel'
  | 'legacy';

export type MicroActionType =
  | 'save_money'
  | 'exercise'
  | 'learn'
  | 'connect'
  | 'create'
  | 'meditate'
  | 'reduce_expense'
  | 'invest'
  | 'network'
  | 'health_check'
  | 'skill_build'
  | 'habit_track'
  | 'optimize'
  | 'delegate'
  | 'review'
  | 'other';

/**
 * Wisdom Check Result
 * The AI's judgment on whether an action aligns with macro goals
 */
export interface WisdomCheckResult {
  passed: boolean;                        // Does this serve the macro goal?
  confidenceScore: number;                // 0-100
  alignedMacroGoals: string[];            // IDs of macro goals this serves
  conflictingMacroGoals: string[];        // IDs of macro goals this conflicts with
  reasoning: string;                      // Explanation
  recommendation: 'proceed' | 'modify' | 'reject' | 'defer';
  suggestedModification?: string;         // If 'modify', what to change
  opportunityCost?: string;               // What you're giving up
  longTermImpact: 'positive' | 'neutral' | 'negative';
  processingTimeMs: number;
}

/**
 * Life Codex - The complete goal hierarchy for a user
 */
export interface LifeCodex {
  userId: string;
  macroGoals: MacroGoal[];
  microGoals: MicroGoal[];
  wisdomLevel: number;                    // 0-100: How well-aligned the user's actions are
  lastWisdomCheck: Date;
  totalWisdomChecks: number;
  passRate: number;                       // % of actions that passed wisdom check
  topDomains: GoalDomain[];               // User's priority domains
  lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL WISDOM ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class ProtocolWisdomEngine {
  private userId: string;
  private macroGoals: MacroGoal[] = [];
  private microGoals: MicroGoal[] = [];
  private wisdomCheckCache: Map<string, WisdomCheckResult> = new Map();
  private isInitialized = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ═══════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════
  async initialize(): Promise<boolean> {
    try {
      console.log(`[WISDOM] Initializing Protocol Wisdom for user: ${this.userId}`);

      // Load existing goals from database
      await this.loadGoals();

      this.isInitialized = true;
      console.log(`[WISDOM] Initialized with ${this.macroGoals.length} macro goals, ${this.microGoals.length} micro goals`);
      
      return true;
    } catch (error) {
      console.error('[WISDOM] Initialization error:', error);
      return false;
    }
  }

  private async loadGoals(): Promise<void> {
    // Load macro goals
    const { data: macros } = await supabase
      .from('wisdom_macro_goals')
      .select('*')
      .eq('user_id', this.userId)
      .eq('status', 'active');

    if (macros) {
      this.macroGoals = macros.map(this.dbToMacroGoal);
    }

    // Load active micro goals
    const { data: micros } = await supabase
      .from('wisdom_micro_goals')
      .select('*')
      .eq('user_id', this.userId)
      .in('status', ['pending', 'in_progress']);

    if (micros) {
      this.microGoals = micros.map(this.dbToMicroGoal);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // MACRO GOAL MANAGEMENT (User-Defined, AI-Protected)
  // ═══════════════════════════════════════════════════════════════════
  
  /**
   * Add a new Macro Goal (The North Star)
   * This is USER input only - AI cannot create macro goals
   */
  async addMacroGoal(goal: Omit<MacroGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isLocked'>): Promise<MacroGoal | null> {
    try {
      const newGoal: MacroGoal = {
        ...goal,
        id: crypto.randomUUID(),
        userId: this.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isLocked: true, // Macro goals are always locked from AI modification
      };

      // Persist to database
      const { error } = await supabase
        .from('wisdom_macro_goals')
        .insert(this.macroGoalToDb(newGoal) as any);

      if (error) throw error;

      this.macroGoals.push(newGoal);
      
      console.log(`[WISDOM] Macro goal added: "${goal.title}"`);
      
      // Trigger micro goal generation
      await this.generateMicroGoalsFromMacro(newGoal);

      return newGoal;
    } catch (error) {
      console.error('[WISDOM] Add macro goal error:', error);
      return null;
    }
  }

  /**
   * Get all macro goals for the user
   */
  getMacroGoals(): MacroGoal[] {
    return [...this.macroGoals];
  }

  /**
   * Get macro goal by ID
   */
  getMacroGoal(id: string): MacroGoal | undefined {
    return this.macroGoals.find(g => g.id === id);
  }

  /**
   * Update macro goal progress (User action only)
   */
  async updateMacroProgress(goalId: string, milestone: MacroMilestone): Promise<boolean> {
    const goal = this.macroGoals.find(g => g.id === goalId);
    if (!goal) return false;

    const existingIndex = goal.milestones.findIndex(m => m.id === milestone.id);
    if (existingIndex >= 0) {
      goal.milestones[existingIndex] = milestone;
    } else {
      goal.milestones.push(milestone);
    }

    goal.updatedAt = new Date();

    await supabase
      .from('wisdom_macro_goals')
      .update({ 
        milestones: goal.milestones as any,
        updated_at: goal.updatedAt.toISOString()
      })
      .eq('id', goalId);

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════
  // MICRO GOAL GENERATION (AI-Driven from Macro Goals)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Generate micro goals from a macro goal
   * This is where AI determines the HOW from the user's WHAT
   */
  async generateMicroGoalsFromMacro(macro: MacroGoal): Promise<MicroGoal[]> {
    console.log(`[WISDOM] Generating micro goals for: "${macro.title}"`);

    const generatedMicros: MicroGoal[] = [];

    // Domain-specific micro goal generation
    switch (macro.domain) {
      case 'financial':
        generatedMicros.push(...this.generateFinancialMicros(macro));
        break;
      case 'health':
        generatedMicros.push(...this.generateHealthMicros(macro));
        break;
      case 'career':
        generatedMicros.push(...this.generateCareerMicros(macro));
        break;
      case 'relationships':
        generatedMicros.push(...this.generateRelationshipMicros(macro));
        break;
      default:
        generatedMicros.push(...this.generateGenericMicros(macro));
    }

    // Persist micro goals
    for (const micro of generatedMicros) {
      await supabase
        .from('wisdom_micro_goals')
        .insert(this.microGoalToDb(micro) as any);
      
      this.microGoals.push(micro);
    }

    console.log(`[WISDOM] Generated ${generatedMicros.length} micro goals`);
    return generatedMicros;
  }

  private generateFinancialMicros(macro: MacroGoal): MicroGoal[] {
    const micros: MicroGoal[] = [];
    const now = new Date();

    // Example: "Retire by 45" -> daily savings micro goals
    if (macro.title.toLowerCase().includes('retire')) {
      micros.push({
        id: crypto.randomUUID(),
        userId: this.userId,
        parentMacroId: macro.id,
        title: 'Save ₹500 today',
        description: 'Set aside ₹500 toward your retirement corpus. Every small amount compounds over time.',
        actionType: 'save_money',
        priority: 'today',
        effort: 'trivial',
        status: 'pending',
        wisdomScore: 95,
        wisdomReasoning: `This ₹500 directly serves your goal to "${macro.title}". Daily micro-savings compound to significant wealth.`,
        estimatedImpact: 0.01,
        suggestedAt: now,
      });

      micros.push({
        id: crypto.randomUUID(),
        userId: this.userId,
        parentMacroId: macro.id,
        title: 'Review one unnecessary subscription',
        description: 'Find one subscription you can cancel to redirect funds to your retirement goal.',
        actionType: 'reduce_expense',
        priority: 'this_week',
        effort: 'quick',
        status: 'pending',
        wisdomScore: 85,
        wisdomReasoning: 'Eliminating recurring expenses accelerates your path to financial freedom.',
        estimatedImpact: 0.5,
        suggestedAt: now,
      });
    }

    return micros;
  }

  private generateHealthMicros(macro: MacroGoal): MicroGoal[] {
    const micros: MicroGoal[] = [];
    const now = new Date();

    micros.push({
      id: crypto.randomUUID(),
      userId: this.userId,
      parentMacroId: macro.id,
      title: '10-minute morning stretch',
      description: 'Start your day with a short stretching routine to build the habit.',
      actionType: 'exercise',
      priority: 'today',
      effort: 'trivial',
      status: 'pending',
      wisdomScore: 90,
      wisdomReasoning: `Small daily habits build toward "${macro.title}". Consistency trumps intensity.`,
      estimatedImpact: 0.1,
      suggestedAt: now,
    });

    return micros;
  }

  private generateCareerMicros(macro: MacroGoal): MicroGoal[] {
    const micros: MicroGoal[] = [];
    const now = new Date();

    micros.push({
      id: crypto.randomUUID(),
      userId: this.userId,
      parentMacroId: macro.id,
      title: 'Learn one new skill for 15 minutes',
      description: 'Dedicate focused time to skill development that advances your career goal.',
      actionType: 'skill_build',
      priority: 'today',
      effort: 'quick',
      status: 'pending',
      wisdomScore: 88,
      wisdomReasoning: `Building skills daily compounds toward "${macro.title}".`,
      estimatedImpact: 0.2,
      suggestedAt: now,
    });

    return micros;
  }

  private generateRelationshipMicros(macro: MacroGoal): MicroGoal[] {
    const micros: MicroGoal[] = [];
    const now = new Date();

    micros.push({
      id: crypto.randomUUID(),
      userId: this.userId,
      parentMacroId: macro.id,
      title: 'Send a thoughtful message to someone you care about',
      description: 'Nurture your relationships with a simple act of connection.',
      actionType: 'connect',
      priority: 'today',
      effort: 'trivial',
      status: 'pending',
      wisdomScore: 92,
      wisdomReasoning: `Small acts of connection strengthen relationships toward "${macro.title}".`,
      estimatedImpact: 0.3,
      suggestedAt: now,
    });

    return micros;
  }

  private generateGenericMicros(macro: MacroGoal): MicroGoal[] {
    const micros: MicroGoal[] = [];
    const now = new Date();

    micros.push({
      id: crypto.randomUUID(),
      userId: this.userId,
      parentMacroId: macro.id,
      title: `Take one step toward "${macro.title}"`,
      description: 'Identify and complete the smallest possible action that moves you forward.',
      actionType: 'other',
      priority: 'today',
      effort: 'quick',
      status: 'pending',
      wisdomScore: 80,
      wisdomReasoning: 'Any forward progress is valuable. Start small, build momentum.',
      estimatedImpact: 0.1,
      suggestedAt: now,
    });

    return micros;
  }

  // ═══════════════════════════════════════════════════════════════════
  // THE WISDOM CHECK - The Core Judgment Logic
  // ═══════════════════════════════════════════════════════════════════

  /**
   * WISDOM CHECK: Does this action serve the macro goals?
   * This is called BEFORE any suggested action to validate alignment
   */
  performWisdomCheck(
    proposedAction: string,
    context?: {
      domain?: GoalDomain;
      estimatedCost?: number;
      estimatedTime?: number;
      urgency?: 'immediate' | 'normal' | 'low';
    }
  ): WisdomCheckResult {
    const startTime = performance.now();

    const alignedGoals: string[] = [];
    const conflictingGoals: string[] = [];
    let maxAlignmentScore = 0;

    // Check alignment with each macro goal
    for (const macro of this.macroGoals) {
      const alignment = this.calculateAlignment(proposedAction, macro, context);
      
      if (alignment.score > 0) {
        alignedGoals.push(macro.id);
        maxAlignmentScore = Math.max(maxAlignmentScore, alignment.score);
      } else if (alignment.score < 0) {
        conflictingGoals.push(macro.id);
      }
    }

    // Determine recommendation
    let recommendation: WisdomCheckResult['recommendation'] = 'proceed';
    let longTermImpact: WisdomCheckResult['longTermImpact'] = 'positive';

    if (conflictingGoals.length > alignedGoals.length) {
      recommendation = 'reject';
      longTermImpact = 'negative';
    } else if (conflictingGoals.length > 0 && alignedGoals.length > 0) {
      recommendation = 'modify';
      longTermImpact = 'neutral';
    } else if (alignedGoals.length === 0) {
      recommendation = 'defer';
      longTermImpact = 'neutral';
    }

    // Build reasoning
    const reasoning = this.buildWisdomReasoning(
      proposedAction,
      alignedGoals.map(id => this.getMacroGoal(id)!),
      conflictingGoals.map(id => this.getMacroGoal(id)!),
      recommendation
    );

    const result: WisdomCheckResult = {
      passed: recommendation === 'proceed' || recommendation === 'modify',
      confidenceScore: Math.round(maxAlignmentScore * 100),
      alignedMacroGoals: alignedGoals,
      conflictingMacroGoals: conflictingGoals,
      reasoning,
      recommendation,
      longTermImpact,
      processingTimeMs: Math.round(performance.now() - startTime),
    };

    // Cache the result
    this.wisdomCheckCache.set(proposedAction, result);

    console.log(`[WISDOM] Check for "${proposedAction.slice(0, 50)}...": ${recommendation.toUpperCase()}`);

    return result;
  }

  private calculateAlignment(
    action: string,
    macro: MacroGoal,
    context?: { domain?: GoalDomain; estimatedCost?: number; estimatedTime?: number }
  ): { score: number; reason: string } {
    let score = 0;
    const actionLower = action.toLowerCase();
    const macroLower = macro.title.toLowerCase();

    // Domain alignment check
    if (context?.domain && context.domain === macro.domain) {
      score += 0.3;
    }

    // Keyword matching for financial goals
    if (macro.domain === 'financial') {
      if (actionLower.includes('save') || actionLower.includes('invest') || actionLower.includes('budget')) {
        score += 0.5;
      }
      if (actionLower.includes('spend') || actionLower.includes('buy') || actionLower.includes('purchase')) {
        // Check if it's a necessary expense
        if (!actionLower.includes('essential') && !actionLower.includes('necessary')) {
          score -= 0.3;
        }
      }
    }

    // Keyword matching for health goals
    if (macro.domain === 'health') {
      if (actionLower.includes('exercise') || actionLower.includes('workout') || actionLower.includes('walk')) {
        score += 0.5;
      }
      if (actionLower.includes('sleep') || actionLower.includes('rest') || actionLower.includes('meditate')) {
        score += 0.4;
      }
    }

    // Keyword matching for career goals
    if (macro.domain === 'career') {
      if (actionLower.includes('learn') || actionLower.includes('skill') || actionLower.includes('network')) {
        score += 0.5;
      }
      if (actionLower.includes('project') || actionLower.includes('work') || actionLower.includes('meeting')) {
        score += 0.3;
      }
    }

    // Priority boost
    if (macro.priority === 'critical') {
      score *= 1.5;
    } else if (macro.priority === 'high') {
      score *= 1.2;
    }

    return {
      score: Math.min(1, Math.max(-1, score)),
      reason: score > 0 ? `Aligns with "${macro.title}"` : `May conflict with "${macro.title}"`
    };
  }

  private buildWisdomReasoning(
    action: string,
    alignedGoals: MacroGoal[],
    conflictingGoals: MacroGoal[],
    recommendation: string
  ): string {
    let reasoning = '';

    if (recommendation === 'proceed' && alignedGoals.length > 0) {
      const goalTitles = alignedGoals.map(g => `"${g.title}"`).join(', ');
      reasoning = `✅ This action directly serves your goal of ${goalTitles}. Proceed with confidence.`;
    } else if (recommendation === 'reject' && conflictingGoals.length > 0) {
      const goalTitles = conflictingGoals.map(g => `"${g.title}"`).join(', ');
      reasoning = `⚠️ This action conflicts with your priority of ${goalTitles}. Consider an alternative that better aligns with your North Star.`;
    } else if (recommendation === 'modify') {
      reasoning = `🔄 This action has mixed alignment. Consider modifying it to better serve your macro goals while minimizing conflicts.`;
    } else {
      reasoning = `🤔 This action doesn't clearly connect to your defined macro goals. Consider if it's truly necessary right now.`;
    }

    return reasoning;
  }

  // ═══════════════════════════════════════════════════════════════════
  // MICRO GOAL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get today's micro goals (prioritized)
   */
  getTodaysMicroGoals(): MicroGoal[] {
    return this.microGoals
      .filter(m => m.status === 'pending' && ['now', 'today'].includes(m.priority))
      .sort((a, b) => {
        // Sort by wisdom score (higher first)
        return b.wisdomScore - a.wisdomScore;
      });
  }

  /**
   * Complete a micro goal
   */
  async completeMicroGoal(goalId: string): Promise<boolean> {
    const goal = this.microGoals.find(g => g.id === goalId);
    if (!goal) return false;

    goal.status = 'completed';
    goal.completedAt = new Date();

    await supabase
      .from('wisdom_micro_goals')
      .update({
        status: 'completed',
        completed_at: goal.completedAt.toISOString()
      } as any)
      .eq('id', goalId);

    console.log(`[WISDOM] Micro goal completed: "${goal.title}"`);
    
    return true;
  }

  /**
   * Skip a micro goal (with reason)
   */
  async skipMicroGoal(goalId: string, reason?: string): Promise<boolean> {
    const goal = this.microGoals.find(g => g.id === goalId);
    if (!goal) return false;

    goal.status = 'skipped';
    goal.metadata = { ...goal.metadata, skipReason: reason };

    await supabase
      .from('wisdom_micro_goals')
      .update({
        status: 'skipped',
        metadata: goal.metadata
      } as any)
      .eq('id', goalId);

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════
  // LIFE CODEX SUMMARY
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get the complete Life Codex for the user
   */
  getLifeCodex(): LifeCodex {
    const completedChecks = Array.from(this.wisdomCheckCache.values());
    const passedChecks = completedChecks.filter(c => c.passed);

    // Determine top domains
    const domainCounts: Record<GoalDomain, number> = {} as Record<GoalDomain, number>;
    this.macroGoals.forEach(g => {
      domainCounts[g.domain] = (domainCounts[g.domain] || 0) + 1;
    });
    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([domain]) => domain as GoalDomain);

    return {
      userId: this.userId,
      macroGoals: this.macroGoals,
      microGoals: this.microGoals,
      wisdomLevel: this.calculateWisdomLevel(),
      lastWisdomCheck: new Date(),
      totalWisdomChecks: completedChecks.length,
      passRate: completedChecks.length > 0 ? (passedChecks.length / completedChecks.length) * 100 : 100,
      topDomains,
      lastUpdated: new Date(),
    };
  }

  private calculateWisdomLevel(): number {
    if (this.macroGoals.length === 0) return 0;

    // Wisdom level based on:
    // 1. Having clear macro goals (30%)
    // 2. Active micro goals aligned to macros (30%)
    // 3. Completion rate of micro goals (20%)
    // 4. Wisdom check pass rate (20%)

    let level = 0;

    // Clear macro goals
    const activeMacros = this.macroGoals.filter(g => g.status === 'active');
    level += Math.min(30, activeMacros.length * 10);

    // Active micro goals
    const activeMicros = this.microGoals.filter(g => g.status === 'pending' || g.status === 'in_progress');
    level += Math.min(30, activeMicros.length * 5);

    // Completion rate
    const completedMicros = this.microGoals.filter(g => g.status === 'completed');
    if (this.microGoals.length > 0) {
      level += (completedMicros.length / this.microGoals.length) * 20;
    }

    // Wisdom check pass rate
    const checks = Array.from(this.wisdomCheckCache.values());
    if (checks.length > 0) {
      const passed = checks.filter(c => c.passed).length;
      level += (passed / checks.length) * 20;
    }

    return Math.round(level);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DATABASE CONVERSION HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private macroGoalToDb(goal: MacroGoal): Record<string, any> {
    return {
      id: goal.id,
      user_id: goal.userId,
      title: goal.title,
      purpose: goal.purpose,
      target_date: goal.targetDate?.toISOString() || null,
      domain: goal.domain,
      priority: goal.priority,
      status: goal.status,
      milestones: goal.milestones,
      emotional_anchors: goal.emotionalAnchors,
      created_at: goal.createdAt.toISOString(),
      updated_at: goal.updatedAt.toISOString(),
      is_locked: goal.isLocked,
    };
  }

  private dbToMacroGoal(row: any): MacroGoal {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      purpose: row.purpose,
      targetDate: row.target_date ? new Date(row.target_date) : undefined,
      domain: row.domain,
      priority: row.priority,
      status: row.status,
      milestones: row.milestones || [],
      emotionalAnchors: row.emotional_anchors || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      isLocked: row.is_locked,
    };
  }

  private microGoalToDb(goal: MicroGoal): Record<string, any> {
    return {
      id: goal.id,
      user_id: goal.userId,
      parent_macro_id: goal.parentMacroId,
      title: goal.title,
      description: goal.description,
      action_type: goal.actionType,
      priority: goal.priority,
      effort: goal.effort,
      status: goal.status,
      wisdom_score: goal.wisdomScore,
      wisdom_reasoning: goal.wisdomReasoning,
      estimated_impact: goal.estimatedImpact,
      suggested_at: goal.suggestedAt.toISOString(),
      completed_at: goal.completedAt?.toISOString() || null,
      metadata: goal.metadata || {},
    };
  }

  private dbToMicroGoal(row: any): MicroGoal {
    return {
      id: row.id,
      userId: row.user_id,
      parentMacroId: row.parent_macro_id,
      title: row.title,
      description: row.description,
      actionType: row.action_type,
      priority: row.priority,
      effort: row.effort,
      status: row.status,
      wisdomScore: row.wisdom_score,
      wisdomReasoning: row.wisdom_reasoning,
      estimatedImpact: row.estimated_impact,
      suggestedAt: new Date(row.suggested_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      metadata: row.metadata,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

const wisdomEngines = new Map<string, ProtocolWisdomEngine>();

export function getWisdomEngine(userId: string): ProtocolWisdomEngine {
  if (!wisdomEngines.has(userId)) {
    wisdomEngines.set(userId, new ProtocolWisdomEngine(userId));
  }
  return wisdomEngines.get(userId)!;
}

export default ProtocolWisdomEngine;
