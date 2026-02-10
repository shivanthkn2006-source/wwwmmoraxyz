// ═══════════════════════════════════════════════════════════════════════════════
// ZOE NEXUS WALLET - The "Quadrillion Valuation" Economic Agent
// Autonomous value execution layer - from advice to action
// ═══════════════════════════════════════════════════════════════════════════════
//
// PROBLEM: Subscriptions ≠ Quadrillion. GDP = Quadrillion.
// - Current Zoe: Gives advice (useProtocolWisdom)
// - Target Zoe: Executes value (books tickets, negotiates bills, finds gigs)
//
// ARCHITECTURE:
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │                    ZOE NEXUS WALLET - ECONOMIC SOVEREIGNTY                  │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │  LAYER 1: VALUE DETECTION                                                   │
// │  ├─ Opportunity Scanner (finds savings, gigs, deals)                        │
// │  ├─ Pattern Matcher (recurring expenses, optimization spots)                │
// │  └─ Market Pulse (price drops, flash sales, arbitrage)                      │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │  LAYER 2: AUTONOMOUS ACTIONS                                                │
// │  ├─ Bill Negotiator (call scripts, email templates)                         │
// │  ├─ Booking Agent (flights, hotels, restaurants)                            │
// │  ├─ Gig Finder (freelance opportunities, side hustles)                      │
// │  └─ Deal Hunter (coupons, cashback, price matching)                         │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │  LAYER 3: EXECUTION & TRACKING                                              │
// │  ├─ Action Queue (pending, in-progress, completed)                          │
// │  ├─ Value Ledger (money saved, earned, optimized)                           │
// │  └─ Trust Score (user approval rate, success rate)                          │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══ CORE TYPES ═══

export type ActionCategory = 
  | 'savings'      // Bill negotiation, subscription optimization
  | 'earnings'     // Gig finding, cashback, referrals
  | 'booking'      // Travel, dining, events
  | 'investment'   // Portfolio optimization
  | 'negotiation'  // Price matching, dispute resolution
  | 'automation';  // Recurring task automation

export type ActionStatus = 
  | 'detected'     // Opportunity identified
  | 'proposed'     // Awaiting user approval
  | 'approved'     // User approved, ready to execute
  | 'executing'    // In progress
  | 'completed'    // Successfully executed
  | 'failed'       // Execution failed
  | 'cancelled';   // User cancelled

export type ActionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface EconomicAction {
  id: string;
  category: ActionCategory;
  status: ActionStatus;
  priority: ActionPriority;
  
  // Description
  title: string;
  description: string;
  rationale: string;
  
  // Value
  estimatedValue: number;
  currency: string;
  valueType: 'saved' | 'earned' | 'optimized';
  confidence: number; // 0-1
  
  // Execution
  requiresApproval: boolean;
  autoExecute: boolean;
  expiresAt?: Date;
  executionSteps: ActionStep[];
  
  // Tracking
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  actualValue?: number;
  
  // Context
  sourceContext: string;
  relatedServices: string[];
}

export interface ActionStep {
  id: string;
  type: 'api_call' | 'email' | 'notification' | 'wait' | 'human_verify' | 'script';
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
}

export interface ValueLedger {
  userId: string;
  totalSaved: number;
  totalEarned: number;
  totalOptimized: number;
  currency: string;
  
  // Monthly breakdown
  monthlyHistory: MonthlyValue[];
  
  // Action stats
  actionsCompleted: number;
  actionsPending: number;
  successRate: number;
  avgValuePerAction: number;
}

export interface MonthlyValue {
  month: string; // YYYY-MM
  saved: number;
  earned: number;
  optimized: number;
  actionsCompleted: number;
}

export interface OpportunitySignal {
  type: 'savings' | 'earnings' | 'deal' | 'optimization';
  source: string;
  description: string;
  estimatedValue: number;
  confidence: number;
  expiresAt?: Date;
  actionRequired: string;
}

// ═══ OPPORTUNITY PATTERNS ═══

const SAVINGS_PATTERNS = {
  subscriptions: [
    { pattern: /netflix|hulu|disney|spotify|apple music/i, avgSavings: 5, action: 'bundle_or_cancel' },
    { pattern: /gym|fitness|peloton/i, avgSavings: 30, action: 'negotiate_or_pause' },
    { pattern: /insurance|geico|state farm|progressive/i, avgSavings: 200, action: 'compare_rates' },
    { pattern: /phone|verizon|at&t|t-mobile/i, avgSavings: 25, action: 'loyalty_discount' },
    { pattern: /internet|comcast|spectrum|xfinity/i, avgSavings: 20, action: 'retention_deal' },
  ],
  bills: [
    { pattern: /electric|utility|power/i, avgSavings: 15, action: 'usage_optimization' },
    { pattern: /credit card|interest|apr/i, avgSavings: 100, action: 'balance_transfer' },
    { pattern: /rent|lease/i, avgSavings: 50, action: 'renewal_negotiation' },
  ],
};

const EARNINGS_PATTERNS = {
  gigs: [
    { skill: 'writing', platforms: ['Upwork', 'Fiverr', 'Medium'], avgEarning: 500 },
    { skill: 'design', platforms: ['99designs', 'Dribbble', 'Behance'], avgEarning: 800 },
    { skill: 'coding', platforms: ['Toptal', 'GitHub Sponsors', 'Freelancer'], avgEarning: 2000 },
    { skill: 'teaching', platforms: ['Udemy', 'Skillshare', 'Teachable'], avgEarning: 300 },
    { skill: 'photography', platforms: ['Shutterstock', 'Adobe Stock', 'iStock'], avgEarning: 200 },
  ],
  passive: [
    { type: 'cashback', platforms: ['Rakuten', 'Ibotta', 'Honey'], avgEarning: 50 },
    { type: 'surveys', platforms: ['Swagbucks', 'Survey Junkie'], avgEarning: 25 },
    { type: 'referrals', avgEarning: 100 },
  ],
};

// ═══ NEGOTIATION SCRIPTS ═══

interface NegotiationTemplate {
  opener: string;
  leverage: string;
  ask: string;
  close: string;
}

const NEGOTIATION_TEMPLATES: Record<string, NegotiationTemplate> = {
  subscription_cancel: {
    opener: "Hi, I've been a loyal customer for {tenure}, but I'm considering canceling due to budget constraints.",
    leverage: "I've noticed competitors offering similar services at lower rates.",
    ask: "Before I cancel, I wanted to see if there are any retention offers or discounts available?",
    close: "I'd really like to stay, but I need the monthly cost to be closer to ${target_price}.",
  },
  bill_reduction: {
    opener: "I'm reviewing my monthly expenses and noticed my {service} bill seems higher than market rates.",
    leverage: "I've been a customer for {tenure} with a perfect payment history.",
    ask: "Are there any loyalty discounts, promotional rates, or plan optimizations available?",
    close: "I'd appreciate if we could bring this down to ${target_price} to keep me as a customer.",
  },
  price_match: {
    opener: "I found the same {product} at {competitor} for ${competitor_price}.",
    leverage: "I've been shopping with you for a while and would prefer to continue.",
    ask: "Do you offer price matching? I'd prefer to purchase from you.",
    close: "Great, can you match that price or offer a better deal?",
  },
};

// ═══ ZOE NEXUS WALLET CLASS ═══

export class ZoeNexusWallet {
  private userId: string;
  private actions: Map<string, EconomicAction> = new Map();
  private ledger: ValueLedger;
  private listeners: Set<(action: EconomicAction) => void> = new Set();
  private trustScore: number = 0.5; // Start neutral
  
  constructor(userId: string) {
    this.userId = userId;
    this.ledger = this.initializeLedger();
  }
  
  private initializeLedger(): ValueLedger {
    return {
      userId: this.userId,
      totalSaved: 0,
      totalEarned: 0,
      totalOptimized: 0,
      currency: 'USD',
      monthlyHistory: [],
      actionsCompleted: 0,
      actionsPending: 0,
      successRate: 0,
      avgValuePerAction: 0,
    };
  }
  
  // ═══ OPPORTUNITY DETECTION ═══
  
  /**
   * Scan user context for economic opportunities
   */
  async scanForOpportunities(context: {
    recentMessages?: string[];
    financialMentions?: string[];
    userSkills?: string[];
    location?: string;
    timezone?: string;
  }): Promise<OpportunitySignal[]> {
    const opportunities: OpportunitySignal[] = [];
    
    // Scan for savings opportunities
    if (context.financialMentions) {
      for (const mention of context.financialMentions) {
        const savingsOpp = this.detectSavingsOpportunity(mention);
        if (savingsOpp) opportunities.push(savingsOpp);
      }
    }
    
    // Scan for earnings opportunities based on skills
    if (context.userSkills) {
      for (const skill of context.userSkills) {
        const earningsOpp = this.detectEarningsOpportunity(skill);
        if (earningsOpp) opportunities.push(earningsOpp);
      }
    }
    
    // Scan messages for optimization hints
    if (context.recentMessages) {
      for (const message of context.recentMessages) {
        const contextOpp = this.detectContextualOpportunity(message);
        if (contextOpp) opportunities.push(contextOpp);
      }
    }
    
    return opportunities;
  }
  
  private detectSavingsOpportunity(mention: string): OpportunitySignal | null {
    // Check subscription patterns
    for (const sub of SAVINGS_PATTERNS.subscriptions) {
      if (sub.pattern.test(mention)) {
        return {
          type: 'savings',
          source: 'subscription_analysis',
          description: `Potential savings on ${mention} - consider ${sub.action.replace(/_/g, ' ')}`,
          estimatedValue: sub.avgSavings,
          confidence: 0.7,
          actionRequired: sub.action,
        };
      }
    }
    
    // Check bill patterns
    for (const bill of SAVINGS_PATTERNS.bills) {
      if (bill.pattern.test(mention)) {
        return {
          type: 'savings',
          source: 'bill_analysis',
          description: `Potential savings on ${mention} - ${bill.action.replace(/_/g, ' ')}`,
          estimatedValue: bill.avgSavings,
          confidence: 0.6,
          actionRequired: bill.action,
        };
      }
    }
    
    return null;
  }
  
  private detectEarningsOpportunity(skill: string): OpportunitySignal | null {
    const skillLower = skill.toLowerCase();
    
    for (const gig of EARNINGS_PATTERNS.gigs) {
      if (skillLower.includes(gig.skill) || gig.skill.includes(skillLower)) {
        return {
          type: 'earnings',
          source: 'skill_matching',
          description: `Your ${skill} skills could earn $${gig.avgEarning}/month on ${gig.platforms.join(', ')}`,
          estimatedValue: gig.avgEarning,
          confidence: 0.65,
          actionRequired: 'create_profile',
        };
      }
    }
    
    return null;
  }
  
  private detectContextualOpportunity(message: string): OpportunitySignal | null {
    const msgLower = message.toLowerCase();
    
    // Travel opportunities
    if (msgLower.includes('flight') || msgLower.includes('travel') || msgLower.includes('vacation')) {
      return {
        type: 'deal',
        source: 'context_analysis',
        description: 'I can help find the best flight deals and set price alerts',
        estimatedValue: 150,
        confidence: 0.5,
        actionRequired: 'search_flights',
      };
    }
    
    // Shopping opportunities
    if (msgLower.includes('buy') || msgLower.includes('purchase') || msgLower.includes('shopping')) {
      return {
        type: 'savings',
        source: 'context_analysis',
        description: 'I can find coupons, cashback, and price comparisons',
        estimatedValue: 25,
        confidence: 0.6,
        actionRequired: 'find_deals',
      };
    }
    
    // Bill complaint
    if (msgLower.includes('expensive') || msgLower.includes('too much') || msgLower.includes('overcharged')) {
      return {
        type: 'savings',
        source: 'context_analysis',
        description: 'I can help negotiate this bill or find alternatives',
        estimatedValue: 50,
        confidence: 0.7,
        actionRequired: 'negotiate',
      };
    }
    
    return null;
  }
  
  // ═══ ACTION CREATION ═══
  
  /**
   * Create an economic action from an opportunity
   */
  createAction(opportunity: OpportunitySignal, options?: {
    autoExecute?: boolean;
    priority?: ActionPriority;
  }): EconomicAction {
    const action: EconomicAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: this.mapOpportunityToCategory(opportunity.type),
      status: 'detected',
      priority: options?.priority || 'medium',
      
      title: this.generateActionTitle(opportunity),
      description: opportunity.description,
      rationale: `Detected from ${opportunity.source}. Confidence: ${(opportunity.confidence * 100).toFixed(0)}%`,
      
      estimatedValue: opportunity.estimatedValue,
      currency: 'USD',
      valueType: opportunity.type === 'earnings' ? 'earned' : 'saved',
      confidence: opportunity.confidence,
      
      requiresApproval: !options?.autoExecute,
      autoExecute: options?.autoExecute || false,
      expiresAt: opportunity.expiresAt,
      executionSteps: this.generateExecutionSteps(opportunity),
      
      createdAt: new Date(),
      sourceContext: opportunity.source,
      relatedServices: [],
    };
    
    this.actions.set(action.id, action);
    this.ledger.actionsPending++;
    this.notifyListeners(action);
    
    return action;
  }
  
  private mapOpportunityToCategory(type: string): ActionCategory {
    switch (type) {
      case 'savings': return 'savings';
      case 'earnings': return 'earnings';
      case 'deal': return 'savings';
      case 'optimization': return 'automation';
      default: return 'savings';
    }
  }
  
  private generateActionTitle(opp: OpportunitySignal): string {
    switch (opp.actionRequired) {
      case 'bundle_or_cancel': return 'Optimize Subscription Bundle';
      case 'negotiate_or_pause': return 'Negotiate Better Rate';
      case 'compare_rates': return 'Compare Insurance Rates';
      case 'loyalty_discount': return 'Request Loyalty Discount';
      case 'retention_deal': return 'Get Retention Offer';
      case 'create_profile': return 'Setup Freelance Profile';
      case 'search_flights': return 'Find Best Flight Deals';
      case 'find_deals': return 'Find Coupons & Cashback';
      case 'negotiate': return 'Negotiate Bill Reduction';
      default: return 'Economic Opportunity';
    }
  }
  
  private generateExecutionSteps(opp: OpportunitySignal): ActionStep[] {
    const steps: ActionStep[] = [];
    
    switch (opp.actionRequired) {
      case 'negotiate_or_pause':
      case 'retention_deal':
      case 'loyalty_discount':
        steps.push(
          { id: 's1', type: 'script', description: 'Generate negotiation script', status: 'pending' },
          { id: 's2', type: 'human_verify', description: 'User reviews and approves script', status: 'pending' },
          { id: 's3', type: 'notification', description: 'Remind user to call/chat with provider', status: 'pending' },
          { id: 's4', type: 'wait', description: 'Wait for user to complete negotiation', status: 'pending' },
          { id: 's5', type: 'human_verify', description: 'User confirms outcome', status: 'pending' },
        );
        break;
        
      case 'compare_rates':
        steps.push(
          { id: 's1', type: 'api_call', description: 'Fetch comparison rates from aggregators', status: 'pending' },
          { id: 's2', type: 'notification', description: 'Present comparison results', status: 'pending' },
          { id: 's3', type: 'human_verify', description: 'User selects preferred option', status: 'pending' },
        );
        break;
        
      case 'create_profile':
        steps.push(
          { id: 's1', type: 'script', description: 'Generate optimized profile content', status: 'pending' },
          { id: 's2', type: 'human_verify', description: 'User reviews profile', status: 'pending' },
          { id: 's3', type: 'notification', description: 'Provide platform signup links', status: 'pending' },
        );
        break;
        
      case 'search_flights':
        steps.push(
          { id: 's1', type: 'api_call', description: 'Search flight aggregators', status: 'pending' },
          { id: 's2', type: 'notification', description: 'Present best options', status: 'pending' },
          { id: 's3', type: 'human_verify', description: 'User selects flight', status: 'pending' },
        );
        break;
        
      default:
        steps.push(
          { id: 's1', type: 'notification', description: 'Present opportunity details', status: 'pending' },
          { id: 's2', type: 'human_verify', description: 'User decides action', status: 'pending' },
        );
    }
    
    return steps;
  }
  
  // ═══ NEGOTIATION SCRIPTS ═══
  
  /**
   * Generate a personalized negotiation script
   */
  generateNegotiationScript(context: {
    service: string;
    tenure?: string;
    currentPrice?: number;
    targetPrice?: number;
    competitor?: string;
    competitorPrice?: number;
  }): {
    script: string[];
    tips: string[];
    expectedSavings: number;
  } {
    const { service, tenure = 'over a year', targetPrice, currentPrice } = context;
    
    // Determine script type
    let template = NEGOTIATION_TEMPLATES.subscription_cancel;
    if (context.competitor && context.competitorPrice) {
      template = NEGOTIATION_TEMPLATES.price_match;
    } else if (currentPrice) {
      template = NEGOTIATION_TEMPLATES.bill_reduction;
    }
    
    // Build script
    const script: string[] = [];
    
    script.push(template.opener
      .replace('{tenure}', tenure)
      .replace('{service}', service)
      .replace('{product}', service)
    );
    
    if (template.leverage) {
      script.push(template.leverage
        .replace('{tenure}', tenure)
        .replace('{competitor}', context.competitor || 'other providers')
      );
    }
    
    script.push(template.ask);
    
    if (targetPrice) {
      script.push(template.close
        .replace('${target_price}', targetPrice.toString())
        .replace('${competitor_price}', context.competitorPrice?.toString() || '')
      );
    }
    
    // Calculate expected savings
    const expectedSavings = currentPrice && targetPrice 
      ? (currentPrice - targetPrice) * 12  // Annual savings
      : 50; // Default estimate
    
    return {
      script,
      tips: [
        'Call at off-peak hours (Tuesday-Thursday, 10am-2pm)',
        'Be polite but firm - you can always escalate',
        'Mention you\'ve been a loyal customer',
        'Ask for the "retention department" directly',
        'If they say no, ask to speak with a supervisor',
        'Be prepared to actually cancel if needed',
      ],
      expectedSavings,
    };
  }
  
  // ═══ ACTION MANAGEMENT ═══
  
  /**
   * Approve an action for execution
   */
  approveAction(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action || action.status !== 'proposed') return false;
    
    action.status = 'approved';
    this.trustScore = Math.min(1, this.trustScore + 0.02);
    this.notifyListeners(action);
    return true;
  }
  
  /**
   * Reject/cancel an action
   */
  cancelAction(actionId: string, _reason?: string): boolean {
    const action = this.actions.get(actionId);
    if (!action) return false;
    
    action.status = 'cancelled';
    this.ledger.actionsPending--;
    this.notifyListeners(action);
    return true;
  }
  
  /**
   * Mark action as completed with actual value
   */
  completeAction(actionId: string, actualValue: number): boolean {
    const action = this.actions.get(actionId);
    if (!action) return false;
    
    action.status = 'completed';
    action.completedAt = new Date();
    action.actualValue = actualValue;
    
    // Update ledger
    if (action.valueType === 'saved') {
      this.ledger.totalSaved += actualValue;
    } else if (action.valueType === 'earned') {
      this.ledger.totalEarned += actualValue;
    } else {
      this.ledger.totalOptimized += actualValue;
    }
    
    this.ledger.actionsCompleted++;
    this.ledger.actionsPending--;
    this.updateSuccessRate();
    
    // Increase trust if value was achieved
    if (actualValue > 0) {
      this.trustScore = Math.min(1, this.trustScore + 0.05);
    }
    
    this.notifyListeners(action);
    return true;
  }
  
  private updateSuccessRate(): void {
    const total = this.ledger.actionsCompleted + this.ledger.actionsPending;
    if (total > 0) {
      const successful = Array.from(this.actions.values()).filter(
        a => a.status === 'completed' && (a.actualValue || 0) > 0
      ).length;
      this.ledger.successRate = successful / total;
    }
    
    // Update avg value
    const completedActions = Array.from(this.actions.values()).filter(a => a.status === 'completed');
    if (completedActions.length > 0) {
      const totalValue = completedActions.reduce((sum, a) => sum + (a.actualValue || 0), 0);
      this.ledger.avgValuePerAction = totalValue / completedActions.length;
    }
  }
  
  // ═══ GETTERS ═══
  
  getAction(actionId: string): EconomicAction | undefined {
    return this.actions.get(actionId);
  }
  
  getAllActions(): EconomicAction[] {
    return Array.from(this.actions.values());
  }
  
  getPendingActions(): EconomicAction[] {
    return this.getAllActions().filter(a => 
      ['detected', 'proposed', 'approved', 'executing'].includes(a.status)
    );
  }
  
  getLedger(): ValueLedger {
    return { ...this.ledger };
  }
  
  getTrustScore(): number {
    return this.trustScore;
  }
  
  getTotalValueGenerated(): number {
    return this.ledger.totalSaved + this.ledger.totalEarned + this.ledger.totalOptimized;
  }
  
  // ═══ LISTENERS ═══
  
  subscribe(listener: (action: EconomicAction) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(action: EconomicAction): void {
    this.listeners.forEach(listener => listener(action));
  }
}

// ═══ SINGLETON & FACTORY ═══

const walletInstances: Map<string, ZoeNexusWallet> = new Map();

export function getZoeNexusWallet(userId: string): ZoeNexusWallet {
  if (!walletInstances.has(userId)) {
    walletInstances.set(userId, new ZoeNexusWallet(userId));
  }
  return walletInstances.get(userId)!;
}

export function destroyZoeNexusWallet(userId: string): void {
  walletInstances.delete(userId);
}

export default ZoeNexusWallet;
