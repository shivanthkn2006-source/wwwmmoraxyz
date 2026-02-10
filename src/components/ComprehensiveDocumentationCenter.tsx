import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, 
  Download, 
  BookOpen, 
  Sparkles, 
  X,
  FileCode,
  Shield,
  Zap,
  Users,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Crown,
  Eye,
  EyeOff,
  Rocket,
  Brain,
  Mic,
  Map,
  Globe,
  Settings,
  Database,
  Code,
  Palette
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from 'jspdf';
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

// Users who have full download access
const AUTHORIZED_USERS = ['moksh50', 'Justmkbhd', 'admin'];

interface DocSection {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  content: string[];
  isPublic: boolean;
  lastUpdated: string;
}

const documentationSections: DocSection[] = [
  {
    id: 'platform-overview',
    title: 'Platform Overview',
    description: 'Complete overview of MMora - Universe of Life platform',
    category: 'General',
    icon: <Globe className="w-5 h-5" />,
    isPublic: true,
    lastUpdated: '2025-12-02',
    content: [
      'MMora is a next-generation social platform powered by Zoe AI Architect',
      'Built with React 18, TypeScript, and Tailwind CSS',
      'Features real-time messaging, posts, and social connections',
      'Integrated with advanced AI for personalized experiences',
      'Progressive Web App (PWA) with offline support',
      'Mobile-first responsive design across all devices',
      'Enterprise-ready with scalable architecture'
    ]
  },
  {
    id: 'zoe-ai-architect',
    title: 'Zoe AI Architect',
    description: 'Comprehensive guide to Zoe agentic AI capabilities',
    category: 'AI Features',
    icon: <Brain className="w-5 h-5" />,
    isPublic: true,
    lastUpdated: '2025-12-02',
    content: [
      'Zoe is the platform\'s agentic AI assistant and creative architect',
      'Supports multiple audience narration modes: Kids, Students, Teachers, Researchers, Academics, PhD Scholars, Scientists, Space Explorers, General',
      'Multi-agent system with PLANNER, RESEARCHER, EXECUTOR, OPTIMIZER, LEARNING, and COORDINATOR agents',
      'Voice-activated with wake word detection ("Hey Zoe", "OK Zoe")',
      'Provides personalized daily briefings with weather, traffic, and notifications',
      'Creative production planning for any domain across 50+ human interests',
      'Adaptive learning from user interactions and behavioral patterns',
      'Story mode narration for immersive educational experiences',
      'Guided tours with audience-appropriate content delivery'
    ]
  },
  {
    id: 'voice-commands',
    title: 'Voice Commands System',
    description: 'Complete list of Zoe voice commands',
    category: 'Voice',
    icon: <Mic className="w-5 h-5" />,
    isPublic: true,
    lastUpdated: '2025-12-02',
    content: [
      'Navigation: "go to home", "open profile", "show huddle", "open timeline"',
      'Content: "create post", "send message to [name]", "search for [query]"',
      'Solar System: "show [planet]", "zoom in/out", "start tour", "story mode"',
      'Narration Modes: "kids mode", "student mode", "scientist mode", "teacher mode"',
      'Timeline: "jump to [threshold]", "tell me about [event]", "architect mode"',
      'Huddle: "find friends nearby", "show [city]", "filter by [interest]"',
      'AI: "suggest ideas", "analyze this", "generate report"',
      'Settings: "mute voice", "enable notifications", "export notes"',
      'Custom macros and shortcuts can be created in Voice Settings'
    ]
  },
  {
    id: 'solar-system-explorer',
    title: 'Solar System Explorer',
    description: '3D Holographic Solar System Tour guide',
    category: 'Features',
    icon: <Rocket className="w-5 h-5" />,
    isPublic: true,
    lastUpdated: '2025-12-02',
    content: [
      'Full 3D WebGL visualization of the solar system',
      'All 8 planets plus Pluto, Moon, and asteroid belt',
      'Time travel simulation to see past/future positions',
      'NASA mission tracking (Voyager, Perseverance, JWST, etc.)',
      'Planet landmarks and moon information',
      'Audience-specific narration (Kids to PhD level)',
      'Story mode for immersive guided tours',
      'Voice commands for hands-free exploration',
      'Notes system with PDF export',
      'Touch controls for mobile devices'
    ]
  },
  {
    id: 'universal-timeline',
    title: 'Universal Agentic Timeline',
    description: '13.7 billion year cosmic history visualization',
    category: 'Features',
    icon: <Sparkles className="w-5 h-5" />,
    isPublic: true,
    lastUpdated: '2025-12-02',
    content: [
      'Spans from Big Bang (13.7B years ago) to Post-Human Future',
      'Era-based color coding inspired by Big History Project',
      'Interactive threshold nodes for major cosmic events',
      'Zoe Dreams AI for dream analysis and psychological exploration',
      'User Personal Timeline based on birth data',
      'Architect Mode for content creation and validation',
      'Voice-controlled navigation and exploration',
      'Holographic Altered Carbon-inspired aesthetics'
    ]
  },
  {
    id: 'huddle-system',
    title: 'Huddle Map System',
    description: 'Location-based friend discovery and social features',
    category: 'Social',
    icon: <Map className="w-5 h-5" />,
    isPublic: true,
    lastUpdated: '2025-12-02',
    content: [
      'Real-time map showing user locations and activity status',
      'Status indicators: Online, Away, In Transit, Work, Study',
      'Advanced filtering by friends, city, interests, distance',
      'Draggable filter panel with position persistence',
      'Quick filter presets for common scenarios',
      'Zoe Huddle Assistant for voice-controlled exploration',
      'Universal notification symbols for user activity'
    ]
  },
  {
    id: 'security-system',
    title: 'Security & Authentication',
    description: 'Account security, Face ID, and recovery methods',
    category: 'Security',
    icon: <Shield className="w-5 h-5" />,
    isPublic: false,
    lastUpdated: '2025-12-02',
    content: [
      'Email/password authentication with auto-confirm',
      'AI-powered Face ID verification (99.1% accuracy)',
      'Two-factor authentication (2FA) support',
      'Recovery email and phone configuration',
      'Trusted device management',
      'Security audit logging',
      'Row Level Security (RLS) on all tables',
      'WebAuthn passwordless authentication support',
      'Encrypted connections (HTTPS)',
      'JWT token-based session management'
    ]
  },
  {
    id: 'architecture',
    title: 'Technical Architecture',
    description: 'Platform technical stack and infrastructure',
    category: 'Technical',
    icon: <Code className="w-5 h-5" />,
    isPublic: false,
    lastUpdated: '2025-12-02',
    content: [
      'Frontend: React 18, TypeScript, Vite, Tailwind CSS',
      'Backend: Supabase (PostgreSQL), Edge Functions (Deno)',
      'Real-time: Supabase Realtime subscriptions',
      'AI: Lovable AI Gateway, Multi-model support',
      'Voice: Web Speech API, Custom TTS engine',
      'State: React Query, Context API',
      'Routing: React Router v6',
      'UI Components: Shadcn/ui, Radix primitives',
      'Animations: Framer Motion',
      '3D Graphics: Three.js for Solar System Explorer'
    ]
  },
  {
    id: 'database-schema',
    title: 'Database Schema',
    description: 'PostgreSQL database structure and tables',
    category: 'Technical',
    icon: <Database className="w-5 h-5" />,
    isPublic: false,
    lastUpdated: '2025-12-02',
    content: [
      'profiles: User profile data with settings',
      'posts: User posts with media support',
      'messages: Real-time chat messages',
      'friendships: Friend connections',
      'friend_requests: Pending friend requests',
      'notifications: User notifications',
      'user_badges: Gamification badges',
      'timeline_content: Universal Timeline data',
      'reminders: User reminders and tasks',
      'All tables protected with RLS policies'
    ]
  },
  {
    id: 'design-system',
    title: 'Design System',
    description: 'UI/UX design principles and components',
    category: 'Design',
    icon: <Palette className="w-5 h-5" />,
    isPublic: true,
    lastUpdated: '2025-12-02',
    content: [
      'Futuristic glassmorphic UI with holographic effects',
      'Dark mode optimized with HSL color system',
      'Semantic color tokens in Tailwind config',
      'Consistent spacing and typography scales',
      'Shadcn/ui component library with custom variants',
      'Framer Motion animation presets',
      'Mobile-first responsive breakpoints',
      'WCAG 2.1 AA accessibility compliance',
      'Altered Carbon-inspired cosmic aesthetics'
    ]
  },
  {
    id: 'gamification',
    title: 'Gamification System',
    description: 'Badges, achievements, and rewards',
    category: 'Features',
    icon: <Crown className="w-5 h-5" />,
    isPublic: true,
    lastUpdated: '2025-12-02',
    content: [
      'Achievement badges across multiple categories',
      'Point-based tier system (Free, Premium, Enterprise)',
      'Challenge system with time-limited goals',
      'Seasonal events and exclusive rewards',
      'Badge collections with bonus unlocks',
      'Global and friend leaderboards',
      'Milestone tracking with progress indicators',
      'Badge sharing to social feed'
    ]
  },
  {
    id: 'admin-features',
    title: 'Admin Control Panels',
    description: 'Administrative tools and analytics',
    category: 'Admin',
    icon: <Settings className="w-5 h-5" />,
    isPublic: false,
    lastUpdated: '2025-12-02',
    content: [
      'God Mode: Platform health monitoring and diagnostics',
      'Analytics Dashboard: User activity and engagement metrics',
      'Omni-Sense Dashboard: Advanced user profiling',
      'AI Audit Endpoint: Automated platform analysis',
      'Admin Notice Panel: Send announcements to users',
      'Feature Analytics: Track feature usage patterns',
      'Platform Health Monitor: Real-time error detection',
      'Role-based access control for admin users'
    ]
  }
];

interface ComprehensiveDocumentationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComprehensiveDocumentationCenter = ({ isOpen, onClose }: ComprehensiveDocumentationCenterProps) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [showPrivate, setShowPrivate] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchUsername = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();
        
        if (data?.username) {
          setUsername(data.username);
          setIsAuthorized(AUTHORIZED_USERS.includes(data.username.toLowerCase()));
        }
      }
    };
    fetchUsername();
  }, [user]);

  const categories = Array.from(new Set(documentationSections.map(d => d.category)));
  
  const filteredDocs = documentationSections.filter(doc => {
    const categoryMatch = !selectedCategory || doc.category === selectedCategory;
    const visibilityMatch = doc.isPublic || (showPrivate && isAuthorized);
    return categoryMatch && visibilityMatch;
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const generateComprehensivePDF = async () => {
    if (!isAuthorized) {
      toast.error('Access Denied', { description: 'You are not authorized to download documentation' });
      return;
    }

    setIsGenerating(true);
    toast.info('Generating PDF...', { description: 'This may take a few seconds' });

    try {
      const pdf = new jsPDF();
      let y = 20;
      const lineHeight = 6;
      const margin = 15;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const checkPageBreak = (requiredSpace: number = 20) => {
        if (y + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      const addText = (text: string, fontSize: number = 10, style: 'normal' | 'bold' = 'normal', indent: number = 0) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', style);
        const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin - indent);
        
        lines.forEach((line: string) => {
          checkPageBreak();
          pdf.text(line, margin + indent, y);
          y += lineHeight;
        });
      };

      const addHeader = (title: string, color: [number, number, number] = [60, 60, 200]) => {
        checkPageBreak(20);
        y += 5;
        pdf.setFillColor(...color);
        pdf.rect(margin, y - 5, pageWidth - 2 * margin, 10, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin + 3, y + 2);
        pdf.setTextColor(0, 0, 0);
        y += 12;
      };

      // Title Page
      pdf.setFillColor(20, 20, 40);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      pdf.setTextColor(100, 200, 255);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MMora Platform', pageWidth / 2, 60, { align: 'center' });
      
      pdf.setTextColor(200, 150, 255);
      pdf.setFontSize(20);
      pdf.text('Universe of Life', pageWidth / 2, 75, { align: 'center' });
      
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(16);
      pdf.text('Comprehensive Documentation', pageWidth / 2, 100, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 130, { align: 'center' });
      pdf.text(`Generated by: @${username}`, pageWidth / 2, 145, { align: 'center' });
      pdf.text('Version: 2.0.0', pageWidth / 2, 160, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Powered by Zoe AI Architect', pageWidth / 2, 200, { align: 'center' });

      // Table of Contents
      pdf.addPage();
      y = margin;
      pdf.setTextColor(0, 0, 0);
      addHeader('TABLE OF CONTENTS', [40, 40, 80]);
      
      documentationSections.forEach((section, index) => {
        if (section.isPublic || isAuthorized) {
          checkPageBreak();
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          const tocEntry = `${index + 1}. ${section.title}`;
          pdf.text(tocEntry, margin, y);
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`[${section.category}]`, pageWidth - margin - 30, y);
          pdf.setTextColor(0, 0, 0);
          y += lineHeight + 2;
        }
      });

      // Content Pages
      documentationSections.forEach((section, sectionIndex) => {
        if (!section.isPublic && !isAuthorized) return;

        pdf.addPage();
        y = margin;

        // Section Header
        const categoryColors: Record<string, [number, number, number]> = {
          'General': [60, 120, 200],
          'AI Features': [200, 60, 150],
          'Voice': [60, 200, 120],
          'Features': [200, 150, 60],
          'Social': [60, 150, 200],
          'Security': [200, 60, 60],
          'Technical': [100, 100, 100],
          'Design': [150, 60, 200],
          'Admin': [60, 60, 60]
        };

        addHeader(`${sectionIndex + 1}. ${section.title}`, categoryColors[section.category] || [60, 60, 200]);
        
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        addText(`Category: ${section.category} | Last Updated: ${section.lastUpdated}`);
        y += 3;
        
        pdf.setTextColor(0, 0, 0);
        addText(section.description, 11, 'bold');
        y += 5;

        // Content Items
        section.content.forEach((item, index) => {
          checkPageBreak();
          pdf.setFillColor(240, 240, 245);
          pdf.rect(margin, y - 3, pageWidth - 2 * margin, lineHeight + 4, 'F');
          addText(`• ${item}`, 10, 'normal', 5);
          y += 2;
        });

        y += 10;
      });

      // Footer Page
      pdf.addPage();
      y = pageHeight / 2 - 40;
      
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(14);
      pdf.text('End of Documentation', pageWidth / 2, y, { align: 'center' });
      
      y += 20;
      pdf.setFontSize(10);
      pdf.text('This document contains confidential platform information.', pageWidth / 2, y, { align: 'center' });
      y += 10;
      pdf.text('Authorized distribution only.', pageWidth / 2, y, { align: 'center' });
      y += 20;
      pdf.text('© 2025 MMora - Universe of Life', pageWidth / 2, y, { align: 'center' });

      // Save
      const filename = `mmora-comprehensive-documentation-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      toast.success('PDF Generated!', { description: filename });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateJSON = () => {
    if (!isAuthorized) {
      toast.error('Access Denied');
      return;
    }

    const exportData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: username,
        version: '2.0.0',
        platform: 'MMora - Universe of Life'
      },
      sections: documentationSections.filter(s => s.isPublic || isAuthorized)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mmora-documentation-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('JSON Downloaded!');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
        
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden"
        >
          <Card className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-xl border-b border-cyan-500/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30">
                    <BookOpen className="h-7 w-7 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      Documentation Center
                    </h2>
                    <p className="text-sm text-slate-400">
                      Comprehensive Platform Documentation
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Authorization Badge */}
                  <Badge variant={isAuthorized ? "default" : "secondary"} className={isAuthorized ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-slate-700"}>
                    {isAuthorized ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                    {isAuthorized ? 'Full Access' : 'Limited Access'}
                  </Badge>
                  
                  <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-red-500/20 hover:text-red-400">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                {/* Download Buttons */}
                <Button
                  onClick={generateComprehensivePDF}
                  disabled={!isAuthorized || isGenerating}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg disabled:opacity-50"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download PDF
                </Button>
                
                <Button
                  onClick={generateJSON}
                  disabled={!isAuthorized}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                >
                  <FileCode className="w-4 h-4 mr-2" />
                  Download JSON
                </Button>

                <div className="flex-1" />

                {/* Show Private Toggle */}
                {isAuthorized && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
                    {showPrivate ? <Eye className="w-4 h-4 text-yellow-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                    <span className="text-xs text-slate-400">Private Docs</span>
                    <Switch checked={showPrivate} onCheckedChange={setShowPrivate} />
                  </div>
                )}
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant={selectedCategory === null ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs"
                >
                  All ({documentationSections.filter(d => d.isPublic || (showPrivate && isAuthorized)).length})
                </Button>
                {categories.map(category => {
                  const count = documentationSections.filter(d => d.category === category && (d.isPublic || (showPrivate && isAuthorized))).length;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="text-xs"
                    >
                      {category} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Document List */}
            <ScrollArea className="h-[calc(90vh-280px)]">
              <div className="p-6 space-y-3">
                {filteredDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group"
                  >
                    <Card
                      className={`bg-slate-800/50 border transition-all duration-300 cursor-pointer hover:shadow-lg ${
                        expandedSections.includes(doc.id) 
                          ? 'border-cyan-500/50 shadow-cyan-500/10' 
                          : 'border-slate-700/50 hover:border-cyan-500/30'
                      }`}
                      onClick={() => toggleSection(doc.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${doc.isPublic ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {doc.icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                  {doc.title}
                                </h3>
                                {!doc.isPublic && (
                                  <Lock className="w-3 h-3 text-yellow-500" />
                                )}
                              </div>
                              <p className="text-sm text-slate-400">{doc.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              {doc.category}
                            </Badge>
                            <span className="text-[10px] text-slate-500">{doc.lastUpdated}</span>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {expandedSections.includes(doc.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 pt-4 border-t border-slate-700/50"
                            >
                              <ul className="space-y-2">
                                {doc.content.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {isAuthorized 
                    ? `Full access granted to @${username}` 
                    : 'Request admin access for private documentation'}
                </span>
                <span>Powered by Zoe AI • v2.0.0</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ComprehensiveDocumentationCenter;
