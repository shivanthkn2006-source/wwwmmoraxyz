import React from 'react';
import { AstroTestingHarness } from '@/components/astro/AstroTestingHarness';

/** Hidden admin route: /admin/zoe-preview — dry-run simulator only. */
const AstroPreviewPage: React.FC = () => (
  <main className="min-h-screen bg-background">
    <AstroTestingHarness />
  </main>
);

export default AstroPreviewPage;
