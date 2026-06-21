// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT DETECTOR TESTS - Vision vs Informational Request Classification
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { detectArtifactIntent, type ArtifactIntent } from '@/hooks/useArtifactDetector';

describe('Artifact Detection', () => {
  
  describe('Vision Detection (Should Generate Images)', () => {
    const VISION_REQUESTS = [
      'create an image of a sunset',
      'draw me a dragon',
      'make a picture of a mountain',
      'generate an image of space',
      'paint me a portrait',
      'illustrate a forest scene',
      'sketch a robot',
      'show me a picture of Tokyo',
      'visualize the aurora borealis',
      'I want to see an image of Mars',
      'render an image of a castle',
      'depict a medieval battle',
      'what did ancient Rome look like',
      'image of a cat sleeping',
    ];
    
    it.each(VISION_REQUESTS)(
      'should detect "%s" as vision request',
      (message) => {
        const result = detectArtifactIntent(message);
        expect(result.type).toBe('vision');
        expect(result.confidence).toBeGreaterThanOrEqual(0.85);
        expect(result.extractedSubject).not.toBe('');
      }
    );
  });

  describe('Informational Guard (Should NOT Generate Images)', () => {
    const INFORMATIONAL_REQUESTS = [
      'make a guide for meditation',
      'create a guide to cooking',
      'make me a list of components',
      'list the steps to build a website',
      'give me a tutorial on React',
      'explain how to use TypeScript',
      'what are the steps to learn Python',
      'tell me how to cook pasta',
      'help me understand quantum physics',
      'teach me about machine learning',
      'what is the best way to exercise',
      'give me instructions for building a PC',
      'show me the documentation',
      'create a list of groceries',
      'make a how to guide',
    ];
    
    it.each(INFORMATIONAL_REQUESTS)(
      'should NOT detect "%s" as vision request',
      (message) => {
        const result = detectArtifactIntent(message);
        expect(result.type).toBe('none');
      }
    );
  });

  describe('Education Detection', () => {
    const EDUCATION_REQUESTS = [
      'create a worksheet for multiplication',
      'make a quiz on geography',
      'generate practice problems for algebra',
      'homework on photosynthesis',
      'quiz me on history',
      'exercises for chemistry',
    ];
    
    it.each(EDUCATION_REQUESTS)(
      'should detect "%s" as education request',
      (message) => {
        const result = detectArtifactIntent(message);
        expect(result.type).toBe('education');
        expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      }
    );
  });

  describe('Chronicle Detection', () => {
    const CHRONICLE_REQUESTS = [
      'give me a report on our conversation',
      'summarize everything we discussed',
      'generate a pdf of this session',
      'export this conversation',
      'compile a report',
    ];
    
    it.each(CHRONICLE_REQUESTS)(
      'should detect "%s" as chronicle request',
      (message) => {
        const result = detectArtifactIntent(message);
        expect(result.type).toBe('chronicle');
        expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      }
    );
  });

  describe('Confidence Thresholds', () => {
    it('should return high confidence for vision requests', () => {
      const result = detectArtifactIntent('draw me a sunset');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should return 1.0 confidence when blocking informational requests', () => {
      const result = detectArtifactIntent('make a guide for cooking');
      expect(result.confidence).toBe(1.0);
      expect(result.type).toBe('none');
    });
  });

  describe('Subject Extraction', () => {
    it('should extract clean subject from vision request', () => {
      const result = detectArtifactIntent('create an image of a beautiful sunset over mountains');
      expect(result.type).toBe('vision');
      expect(result.extractedSubject).not.toContain('image');
      expect(result.extractedSubject).not.toContain('picture');
    });

    it('should normalize subject by removing command words', () => {
      const result = detectArtifactIntent('draw me a cute kitten');
      expect(result.type).toBe('vision');
      expect(result.extractedSubject.toLowerCase()).toContain('kitten');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = detectArtifactIntent('');
      expect(result.type).toBe('none');
    });

    it('should handle mixed intent (informational + visual keyword)', () => {
      // "guide" is informational, should block despite "image" mention
      const result = detectArtifactIntent('make a guide with images');
      expect(result.type).toBe('none');
    });

    it('should detect vision even with complex phrasing', () => {
      const result = detectArtifactIntent('can you please create me an image of a dragon');
      expect(result.type).toBe('vision');
    });
  });
});
