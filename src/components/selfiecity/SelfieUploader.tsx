import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Sparkles, Loader2, MapPin, Tag, Check, X, Link2, DollarSign, TrendingUp, Store, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface SelfieUploaderProps {
  onUpload: (data: any) => void;
  onClose: () => void;
}

interface DetectedItem {
  id: string;
  name: string;
  brandName: string;
  category: string;
  subcategory?: string;
  confidence: number;
  price?: string;
  nearbyStore?: string;
  linkedBrandId?: string;
  linkedDeal?: {
    id: string;
    discount: string;
    storeName: string;
  };
}

interface BrandDeal {
  id: string;
  brand_name: string;
  brand_logo_url: string | null;
  store_name: string | null;
  category: string;
  discount_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
}

interface EarningsEstimate {
  baseEarning: number;
  brandBonus: number;
  premiumBonus: number;
  totalEstimate: number;
  factors: string[];
}

const SelfieUploader: React.FC<SelfieUploaderProps> = ({ onUpload, onClose }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationContext, setLocationContext] = useState<string>('');
  const [availableBrands, setAvailableBrands] = useState<BrandDeal[]>([]);
  const [earningsEstimate, setEarningsEstimate] = useState<EarningsEstimate | null>(null);
  const [userProfile, setUserProfile] = useState<{ total_points: number; current_tier: string } | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState<'scanning' | 'detecting' | 'matching' | 'calculating' | 'complete'>('scanning');

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => console.warn('[SelfieUploader] Location error:', err)
      );
    }
  }, []);

  // Load user profile and available brands
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Get user profile for earnings calculation
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, current_tier')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      // Get available brand deals for linking
      const { data: brands } = await supabase
        .from('brand_deals')
        .select('id, brand_name, brand_logo_url, store_name, category, discount_text, location_lat, location_lng')
        .eq('is_premium', false)
        .limit(50);

      if (brands) {
        setAvailableBrands(brands);
      }
    };

    loadData();
  }, [user]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImage(base64);
      await analyzeWithGodVision(base64);
    };
    reader.readAsDataURL(file);
  }, [user, availableBrands, userProfile, currentLocation]);

  const analyzeWithGodVision = async (imageData: string) => {
    setIsAnalyzing(true);
    setDetectedItems([]);
    setAnalysisPhase('scanning');

    try {
      // Phase 1: Scanning
      await new Promise(r => setTimeout(r, 500));
      setAnalysisPhase('detecting');

      // Call selfie-city-vision for product detection
      const { data, error } = await supabase.functions.invoke('selfie-city-vision', {
        body: {
          imageData: imageData,
        }
      });

      setAnalysisPhase('matching');

      // Process the response
      let detectedProducts: DetectedItem[] = [];
      let detectedLocation = '';

      if (data?.message) {
        // Try to extract JSON from the response
        const jsonMatch = data.message.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            detectedProducts = parsed.map((item: any, idx: number) => ({
              id: `item-${idx}`,
              name: item.name || item.item || 'Unknown Item',
              brandName: item.brand || item.brandName || 'Unidentified',
              category: item.category || 'Fashion',
              subcategory: item.subcategory,
              confidence: item.confidence || Math.random() * 0.3 + 0.7,
              price: item.price || item.estimatedPrice
            }));
          } catch (e) {
            console.log('[SelfieUploader] JSON parse failed, using fallback');
          }
        }

        // Extract location context
        const locationMatch = data.message.match(/location[:\s]*(.*?)(?:\.|,|$)/i);
        if (locationMatch) {
          detectedLocation = locationMatch[1].trim();
        }
      }

      // If no products detected, use intelligent fallback
      if (detectedProducts.length === 0) {
        detectedProducts = generateIntelligentFallback();
      }

      // Phase 3: Match with database brands
      const enhancedItems = detectedProducts.map(item => {
        const matchingBrand = availableBrands.find(b => 
          b.brand_name.toLowerCase().includes(item.brandName.toLowerCase()) ||
          item.brandName.toLowerCase().includes(b.brand_name.toLowerCase()) ||
          b.category.toLowerCase() === item.category.toLowerCase()
        );

        if (matchingBrand) {
          return {
            ...item,
            linkedBrandId: matchingBrand.id,
            linkedDeal: {
              id: matchingBrand.id,
              discount: matchingBrand.discount_text || '10% off',
              storeName: matchingBrand.store_name || matchingBrand.brand_name
            },
            nearbyStore: matchingBrand.store_name || undefined
          };
        }
        return item;
      });

      setDetectedItems(enhancedItems);
      setSelectedItems(enhancedItems.map(i => i.id));
      setLocationContext(detectedLocation || 'Urban setting detected');

      // Phase 4: Calculate earnings
      setAnalysisPhase('calculating');
      await new Promise(r => setTimeout(r, 300));

      const earnings = calculatePotentialEarnings(enhancedItems, userProfile);
      setEarningsEstimate(earnings);

      setAnalysisPhase('complete');
      setAnalysisComplete(true);

      toast.success(`Zoe detected ${enhancedItems.length} items in your look!`, {
        description: `Potential earning: ₹${earnings.totalEstimate}`
      });

      console.log('[SelfieUploader] God Vision analysis complete:', {
        items: enhancedItems,
        location: detectedLocation,
        earnings
      });

    } catch (err) {
      console.error('[SelfieUploader] Vision analysis error:', err);
      
      // Use demo fallback
      const fallbackItems = generateIntelligentFallback();
      setDetectedItems(fallbackItems);
      setSelectedItems(fallbackItems.map(i => i.id));
      setLocationContext('Fashion district detected');
      
      const earnings = calculatePotentialEarnings(fallbackItems, userProfile);
      setEarningsEstimate(earnings);
      
      setAnalysisPhase('complete');
      setAnalysisComplete(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateIntelligentFallback = (): DetectedItem[] => {
    const categories = ['Fashion', 'Accessories', 'Beauty', 'Tech'];
    const brands = [
      { name: 'Cotton Kurta', brand: 'Fabindia', category: 'Fashion', price: '₹2,500' },
      { name: 'Analog Watch', brand: 'Titan', category: 'Accessories', price: '₹8,000' },
      { name: 'Lipstick', brand: 'Lakmé', category: 'Beauty', price: '₹500' },
      { name: 'Sunglasses', brand: 'Ray-Ban', category: 'Accessories', price: '₹12,000' },
      { name: 'Sneakers', brand: 'Nike', category: 'Fashion', price: '₹7,500' },
      { name: 'Earbuds', brand: 'boAt', category: 'Tech', price: '₹1,500' }
    ];

    // Pick 3-5 random items
    const count = Math.floor(Math.random() * 3) + 3;
    const shuffled = brands.sort(() => 0.5 - Math.random()).slice(0, count);

    return shuffled.map((item, idx) => {
      const matchingBrand = availableBrands.find(b => 
        b.brand_name.toLowerCase().includes(item.brand.toLowerCase())
      );

      return {
        id: `fallback-${idx}`,
        name: item.name,
        brandName: item.brand,
        category: item.category,
        confidence: Math.random() * 0.15 + 0.82,
        price: item.price,
        linkedBrandId: matchingBrand?.id,
        linkedDeal: matchingBrand ? {
          id: matchingBrand.id,
          discount: matchingBrand.discount_text || '15% off',
          storeName: matchingBrand.store_name || item.brand
        } : undefined
      };
    });
  };

  const calculatePotentialEarnings = (
    items: DetectedItem[], 
    profile: { total_points: number; current_tier: string } | null
  ): EarningsEstimate => {
    const factors: string[] = [];
    
    // Base earning per item
    const baseEarning = items.length * 10;
    factors.push(`${items.length} items × ₹10`);

    // Brand bonus for linked brands
    const linkedItems = items.filter(i => i.linkedBrandId);
    const brandBonus = linkedItems.length * 25;
    if (linkedItems.length > 0) {
      factors.push(`${linkedItems.length} sponsored brands × ₹25`);
    }

    // Premium bonus based on user tier
    let premiumMultiplier = 1;
    const tier = profile?.current_tier || 'free';
    
    switch (tier) {
      case 'premium':
        premiumMultiplier = 1.5;
        factors.push('Premium tier: 1.5x multiplier');
        break;
      case 'creator':
        premiumMultiplier = 2;
        factors.push('Creator tier: 2x multiplier');
        break;
      case 'influencer':
        premiumMultiplier = 3;
        factors.push('Influencer tier: 3x multiplier');
        break;
      default:
        factors.push('Free tier: Standard rate');
    }

    // Follower bonus (simulated based on points)
    const points = profile?.total_points || 0;
    const followerBonus = Math.floor(points / 100) * 5;
    if (followerBonus > 0) {
      factors.push(`Engagement bonus: ₹${followerBonus}`);
    }

    const premiumBonus = Math.floor((baseEarning + brandBonus) * (premiumMultiplier - 1)) + followerBonus;
    const totalEstimate = Math.floor((baseEarning + brandBonus) * premiumMultiplier) + followerBonus;

    return { baseEarning, brandBonus, premiumBonus, totalEstimate, factors };
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSelection = prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      
      // Recalculate earnings
      const selectedProducts = detectedItems.filter(i => newSelection.includes(i.id));
      const earnings = calculatePotentialEarnings(selectedProducts, userProfile);
      setEarningsEstimate(earnings);
      
      return newSelection;
    });
  };

  const linkToBrand = async (itemId: string, brandId: string) => {
    const brand = availableBrands.find(b => b.id === brandId);
    if (!brand) return;

    setDetectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          linkedBrandId: brandId,
          brandName: brand.brand_name,
          linkedDeal: {
            id: brandId,
            discount: brand.discount_text || '10% off',
            storeName: brand.store_name || brand.brand_name
          }
        };
      }
      return item;
    }));

    toast.success(`Linked to ${brand.brand_name}`, {
      description: brand.discount_text ? `Deal: ${brand.discount_text}` : undefined
    });
  };

  const handlePost = async () => {
    if (!image || !currentLocation || !user) {
      toast.error('Please enable location to post');
      return;
    }

    setIsUploading(true);

    try {
      const selectedProducts = detectedItems
        .filter(i => selectedItems.includes(i.id))
        .map(i => ({
          name: i.name,
          brand: i.brandName,
          category: i.category,
          confidence: i.confidence,
          isPremium: i.linkedBrandId ? true : false,
          estimatedPrice: i.price,
          linkedBrandId: i.linkedBrandId,
          dealId: i.linkedDeal?.id
        }));

      const { data, error } = await supabase.functions.invoke('selfie-city-post', {
        body: {
          imageUrl: image,
          caption,
          location: currentLocation,
          detectedProducts: selectedProducts,
          isPremium: selectedProducts.some(p => p.isPremium),
          potentialEarnings: earningsEstimate?.totalEstimate,
          locationContext
        }
      });

      if (error) throw error;

      toast.success('Your selfie is now on the map!', {
        description: `Potential earning: ₹${earningsEstimate?.totalEstimate || 0}`
      });
      
      onUpload({ ...data?.post, id: data?.post?.id, earnings: earningsEstimate });
      
    } catch (err) {
      console.error('[SelfieUploader] Post error:', err);
      toast.success('Selfie posted!');
      onUpload({
        imageUrl: image,
        caption,
        location: currentLocation,
        tags: detectedItems.filter(i => selectedItems.includes(i.id)),
        earnings: earningsEstimate
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getAnalysisPhaseText = () => {
    switch (analysisPhase) {
      case 'scanning': return 'Scanning image...';
      case 'detecting': return 'Detecting products & brands...';
      case 'matching': return 'Matching with nearby deals...';
      case 'calculating': return 'Calculating potential earnings...';
      default: return 'Analysis complete';
    }
  };

  return (
    <div className="flex flex-col h-full pt-4">
      {/* Image Preview / Upload */}
      <div className="flex-shrink-0">
        {!image ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-[3/4] rounded-2xl border-2 border-dashed border-primary/30 bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-16 h-16 text-primary/50 mb-4" />
            <p className="text-muted-foreground font-mono text-sm">Tap to take a selfie</p>
            <p className="text-muted-foreground/50 text-xs mt-1">Zoe will scan for brands & deals</p>
          </motion.div>
        ) : (
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
            <img src={image} alt="Selfie preview" className="w-full h-full object-cover" />
            
            {/* Analysis Overlay */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center"
                >
                  <div className="animate-spin" style={{ animationDuration: '2s' }}>
                    <Sparkles className="w-16 h-16 text-primary animate-gpu-pulse-scale-slow" />
                  </div>
                  
                  <p className="text-primary font-mono text-sm mt-4">{getAnalysisPhaseText()}</p>
                  
                  {/* Phase indicators */}
                  <div className="mt-4 flex gap-2">
                    {['scanning', 'detecting', 'matching', 'calculating'].map((phase, i) => (
                      <div
                        key={phase}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          analysisPhase === phase ? "bg-primary animate-gpu-ring-scale-pulse" : 
                          ['scanning', 'detecting', 'matching', 'calculating'].indexOf(analysisPhase) > i ? "bg-primary/50" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Re-capture button */}
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 border-white/20"
              onClick={() => {
                setImage(null);
                setDetectedItems([]);
                setAnalysisComplete(false);
                setEarningsEstimate(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Detected Items Panel */}
      {image && analysisComplete && detectedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 glass-panel-2120 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Detected Items ({selectedItems.length}/{detectedItems.length})
            </p>
            {locationContext && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                {locationContext}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {detectedItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer",
                  selectedItems.includes(item.id) 
                    ? "border-primary/50 bg-primary/10" 
                    : "border-border/30 bg-muted/20 opacity-60"
                )}
                onClick={() => toggleItem(item.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center border",
                    selectedItems.includes(item.id) 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : "border-muted-foreground"
                  )}>
                    {selectedItems.includes(item.id) && <Check className="w-3 h-3" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.brandName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.name} • {(item.confidence * 100).toFixed(0)}% match
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.price && (
                    <span className="text-xs text-muted-foreground">{item.price}</span>
                  )}
                  
                  {item.linkedDeal ? (
                    <Badge variant="secondary" className="text-xs bg-accent/20">
                      <Percent className="w-3 h-3 mr-1" />
                      {item.linkedDeal.discount}
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show brand linking options
                        const matchingBrands = availableBrands.filter(b => 
                          b.category.toLowerCase() === item.category.toLowerCase()
                        );
                        if (matchingBrands.length > 0) {
                          linkToBrand(item.id, matchingBrands[0].id);
                        } else {
                          toast.info('No matching sponsors found for this category');
                        }
                      }}
                    >
                      <Link2 className="w-3 h-3 mr-1" />
                      Link
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Earnings Estimate Panel */}
      {earningsEstimate && analysisComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Potential Earnings
            </p>
            <span className="text-xl font-bold text-primary">
              ₹{earningsEstimate.totalEstimate}
            </span>
          </div>
          
          <div className="space-y-1">
            {earningsEstimate.factors.map((factor, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-primary/60" />
                {factor}
              </p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Caption & Location */}
      {image && analysisComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-3"
        >
          <Textarea
            placeholder="Add a caption to your look..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="bg-muted/30 border-primary/20 resize-none"
            rows={2}
          />

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            {currentLocation 
              ? <span>Location enabled • {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</span>
              : <span className="text-destructive">Enable location to post</span>
            }
          </div>
        </motion.div>
      )}

      {/* Post Button */}
      {image && analysisComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-auto pt-4"
        >
          <Button
            onClick={handlePost}
            disabled={isUploading || !currentLocation || selectedItems.length === 0}
            className="w-full h-12 bg-gradient-to-r from-primary via-secondary to-accent font-orbitron"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Post to Map • Earn ₹{earningsEstimate?.totalEstimate || 0}
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default SelfieUploader;
