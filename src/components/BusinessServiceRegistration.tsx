import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Phone, Mail, Clock, Globe, Users, 
  X, CheckCircle, Upload, Headphones, MessageSquare,
  Settings, Package, Calendar, Save, Loader2, Shield, Lock, Bot, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
];

interface BusinessServiceRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenServiceAgent?: () => void;
}

const BusinessServiceRegistration = ({ isOpen, onClose, onOpenServiceAgent }: BusinessServiceRegistrationProps) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [formData, setFormData] = useState({
    companyName: '',
    businessType: '',
    industry: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    description: '',
    enableChat: true,
    enableVoice: true,
    enable24x7: true,
    supportLanguages: ['English'],
    workingHours: {
      monday: { start: '09:00', end: '18:00', enabled: true },
      tuesday: { start: '09:00', end: '18:00', enabled: true },
      wednesday: { start: '09:00', end: '18:00', enabled: true },
      thursday: { start: '09:00', end: '18:00', enabled: true },
      friday: { start: '09:00', end: '18:00', enabled: true },
      saturday: { start: '10:00', end: '16:00', enabled: false },
      sunday: { start: '00:00', end: '00:00', enabled: false },
    },
    products: [] as { name: string; description: string; category: string }[]
  });

  const [newProduct, setNewProduct] = useState({ name: '', description: '', category: '' });

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Education',
    'Manufacturing', 'Hospitality', 'Real Estate', 'Legal', 'Other'
  ];

  const businessTypes = [
    'Small Business', 'Medium Enterprise', 'Large Corporation',
    'Startup', 'Non-Profit', 'Government', 'Freelancer'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { ...newProduct }]
    }));
    setNewProduct({ name: '', description: '', category: '' });
    toast.success('Product/Service added');
  };

  const handleRemoveProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!formData.contactEmail.trim()) {
      toast.error('Contact email is required');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to register your business');
        setIsLoading(false);
        return;
      }

      toast.success('Business registration submitted successfully!', {
        description: 'Your 24/7 AI Service will be activated within 24 hours'
      });
      
      onClose();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to submit registration');
    } finally {
      setIsLoading(false);
    }
  };

  const updateWorkingHours = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: { ...prev.workingHours[day as keyof typeof prev.workingHours], [field]: value }
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        {/* ONI Deep Void Background */}
        <div className="absolute inset-0 oni-void-deep" />
        <div className="absolute inset-0 oni-neural-mesh opacity-30" />
        <div className="absolute inset-0 oni-vignette-lens" />
        
        {/* Floating Bioluminescent Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-1 h-1 rounded-full",
                i < 3 ? 'animate-gpu-float-particle-1' :
                i < 6 ? 'animate-gpu-float-particle-2' :
                i < 9 ? 'animate-gpu-float-particle-3' :
                i < 12 ? 'animate-gpu-float-particle-4' : 'animate-gpu-float-particle-5'
              )}
              style={{
                background: i % 2 === 0 ? 'hsl(var(--oni-cyan))' : 'hsl(var(--oni-purple))',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                boxShadow: `0 0 ${8 + Math.random() * 12}px ${i % 2 === 0 ? 'hsl(var(--oni-cyan))' : 'hsl(var(--oni-purple))'}`
              }}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotateX: 15 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 0.8, opacity: 0, rotateX: -15 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ perspective: '1000px' }}
        >
          {/* ONI Curved Lens Frame */}
          <div className="oni-curved-lens relative overflow-hidden">
            {/* Outer Glow Ring */}
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-[hsl(var(--oni-cyan))] via-[hsl(var(--oni-purple))] to-[hsl(var(--oni-pink))] opacity-30 blur-xl animate-pulse" />
            
            {/* Main Glass Panel */}
            <div className="relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden oni-glass-curved">
              {/* Scan Line Effect */}
              <div className="absolute inset-0 oni-scan-beam pointer-events-none" />
              
              {/* Inner Gradient Border */}
              <div className="absolute inset-0 rounded-[1.5rem] sm:rounded-[2rem] p-[1px] bg-gradient-to-br from-[hsl(var(--oni-cyan))/0.5] via-transparent to-[hsl(var(--oni-pink))/0.3]" />
              
              {/* Header - ONI Curved Top */}
              <div className="relative p-3 sm:p-4 border-b border-[hsl(var(--oni-cyan))]/20">
                {/* Tech Data Decorations */}
                <div className="absolute top-2 left-3 text-[8px] sm:text-[9px] text-[hsl(var(--oni-cyan))]/40 font-mono">SYS.REG.ENT.v3.0</div>
                <div className="absolute top-2 right-12 text-[8px] sm:text-[9px] text-[hsl(var(--oni-pink))]/40 font-mono">SECURE.LINK</div>
                
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Holographic Avatar */}
                    <div className="relative">
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full oni-holo-ring flex items-center justify-center animate-gpu-glow-cyan"
                      >
                        <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-[hsl(var(--oni-cyan))]" />
                      </div>
                      {/* Orbiting Particle - CSS animation */}
                      <div
                        className="absolute w-1.5 h-1.5 bg-[hsl(var(--oni-purple))] rounded-full animate-gpu-spin-3s"
                        style={{ 
                          top: '50%', 
                          left: '50%',
                          transformOrigin: '0 -20px'
                        }}
                      />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-lg font-bold text-[hsl(var(--oni-cyan))] oni-glow-text" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        24/7 SERVICE AI
                      </h2>
                      <p className="text-[10px] sm:text-xs text-[hsl(var(--oni-cyan))]/60 font-mono">ENTERPRISE REGISTRATION PORTAL</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Badge className="hidden sm:flex text-[9px] bg-transparent border border-[hsl(var(--oni-cyan))]/50 text-[hsl(var(--oni-cyan))]">
                      <Shield className="w-3 h-3 mr-1" />
                      SECURE
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={onClose}
                      className="w-8 h-8 rounded-full border border-[hsl(var(--oni-pink))]/30 hover:bg-[hsl(var(--oni-pink))]/20 hover:border-[hsl(var(--oni-pink))]/60"
                    >
                      <X className="w-4 h-4 text-[hsl(var(--oni-pink))]" />
                    </Button>
                  </div>
                </div>
                
                {/* Try Live AI Agent Button - ONI Style */}
                <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-[hsl(var(--oni-purple))]/20 to-[hsl(var(--oni-pink))]/10 border border-[hsl(var(--oni-purple))]/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-[hsl(var(--oni-purple))]/30 border border-[hsl(var(--oni-purple))]/50 animate-gpu-scale-bounce">
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--oni-purple))]" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-[hsl(var(--oni-purple))]" style={{ fontFamily: "'Orbitron', sans-serif" }}>TRY LIVE AGENT DEMO</div>
                        <div className="text-[9px] sm:text-[10px] text-[hsl(var(--oni-cyan))]/60 font-mono">EXPERIENCE ZOE AI BEFORE REGISTRATION</div>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 0 20px hsl(var(--oni-purple)/0.6)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-service-ai-agent'));
                      }}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-[hsl(var(--oni-purple))] to-[hsl(var(--oni-pink))] text-white text-xs font-semibold flex items-center gap-1 shadow-[0_0_15px_hsl(var(--oni-purple)/0.4)]"
                      style={{ fontFamily: "'Orbitron', sans-serif" }}
                    >
                      <MessageSquare className="w-3 h-3" />
                      TRY NOW
                    </motion.button>
                  </div>
                </div>
                
                {/* Step Indicator - ONI Curved Pills */}
                <div className="flex items-center gap-1 sm:gap-2 mt-4">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex-1 flex items-center">
                      <div
                        className={cn(
                          "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all",
                          step >= s ? 'oni-step-active text-white' : 'oni-step-inactive text-[hsl(var(--oni-cyan))]/50',
                          step === s && 'animate-gpu-scale-bounce'
                        )}
                        style={{ fontFamily: "'Orbitron', sans-serif" }}
                      >
                        {step > s ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : s}
                      </div>
                      {s < 4 && (
                        <div className={`flex-1 h-[2px] mx-1 sm:mx-2 transition-all rounded-full ${
                          step > s 
                            ? 'bg-gradient-to-r from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))] shadow-[0_0_8px_hsl(var(--oni-cyan)/0.5)]' 
                            : 'bg-[hsl(var(--oni-cyan))]/10'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[8px] sm:text-[10px] text-[hsl(var(--oni-cyan))]/50 font-mono px-1">
                  <span>COMPANY</span>
                  <span>SERVICES</span>
                  <span>HOURS</span>
                  <span>PRODUCTS</span>
                </div>
              </div>

              <ScrollArea className="h-[350px] sm:h-[400px]">
                <div className="p-3 sm:p-4 space-y-4">
                  {/* Step 1: Company Details */}
                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs sm:text-sm text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <Building2 className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
                          COMPANY NAME *
                        </Label>
                        <Input
                          value={formData.companyName}
                          onChange={(e) => handleInputChange('companyName', e.target.value)}
                          placeholder="Your company name"
                          className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 font-mono text-sm focus:border-[hsl(var(--oni-cyan))]/60 focus:shadow-[0_0_15px_hsl(var(--oni-cyan)/0.3)] rounded-xl"
                          style={{ backdropFilter: 'blur(12px)' }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs sm:text-sm text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>BUSINESS TYPE</Label>
                          <select
                            value={formData.businessType}
                            onChange={(e) => handleInputChange('businessType', e.target.value)}
                            className="w-full p-2 rounded-xl bg-[hsl(var(--oni-void))]/80 border border-[hsl(var(--oni-cyan))]/30 text-xs sm:text-sm text-[hsl(var(--oni-cyan))] font-mono focus:border-[hsl(var(--oni-cyan))]/60 focus:outline-none"
                            style={{ backdropFilter: 'blur(12px)' }}
                          >
                            <option value="" className="bg-[hsl(var(--oni-void))]">Select type</option>
                            {businessTypes.map(type => (
                              <option key={type} value={type} className="bg-[hsl(var(--oni-void))]">{type}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs sm:text-sm text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>INDUSTRY</Label>
                          <select
                            value={formData.industry}
                            onChange={(e) => handleInputChange('industry', e.target.value)}
                            className="w-full p-2 rounded-xl bg-[hsl(var(--oni-void))]/80 border border-[hsl(var(--oni-cyan))]/30 text-xs sm:text-sm text-[hsl(var(--oni-cyan))] font-mono focus:border-[hsl(var(--oni-cyan))]/60 focus:outline-none"
                            style={{ backdropFilter: 'blur(12px)' }}
                          >
                            <option value="" className="bg-[hsl(var(--oni-void))]">Select industry</option>
                            {industries.map(ind => (
                              <option key={ind} value={ind} className="bg-[hsl(var(--oni-void))]">{ind}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-xs sm:text-sm text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                            <Mail className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
                            CONTACT EMAIL *
                          </Label>
                          <Input
                            type="email"
                            value={formData.contactEmail}
                            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                            placeholder="contact@company.com"
                            className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 font-mono text-sm focus:border-[hsl(var(--oni-cyan))]/60 rounded-xl"
                            style={{ backdropFilter: 'blur(12px)' }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-xs sm:text-sm text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                            <Phone className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
                            CONTACT PHONE
                          </Label>
                          <Input
                            type="tel"
                            value={formData.contactPhone}
                            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                            placeholder="+1 234 567 8900"
                            className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 font-mono text-sm focus:border-[hsl(var(--oni-cyan))]/60 rounded-xl"
                            style={{ backdropFilter: 'blur(12px)' }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs sm:text-sm text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <Globe className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
                          WEBSITE
                        </Label>
                        <Input
                          value={formData.website}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          placeholder="https://www.yourcompany.com"
                          className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 font-mono text-sm focus:border-[hsl(var(--oni-cyan))]/60 rounded-xl"
                          style={{ backdropFilter: 'blur(12px)' }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>BUSINESS DESCRIPTION</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          placeholder="Describe your business and services..."
                          className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 font-mono text-sm min-h-[80px] focus:border-[hsl(var(--oni-cyan))]/60 rounded-xl"
                          style={{ backdropFilter: 'blur(12px)' }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Service Settings */}
                  {step === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[hsl(var(--oni-cyan))]/10 to-[hsl(var(--oni-purple))]/5 border border-[hsl(var(--oni-cyan))]/20 backdrop-blur-sm">
                        <h3 className="text-xs sm:text-sm font-semibold text-[hsl(var(--oni-cyan))] mb-3 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          <Settings className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
                          SERVICE CHANNELS
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/10">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-[hsl(var(--oni-cyan))]/20 border border-[hsl(var(--oni-cyan))]/30">
                                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--oni-cyan))]" />
                              </div>
                              <div>
                                <div className="text-xs sm:text-sm font-medium text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Orbitron', sans-serif" }}>CHAT SUPPORT</div>
                                <div className="text-[10px] sm:text-xs text-[hsl(var(--oni-cyan))]/60 font-mono">AI-powered chat assistance</div>
                              </div>
                            </div>
                            <Switch
                              checked={formData.enableChat}
                              onCheckedChange={(checked) => handleInputChange('enableChat', checked)}
                              className="data-[state=checked]:bg-[hsl(var(--oni-cyan))]"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/10">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-[hsl(var(--oni-purple))]/20 border border-[hsl(var(--oni-purple))]/30">
                                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--oni-purple))]" />
                              </div>
                              <div>
                                <div className="text-xs sm:text-sm font-medium text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Orbitron', sans-serif" }}>VOICE CALLS</div>
                                <div className="text-[10px] sm:text-xs text-[hsl(var(--oni-cyan))]/60 font-mono">Inbound & outbound voice support</div>
                              </div>
                            </div>
                            <Switch
                              checked={formData.enableVoice}
                              onCheckedChange={(checked) => handleInputChange('enableVoice', checked)}
                              className="data-[state=checked]:bg-[hsl(var(--oni-purple))]"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/10">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-[hsl(var(--oni-pink))]/20 border border-[hsl(var(--oni-pink))]/30">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--oni-pink))]" />
                              </div>
                              <div>
                                <div className="text-xs sm:text-sm font-medium text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Orbitron', sans-serif" }}>24/7 AVAILABILITY</div>
                                <div className="text-[10px] sm:text-xs text-[hsl(var(--oni-cyan))]/60 font-mono">Round-the-clock AI service</div>
                              </div>
                            </div>
                            <Switch
                              checked={formData.enable24x7}
                              onCheckedChange={(checked) => handleInputChange('enable24x7', checked)}
                              className="data-[state=checked]:bg-[hsl(var(--oni-pink))]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[hsl(var(--oni-purple))]/10 to-[hsl(var(--oni-pink))]/5 border border-[hsl(var(--oni-purple))]/20 backdrop-blur-sm">
                        <h3 className="text-xs sm:text-sm font-semibold text-[hsl(var(--oni-cyan))] mb-3 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          <Globe className="w-4 h-4 text-[hsl(var(--oni-purple))]" />
                          SUPPORT LANGUAGES
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Hindi', 'Arabic'].map(lang => (
                            <motion.button
                              key={lang}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                const langs = formData.supportLanguages.includes(lang)
                                  ? formData.supportLanguages.filter(l => l !== lang)
                                  : [...formData.supportLanguages, lang];
                                handleInputChange('supportLanguages', langs);
                              }}
                              className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all ${
                                formData.supportLanguages.includes(lang)
                                  ? 'bg-gradient-to-r from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))] text-white shadow-[0_0_10px_hsl(var(--oni-cyan)/0.4)]'
                                  : 'bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/20 text-[hsl(var(--oni-cyan))]/60 hover:border-[hsl(var(--oni-cyan))]/50'
                              }`}
                              style={{ fontFamily: "'Share Tech Mono', monospace" }}
                            >
                              {lang}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Working Hours */}
                  {step === 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[hsl(var(--oni-cyan))]/10 to-[hsl(var(--oni-purple))]/5 border border-[hsl(var(--oni-cyan))]/20 backdrop-blur-sm">
                        <h3 className="text-xs sm:text-sm font-semibold text-[hsl(var(--oni-cyan))] mb-3 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          <Calendar className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
                          BUSINESS HOURS
                        </h3>
                        
                        <div className="space-y-2">
                          {Object.entries(formData.workingHours).map(([day, hours]) => (
                            <div key={day} className="flex items-center gap-2 p-2 rounded-xl bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/10">
                              <Switch
                                checked={hours.enabled}
                                onCheckedChange={(checked) => updateWorkingHours(day, 'enabled', checked)}
                                className="data-[state=checked]:bg-[hsl(var(--oni-cyan))]"
                              />
                              <span className={`w-16 sm:w-20 text-[10px] sm:text-xs font-mono capitalize ${hours.enabled ? 'text-[hsl(var(--oni-cyan))]' : 'text-[hsl(var(--oni-cyan))]/40'}`}>
                                {day.slice(0, 3).toUpperCase()}
                              </span>
                              {hours.enabled && (
                                <div className="flex items-center gap-1 sm:gap-2 flex-1">
                                  <Input
                                    type="time"
                                    value={hours.start}
                                    onChange={(e) => updateWorkingHours(day, 'start', e.target.value)}
                                    className="h-7 sm:h-8 text-[10px] sm:text-xs bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] font-mono rounded-lg"
                                  />
                                  <span className="text-[10px] text-[hsl(var(--oni-cyan))]/40">TO</span>
                                  <Input
                                    type="time"
                                    value={hours.end}
                                    onChange={(e) => updateWorkingHours(day, 'end', e.target.value)}
                                    className="h-7 sm:h-8 text-[10px] sm:text-xs bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] font-mono rounded-lg"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Products/Services */}
                  {step === 4 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[hsl(var(--oni-cyan))]/10 to-[hsl(var(--oni-purple))]/5 border border-[hsl(var(--oni-cyan))]/20 backdrop-blur-sm">
                        <h3 className="text-xs sm:text-sm font-semibold text-[hsl(var(--oni-cyan))] mb-3 flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          <Package className="w-4 h-4 text-[hsl(var(--oni-cyan))]" />
                          ADD PRODUCTS/SERVICES
                        </h3>
                        
                        <div className="space-y-3">
                          <Input
                            value={newProduct.name}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Product/Service name"
                            className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 font-mono text-sm rounded-xl"
                            style={{ backdropFilter: 'blur(12px)' }}
                          />
                          <Input
                            value={newProduct.category}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                            placeholder="Category"
                            className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 font-mono text-sm rounded-xl"
                            style={{ backdropFilter: 'blur(12px)' }}
                          />
                          <Textarea
                            value={newProduct.description}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Description"
                            className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] placeholder:text-[hsl(var(--oni-cyan))]/30 font-mono text-sm min-h-[60px] rounded-xl"
                            style={{ backdropFilter: 'blur(12px)' }}
                          />
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAddProduct}
                            className="w-full py-2 rounded-full bg-gradient-to-r from-[hsl(var(--oni-cyan))]/20 to-[hsl(var(--oni-purple))]/20 border border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] text-xs font-semibold flex items-center justify-center gap-2 hover:border-[hsl(var(--oni-cyan))]/60"
                            style={{ fontFamily: "'Orbitron', sans-serif" }}
                          >
                            <Package className="w-4 h-4" />
                            ADD PRODUCT
                          </motion.button>
                        </div>

                        {formData.products.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {formData.products.map((product, index) => (
                              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/10">
                                <div>
                                  <div className="text-xs sm:text-sm font-medium text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Orbitron', sans-serif" }}>{product.name}</div>
                                  <div className="text-[10px] text-[hsl(var(--oni-cyan))]/60 font-mono">{product.category}</div>
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleRemoveProduct(index)}
                                  className="p-1.5 rounded-full bg-[hsl(var(--oni-pink))]/20 border border-[hsl(var(--oni-pink))]/30 text-[hsl(var(--oni-pink))]"
                                >
                                  <X className="w-3 h-3" />
                                </motion.button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Footer Navigation - ONI Style */}
              <div className="p-3 sm:p-4 border-t border-[hsl(var(--oni-cyan))]/20 bg-gradient-to-t from-[hsl(var(--oni-void))] to-transparent">
                <div className="flex justify-between gap-3">
                  {step > 1 && (
                    <motion.button
                      whileHover={{ scale: 1.02, x: -3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep(step - 1)}
                      className="px-4 sm:px-6 py-2 rounded-full bg-[hsl(var(--oni-void))]/60 border border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))] text-xs sm:text-sm font-semibold hover:border-[hsl(var(--oni-cyan))]/60"
                      style={{ fontFamily: "'Orbitron', sans-serif" }}
                    >
                      PREVIOUS
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 0 25px hsl(var(--oni-cyan)/0.6)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => step < 4 ? setStep(step + 1) : handleSubmit()}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none px-6 sm:px-8 py-2 rounded-full bg-gradient-to-r from-[hsl(var(--oni-cyan))] to-[hsl(var(--oni-purple))] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_hsl(var(--oni-cyan)/0.4)] disabled:opacity-50"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : step < 4 ? (
                      <>NEXT</>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        SUBMIT REGISTRATION
                      </>
                    )}
                  </motion.button>
                </div>
                
                {/* Tech Footer */}
                <div className="flex justify-between mt-2 px-2">
                  <span className="text-[8px] sm:text-[9px] text-[hsl(var(--oni-cyan))]/30 font-mono">SYS.REG.{step}/4</span>
                  <span className="text-[8px] sm:text-[9px] text-[hsl(var(--oni-pink))]/30 font-mono">ENTERPRISE.GRADE</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BusinessServiceRegistration;
