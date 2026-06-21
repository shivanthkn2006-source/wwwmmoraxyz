// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC COMPRESSION ENGINE - Memory Immortality Protocol
// ═══════════════════════════════════════════════════════════════════════════════
// THE RULE: We do not delete memories; we distill them.
// Ghost Tokens → Truth Vectors → Universal Truth Ledger
// Clear RAM, but keep the wisdom.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

export interface TruthVector {
  key: string;
  value: string;
  category: 'project' | 'preference' | 'relationship' | 'biographical' | 'behavioral_pattern';
  confidence: number;
  sourceTokenCount: number;
  themes: string[];
  distilledAt: Date;
}

export interface CompressionResult {
  success: boolean;
  vectorsCreated: number;
  tokensFreed: number;
  truthVectors: TruthVector[];
}

export interface GhostToken {
  id: string;
  content: string;
  createdAt: Date;
  tokenCount: number;
  sessionId?: string;
}

class SemanticCompressorEngine {
  private compressionCache: Map<string, TruthVector[]> = new Map();
  private isCompressing = false;

  /**
   * CORE PROTOCOL: Distill ghost tokens into permanent truth vectors
   * Never delete - always compress and preserve
   */
  async distillToTruthVector(
    userId: string,
    ghostTokens: GhostToken[],
    projectContext?: string
  ): Promise<CompressionResult> {
    if (this.isCompressing) {
      console.warn('[SemanticCompressor] Compression already in progress');
      return { success: false, vectorsCreated: 0, tokensFreed: 0, truthVectors: [] };
    }

    this.isCompressing = true;
    const truthVectors: TruthVector[] = [];
    let tokensFreed = 0;

    try {
      // Step 1: Extract key themes from ghost tokens
      const themes = this.extractThemes(ghostTokens);
      
      // Step 2: Identify project context
      const detectedProject = projectContext || this.detectProjectContext(ghostTokens);
      
      // Step 3: Create truth vectors for each significant theme
      for (const [theme, relevance] of Object.entries(themes)) {
        if (relevance > 0.3) { // Only preserve significant themes
          const vector: TruthVector = {
            key: `${detectedProject}_${theme}`.toLowerCase().replace(/\s+/g, '_'),
            value: this.summarizeTheme(ghostTokens, theme),
            category: this.categorizeTheme(theme),
            confidence: relevance,
            sourceTokenCount: this.countTokens(ghostTokens),
            themes: [theme],
            distilledAt: new Date()
          };
          truthVectors.push(vector);
        }
      }

      // Step 4: Write to Universal Truth Ledger
      for (const vector of truthVectors) {
        await this.writeTruthVector(userId, vector);
      }

      tokensFreed = ghostTokens.reduce((sum, t) => sum + t.tokenCount, 0);

      // Cache the compression result
      this.compressionCache.set(userId, truthVectors);

      console.log(`[SemanticCompressor] Distilled ${ghostTokens.length} tokens into ${truthVectors.length} truth vectors`);
      console.log(`[SemanticCompressor] RAM freed: ${tokensFreed} tokens, Wisdom preserved: ${truthVectors.length} vectors`);

      return {
        success: true,
        vectorsCreated: truthVectors.length,
        tokensFreed,
        truthVectors
      };

    } catch (error) {
      console.error('[SemanticCompressor] Distillation failed:', error);
      return { success: false, vectorsCreated: 0, tokensFreed: 0, truthVectors: [] };
    } finally {
      this.isCompressing = false;
    }
  }

  /**
   * Extract themes from ghost tokens using keyword density analysis
   */
  private extractThemes(tokens: GhostToken[]): Record<string, number> {
    const themes: Record<string, number> = {};
    const allContent = tokens.map(t => t.content).join(' ').toLowerCase();
    
    // Project/Brand detection
    const projectPatterns = [
      { pattern: /house of sisuu/gi, theme: 'House_of_Sisuu' },
      { pattern: /gemini grill/gi, theme: 'Gemini_Grill' },
      { pattern: /brand|branding|logo/gi, theme: 'Branding' },
      { pattern: /design|aesthetic|visual/gi, theme: 'Design' },
      { pattern: /business|startup|company/gi, theme: 'Business' },
      { pattern: /relationship|partner|muse/gi, theme: 'Relationships' },
      { pattern: /astrology|chart|zodiac/gi, theme: 'Astrology' },
      { pattern: /tech|code|development/gi, theme: 'Technology' },
      { pattern: /ai|artificial|intelligence/gi, theme: 'AI_Development' },
    ];

    for (const { pattern, theme } of projectPatterns) {
      const matches = allContent.match(pattern);
      if (matches) {
        themes[theme] = Math.min(1, matches.length * 0.2);
      }
    }

    return themes;
  }

  /**
   * Detect primary project context from tokens
   */
  private detectProjectContext(tokens: GhostToken[]): string {
    const content = tokens.map(t => t.content).join(' ');
    
    if (/house of sisuu/i.test(content)) return 'house_of_sisuu';
    if (/gemini grill/i.test(content)) return 'gemini_grill';
    if (/zoe|ai companion/i.test(content)) return 'zoe_ai';
    
    return 'general_context';
  }

  /**
   * Summarize a theme from the token content
   */
  private summarizeTheme(tokens: GhostToken[], theme: string): string {
    const relevantContent = tokens
      .filter(t => t.content.toLowerCase().includes(theme.toLowerCase().replace(/_/g, ' ')))
      .map(t => t.content)
      .join(' ');

    // Extract key sentences
    const sentences = relevantContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keySentences = sentences.slice(0, 3).map(s => s.trim());
    
    return `Key Themes: ${keySentences.join('; ')}` || `Context about ${theme}`;
  }

  /**
   * Categorize a theme into truth ledger categories
   */
  private categorizeTheme(theme: string): TruthVector['category'] {
    const categoryMap: Record<string, TruthVector['category']> = {
      'House_of_Sisuu': 'project',
      'Gemini_Grill': 'project',
      'Branding': 'project',
      'Design': 'preference',
      'Business': 'project',
      'Relationships': 'relationship',
      'Astrology': 'preference',
      'Technology': 'behavioral_pattern',
      'AI_Development': 'project',
    };
    return categoryMap[theme] || 'biographical';
  }

  /**
   * Count tokens in ghost token array
   */
  private countTokens(tokens: GhostToken[]): number {
    return tokens.reduce((sum, t) => sum + t.tokenCount, 0);
  }

  /**
   * Write truth vector to Universal Truth Ledger (permanent storage)
   */
  private async writeTruthVector(userId: string, vector: TruthVector): Promise<void> {
    try {
      const { error } = await supabase
        .from('universal_truth_ledger')
        .upsert({
          user_id: userId,
          truth_key: vector.key,
          truth_value: vector.value,
          truth_category: vector.category,
          confidence_score: vector.confidence,
          is_active: true,
          first_observed_at: new Date().toISOString(),
          last_confirmed_at: new Date().toISOString(),
          confirmation_count: 1
        }, { onConflict: 'user_id,truth_key' });

      if (error) {
        console.error('[SemanticCompressor] Failed to write truth vector:', error);
      } else {
        console.log(`[SemanticCompressor] ✓ Truth vector written: ${vector.key}`);
      }
    } catch (err) {
      console.error('[SemanticCompressor] Write error:', err);
    }
  }

  /**
   * RESTORATION: Restore context from backup logs
   */
  async restoreFromBackupLogs(userId: string, projectName: string): Promise<TruthVector[]> {
    console.log(`[SemanticCompressor] Restoring ${projectName} context from backup logs...`);

    try {
      // Search ai_companion_messages for the project context
      const { data: messages, error } = await supabase
        .from('ai_companion_messages')
        .select('id, content, role, created_at')
        .eq('user_id', userId)
        .ilike('content', `%${projectName}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !messages?.length) {
        console.warn(`[SemanticCompressor] No backup found for ${projectName}`);
        return [];
      }

      // Convert to ghost tokens and distill
      const ghostTokens: GhostToken[] = messages.map(m => ({
        id: m.id,
        content: m.content,
        createdAt: new Date(m.created_at),
        tokenCount: Math.ceil(m.content.length / 4)
      }));

      const result = await this.distillToTruthVector(userId, ghostTokens, projectName.toLowerCase().replace(/\s+/g, '_'));
      
      console.log(`[SemanticCompressor] ✓ Restored ${result.vectorsCreated} truth vectors for ${projectName}`);
      return result.truthVectors;

    } catch (err) {
      console.error('[SemanticCompressor] Restoration failed:', err);
      return [];
    }
  }

  /**
   * INTERCEPT: Hook into any delete/purge operation
   * Ensures distillation happens before RAM clear
   */
  async interceptPurge(
    userId: string,
    dataToDelete: any[],
    source: string
  ): Promise<CompressionResult> {
    console.log(`[SemanticCompressor] INTERCEPTED ${source} purge - distilling before clear...`);

    const ghostTokens: GhostToken[] = dataToDelete.map((item, i) => ({
      id: item.id || `ghost_${i}`,
      content: item.content || JSON.stringify(item),
      createdAt: new Date(item.created_at || Date.now()),
      tokenCount: Math.ceil((item.content?.length || 100) / 4)
    }));

    return this.distillToTruthVector(userId, ghostTokens);
  }

  /**
   * Get cached truth vectors for a user
   */
  getCachedVectors(userId: string): TruthVector[] {
    return this.compressionCache.get(userId) || [];
  }

  /**
   * Clear RAM safely (after distillation)
   */
  async safeClearRAM(userId: string): Promise<{ cleared: boolean; preserved: number }> {
    const cached = this.compressionCache.get(userId);
    if (cached && cached.length > 0) {
      console.log(`[SemanticCompressor] Safe clear: ${cached.length} vectors preserved in Truth Ledger`);
      return { cleared: true, preserved: cached.length };
    }
    console.warn('[SemanticCompressor] No distillation found - refusing to clear RAM');
    return { cleared: false, preserved: 0 };
  }
}

// Singleton instance
export const SemanticCompressor = new SemanticCompressorEngine();

// React hook for semantic compression
export const useSemanticCompression = () => {
  return {
    distill: SemanticCompressor.distillToTruthVector.bind(SemanticCompressor),
    restore: SemanticCompressor.restoreFromBackupLogs.bind(SemanticCompressor),
    interceptPurge: SemanticCompressor.interceptPurge.bind(SemanticCompressor),
    safeClearRAM: SemanticCompressor.safeClearRAM.bind(SemanticCompressor),
    getCachedVectors: SemanticCompressor.getCachedVectors.bind(SemanticCompressor)
  };
};
