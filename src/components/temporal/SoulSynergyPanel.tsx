// ═══════════════════════════════════════════════════════════════════════════════
// SOUL SYNERGY PANEL - Enhanced with Interest-Based Matching
// Zero-Swipe • Destiny-Based Connection • Interest + Soul Resonance Matching
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  Sparkles, 
  MapPin, 
  Shield, 
  Eye, 
  EyeOff,
  RefreshCw,
  Star,
  Zap,
  AlertTriangle,
  Users,
  ChevronRight,
  Briefcase,
  Hash,
  Clock,
  Target,
  Lightbulb
} from 'lucide-react';
import { useAnimaSynergy } from '@/hooks/useAnimaSynergy';
import { useAnimaInterestMatch, type InterestMatch } from '@/hooks/useAnimaInterestMatch';
import { Skeleton } from '@/components/ui/skeleton';
import type { SoulConnection } from '@/core/quantum/AnimaEngine';
import { useNavigate } from 'react-router-dom';

const SoulSynergyPanel: React.FC = () => {
  const navigate = useNavigate();
  const {
    myVector,
    topConnections,
    destinyNotifications,
    isSearching,
    isLoading: soulLoading,
    error: soulError,
    enableSearch,
    disableSearch,
    refreshConnections,
    dismissNotification
  } = useAnimaSynergy();

  const {
    myProfile,
    topInterestMatches,
    isLoading: interestLoading,
    isRefreshing,
    error: interestError,
    refreshMatches,
    lastUpdated
  } = useAnimaInterestMatch();

  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'soul' | 'interests'>('interests');

  const isLoading = soulLoading || interestLoading;
  const error = soulError || interestError;

  // Memoize sorted interest matches
  const sortedInterestMatches = useMemo(() => {
    return [...topInterestMatches].sort((a, b) => b.synergy.overall - a.synergy.overall);
  }, [topInterestMatches]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-card/50 backdrop-blur-xl">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Soul Synergy Offline</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getConnectionColor = (type: SoulConnection['connectionType']) => {
    switch (type) {
      case 'soulmate': return 'text-pink-500 bg-pink-500/10 border-pink-500/30';
      case 'karmic_partner': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
      case 'mirror_soul': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'growth_catalyst': return 'text-green-500 bg-green-500/10 border-green-500/30';
      default: return 'text-muted-foreground bg-muted/10 border-border/30';
    }
  };

  const getConnectionIcon = (type: SoulConnection['connectionType']) => {
    switch (type) {
      case 'soulmate': return <Heart className="w-4 h-4" />;
      case 'karmic_partner': return <Zap className="w-4 h-4" />;
      case 'mirror_soul': return <Eye className="w-4 h-4" />;
      case 'growth_catalyst': return <Star className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getInterestMatchColor = (score: number) => {
    if (score >= 80) return 'border-pink-500/50 bg-pink-500/10';
    if (score >= 60) return 'border-purple-500/50 bg-purple-500/10';
    if (score >= 40) return 'border-blue-500/50 bg-blue-500/10';
    return 'border-border/50 bg-muted/10';
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Soul Synergy
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isSearching ? 'Searching' : 'Paused'}
              </span>
              <Switch 
                checked={isSearching}
                onCheckedChange={(checked) => checked ? enableSearch() : disableSearch()}
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => activeTab === 'soul' ? refreshConnections() : refreshMatches()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'soul' | 'interests')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="interests" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Interests</span>
            </TabsTrigger>
            <TabsTrigger value="soul" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Soul</span>
            </TabsTrigger>
          </TabsList>

          {/* Interest-Based Matching Tab */}
          <TabsContent value="interests" className="space-y-4 mt-4">
            {/* My Profile Summary */}
            {myProfile && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Your Interest Profile
                  </span>
                  {lastUpdated && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {myProfile.hobbies.slice(0, 5).map((hobby, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {hobby}
                    </Badge>
                  ))}
                  {myProfile.hobbies.length > 5 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{myProfile.hobbies.length - 5} more
                    </Badge>
                  )}
                </div>
                {myProfile.profession && (
                  <div className="flex items-center gap-1 mt-2">
                    <Briefcase className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{myProfile.profession}</span>
                  </div>
                )}
              </div>
            )}

            {/* Interest Matches */}
            {sortedInterestMatches.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Interest-Based Matches ({sortedInterestMatches.length})
                </h4>
                {sortedInterestMatches.map((match) => (
                  <motion.div
                    key={match.userId}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${getInterestMatchColor(match.synergy.overall)}`}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setShowDetails(
                      showDetails === match.userId ? null : match.userId
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/30">
                          <AvatarImage src={match.profilePhotoUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {match.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-sm font-medium">{match.displayName}</span>
                          <div className="flex items-center gap-1">
                            {match.isOnline && (
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                            )}
                            <span className="text-[10px] text-muted-foreground">@{match.username}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-lg font-bold text-primary">
                            {match.synergy.overall}%
                          </span>
                          <div className="text-[10px] text-muted-foreground">Match</div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${
                          showDetails === match.userId ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </div>

                    {/* Shared Interests Preview */}
                    {match.synergy.sharedInterestsList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {match.synergy.sharedInterestsList.slice(0, 4).map((interest, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] bg-primary/10">
                            {interest}
                          </Badge>
                        ))}
                        {match.synergy.sharedInterestsList.length > 4 && (
                          <Badge variant="outline" className="text-[9px]">
                            +{match.synergy.sharedInterestsList.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {showDetails === match.userId && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 pt-3 border-t border-border/30 space-y-3"
                        >
                          {/* Synergy Breakdown */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3 text-pink-500" />
                                Shared Interests
                              </span>
                              <span>{match.synergy.sharedInterests}%</span>
                            </div>
                            <Progress value={match.synergy.sharedInterests} className="h-1" />
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3 text-purple-500" />
                                Category Alignment
                              </span>
                              <span>{match.synergy.categoryAlignment}%</span>
                            </div>
                            <Progress value={match.synergy.categoryAlignment} className="h-1" />
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3 text-blue-500" />
                                Profession Synergy
                              </span>
                              <span>{match.synergy.professionSynergy}%</span>
                            </div>
                            <Progress value={match.synergy.professionSynergy} className="h-1" />
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-green-500" />
                                Location Proximity
                              </span>
                              <span>{match.synergy.locationProximity}%</span>
                            </div>
                            <Progress value={match.synergy.locationProximity} className="h-1" />
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-yellow-500" />
                                Zoe DHF Compatibility
                              </span>
                              <span>{match.synergy.zoeDHFCompatibility}%</span>
                            </div>
                            <Progress value={match.synergy.zoeDHFCompatibility} className="h-1" />
                          </div>

                          {/* Match Insights */}
                          {match.synergy.matchInsights.length > 0 && (
                            <div className="p-2 rounded bg-primary/10 border border-primary/30">
                              <p className="text-[10px] font-medium mb-1">💡 Insights:</p>
                              <ul className="text-[10px] text-muted-foreground space-y-1">
                                {match.synergy.matchInsights.map((insight, i) => (
                                  <li key={i}>• {insight}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${match.userId}`);
                              }}
                            >
                              View Profile
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 text-xs bg-gradient-to-r from-primary to-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/chat', { state: { selectedUserId: match.userId } });
                              }}
                            >
                              Connect
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-gpu-pulse-scale-slow">
                  <Target className="w-12 h-12 text-primary/50 mx-auto" />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Finding people with similar interests...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete your profile to improve matches
                </p>
              </div>
            )}
          </TabsContent>

          {/* Soul-Based Matching Tab */}
          <TabsContent value="soul" className="space-y-4 mt-4">
            {/* My Vector Summary */}
            {myVector && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Your Soul Vector</span>
                  <Badge variant="outline" className="text-[10px]">
                    {myVector.currentLifePhase.split('(')[0].trim()}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">{myVector.driverNumber}</div>
                    <div className="text-[10px] text-muted-foreground">Driver</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-primary">{myVector.conductorNumber}</div>
                    <div className="text-[10px] text-muted-foreground">Conductor</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-primary">{myVector.personalYear}</div>
                    <div className="text-[10px] text-muted-foreground">Year</div>
                  </div>
                </div>
              </div>
            )}

            {/* Destiny Notifications */}
            <AnimatePresence>
              {destinyNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Alert className="border-pink-500/30 bg-pink-500/10">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                    <AlertTitle className="text-pink-500">Destiny Notification</AlertTitle>
                    <AlertDescription className="text-sm">
                      {notification.message}
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-pink-500 border-pink-500/30">
                          {notification.resonanceScore}% Resonance
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => dismissNotification(notification.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Privacy Notice */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-[10px] text-muted-foreground">
                Zero-Knowledge Privacy: Identities hidden until mutual consent
              </span>
            </div>

            {/* Soul Connections List */}
            {isSearching ? (
              topConnections.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Top Soul Resonances
                  </h4>
                  {topConnections.map((connection) => (
                    <motion.div
                      key={connection.connectionId}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${getConnectionColor(connection.connectionType)}`}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setShowDetails(
                        showDetails === connection.connectionId ? null : connection.connectionId
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getConnectionIcon(connection.connectionType)}
                          <span className="text-sm font-medium capitalize">
                            {connection.connectionType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            {connection.resonanceScore}%
                          </span>
                          <ChevronRight className={`w-4 h-4 transition-transform ${
                            showDetails === connection.connectionId ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </div>

                      {/* Privacy indicator */}
                      <div className="flex items-center gap-1 mt-2">
                        <EyeOff className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          Anonymous until both accept
                        </span>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {showDetails === connection.connectionId && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 pt-3 border-t border-border/30 space-y-3"
                          >
                            {/* Synergy Breakdown */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span>Numerological</span>
                                <span>{connection.synergyBreakdown.numerological}%</span>
                              </div>
                              <Progress value={connection.synergyBreakdown.numerological} className="h-1" />
                              
                              <div className="flex items-center justify-between text-xs">
                                <span>Behavioral</span>
                                <span>{connection.synergyBreakdown.behavioral}%</span>
                              </div>
                              <Progress value={connection.synergyBreakdown.behavioral} className="h-1" />
                              
                              <div className="flex items-center justify-between text-xs">
                                <span>Temporal</span>
                                <span>{connection.synergyBreakdown.temporal}%</span>
                              </div>
                              <Progress value={connection.synergyBreakdown.temporal} className="h-1" />
                              
                              <div className="flex items-center justify-between text-xs">
                                <span>Karmic</span>
                                <span>{connection.synergyBreakdown.karmic}%</span>
                              </div>
                              <Progress value={connection.synergyBreakdown.karmic} className="h-1" />
                            </div>

                            {/* Match Reasons */}
                            {connection.matchReasons.length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-1">Why You Match:</p>
                                <ul className="text-[10px] text-muted-foreground space-y-1">
                                  {connection.matchReasons.slice(0, 3).map((reason, i) => (
                                    <li key={i}>• {reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Warnings */}
                            {connection.warnings.length > 0 && (
                              <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                                <p className="text-[10px] text-yellow-500">
                                  ⚠️ {connection.warnings[0]}
                                </p>
                              </div>
                            )}

                            {/* Destiny Message */}
                            <div className="p-2 rounded bg-primary/10 border border-primary/30">
                              <p className="text-[10px] italic">
                                "{connection.destinyMessage}"
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-gpu-pulse-scale-slow">
                    <Sparkles className="w-12 h-12 text-primary/50 mx-auto animate-gpu-icon-wiggle" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Scanning the cosmos for compatible souls...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    High-resonance connections will appear here
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground mt-4">
                  Soul Synergy is paused
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Enable search to find destiny connections
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SoulSynergyPanel;
