import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, ChevronDown, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WORLD_REGIONS } from '@/utils/worldLocations';

interface WorldRegionSelectorProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
}

export const WorldRegionSelector: React.FC<WorldRegionSelectorProps> = ({ 
  selectedLocation, 
  onLocationChange 
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 w-full justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="text-xs">{selectedLocation || 'All Locations'}</span>
          </div>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
        <DropdownMenuItem onClick={() => onLocationChange('')}>
          <MapPin className="w-4 h-4 mr-2" />
          All Locations
        </DropdownMenuItem>
        
        {Object.entries(WORLD_REGIONS).map(([continent, countries]) => (
          <DropdownMenuSub key={continent}>
            <DropdownMenuSubTrigger className="text-sm">
              <Globe className="w-4 h-4 mr-2" />
              {continent}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-96 overflow-y-auto">
              {Object.entries(countries).map(([country, cities]) => (
                <DropdownMenuSub key={country}>
                  <DropdownMenuSubTrigger className="text-xs">
                    {country}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                    <DropdownMenuItem 
                      onClick={() => onLocationChange(country)}
                      className="text-xs font-medium"
                    >
                      <MapPin className="w-3 h-3 mr-2" />
                      All of {country}
                    </DropdownMenuItem>
                    {cities.map(city => (
                      <DropdownMenuItem 
                        key={city}
                        onClick={() => onLocationChange(city)}
                        className="text-xs"
                      >
                        {city}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
