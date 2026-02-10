import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Heart, Eye, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SelfieCityPin {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  location_lat: number;
  location_lng: number;
  location_name: string | null;
  detected_products: any;
  is_premium: boolean;
  likes_count: number;
  views_count: number;
  created_at: string;
  // Project Midas fields
  sponsorship_score?: number;
  is_premium_ad_space?: boolean;
  detected_brands?: any[];
}

const SelfieCityFeed: React.FC = () => {
  const [pins, setPins] = useState<SelfieCityPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPins = async () => {
      try {
        const { data, error } = await supabase
          .from('selfie_city_pins')
          .select('*, sponsorship_score, is_premium_ad_space, detected_brands')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        
        // Map and cast the data properly
        const mappedPins: SelfieCityPin[] = (data || []).map((pin: any) => ({
          ...pin,
          detected_brands: Array.isArray(pin.detected_brands) ? pin.detected_brands : [],
        }));
        
        setPins(mappedPins);
      } catch (err) {
        console.error('[SelfieCityFeed] Error loading pins:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPins();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-gpu-spin-2s" />
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No selfies in Selfie City yet</p>
        <p className="text-sm mt-2">Be the first to post!</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-3">
        {pins.map((pin, index) => (
          <motion.div
            key={pin.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative group rounded-xl overflow-hidden bg-card border ${
              pin.is_premium_ad_space 
                ? 'border-amber-500/50 ring-2 ring-amber-500/20' 
                : 'border-border/50'
            }`}
          >
            {/* Image */}
            <div className="aspect-square relative">
              <img
                src={pin.image_url}
                alt={pin.caption || 'Selfie'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Premium Ad Space Badge */}
              {pin.is_premium_ad_space && (
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  <Badge className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white text-[10px] px-1.5 py-0.5 animate-pulse">
                    <DollarSign className="w-3 h-3 mr-0.5" />
                    Premium Ad Space
                  </Badge>
                </div>
              )}

              {/* Sponsorship Score Badge */}
              {pin.sponsorship_score !== undefined && pin.sponsorship_score > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      pin.sponsorship_score >= 80 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        : pin.sponsorship_score >= 50
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                          : 'bg-muted/80 text-foreground'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      {pin.sponsorship_score}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sponsorship Score: {pin.sponsorship_score}/100</p>
                    {pin.detected_brands && pin.detected_brands.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Brands: {pin.detected_brands.map((b: any) => b.name).join(', ')}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Regular Premium Badge (if not ad space) */}
              {pin.is_premium && !pin.is_premium_ad_space && (
                <Badge className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-1.5 py-0.5">
                  <Sparkles className="w-3 h-3 mr-0.5" />
                  Premium
                </Badge>
              )}
              
              {/* Location Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="flex items-center gap-1 text-white/90 text-xs">
                  <MapPin className="w-3 h-3 text-pink-400" />
                  <span className="truncate">{pin.location_name || 'Unknown'}</span>
                </div>
              </div>
            </div>

          {/* Content */}
          <div className="p-2">
            {/* Caption */}
            {pin.caption && (
              <p className="text-xs text-foreground/80 line-clamp-2 mb-2">
                {pin.caption}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5">
                  <Heart className="w-3 h-3" />
                  {pin.likes_count || 0}
                </span>
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />
                  {pin.views_count || 0}
                </span>
              </div>
              
              {/* Detected Brands */}
              {pin.detected_brands && pin.detected_brands.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {pin.detected_brands.slice(0, 2).map((brand: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-[9px] px-1 border-amber-500/50 text-amber-400">
                      {brand.name}
                    </Badge>
                  ))}
                </div>
              ) : pin.detected_products && pin.detected_products.length > 0 ? (
                <Badge variant="secondary" className="text-[9px] px-1">
                  {(pin.detected_products[0] as any)?.category || 'Item'}
                </Badge>
              ) : null}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </TooltipProvider>
);
};

export default SelfieCityFeed;
