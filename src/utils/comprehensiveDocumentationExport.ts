import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

/**
 * COMPREHENSIVE PLATFORM DOCUMENTATION EXPORT SYSTEM
 * Generates complete documentation of the entire platform architecture,
 * design principles, functionalities, technologies, and AI capabilities
 */

export interface PlatformDocumentation {
  metadata: {
    generatedAt: string;
    version: string;
    platformName: string;
    description: string;
  };
  architecture: {
    frontend: string[];
    backend: string[];
    database: string[];
    ai: string[];
    infrastructure: string[];
  };
  features: {
    core: string[];
    ai: string[];
    social: string[];
    timeline: string[];
    voice: string[];
    gamification: string[];
  };
  designPrinciples: string[];
  technologies: {
    languages: string[];
    frameworks: string[];
    libraries: string[];
    tools: string[];
  };
  aiCapabilities: {
    models: string[];
    features: string[];
    integrations: string[];
  };
  voiceCommands: string[];
  userExperience: {
    designSystem: string[];
    accessibility: string[];
    performance: string[];
  };
  security: {
    authentication: string[];
    authorization: string[];
    dataProtection: string[];
  };
}

export async function generateComprehensiveDocumentation(userId: string): Promise<PlatformDocumentation> {
  const doc: PlatformDocumentation = {
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '2.0.0',
      platformName: 'MMora - Universe of Life',
      description: 'Next-generation social platform powered by Zoe AI Architect',
    },
    architecture: {
      frontend: [
        'React 18 with TypeScript',
        'Vite for build tooling and HMR',
        'Tailwind CSS for styling',
        'Framer Motion for animations',
        'Shadcn UI component library',
        'React Query for data fetching',
        'React Router for navigation',
      ],
      backend: [
        'Supabase (PostgreSQL database)',
        'Edge Functions (Deno runtime)',
        'Real-time subscriptions',
        'RESTful API endpoints',
        'Serverless architecture',
      ],
      database: [
        'PostgreSQL via Supabase',
        'Row Level Security (RLS)',
        'Real-time subscriptions',
        'Full-text search',
        'JSONB for flexible data',
        'Materialized views for performance',
      ],
      ai: [
        'Advanced AI for agentic intelligence',
        'AI Gateway integration',
        'Natural language processing',
        'Computer vision for image analysis',
        'Voice synthesis and recognition',
        'Sentiment analysis',
      ],
      infrastructure: [
        'Progressive Web App (PWA)',
        'Service Worker for offline support',
        'Responsive design (mobile-first)',
        'Cloud-based deployment',
        'CDN for static assets',
      ],
    },
    features: {
      core: [
        'Social networking and friend connections',
        'Real-time messaging with media support',
        'Post creation with images/videos',
        'Comments and likes system',
        'User profiles and customization',
        'Notifications system',
        'Search functionality',
      ],
      ai: [
        'Zoe AI Architect - Agentic AI assistant',
        'Creative production planning',
        'Personalized recommendations',
        'Smart notifications',
        'Context-aware assistance',
        'Behavioral learning and adaptation',
        'Multi-domain creative generation',
      ],
      social: [
        'Friend requests and connections',
        'Private timelines for groups',
        'Activity feed with filtering',
        'User tagging in posts',
        'Profile visibility controls',
        'Interest-based matching',
      ],
      timeline: [
        'Universal Agentic Timeline (UHAT)',
        'Historical visualization (Big Bang to Future)',
        'Interactive threshold exploration',
        'Voice-controlled navigation',
        'Future prediction module',
        'User proposal analysis',
      ],
      voice: [
        'Wake word detection ("Hey Zoe")',
        'Natural language commands',
        'Voice-to-text transcription',
        'Text-to-speech responses',
        'Voice macros and shortcuts',
        'Proactive voice notifications',
        'Customizable voice settings',
      ],
      gamification: [
        'Achievement badges',
        'Point-based tier system',
        'Challenge system',
        'Seasonal events',
        'Badge collections',
        'Leaderboards',
        'Milestone tracking',
      ],
    },
    designPrinciples: [
      'Futuristic glassmorphic UI',
      'Dark mode optimized',
      'Smooth animations and transitions',
      'Accessible design (WCAG 2.1)',
      'Mobile-first responsive',
      'Consistent color system',
      'Clear visual hierarchy',
      'Intuitive navigation',
      'Performance-optimized',
    ],
    technologies: {
      languages: [
        'TypeScript',
        'JavaScript (ES2022)',
        'SQL (PostgreSQL)',
        'HTML5',
        'CSS3',
      ],
      frameworks: [
        'React',
        'Tailwind CSS',
        'Framer Motion',
        'React Query',
        'React Router',
      ],
      libraries: [
        'Supabase Client',
        'Lucide React (icons)',
        'date-fns',
        'Sonner (toast)',
        'jsPDF',
        'React Hook Form',
        'Zod (validation)',
      ],
      tools: [
        'Vite',
        'TypeScript Compiler',
        'ESLint',
        'PostCSS',
        'Git',
      ],
    },
    aiCapabilities: {
      models: [
        'Advanced reasoning models',
        'Balanced performance models',
        'Fast inference models',
        'google/gemini-2.5-flash-image - Image generation',
      ],
      features: [
        'Conversational AI chat',
        'Creative production planning',
        'Context understanding',
        'Multi-modal input (text, voice, image)',
        'Personalized responses',
        'Proactive suggestions',
        'Learning from user behavior',
        'Cost estimation and sourcing',
      ],
      integrations: [
        'Zoe AI Architect (WebDrop page)',
        'AI Companion (dedicated chat)',
        'Huddle Assistant (location-based)',
        'Voice Assistant (global)',
        'Timeline narrator',
        'God Mode diagnostics',
      ],
    },
    voiceCommands: [
      'Navigation: "open [page name]"',
      'Content: "create post", "send message"',
      'Timeline: "jump to [threshold]", "tell me about [event]"',
      'Huddle: "find friends nearby", "show [city]"',
      'AI: "suggest ideas", "analyze this"',
      'Settings: "enable notifications", "mute voice"',
      'Custom macros and shortcuts',
    ],
    userExperience: {
      designSystem: [
        'CSS custom properties for theming',
        'HSL color system',
        'Tailwind utility classes',
        'Consistent spacing scale',
        'Typography system',
        'Component variants',
        'Animation presets',
      ],
      accessibility: [
        'Keyboard navigation',
        'Screen reader support',
        'Focus indicators',
        'Color contrast (WCAG AA)',
        'Alt text for images',
        'Semantic HTML',
        'ARIA labels',
      ],
      performance: [
        'Code splitting',
        'Lazy loading',
        'Image optimization',
        'Caching strategies',
        'Bundle size optimization',
        'React Query caching',
        'Memoization',
      ],
    },
    security: {
      authentication: [
        'Email/password authentication',
        'Session management',
        'Password hashing (bcrypt)',
        'JWT tokens',
        'Auto-confirm email signups',
      ],
      authorization: [
        'Row Level Security (RLS)',
        'User-based access control',
        'Admin roles',
        'Protected routes',
        'API key management',
      ],
      dataProtection: [
        'Encrypted connections (HTTPS)',
        'Secure storage of credentials',
        'Environment variables for secrets',
        'Input sanitization',
        'XSS prevention',
        'CSRF protection',
      ],
    },
  };

  // Fetch user-specific data if needed
  try {
    if (userId) {
      const { data: voiceCommands } = await supabase
        .from('voice_assistant_settings')
        .select('zoe_custom_commands')
        .eq('user_id', userId)
        .single();

      if (voiceCommands?.zoe_custom_commands) {
        const customCommands = (voiceCommands.zoe_custom_commands as any).commands || [];
        doc.voiceCommands = [...doc.voiceCommands, ...customCommands.map((c: any) => c.phrase)];
      }
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  return doc;
}

export async function exportDocumentationAsPDF(userId: string) {
  const doc = await generateComprehensiveDocumentation(userId);
  const pdf = new jsPDF();
  
  let y = 20;
  const lineHeight = 7;
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const addText = (text: string, fontSize: number = 10, style: 'normal' | 'bold' = 'normal', indent: number = 0) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', style);
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin - indent);
    
    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin + indent, y);
      y += lineHeight;
    });
  };

  const addSection = (title: string) => {
    y += 5;
    pdf.setFillColor(60, 60, 200);
    pdf.rect(margin, y - 5, pageWidth - 2 * margin, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    addText(title, 14, 'bold');
    pdf.setTextColor(0, 0, 0);
    y += 3;
  };

  const addList = (items: string[], indent: number = 5) => {
    items.forEach(item => {
      addText(`• ${item}`, 10, 'normal', indent);
    });
  };

  // Title Page
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 200);
  pdf.text('MMora Platform', pageWidth / 2, 40, { align: 'center' });
  
  pdf.setFontSize(18);
  pdf.text('Comprehensive Documentation', pageWidth / 2, 55, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Generated: ${new Date(doc.metadata.generatedAt).toLocaleString()}`, pageWidth / 2, 75, { align: 'center' });
  pdf.text(`Version: ${doc.metadata.version}`, pageWidth / 2, 85, { align: 'center' });

  pdf.addPage();
  y = margin;
  pdf.setTextColor(0, 0, 0);

  // Metadata
  addSection('PLATFORM OVERVIEW');
  addText(`Name: ${doc.metadata.platformName}`, 11, 'bold');
  addText(`Description: ${doc.metadata.description}`);

  // Architecture
  addSection('ARCHITECTURE');
  
  addText('Frontend Stack:', 11, 'bold');
  addList(doc.architecture.frontend);
  
  y += 3;
  addText('Backend Infrastructure:', 11, 'bold');
  addList(doc.architecture.backend);
  
  y += 3;
  addText('Database:', 11, 'bold');
  addList(doc.architecture.database);
  
  y += 3;
  addText('AI Integration:', 11, 'bold');
  addList(doc.architecture.ai);

  // Features
  addSection('CORE FEATURES');
  
  addText('Social Features:', 11, 'bold');
  addList(doc.features.social);
  
  y += 3;
  addText('AI Features:', 11, 'bold');
  addList(doc.features.ai);
  
  y += 3;
  addText('Voice Features:', 11, 'bold');
  addList(doc.features.voice);
  
  y += 3;
  addText('Timeline Features:', 11, 'bold');
  addList(doc.features.timeline);

  // Technologies
  addSection('TECHNOLOGIES');
  
  addText('Languages:', 11, 'bold');
  addList(doc.technologies.languages);
  
  y += 3;
  addText('Frameworks:', 11, 'bold');
  addList(doc.technologies.frameworks);
  
  y += 3;
  addText('Libraries:', 11, 'bold');
  addList(doc.technologies.libraries);

  // AI Capabilities
  addSection('AI CAPABILITIES');
  
  addText('Models:', 11, 'bold');
  addList(doc.aiCapabilities.models);
  
  y += 3;
  addText('Features:', 11, 'bold');
  addList(doc.aiCapabilities.features);
  
  y += 3;
  addText('Integrations:', 11, 'bold');
  addList(doc.aiCapabilities.integrations);

  // Design Principles
  addSection('DESIGN PRINCIPLES');
  addList(doc.designPrinciples);

  // Voice Commands
  addSection('VOICE COMMANDS');
  addList(doc.voiceCommands);

  // User Experience
  addSection('USER EXPERIENCE');
  
  addText('Design System:', 11, 'bold');
  addList(doc.userExperience.designSystem);
  
  y += 3;
  addText('Accessibility:', 11, 'bold');
  addList(doc.userExperience.accessibility);
  
  y += 3;
  addText('Performance:', 11, 'bold');
  addList(doc.userExperience.performance);

  // Security
  addSection('SECURITY');
  
  addText('Authentication:', 11, 'bold');
  addList(doc.security.authentication);
  
  y += 3;
  addText('Authorization:', 11, 'bold');
  addList(doc.security.authorization);
  
  y += 3;
  addText('Data Protection:', 11, 'bold');
  addList(doc.security.dataProtection);

  // Save PDF
  const filename = `mmora-platform-documentation-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

export async function exportDocumentationAsJSON(userId: string) {
  const doc = await generateComprehensiveDocumentation(userId);
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mmora-platform-documentation-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
