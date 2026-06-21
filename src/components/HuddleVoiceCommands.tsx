import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HuddleVoiceCommands = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    view: true,
    filter: false,
    navigation: false,
    display: false,
    location: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const commandCategories = [
    {
      id: 'view',
      title: 'View Controls',
      icon: '👁️',
      commands: [
        { phrase: '"show map view"', description: 'Switch to map view' },
        { phrase: '"show grid view"', description: 'Switch to grid view' },
        { phrase: '"toggle view"', description: 'Switch between map and grid' },
      ],
    },
    {
      id: 'filter',
      title: 'Filtering',
      icon: '🔍',
      commands: [
        { phrase: '"show online users"', description: 'Filter to show only online users' },
        { phrase: '"show friends only"', description: 'Show only your friends' },
        { phrase: '"filter by [status]"', description: 'Filter by activity (e.g., "filter by cooking")' },
        { phrase: '"show users in [location]"', description: 'Filter by location (e.g., "show users in Tokyo")' },
        { phrase: '"clear all filters"', description: 'Remove all active filters' },
        { phrase: '"set radius [number]"', description: 'Set search radius (e.g., "set radius 200")' },
      ],
    },
    {
      id: 'navigation',
      title: 'Navigation',
      icon: '🧭',
      commands: [
        { phrase: '"zoom in"', description: 'Zoom closer on the map' },
        { phrase: '"zoom out"', description: 'Zoom further out on the map' },
        { phrase: '"go to [location]"', description: 'Navigate to location (e.g., "go to Paris")' },
        { phrase: '"search for [interest]"', description: 'Find users by interest (e.g., "search for photographers")' },
        { phrase: '"find [monument]"', description: 'Locate landmarks (e.g., "find Taj Mahal")' },
      ],
    },
    {
      id: 'display',
      title: 'Display Modes',
      icon: '👥',
      commands: [
        { phrase: '"show all users"', description: 'Display all available users' },
        { phrase: '"show recommendations"', description: 'Show recommended matches' },
        { phrase: '"show [interest category]"', description: 'Filter by category (e.g., "show creative users")' },
      ],
    },
    {
      id: 'location',
      title: 'Location-Specific',
      icon: '🗺️',
      commands: [
        { phrase: '"show users near [city]"', description: 'Find users near location (e.g., "show users near London")' },
        { phrase: '"find landmarks in [region]"', description: 'Discover landmarks (e.g., "find landmarks in Europe")' },
        { phrase: '"show capital cities"', description: 'Display capital cities on map' },
        { phrase: '"find villages"', description: 'Show smaller towns and villages' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-primary/20 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Huddle Voice Commands
          </CardTitle>
          <CardDescription>
            Use these voice commands with Zoe AI in Huddle to find friends, discover people, and navigate locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {commandCategories.map((category) => (
            <Collapsible
              key={category.id}
              open={expandedSections[category.id]}
              onOpenChange={() => toggleSection(category.id)}
            >
              <CollapsibleTrigger className="w-full">
                <motion.div
                  className="flex items-center justify-between w-full p-3 rounded-lg bg-background/60 hover:bg-background/80 border border-border/50 transition-all cursor-pointer"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <span className="font-medium text-foreground text-left">
                      {category.title}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {category.commands.length} commands
                    </span>
                  </div>
                  {expandedSections[category.id] ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </motion.div>
              </CollapsibleTrigger>
              
              <AnimatePresence>
                {expandedSections[category.id] && (
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 space-y-2 pl-6"
                    >
                      {category.commands.map((cmd, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 rounded-md bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col gap-1">
                            <code className="text-sm text-primary font-mono">
                              {cmd.phrase}
                            </code>
                            <p className="text-xs text-muted-foreground">
                              {cmd.description}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </CollapsibleContent>
                )}
              </AnimatePresence>
            </Collapsible>
          ))}

          <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> You can say these commands to Zoe in the Huddle page to quickly navigate, filter, and discover people by interests and locations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HuddleVoiceCommands;
