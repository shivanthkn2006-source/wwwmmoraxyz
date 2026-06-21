import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Camera, MapPin, Sparkles, Users, Filter, Bell, Upload, Zap, Crown, ShoppingBag, Coffee, Store, Car, ChevronRight, X, Heart, MessageCircle, Share2, Shield, Activity, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import SelfieGlobe from '@/components/selfiecity/SelfieGlobe';
import SelfieUploader from '@/components/selfiecity/SelfieUploader';
import SelfieCitySearchBar from '@/components/selfiecity/SelfieCitySearchBar';
import SmartTagsPanel from '@/components/selfiecity/SmartTagsPanel';
import OnRouteNotifications from '@/components/selfiecity/OnRouteNotifications';
import BrandCategoryFilter from '@/components/selfiecity/BrandCategoryFilter';
import SelfieCityVoiceOverlay, { VoiceActivationButton } from '@/components/selfiecity/SelfieCityVoiceOverlay';
import { useSelfieCityStore } from '@/hooks/useSelfieCityStore';
import { useOnRouteEngine } from '@/hooks/useOnRouteEngine';
import { useSelfieCitySovereign } from '@/hooks/useSelfieCitySovereign';
import { useZoeSelfieCityCommands, VoiceCommandResult } from '@/hooks/useZoeSelfieCityCommands';
import { useSelfieCityVoiceLayer } from '@/hooks/useSelfieCityVoiceLayer';
import { smartFlyTo } from '@/services/globeNavigationService';
import { useNavigationBusSafe, SearchTarget } from '@/contexts/NavigationBusContext';

// Brand category definitions
const BRAND_CATEGORIES = {
  essentials: {
    name: 'Day-to-Day Essentials',
    icon: ShoppingBag,
    subcategories: [
      'Grocery', 'Pharmacy', 'Personal Care', 'Home Essentials', 'Electronics',
      'Mobile Accessories', 'Stationery', 'Pet Supplies', 'Baby Products', 'Kitchen'
    ]
  },
  food: {
    name: 'Food & Beverages',
    icon: Coffee,
    subcategories: [
      'Restaurants', 'Cafes', 'Street Food', 'Bakeries', 'Ice Cream',
      'Juice Bars', 'Fast Food', 'Fine Dining', 'Cloud Kitchen', 'Desserts'
    ]
  },
  fashion: {
    name: 'Fashion & Lifestyle',
    icon: Sparkles,
    subcategories: [
      'Clothing', 'Footwear', 'Accessories', 'Jewelry', 'Watches',
      'Bags', 'Eyewear', 'Ethnic Wear', 'Sports Wear', 'Kids Wear'
    ]
  },
  services: {
    name: 'Services',
    icon: Store,
    subcategories: [
      'Salons', 'Spas', 'Gyms', 'Clinics', 'Repair Services',
      'Laundry', 'Photography', 'Events', 'Travel', 'Education'
    ]
  },
  premium: {
    name: 'Premium & Luxury',
    icon: Crown,
    subcategories: [
      'Designer Fashion', 'Luxury Cars', 'Premium Watches', 'Fine Jewelry', 'Art Galleries',
      'Exclusive Clubs', 'Luxury Hotels', 'High-End Electronics', 'Celebrity Endorsed', 'VIP Services'
    ]
  }
};

const SelfieCityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'friends' | 'sales' | 'products' | 'premium'>('friends');
  const [showUploader, setShowUploader] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  
  const { 
    selfies, 
    nearbyDeals, 
    loadSelfies, 
    loadNearbyDeals,
    userLocation 
  } = useSelfieCityStore();
  
  const { 
    activeNotifications, 
    onRouteDeals,
    startRouteTracking,
    stopRouteTracking,
    isTracking
  } = useOnRouteEngine();

  // Zoe DHF Quantum Sovereign Integration
  const {
    isInitialized: sovereignInitialized,
    systemHealth,
    isPremiumUser,
    logDHFEvent,
    triggerHealthCheck
  } = useSelfieCitySovereign();

  // Zoe Voice Commands Integration
  const { processCommand, getAvailableCommands } = useZoeSelfieCityCommands();

  // Phase 1 Voice Layer - Bridges Web Speech API with Three.js canvas
  const voiceLayer = useSelfieCityVoiceLayer({
    onFilterChange: (filter) => setActiveFilter(filter as any),
    onError: (error) => toast.error(error),
  });

  // PHASE 2: Navigation Bus - Bridges Search → Globe → Product Modal
  const navigationBus = useNavigationBusSafe();

  // Load data on mount with sovereign integration
  useEffect(() => {
    if (!user) return;
    
    // Immediate load for critical data
    loadSelfies();
    loadNearbyDeals();
    
    // Defer route tracking slightly to not block render
    const timer = setTimeout(() => {
      startRouteTracking();
      logDHFEvent('selfie_city_opened', { filter: activeFilter });
    }, 500);
    
    // SelfieCity initialized with Zoe DHF Sovereign Core integration
    
    return () => {
      clearTimeout(timer);
      stopRouteTracking();
    };
  }, [user]);

  // Update notification count
  useEffect(() => {
    setNotificationCount(activeNotifications.length);
  }, [activeNotifications]);

  // Listen for HUD camera action
  useEffect(() => {
    const handleCameraAction = (e: CustomEvent<string>) => {
      if (e.detail === 'camera') {
        setShowUploader(true);
      }
    };
    
    window.addEventListener('selfie-city-action', handleCameraAction as EventListener);
    return () => window.removeEventListener('selfie-city-action', handleCameraAction as EventListener);
  }, []);

  // PHASE 2: Listen for Navigation Bus flight completion → Auto-open product modal
  useEffect(() => {
    const handleFlightComplete = (e: CustomEvent<SearchTarget>) => {
      const target = e.detail;
      if (!target) return;
      
      // Flight completed, auto-opening product modal
      
      // Auto-open the product details modal after landing
      setSelectedPin({
        type: target.type,
        storeName: target.metadata?.storeName || target.name,
        brandName: target.metadata?.brand || target.name,
        description: target.metadata?.description || `${target.type} at this location`,
        discount: target.metadata?.discount,
        priceRange: target.metadata?.price_range,
        rating: target.metadata?.rating,
        imageUrl: target.metadata?.imageUrl,
        lat: target.lat,
        lng: target.lng,
        isPremium: target.type === 'brand' || target.metadata?.category === 'Premium',
        category: target.metadata?.category,
      });
      
      toast.success(`Landed at ${target.name}`, {
        description: 'Tap the card below for details',
        duration: 3000,
      });
      
      // Notify Zoe Core
      window.dispatchEvent(new CustomEvent('zoe-core-event', {
        detail: {
          type: 'navigation_landed',
          payload: { target: target.name, type: target.type }
        }
      }));
    };

    const handleGlobeFlightComplete = (e: CustomEvent<{ locationName: string }>) => {
      // Trigger Navigation Bus completion
      if (navigationBus) {
        navigationBus.completeFlight();
      }
    };

    const handleShowProduct = (e: CustomEvent<SearchTarget>) => {
      const target = e.detail;
      if (target) {
        setSelectedPin({
          type: target.type,
          storeName: target.metadata?.storeName || target.name,
          brandName: target.metadata?.brand || target.name,
          description: target.metadata?.description,
          discount: target.metadata?.discount,
          imageUrl: target.metadata?.imageUrl,
          lat: target.lat,
          lng: target.lng,
        });
      }
    };

    window.addEventListener('navigation-bus-flight-complete', handleFlightComplete as EventListener);
    window.addEventListener('globe-flight-animation-complete', handleGlobeFlightComplete as EventListener);
    window.addEventListener('navigation-bus-show-product', handleShowProduct as EventListener);

    return () => {
      window.removeEventListener('navigation-bus-flight-complete', handleFlightComplete as EventListener);
      window.removeEventListener('globe-flight-animation-complete', handleGlobeFlightComplete as EventListener);
      window.removeEventListener('navigation-bus-show-product', handleShowProduct as EventListener);
    };
  }, [navigationBus]);

  // Listen for Zoe voice command actions
  useEffect(() => {
    const handleVoiceAction = async (e: CustomEvent<VoiceCommandResult>) => {
      const { action, payload, response } = e.detail;
      
      // Voice action received
      
      // Show Zoe's response as toast
      if (response && action !== 'help') {
        toast.info(response, { duration: 2000 });
      }

      switch (action) {
        case 'open_camera':
          setShowUploader(true);
          break;
        case 'close_camera':
          setShowUploader(false);
          break;
        case 'fly_to_location':
          if (payload?.location) {
            const result = await smartFlyTo(payload.location);
            if (result.success) {
              toast.success(`Flying to ${result.location?.displayName || payload.location}`);
            } else {
              toast.error(result.error || 'Location not found');
            }
          }
          break;
        case 'filter_friends':
          setActiveFilter('friends');
          break;
        case 'filter_sales':
          setActiveFilter('sales');
          break;
        case 'filter_products':
          setActiveFilter('products');
          break;
        case 'filter_premium':
          setActiveFilter('premium');
          break;
        case 'clear_filters':
          setActiveFilter('friends');
          break;
        case 'show_filters':
          setShowFilters(true);
          break;
        case 'hide_filters':
          setShowFilters(false);
          break;
        case 'show_notifications':
          setShowNotifications(true);
          break;
        case 'hide_notifications':
          setShowNotifications(false);
          break;
        case 'start_tracking':
          startRouteTracking();
          toast.success('Route tracking started');
          break;
        case 'stop_tracking':
          stopRouteTracking();
          toast.info('Route tracking stopped');
          break;
        case 'close_pin':
          setSelectedPin(null);
          break;
        case 'go_home':
          navigate('/home');
          break;
        case 'help':
          const commands = getAvailableCommands();
          toast.info(
            <div className="text-sm">
              <p className="font-semibold mb-1">Available commands:</p>
              <ul className="text-xs space-y-0.5">
                {commands.slice(0, 5).map((cmd, i) => (
                  <li key={i}>• {cmd}</li>
                ))}
              </ul>
            </div>,
            { duration: 6000 }
          );
          break;
        case 'search_query':
          // Search is handled by the search bar component
          window.dispatchEvent(new CustomEvent('selfie-city-search-trigger', {
            detail: { query: payload?.query }
          }));
          break;
        case 'check_weather':
          // Dispatch weather visualization event to the globe
          window.dispatchEvent(new CustomEvent('selfie-city-camera-control', {
            detail: { type: 'show_weather', weatherType: payload?.weatherType || 'rain' }
          }));
          toast.info('Visualizing precipitation patterns on the globe');
          break;
        case 'filter_brand':
          // Filter by brand - dispatch to search and visually highlight
          if (payload?.brand) {
            window.dispatchEvent(new CustomEvent('selfie-city-search-trigger', {
              detail: { query: payload.brand, filterType: 'brand' }
            }));
            toast.info(`Filtering for ${payload.brand}. Matching clusters lighting up.`);
          }
          break;
        default:
          // Unhandled voice action - no action needed
      }
    };

    window.addEventListener('selfie-city-voice-action', handleVoiceAction as EventListener);
    return () => window.removeEventListener('selfie-city-voice-action', handleVoiceAction as EventListener);
  }, [navigate, startRouteTracking, stopRouteTracking, getAvailableCommands]);

  const handleSelfieUpload = useCallback((selfieData: any) => {
    setShowUploader(false);
    logDHFEvent('selfie_uploaded', { hasProducts: selfieData?.products?.length > 0 });
    toast.success('Selfie posted to your location!', {
      description: 'Zoe is analyzing your look...'
    });
  }, [logDHFEvent]);

  const handlePinClick = useCallback((pin: any) => {
    setSelectedPin(pin);
    logDHFEvent('pin_selected', { type: pin?.type, isPremium: pin?.isPremium });
  }, [logDHFEvent]);

  // Handle selfie selection from 3D globe pins
  const handleGlobeSelfieSelect = useCallback((selfie: any) => {
    setSelectedPin({
      ...selfie,
      type: 'selfie',
      storeName: selfie.userName,
      description: selfie.caption,
      tags: selfie.detectedProducts?.map((p: any) => ({ brandName: p.brand || p.name }))
    });
    logDHFEvent('globe_pin_selected', { selfieId: selfie.id, isPremium: selfie.isPremium });
  }, [logDHFEvent]);

  const handleFilterChange = useCallback((filter: typeof activeFilter) => {
    setActiveFilter(filter);
    logDHFEvent('filter_changed', { filter });
  }, [logDHFEvent]);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Full-screen 3D Globe - Project Gaia */}
      <div className="absolute inset-0">
        <SelfieGlobe 
          selfies={selfies}
          onSelfieSelect={handleGlobeSelfieSelect}
          onLocationSelect={() => {}}
        />
      </div>

      {/* Search Bar - Bottom Center */}
      <SelfieCitySearchBar userLocation={userLocation} />

      {/* Top HUD - Header Left, Stats Right */}
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 z-20 p-4 safe-area-top"
      >
        <div className="flex items-start justify-between">
          {/* Left - Logo & Title */}
          <div className="flex items-center gap-2">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
              {sovereignInitialized && (
                <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background ${
                  systemHealth === 'healthy' ? 'bg-green-500' : 
                  systemHealth === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                } animate-pulse`} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="font-orbitron text-sm font-bold text-foreground">SELFIE CITY</h1>
                {isPremiumUser && <Crown className="w-3 h-3 text-amber-400" />}
              </div>
              <p className="text-[9px] text-muted-foreground font-mono">
                {sovereignInitialized ? 'Zoe Sovereign Active' : 'AR Commerce Engine'}
              </p>
            </div>
          </div>

          {/* Right - Stats & Actions */}
          <div className="glass-panel-2120 rounded-xl px-3 py-2 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              className="relative h-7 w-7"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="w-4 h-4 text-primary" />
              {notificationCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                >
                  {notificationCount}
                </motion.span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Compact Filter Chips */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {(['friends', 'sales', 'products', 'premium'] as const).map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? 'default' : 'outline'}
              size="sm"
              className={`rounded-full text-[10px] font-mono whitespace-nowrap h-7 px-2.5 ${
                activeFilter === filter 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background/60 backdrop-blur-lg border-primary/30 text-primary hover:bg-primary/10'
              }`}
              onClick={() => handleFilterChange(filter)}
            >
              {filter === 'friends' && <Users className="w-3 h-3 mr-1" />}
              {filter === 'sales' && <Zap className="w-3 h-3 mr-1" />}
              {filter === 'products' && <ShoppingBag className="w-3 h-3 mr-1" />}
              {filter === 'premium' && <Crown className="w-3 h-3 mr-1" />}
              {filter.toUpperCase()}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* On-Route Alert Banner */}
      <AnimatePresence>
        {onRouteDeals.length > 0 && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-32 left-4 right-4 z-30"
          >
            <div className="bg-gradient-to-r from-primary/90 to-secondary/90 rounded-xl p-3 backdrop-blur-lg border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  {onRouteDeals[0].brandLogo ? (
                    <img src={onRouteDeals[0].brandLogo} alt="" className="w-6 h-6 object-contain" />
                  ) : (
                    <MapPin className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{onRouteDeals[0].title}</p>
                  <p className="text-white/80 text-xs">{onRouteDeals[0].distance}m ahead • {onRouteDeals[0].discount}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera FAB removed - moved to right HUD sidebar */}

      {/* Selected Pin Details */}
      <AnimatePresence>
        {selectedPin && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-24 left-4 right-4 z-20"
          >
            <div className="glass-panel-2120 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                {/* Avatar/Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted">
                  {selectedPin.imageUrl && (
                    <img src={selectedPin.imageUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                
                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{selectedPin.userName || selectedPin.storeName}</span>
                    {selectedPin.isPremium && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                        <Crown className="w-2 h-2 mr-1" />
                        PREMIUM
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedPin.description}</p>
                  
                  {/* Smart Tags */}
                  {selectedPin.tags && selectedPin.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedPin.tags.slice(0, 3).map((tag: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-primary/30 text-primary">
                          {tag.brandName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Close */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPin(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                <Button variant="ghost" size="sm" className="flex-1">
                  <Heart className="w-4 h-4 mr-1" />
                  Like
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Comment
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
                {selectedPin.type === 'deal' && (
                  <Button size="sm" className="flex-1 bg-primary text-primary-foreground">
                    <MapPin className="w-4 h-4 mr-1" />
                    Route
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selfie Uploader Sheet */}
      <Sheet open={showUploader} onOpenChange={setShowUploader}>
        <SheetContent side="bottom" className="h-[90vh] bg-background/95 backdrop-blur-xl">
          <SheetHeader>
            <SheetTitle className="font-orbitron text-primary">Post Your Look</SheetTitle>
          </SheetHeader>
          <SelfieUploader onUpload={handleSelfieUpload} onClose={() => setShowUploader(false)} />
        </SheetContent>
      </Sheet>

      {/* Brand Category Filters */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="right" className="w-[85vw] bg-background/95 backdrop-blur-xl">
          <SheetHeader>
            <SheetTitle className="font-orbitron text-primary">Filter Brands</SheetTitle>
          </SheetHeader>
          <BrandCategoryFilter categories={BRAND_CATEGORIES} onApply={() => setShowFilters(false)} />
        </SheetContent>
      </Sheet>

      {/* Notifications Panel */}
      <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
        <SheetContent side="left" className="w-[85vw] bg-background/95 backdrop-blur-xl">
          <SheetHeader>
            <SheetTitle className="font-orbitron text-primary">On-Route Alerts</SheetTitle>
          </SheetHeader>
          <OnRouteNotifications notifications={activeNotifications} />
        </SheetContent>
      </Sheet>

      {/* Phase 1 Voice Layer - Hands-free Zoe Integration */}
      <SelfieCityVoiceOverlay
        isActive={voiceLayer.isActive}
        isListening={voiceLayer.isListening}
        isSpeaking={voiceLayer.isSpeaking}
        isProcessing={voiceLayer.isProcessing}
        transcript={voiceLayer.transcript}
        lastResponse={voiceLayer.lastIntent?.zoeResponse}
        onToggle={voiceLayer.toggle}
        onClose={voiceLayer.deactivate}
      />

      {/* Voice Activation Button - Bottom Right */}
      <VoiceActivationButton
        isActive={voiceLayer.isActive}
        isListening={voiceLayer.isListening}
        onClick={voiceLayer.toggle}
        className="absolute bottom-28 right-4 z-30"
      />
    </div>
  );
};

export default SelfieCityPage;
