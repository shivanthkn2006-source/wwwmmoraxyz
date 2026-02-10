import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, MapPin, ExternalLink, ShoppingCart, Heart, TrendingUp, Store, ChevronRight, Navigation, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface SmartTag {
  id: string;
  brandName: string;
  brandLogo?: string;
  category: string;
  productName?: string;
  confidence: number;
  price?: {
    min: number;
    max: number;
    currency: string;
  };
  nearbyStores?: {
    name: string;
    distance: string;
    hasStock: boolean;
    discount?: string;
  }[];
  onlinePrice?: {
    platform: string;
    price: number;
    link: string;
  };
}

interface SmartTagsPanelProps {
  tags: SmartTag[];
  onNavigate: (store: any) => void;
  onBuyOnline: (tag: SmartTag) => void;
}

const SmartTagsPanel: React.FC<SmartTagsPanelProps> = ({ tags, onNavigate, onBuyOnline }) => {
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [savedTags, setSavedTags] = useState<Set<string>>(new Set());
  const [trackedTags, setTrackedTags] = useState<Set<string>>(new Set());

  const handleSave = useCallback((tagId: string, brandName: string) => {
    setSavedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
        toast.success(`Removed ${brandName} from saved`);
      } else {
        next.add(tagId);
        toast.success(`Saved ${brandName}!`, { description: 'Added to your wishlist' });
      }
      return next;
    });
  }, []);

  const handleTrackPrice = useCallback((tagId: string, brandName: string) => {
    setTrackedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
        toast.success(`Stopped tracking ${brandName}`);
      } else {
        next.add(tagId);
        toast.success(`Tracking ${brandName}!`, { description: 'You\'ll be notified of price drops' });
      }
      return next;
    });
  }, []);

  const handleComparePrice = useCallback((tag: SmartTag) => {
    toast.success(`Comparing prices for ${tag.brandName}`, {
      description: `Found ${(tag.nearbyStores?.length || 0) + (tag.onlinePrice ? 1 : 0)} options`
    });
  }, []);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        {tags.map((tag, index) => (
          <motion.div
            key={tag.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel-2120 rounded-xl overflow-hidden"
          >
            {/* Tag Header */}
            <div 
              className="p-3 flex items-center gap-3 cursor-pointer"
              onClick={() => setExpandedTag(expandedTag === tag.id ? null : tag.id)}
            >
              {/* Brand Logo */}
              <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
                {tag.brandLogo ? (
                  <img src={tag.brandLogo} alt={tag.brandName} className="w-8 h-8 object-contain" />
                ) : (
                  <Tag className="w-6 h-6 text-primary" />
                )}
              </div>

              {/* Tag Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{tag.brandName}</span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    {Math.round(tag.confidence * 100)}% match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{tag.category}</p>
                {tag.productName && (
                  <p className="text-xs text-primary/80 truncate">{tag.productName}</p>
                )}
              </div>

              {/* Price Range */}
              {tag.price && (
                <div className="text-right">
                  <p className="text-sm font-mono text-primary">
                    {tag.price.currency}{tag.price.min.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    - {tag.price.currency}{tag.price.max.toLocaleString()}
                  </p>
                </div>
              )}

              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${
                expandedTag === tag.id ? 'rotate-90' : ''
              }`} />
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {expandedTag === tag.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border/50"
                >
                  {/* Nearby Stores */}
                  {tag.nearbyStores && tag.nearbyStores.length > 0 && (
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        Available Nearby
                      </p>
                      {tag.nearbyStores.map((store, i) => (
                        <div 
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => onNavigate(store)}
                        >
                          <MapPin className="w-4 h-4 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{store.name}</p>
                            <p className="text-xs text-muted-foreground">{store.distance}</p>
                          </div>
                          {store.discount && (
                            <Badge className="bg-destructive/20 text-destructive text-[10px]">
                              {store.discount}
                            </Badge>
                          )}
                          {store.hasStock ? (
                            <Badge className="bg-green-500/20 text-green-400 text-[10px]">In Stock</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Check</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Online Option */}
                  {tag.onlinePrice && (
                    <div className="p-3 border-t border-border/50">
                      <div 
                        className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 cursor-pointer transition-colors"
                        onClick={() => onBuyOnline(tag)}
                      >
                        <ShoppingCart className="w-4 h-4 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            Buy on {tag.onlinePrice.platform}
                          </p>
                          <p className="text-xs text-primary font-mono">
                            ₹{tag.onlinePrice.price.toLocaleString()}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-3 flex gap-2 border-t border-border/50">
                    <Button 
                      variant={savedTags.has(tag.id) ? 'default' : 'outline'} 
                      size="sm" 
                      className={`flex-1 ${savedTags.has(tag.id) ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => handleSave(tag.id, tag.brandName)}
                    >
                      <Heart className={`w-3 h-3 mr-1 ${savedTags.has(tag.id) ? 'fill-current' : ''}`} />
                      {savedTags.has(tag.id) ? 'Saved' : 'Save'}
                    </Button>
                    <Button 
                      variant={trackedTags.has(tag.id) ? 'default' : 'outline'} 
                      size="sm" 
                      className={`flex-1 ${trackedTags.has(tag.id) ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => handleTrackPrice(tag.id, tag.brandName)}
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {trackedTags.has(tag.id) ? 'Tracking' : 'Track'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleComparePrice(tag)}
                    >
                      <BarChart2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {tags.length === 0 && (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No products detected yet</p>
            <p className="text-muted-foreground/50 text-xs mt-1">
              Upload a selfie to see smart tags
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default SmartTagsPanel;
