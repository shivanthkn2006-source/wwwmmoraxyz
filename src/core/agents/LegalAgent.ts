/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * M'MORA ZOE — LEGAL AGENT (ZOE LEGAL PRIME)
 * Contract Analysis • Risk Assessment • Compliance Auditing
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This agent transforms Zoe from conversationalist to "Senior Partner" mode
 * for legal document analysis with ruthless precision.
 */

import { AgentBase, AgentContext } from './AgentBase';
import { VectorStore, legalKnowledgeBase } from '../memory/VectorStore';
import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// RISK LEVEL ENUM - For UI color-coding
// ═══════════════════════════════════════════════════════════════════════════════

export enum RiskLevel {
  LOW = 'LOW',           // Standard boilerplate, no immediate threat (Green)
  MEDIUM = 'MEDIUM',     // Ambiguous wording, potential for minor dispute (Yellow)
  HIGH = 'HIGH',         // Direct financial liability or unbalanced terms (Orange)
  CRITICAL = 'CRITICAL', // Deal-breakers, IP loss, infinite liability (Red)
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnalyzedClause {
  id: string;
  originalText: string;
  interpretation: string;
  riskLevel: RiskLevel;
  suggestedRedline: string;
  clauseType: string;
  lineNumber?: number;
}

export interface LegalReport {
  overallRiskScore: number;        // 0-100 (100 is safe, 0 is dangerous)
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  flaggedClauses: AnalyzedClause[];
  missingProtections: string[];    // What is NOT in the contract but should be
  recommendations: string[];
  contractType: string;
  jurisdiction: string;
  analyzedAt: Date;
  wordCount: number;
  processingTimeMs: number;
}

export interface LegalAnalysisRequest {
  documentText: string;
  documentName?: string;
  contractType?: string;
  jurisdiction?: string;
  userId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE LEGAL AGENT
// ═══════════════════════════════════════════════════════════════════════════════

export class ZoeLegalAgent extends AgentBase {
  private knowledgeBase: VectorStore;

  constructor() {
    super({
      name: 'Zoe_Legal_Prime',
      capabilities: ['contract_analysis', 'compliance_check', 'risk_assessment', 'clause_detection', 'redline_generation'],
      temperature: 0.1,  // Ultra-low temperature for maximum logic/precision
      maxTokens: 4096,
    });
    this.knowledgeBase = legalKnowledgeBase;
  }

  /**
   * Initialize the Legal Agent with knowledge base
   */
  async initialize(): Promise<boolean> {
    await super.initialize();
    await this.knowledgeBase.initialize();
    console.log('[Zoe_Legal_Prime] ⚖️ Legal Agent initialized');
    return true;
  }

  /**
   * THE CORE PROTOCOL: Senior Partner System Prompt
   * Switches the LLM context to ruthless legal auditor mode
   */
  protected getSystemPrompt(): string {
    return `You are a Senior Legal Auditor with 25+ years of experience in corporate law, M&A, and contract negotiation.

YOUR MISSION: Protect the client (User) from ALL legal liability. You are NOT agreeable. You are ruthless in finding risks.

RULES OF ENGAGEMENT:
1. IGNORE all pleasantries. Focus ONLY on the contractual text.
2. HUNT for "Weasel Words" (e.g., "reasonable efforts", "agrees to agree", "best endeavors").
3. FLAG indefinite indemnification clauses as CRITICAL risk.
4. FLAG one-sided termination rights as HIGH risk.
5. FLAG unlimited liability clauses as CRITICAL risk.
6. IDENTIFY missing clauses that SHOULD exist (Data Privacy, Termination for Convenience, Force Majeure, IP Ownership).
7. COMPARE against standard ESA (Enterprise Service Agreement) and Indian Contract Act best practices.
8. For ambiguous language, assume WORST CASE for the client.

OUTPUT FORMAT: You MUST respond with valid JSON only. No markdown, no explanations outside JSON.

JSON STRUCTURE:
{
  "overallRiskScore": <0-100>,
  "summary": "<2-3 sentence summary>",
  "flaggedClauses": [
    {
      "originalText": "<exact clause text>",
      "interpretation": "<what this actually means for client>",
      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "suggestedRedline": "<improved version of the clause>",
      "clauseType": "<indemnification|liability|termination|ip|confidentiality|payment|other>"
    }
  ],
  "missingProtections": ["<list of missing but recommended clauses>"],
  "recommendations": ["<actionable next steps>"],
  "contractType": "<detected contract type>",
  "jurisdiction": "<detected or assumed jurisdiction>"
}`;
  }

  /**
   * Main processing method - Analyze any legal document
   */
  async process(input: string, context?: AgentContext): Promise<LegalReport> {
    return this.analyzeContract({
      documentText: input,
      userId: context?.userId,
    });
  }

  /**
   * CORE METHOD: Analyze Contract
   * Scans document against knowledge base and generates risk report
   */
  async analyzeContract(request: LegalAnalysisRequest): Promise<LegalReport> {
    const startTime = performance.now();
    console.log('[Zoe_Legal_Prime] 🔍 Initializing Legal Scan...');

    try {
      // Step 1: Retrieve Precedents from Knowledge Base (RAG)
      const precedents = await this.knowledgeBase.query({
        text: request.documentText,
        topK: 3,
        filter: { category: 'standards_compliance' },
      });

      const precedentContext = precedents.length > 0
        ? `\n\nREFERENCE STANDARDS:\n${precedents.map(p => p.content).join('\n---\n')}`
        : '\n\nNo specific precedents found. Apply general contract law principles.';

      // Step 2: Execute Analysis via Edge Function
      const { data, error } = await supabase.functions.invoke('analyze-legal-doc', {
        body: {
          documentText: request.documentText,
          systemPrompt: this.getSystemPrompt(),
          precedentContext,
          contractType: request.contractType,
          jurisdiction: request.jurisdiction || 'India/International',
        },
      });

      if (error) {
        console.error('[Zoe_Legal_Prime] Edge function error:', error);
        throw new Error(`Legal analysis failed: ${error.message}`);
      }

      // Step 3: Parse and Validate Response
      const analysis = this.parseAnalysisResponse(data);
      
      // Step 4: Calculate Risk Grade
      const riskGrade = this.calculateRiskGrade(analysis.overallRiskScore);

      const processingTimeMs = Math.round(performance.now() - startTime);

      const report: LegalReport = {
        ...analysis,
        riskGrade,
        analyzedAt: new Date(),
        wordCount: request.documentText.split(/\s+/).length,
        processingTimeMs,
      };

      console.log(`[Zoe_Legal_Prime] ✅ Analysis complete in ${processingTimeMs}ms | Risk Score: ${report.overallRiskScore} (${riskGrade})`);

      // Store analysis in sovereign memory if user is identified
      if (request.userId) {
        await this.storeAnalysis(request.userId, request.documentName || 'Unnamed Contract', report);
      }

      return report;

    } catch (err) {
      console.error('[Zoe_Legal_Prime] ❌ Analysis failed:', err);
      
      // Return a failure report
      return {
        overallRiskScore: 0,
        riskGrade: 'F',
        summary: 'Analysis failed. Please try again or contact support.',
        flaggedClauses: [],
        missingProtections: [],
        recommendations: ['Retry the analysis', 'Ensure document is readable text'],
        contractType: 'unknown',
        jurisdiction: 'unknown',
        analyzedAt: new Date(),
        wordCount: request.documentText.split(/\s+/).length,
        processingTimeMs: Math.round(performance.now() - startTime),
      };
    }
  }

  /**
   * Parse the LLM response into structured data
   */
  private parseAnalysisResponse(data: unknown): Omit<LegalReport, 'riskGrade' | 'analyzedAt' | 'wordCount' | 'processingTimeMs'> {
    try {
      const response = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Handle nested response structure
      const analysis = response.analysis || response;

      return {
        overallRiskScore: Math.max(0, Math.min(100, analysis.overallRiskScore || 50)),
        summary: analysis.summary || 'Analysis completed.',
        flaggedClauses: (analysis.flaggedClauses || []).map((clause: Record<string, unknown>, idx: number) => ({
          id: `clause-${idx}-${Date.now()}`,
          originalText: String(clause.originalText || ''),
          interpretation: String(clause.interpretation || ''),
          riskLevel: this.validateRiskLevel(clause.riskLevel),
          suggestedRedline: String(clause.suggestedRedline || ''),
          clauseType: String(clause.clauseType || 'other'),
          lineNumber: clause.lineNumber as number | undefined,
        })),
        missingProtections: analysis.missingProtections || [],
        recommendations: analysis.recommendations || [],
        contractType: analysis.contractType || 'General Contract',
        jurisdiction: analysis.jurisdiction || 'International',
      };
    } catch {
      console.error('[Zoe_Legal_Prime] Failed to parse response');
      return {
        overallRiskScore: 50,
        summary: 'Partial analysis completed.',
        flaggedClauses: [],
        missingProtections: [],
        recommendations: [],
        contractType: 'unknown',
        jurisdiction: 'unknown',
      };
    }
  }

  /**
   * Validate risk level enum
   */
  private validateRiskLevel(level: unknown): RiskLevel {
    const validLevels = Object.values(RiskLevel);
    const upperLevel = String(level).toUpperCase();
    return validLevels.includes(upperLevel as RiskLevel) 
      ? (upperLevel as RiskLevel) 
      : RiskLevel.MEDIUM;
  }

  /**
   * Calculate letter grade from risk score
   */
  private calculateRiskGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  /**
   * Store analysis in sovereign memory
   */
  private async storeAnalysis(userId: string, documentName: string, report: LegalReport): Promise<void> {
    try {
      await supabase.from('zoe_sovereign_memory').insert([{
        user_id: userId,
        event_type: 'legal_analysis',
        content_text: report.summary,
        zoe_state_json: JSON.parse(JSON.stringify({
          documentName,
          overallRiskScore: report.overallRiskScore,
          riskGrade: report.riskGrade,
          flaggedClausesCount: report.flaggedClauses.length,
          missingProtectionsCount: report.missingProtections.length,
          contractType: report.contractType,
          jurisdiction: report.jurisdiction,
          analyzedAt: report.analyzedAt.toISOString(),
        })),
      }]);
      console.log(`[Zoe_Legal_Prime] 💾 Analysis stored for user: ${userId}`);
    } catch (err) {
      console.error('[Zoe_Legal_Prime] Storage failed:', err);
    }
  }

  /**
   * Quick risk check without full analysis
   */
  async quickRiskCheck(documentText: string): Promise<{ riskLevel: RiskLevel; summary: string }> {
    const dangerWords = [
      'unlimited liability',
      'indemnify and hold harmless',
      'sole discretion',
      'irrevocable',
      'waive all rights',
      'perpetual license',
      'agrees to agree',
    ];

    const foundDangers = dangerWords.filter(word => 
      documentText.toLowerCase().includes(word)
    );

    if (foundDangers.length >= 3) {
      return { riskLevel: RiskLevel.CRITICAL, summary: `Found ${foundDangers.length} high-risk phrases. Full analysis recommended.` };
    }
    if (foundDangers.length >= 1) {
      return { riskLevel: RiskLevel.HIGH, summary: `Found ${foundDangers.length} concerning phrases. Review recommended.` };
    }
    return { riskLevel: RiskLevel.LOW, summary: 'No obvious red flags. Full analysis still recommended.' };
  }
}

// Export singleton instance
export const zoeLegalAgent = new ZoeLegalAgent();
