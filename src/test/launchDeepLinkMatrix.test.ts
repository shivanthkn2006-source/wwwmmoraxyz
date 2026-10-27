import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { publicDocuments } from '@/config/publicDocuments';

const app = readFileSync('src/App.tsx', 'utf8');
const bridge = readFileSync('supabase/functions/zoe-matter-bridge/index.ts', 'utf8');

const deepLinks = ['/documents', '/terms', '/data-policy', '/auth'];

describe('launch deep-link matrix (local routes only)', () => {
  it.each(deepLinks)('%s is a declared route', (p) => {
    expect(app).toContain(`path="${p}"`);
  });

  it('every document link points to a declared route', () => {
    for (const d of publicDocuments) {
      if (d.href) expect(app).toContain(`path="${d.href.split('#')[0]}"`);
    }
  });

  it('every jurisdiction notice stays a draft', () => {
    for (const d of publicDocuments.filter((x) => x.summary)) {
      expect(d.status).toBe('Draft for review');
    }
  });
});

describe('free launch', () => {
  it('payment tool refuses before recording an executed payment', () => {
    const guard = bridge.indexOf('PAYMENTS_DISABLED');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(bridge.indexOf("event_type: 'payment_executed'"));
  });
});
