import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FileDown
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from 'jspdf';

interface Document {
  id: string;
  title: string;
  description: string;
  category: "Architecture" | "User Guides" | "Technical" | "Security" | "AI Features";
  icon: typeof FileText;
  filename: string;
  content: string[];
}

const documents: Document[] = [
  {
    id: "master",
    title: "Master Documentation",
    description: "Complete platform overview and feature guide",
    category: "User Guides",
    icon: BookOpen,
    filename: "MASTER_DOCUMENTATION.pdf",
    content: [
      "MMora - Universe of Life Platform Documentation",
      "Version 2.0.0 - Complete Feature Guide",
      "",
      "Platform Overview:",
      "• Next-generation social platform powered by Zoe AI Architect",
      "• Built with React 18, TypeScript, and Tailwind CSS",
      "• Real-time messaging, posts, and social connections",
      "• Progressive Web App (PWA) with offline support",
      "",
      "Core Features:",
      "• Zoe AI Architect - Agentic AI assistant for creative production",
      "• Universal Timeline - 13.7 billion year cosmic history",
      "• Solar System Explorer - 3D holographic space visualization",
      "• Huddle - Location-based friend discovery",
      "• WebDrop - Creative content generation hub",
      "",
      "Voice Commands:",
      "• Wake words: 'Hey Zoe', 'OK Zoe'",
      "• Navigation: 'go to home', 'open profile', 'show timeline'",
      "• Content: 'create post', 'send message', 'search for...'",
      "",
      "Technical Stack:",
      "• Frontend: React 18, Vite, Tailwind CSS",
      "• Backend: Supabase (PostgreSQL), Edge Functions",
      "• AI: Lovable AI Gateway with multi-model support",
      "• 3D: Three.js for Solar System Explorer"
    ]
  },
  {
    id: "app-docs",
    title: "App Documentation",
    description: "Core application features and usage",
    category: "User Guides",
    icon: FileText,
    filename: "APP_DOCUMENTATION.pdf",
    content: [
      "Application Features Documentation",
      "",
      "Home Page:",
      "• Personalized feed with posts from friends and global users",
      "• Post creation with text, images, and video support",
      "• Real-time like, comment, and share functionality",
      "",
      "Profile System:",
      "• Customizable profile with bio, photos, and interests",
      "• Privacy settings for profile visibility",
      "• Badge collection and achievement display",
      "",
      "Messaging:",
      "• Real-time chat with read receipts",
      "• Media sharing and voice messages",
      "• Message reactions and forwarding",
      "",
      "Notifications:",
      "• Smart notification batching",
      "• Voice announcements via Zoe",
      "• Customizable notification preferences"
    ]
  },
  {
    id: "zoe-user-guide",
    title: "Zoe AI User Guide",
    description: "Comprehensive Zoe AI Architect usage guide",
    category: "AI Features",
    icon: Sparkles,
    filename: "ZOE_USER_GUIDE.pdf",
    content: [
      "Zoe AI Architect - User Guide",
      "",
      "Introduction:",
      "Zoe is your agentic AI assistant and creative architect",
      "",
      "Key Capabilities:",
      "• Multi-agent system with specialized agents",
      "• Voice-activated with wake word detection",
      "• Personalized daily briefings",
      "• Creative production planning",
      "• Adaptive learning from interactions",
      "",
      "Narration Modes:",
      "• Kids - Simple, fun explanations",
      "• Students - Educational content",
      "• Teachers - Curriculum-aligned material",
      "• Researchers - In-depth analysis",
      "• Scientists - Technical specifications",
      "",
      "Voice Commands:",
      "• 'Hey Zoe' or 'OK Zoe' to activate",
      "• 'Tell me about...' for information",
      "• 'Create a plan for...' for production planning",
      "• 'Analyze this...' for AI analysis"
    ]
  },
  {
    id: "zoe-agentic",
    title: "Zoe Agentic AI Implementation",
    description: "Technical details of Zoe's agentic architecture",
    category: "AI Features",
    icon: Zap,
    filename: "ZOE_AGENTIC_AI_IMPLEMENTATION.pdf",
    content: [
      "Zoe Agentic AI - Technical Implementation",
      "",
      "Multi-Agent Architecture:",
      "• PLANNER Agent - Task decomposition and planning",
      "• RESEARCHER Agent - Information gathering",
      "• EXECUTOR Agent - Task execution",
      "• OPTIMIZER Agent - Performance optimization",
      "• LEARNING Agent - Adaptive learning",
      "• COORDINATOR Agent - Agent orchestration",
      "",
      "Intelligence Systems:",
      "• Contextual Memory",
      "• Goal Tracking",
      "• Emotional Intelligence",
      "• Predictive Intent",
      "• Content Intelligence",
      "",
      "Integration Points:",
      "• Edge Functions for AI processing",
      "• Real-time streaming responses",
      "• Voice synthesis and recognition"
    ]
  },
  {
    id: "security-guide",
    title: "Account Security System",
    description: "Face ID, 2FA, and recovery methods guide",
    category: "Security",
    icon: Shield,
    filename: "ACCOUNT_SECURITY_SYSTEM_GUIDE.pdf",
    content: [
      "Account Security System Guide",
      "",
      "Authentication Methods:",
      "• Email/password with auto-confirm",
      "• AI-powered Face ID (99.1% accuracy)",
      "• Two-factor authentication (2FA)",
      "• WebAuthn passwordless support",
      "",
      "Recovery Options:",
      "• Recovery email configuration",
      "• Recovery phone number",
      "• Backup recovery codes",
      "",
      "Security Features:",
      "• Trusted device management",
      "• Security audit logging",
      "• Row Level Security (RLS)",
      "• JWT token-based sessions",
      "• Encrypted HTTPS connections"
    ]
  },
  {
    id: "responsive-design",
    title: "Responsive Design & Enterprise Guide",
    description: "Mobile, tablet, IoT device support and scaling",
    category: "Technical",
    icon: FileCode,
    filename: "RESPONSIVE_DESIGN_ENTERPRISE_GUIDE.pdf",
    content: [
      "Responsive Design & Enterprise Guide",
      "",
      "Device Support:",
      "• Mobile phones (iOS/Android)",
      "• Tablets (portrait/landscape)",
      "• Desktop browsers",
      "• Large displays and IoT",
      "",
      "Breakpoints:",
      "• sm: 640px - Small tablets",
      "• md: 768px - Tablets",
      "• lg: 1024px - Laptops",
      "• xl: 1280px - Desktops",
      "• 2xl: 1536px - Large screens",
      "",
      "Enterprise Scaling:",
      "• Supabase instance sizing",
      "• Edge function optimization",
      "• CDN and caching strategies",
      "• Database indexing"
    ]
  },
  {
    id: "mobile-build",
    title: "Mobile App Build Guide",
    description: "iOS and Android native app deployment",
    category: "Technical",
    icon: FileCode,
    filename: "MOBILE_APP_BUILD_GUIDE.pdf",
    content: [
      "Mobile App Build Guide",
      "",
      "Capacitor Setup:",
      "• iOS configuration and requirements",
      "• Android configuration and requirements",
      "• Native plugin integration",
      "",
      "Build Process:",
      "1. npm run build",
      "2. npx cap sync",
      "3. npx cap open ios/android",
      "4. Build in Xcode/Android Studio",
      "",
      "App Store Deployment:",
      "• iOS App Store guidelines",
      "• Google Play Store guidelines",
      "• Beta testing with TestFlight/Firebase"
    ]
  },
  {
    id: "universal-timeline",
    title: "Universal Timeline Testing Guide",
    description: "UHAT feature documentation and testing",
    category: "User Guides",
    icon: FileText,
    filename: "UNIVERSAL_TIMELINE_TESTING_GUIDE.pdf",
    content: [
      "Universal Agentic Timeline Guide",
      "",
      "Timeline Overview:",
      "• Spans 13.7 billion years of cosmic history",
      "• Era-based color coding",
      "• Interactive threshold nodes",
      "",
      "Key Features:",
      "• Zoe Dreams AI integration",
      "• User Personal Timeline",
      "• Architect Mode for content creation",
      "• Voice-controlled navigation",
      "",
      "Testing Checklist:",
      "• Timeline rendering performance",
      "• Zoom controls (0.5x - 3x)",
      "• Voice command responses",
      "• Content loading and caching"
    ]
  },
  {
    id: "huddle-integration",
    title: "Zoe Huddle Integration",
    description: "Map-based friend discovery with Zoe AI",
    category: "AI Features",
    icon: Users,
    filename: "ZOE_HUDDLE_INTEGRATION.pdf",
    content: [
      "Zoe Huddle Integration Guide",
      "",
      "Map Features:",
      "• Real-time user location display",
      "• Activity status indicators",
      "• Friend and global user views",
      "",
      "Filtering System:",
      "• Friends vs all users",
      "• City-based filtering",
      "• Interest-based filtering",
      "• Distance radius filtering",
      "",
      "Zoe Huddle Assistant:",
      "• Voice-controlled exploration",
      "• Personalized suggestions",
      "• Friend activity notifications"
    ]
  },
  {
    id: "voice-onboarding",
    title: "Voice Onboarding Guide",
    description: "Voice-based user onboarding system",
    category: "User Guides",
    icon: FileText,
    filename: "VOICE_ONBOARDING_GUIDE.pdf",
    content: [
      "Voice Onboarding System",
      "",
      "Onboarding Steps:",
      "1. Welcome and introduction",
      "2. Name capture via voice",
      "3. Interest selection",
      "4. Profile photo setup",
      "5. Notification preferences",
      "",
      "Skip Options:",
      "• Users can skip voice input",
      "• Manual text input fallback",
      "• Progress saving between sessions",
      "",
      "Accessibility:",
      "• Screen reader support",
      "• High contrast mode",
      "• Keyboard navigation"
    ]
  },
  {
    id: "comprehensive-export",
    title: "Comprehensive Activity Export",
    description: "Export all platform data and analytics",
    category: "User Guides",
    icon: Download,
    filename: "COMPREHENSIVE_ACTIVITY_EXPORT_GUIDE.pdf",
    content: [
      "Activity Export Guide",
      "",
      "Exportable Data:",
      "• Posts and comments",
      "• Messages and conversations",
      "• Profile information",
      "• Friend connections",
      "• Activity logs",
      "",
      "Export Formats:",
      "• PDF reports",
      "• JSON data files",
      "• CSV spreadsheets",
      "",
      "Privacy Controls:",
      "• Selective data export",
      "• Data anonymization options",
      "• GDPR compliance support"
    ]
  },
  {
    id: "error-fixes",
    title: "Platform Updates (Dec 2025)",
    description: "Recent bug fixes and performance improvements",
    category: "Technical",
    icon: Zap,
    filename: "PLATFORM_UPDATES_DEC_2025.pdf",
    content: [
      "Platform Updates - December 2025",
      "",
      "Bug Fixes:",
      "• Solar System Explorer rendering",
      "• Voice command recognition",
      "• Modal overlay positioning",
      "• Responsive design improvements",
      "",
      "Performance Improvements:",
      "• Reduced initial load time",
      "• Optimized image loading",
      "• Database query optimization",
      "• Memory leak fixes",
      "",
      "New Features:",
      "• Premium image generation",
      "• Business service registration",
      "• Enhanced multi-agent AI"
    ]
  }
];

interface UniversalDocumentHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UniversalDocumentHub = ({ isOpen, onClose }: UniversalDocumentHubProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = (doc: Document): void => {
    const pdf = new jsPDF();
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = margin;
    const lineHeight = 7;

    // Title
    pdf.setFillColor(30, 30, 60);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(100, 200, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(doc.title, margin, 25);
    
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(10);
    pdf.text(doc.description, margin, 35);

    y = 55;
    pdf.setTextColor(0, 0, 0);

    // Content
    doc.content.forEach((line) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }

      if (line.startsWith('•')) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(line, pageWidth - 2 * margin - 5);
        lines.forEach((l: string) => {
          if (y > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(l, margin + 5, y);
          y += lineHeight;
        });
      } else if (line.endsWith(':') || line === '') {
        if (line !== '') {
          y += 3;
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(60, 60, 150);
          pdf.text(line, margin, y);
          pdf.setTextColor(0, 0, 0);
          y += lineHeight + 2;
        } else {
          y += 5;
        }
      } else {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(line, pageWidth - 2 * margin);
        lines.forEach((l: string) => {
          if (y > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(l, margin, y);
          y += lineHeight;
        });
      }
    });

    // Footer
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.text('MMora - Universe of Life', margin, pageHeight - 10);
      pdf.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    pdf.save(doc.filename);
  };

  const handleDownload = (doc: Document) => {
    try {
      generatePDF(doc);
      toast.success(`Downloaded: ${doc.title}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed");
    }
  };

  const handleDownloadAll = async () => {
    setIsGenerating(true);
    toast.info("Generating all PDFs...");
    
    try {
      for (const doc of documents) {
        generatePDF(doc);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      toast.success("All documents downloaded!");
    } catch (error) {
      toast.error("Some downloads failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = Array.from(new Set(documents.map(d => d.category)));
  const filteredDocs = selectedCategory 
    ? documents.filter(d => d.category === selectedCategory)
    : documents;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-4xl max-h-[85vh] backdrop-blur-2xl bg-card/95 border-primary/30 shadow-2xl shadow-primary/20 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-card/80 border-b border-border/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Universal Document Hub
                </h2>
                <p className="text-sm text-muted-foreground">
                  Download PDF documentation
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button
              onClick={handleDownloadAll}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : `Download All PDFs (${documents.length})`}
            </Button>
            
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="backdrop-blur-sm"
              >
                All
              </Button>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="backdrop-blur-sm"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Document List */}
        <ScrollArea className="h-[calc(85vh-180px)]">
          <div className="p-6 space-y-4">
            {filteredDocs.map((doc) => {
              const Icon = doc.icon;
              return (
                <Card
                  key={doc.id}
                  className="group backdrop-blur-xl bg-card/40 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {doc.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {doc.category}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                            PDF
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(doc)}
                      size="sm"
                      className="shrink-0 bg-primary/20 hover:bg-primary hover:text-primary-foreground backdrop-blur-sm gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="sticky bottom-0 backdrop-blur-xl bg-card/80 border-t border-border/50 p-4">
          <p className="text-xs text-center text-muted-foreground">
            All documents generated as PDF • Powered by Zoe AI
          </p>
        </div>
      </Card>
    </div>
  );
};
