/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * M'MORA ZOE — VECTOR STORE
 * Semantic memory for RAG (Retrieval Augmented Generation)
 * Uses legal_knowledge_base table with vector embeddings
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/integrations/supabase/client';

export interface VectorDocument {
  id: string;
  content: string;
  category?: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  similarity?: number;
}

export interface VectorQueryOptions {
  text: string;
  topK?: number;
  filter?: Record<string, unknown>;
  threshold?: number;
}

export interface VectorStoreStats {
  documentCount: number;
  indexName: string;
  lastUpdated: Date | null;
}

/**
 * VectorStore - Semantic search and retrieval
 * Connects to legal_knowledge_base for vector-based document search
 */
export class VectorStore {
  private indexName: string;
  private documents: Map<string, VectorDocument> = new Map();
  private isInitialized: boolean = false;

  constructor(indexName: string) {
    this.indexName = indexName;
    console.log(`[VectorStore] Created index: ${indexName}`);
  }

  /**
   * Initialize the vector store - load from legal_knowledge_base
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log(`[VectorStore:${this.indexName}] Initializing from legal_knowledge_base...`);
      
      // Load existing documents from legal_knowledge_base table
      const { data, error } = await supabase
        .from('legal_knowledge_base')
        .select('id, content, category, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        data.forEach((doc) => {
          this.documents.set(doc.id, {
            id: doc.id,
            content: doc.content || '',
            category: doc.category || '',
            metadata: (doc.metadata as Record<string, unknown>) || {},
          });
        });
        console.log(`[VectorStore:${this.indexName}] Loaded ${this.documents.size} legal documents`);
      }

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error(`[VectorStore:${this.indexName}] Init error:`, err);
      // Still mark as initialized to prevent repeated failures
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Add document to the legal_knowledge_base
   * Note: Embeddings should be generated server-side via edge function
   */
  async addDocument(content: string, metadata: Record<string, unknown> = {}): Promise<string | null> {
    try {
      const category = (metadata.category as string) || 'general';
      
      const { data, error } = await supabase
        .from('legal_knowledge_base')
        .insert([{
          content,
          category,
          metadata: JSON.parse(JSON.stringify(metadata)),
          // Note: embedding column should be populated by a separate process
        }])
        .select('id')
        .single();

      if (error) throw error;

      const docId = data.id;
      this.documents.set(docId, { id: docId, content, category, metadata });
      
      console.log(`[VectorStore:${this.indexName}] Added legal document: ${docId}`);
      return docId;
    } catch (err) {
      console.error(`[VectorStore:${this.indexName}] Add error:`, err);
      return null;
    }
  }

  /**
   * Query the vector store for similar documents
   * Uses keyword matching for now (upgrade path: call match_legal_clauses RPC with embeddings)
   */
  async query(options: VectorQueryOptions): Promise<VectorDocument[]> {
    const { text, topK = 5, filter, threshold = 0.3 } = options;

    if (!this.isInitialized) {
      await this.initialize();
    }

    // First try to get fresh data from the database
    try {
      const categoryFilter = filter?.category as string | undefined;
      
      let query = supabase
        .from('legal_knowledge_base')
        .select('id, content, category, metadata')
        .limit(topK * 2); // Fetch extra for filtering
      
      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }
      
      const { data, error } = await query;
      
      if (!error && data && data.length > 0) {
        // Perform keyword matching on fetched results
        const queryTerms = text.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        
        const results: VectorDocument[] = data
          .map((doc) => {
            const contentLower = (doc.content || '').toLowerCase();
            const matchedTerms = queryTerms.filter(term => contentLower.includes(term));
            const similarity = queryTerms.length > 0 ? matchedTerms.length / queryTerms.length : 0;
            
            return {
              id: doc.id,
              content: doc.content || '',
              category: doc.category || '',
              metadata: (doc.metadata as Record<string, unknown>) || {},
              similarity,
            };
          })
          .filter(doc => doc.similarity >= threshold)
          .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
          .slice(0, topK);
        
        return results;
      }
    } catch (err) {
      console.warn(`[VectorStore:${this.indexName}] DB query failed, using cache:`, err);
    }

    // Fallback to in-memory cache
    const results: VectorDocument[] = [];
    const queryTerms = text.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    for (const [, doc] of this.documents) {
      // Apply filters
      if (filter) {
        let matchesFilter = true;
        for (const [key, value] of Object.entries(filter)) {
          const docValue = key === 'category' ? doc.category : doc.metadata[key];
          if (docValue !== value) {
            matchesFilter = false;
            break;
          }
        }
        if (!matchesFilter) continue;
      }

      // Calculate similarity (keyword matching)
      const contentLower = doc.content.toLowerCase();
      const matchedTerms = queryTerms.filter(term => contentLower.includes(term));
      const similarity = queryTerms.length > 0 ? matchedTerms.length / queryTerms.length : 0;

      if (similarity >= threshold) {
        results.push({ ...doc, similarity });
      }
    }

    return results
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, topK);
  }

  /**
   * Get store statistics
   */
  getStats(): VectorStoreStats {
    return {
      documentCount: this.documents.size,
      indexName: this.indexName,
      lastUpdated: this.documents.size > 0 ? new Date() : null,
    };
  }

  /**
   * Clear in-memory cache (doesn't delete from DB)
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.isInitialized = false;
    console.log(`[VectorStore:${this.indexName}] Cache cleared`);
  }

  /**
   * Reload documents from database
   */
  async refresh(): Promise<boolean> {
    this.isInitialized = false;
    this.documents.clear();
    return this.initialize();
  }
}

// Pre-configured stores for the platform - now using legal_knowledge_base
export const legalKnowledgeBase = new VectorStore('legal_framework_v1');
export const contractTemplates = new VectorStore('contract_templates_v1');
