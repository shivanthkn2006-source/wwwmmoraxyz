/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * M'MORA ZOE — AGENTS MODULE
 * Specialized AI Agents for vertical platform capabilities
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Base class for all agents
export { AgentBase } from './AgentBase';
export type { AgentConfig, AgentContext } from './AgentBase';

// Legal Agent - Contract Analysis & Risk Assessment
export { ZoeLegalAgent, zoeLegalAgent, RiskLevel } from './LegalAgent';
export type { AnalyzedClause, LegalReport, LegalAnalysisRequest } from './LegalAgent';
