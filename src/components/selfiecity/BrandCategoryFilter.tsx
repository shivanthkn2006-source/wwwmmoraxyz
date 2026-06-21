import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Crown, ShoppingBag, Coffee, Store, Sparkles, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface BrandCategory {
  name: string;
  icon: any;
  subcategories: string[];
}

interface BrandCategoryFilterProps {
  categories: Record<string, BrandCategory>;
  onApply: () => void;
}

// Sample Indian brands for each category
const INDIAN_BRANDS: Record<string, string[]> = {
  'Grocery': ['BigBasket', 'Blinkit', 'JioMart', 'DMart', 'Reliance Fresh', 'More', 'Spencer\'s', 'Nature\'s Basket', 'Grofers', 'Amazon Fresh'],
  'Pharmacy': ['Apollo', 'MedPlus', 'Netmeds', 'PharmEasy', '1mg', 'Medlife', 'Wellness Forever', 'Guardian', 'Frank Ross', 'Noble Plus'],
  'Personal Care': ['Lakme', 'Biotique', 'Himalaya', 'Mamaearth', 'WOW', 'Plum', 'mCaffeine', 'Sugar', 'Colorbar', 'Faces Canada'],
  'Restaurants': ['Swiggy', 'Zomato', 'Domino\'s', 'McDonald\'s', 'KFC', 'Burger King', 'Subway', 'Pizza Hut', 'Haldiram\'s', 'Barbeque Nation'],
  'Cafes': ['Starbucks', 'Café Coffee Day', 'Blue Tokai', 'Third Wave', 'Chaayos', 'Tea Trails', 'Barista', 'Costa Coffee', 'Dunkin\'', 'Tim Hortons'],
  'Clothing': ['FabIndia', 'W', 'Biba', 'Global Desi', 'AND', 'Allen Solly', 'Van Heusen', 'Peter England', 'Louis Philippe', 'Manyavar'],
  'Footwear': ['Bata', 'Liberty', 'Relaxo', 'Metro', 'Khadim\'s', 'Woodland', 'Red Tape', 'Campus', 'Sparx', 'Lancer'],
  'Electronics': ['Croma', 'Reliance Digital', 'Vijay Sales', 'Poorvika', 'Sangeetha', 'UniverCell', 'The Mobile Store', 'Samsung', 'OnePlus', 'Xiaomi'],
  'Salons': ['Lakme Salon', 'VLCC', 'Naturals', 'Jawed Habib', 'Enrich', 'Looks', 'Jean Claude Biguine', 'Bodycraft', 'BBlunt', 'Strands'],
  'Gyms': ['Cult.fit', 'Gold\'s Gym', 'Anytime Fitness', 'Fitness First', 'Talwalkars', 'Snap Fitness', 'The Gym', 'Intensity', 'Reebok CrossFit', 'F45'],
  'Designer Fashion': ['Sabyasachi', 'Manish Malhotra', 'Anita Dongre', 'Tarun Tahiliani', 'Rohit Bal', 'Ritu Kumar', 'Masaba', 'Abu Jani Sandeep Khosla', 'Gaurav Gupta', 'Shantanu & Nikhil'],
  'Luxury Cars': ['Mercedes-Benz', 'BMW', 'Audi', 'Jaguar', 'Land Rover', 'Porsche', 'Lexus', 'Volvo', 'Bentley', 'Rolls-Royce'],
  'Premium Watches': ['Titan', 'Fastrack', 'Sonata', 'Rolex', 'Omega', 'Tag Heuer', 'Longines', 'Tissot', 'Rado', 'Fossil'],
  'Fine Jewelry': ['Tanishq', 'Kalyan Jewellers', 'Malabar Gold', 'PC Jeweller', 'Senco Gold', 'Joyalukkas', 'Tribhovandas Bhimji Zaveri', 'PNG Jewellers', 'CaratLane', 'BlueStone']
};

const BrandCategoryFilter: React.FC<BrandCategoryFilterProps> = ({ categories, onApply }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showOnlyDiscounts, setShowOnlyDiscounts] = useState(false);
  const [showOnlyPremium, setShowOnlyPremium] = useState(false);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand)
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setShowOnlyDiscounts(false);
    setShowOnlyPremium(false);
    setSearchQuery('');
  };

  const getFilteredBrands = (subcategory: string) => {
    const brands = INDIAN_BRANDS[subcategory] || [];
    if (!searchQuery) return brands;
    return brands.filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const categoryIcons: Record<string, typeof ShoppingBag> = {
    essentials: ShoppingBag,
    food: Coffee,
    fashion: Sparkles,
    services: Store,
    premium: Crown
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mt-3">
          <Badge
            variant={showOnlyDiscounts ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setShowOnlyDiscounts(!showOnlyDiscounts)}
          >
            🏷️ Discounts Only
          </Badge>
          <Badge
            variant={showOnlyPremium ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setShowOnlyPremium(!showOnlyPremium)}
          >
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        </div>

        {/* Selected Count */}
        {(selectedCategories.length > 0 || selectedBrands.length > 0) && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {selectedCategories.length} categories, {selectedBrands.length} brands selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Categories List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {Object.entries(categories).map(([key, category]) => {
            const Icon = categoryIcons[key] || Store;
            const isExpanded = expandedCategory === key;
            
            return (
              <Collapsible
                key={key}
                open={isExpanded}
                onOpenChange={() => setExpandedCategory(isExpanded ? null : key)}
              >
                <CollapsibleTrigger className="w-full">
                  <motion.div
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isExpanded ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      key === 'premium' 
                        ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20' 
                        : 'bg-primary/20'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        key === 'premium' ? 'text-amber-400' : 'text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.subcategories.length} subcategories
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`} />
                  </motion.div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-4 pt-2 space-y-2"
                      >
                        {category.subcategories.map((sub) => {
                          const brands = getFilteredBrands(sub);
                          
                          return (
                            <div key={sub} className="space-y-1">
                              <div 
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 cursor-pointer"
                                onClick={() => toggleCategory(sub)}
                              >
                                <Checkbox 
                                  checked={selectedCategories.includes(sub)}
                                  className="border-primary data-[state=checked]:bg-primary"
                                />
                                <span className="text-sm text-foreground">{sub}</span>
                                <Badge variant="outline" className="ml-auto text-[10px]">
                                  {brands.length} brands
                                </Badge>
                              </div>

                              {/* Brand Pills */}
                              {selectedCategories.includes(sub) && brands.length > 0 && (
                                <div className="flex flex-wrap gap-1 pl-6 pb-2">
                                  {brands.slice(0, 10).map((brand) => (
                                    <Badge
                                      key={brand}
                                      variant={selectedBrands.includes(brand) ? 'default' : 'outline'}
                                      className={`cursor-pointer text-[10px] ${
                                        selectedBrands.includes(brand)
                                          ? 'bg-primary text-primary-foreground'
                                          : 'border-primary/30 text-primary hover:bg-primary/10'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleBrand(brand);
                                      }}
                                    >
                                      {selectedBrands.includes(brand) && (
                                        <Check className="w-2 h-2 mr-1" />
                                      )}
                                      {brand}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Apply Button */}
      <div className="p-4 border-t border-border/50">
        <Button 
          onClick={onApply}
          className="w-full bg-gradient-to-r from-primary to-secondary font-orbitron"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default BrandCategoryFilter;
