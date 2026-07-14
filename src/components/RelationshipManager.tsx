import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Check, X, Send, Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

const RELATIONSHIP_TYPES = [
  { value: 'father', label: 'Father', inverse: 'child' },
  { value: 'mother', label: 'Mother', inverse: 'child' },
  { value: 'son', label: 'Son', inverse: 'parent' },
  { value: 'daughter', label: 'Daughter', inverse: 'parent' },
  { value: 'husband', label: 'Husband', inverse: 'wife' },
  { value: 'wife', label: 'Wife', inverse: 'husband' },
  { value: 'brother', label: 'Brother', inverse: 'sibling' },
  { value: 'sister', label: 'Sister', inverse: 'sibling' },
  { value: 'grandfather', label: 'Grandfather', inverse: 'grandchild' },
  { value: 'grandmother', label: 'Grandmother', inverse: 'grandchild' },
  { value: 'grandson', label: 'Grandson', inverse: 'grandparent' },
  { value: 'granddaughter', label: 'Granddaughter', inverse: 'grandparent' },
  { value: 'uncle', label: 'Uncle', inverse: 'nephew_niece' },
  { value: 'aunt', label: 'Aunt', inverse: 'nephew_niece' },
  { value: 'nephew', label: 'Nephew', inverse: 'uncle_aunt' },
  { value: 'niece', label: 'Niece', inverse: 'uncle_aunt' },
  { value: 'cousin', label: 'Cousin', inverse: 'cousin' },
  { value: 'partner', label: 'Partner', inverse: 'partner' },
  { value: 'friend', label: 'Close Friend', inverse: 'friend' },
];

interface Relationship {
  id: string;
  requester_id: string;
  recipient_id: string;
  relationship_type: string;
  status: string;
  requester_label: string;
  recipient_label: string;
  created_at: string;
  confirmed_at: string | null;
  requester_profile?: {
    username: string;
    display_name: string;
    profile_photo_url: string;
  };
  recipient_profile?: {
    username: string;
    display_name: string;
    profile_photo_url: string;
  };
}

interface UserSearchResult {
  user_id: string;
  username: string;
  display_name: string;
  profile_photo_url: string;
}

export const RelationshipManager: React.FC = () => {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedRelationType, setSelectedRelationType] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadRelationships = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all relationships where user is involved
      const { data, error } = await supabase
        .from('user_relationships')
        .select(`
          *,
          requester_profile:profiles!user_relationships_requester_id_fkey(username, display_name, profile_photo_url),
          recipient_profile:profiles!user_relationships_recipient_id_fkey(username, display_name, profile_photo_url)
        `)
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const confirmed = (data || []).filter(r => r.status === 'confirmed');
      const pending = (data || []).filter(r => r.status === 'pending');

      setRelationships(confirmed);
      setPendingRequests(pending);
    } catch (err) {
      console.error('Error loading relationships:', err);
      toast.error('Failed to load relationships');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  // Real-time subscription for relationship updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`relationship-updates:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_relationships',
        filter: `requester_id=eq.${user.id}`
      }, () => loadRelationships())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_relationships',
        filter: `recipient_id=eq.${user.id}`
      }, () => loadRelationships())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadRelationships]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, profile_photo_url')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('user_id', user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, searchUsers]);

  const sendRelationshipRequest = async () => {
    if (!user || !selectedUser || !selectedRelationType) return;

    setIsSending(true);
    try {
      const relType = RELATIONSHIP_TYPES.find(r => r.value === selectedRelationType);
      
      const { error } = await supabase
        .from('user_relationships')
        .insert({
          requester_id: user.id,
          recipient_id: selectedUser.user_id,
          relationship_type: selectedRelationType,
          requester_label: relType?.inverse || selectedRelationType,
          recipient_label: selectedRelationType,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Relationship request already exists');
        } else {
          throw error;
        }
        return;
      }

      // Log to DHF for Zoe learning
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'relationship_request_sent',
        event_category: 'social',
        context_snippet: `Sent ${selectedRelationType} relationship request to ${selectedUser.username}`,
        metadata: {
          recipient_id: selectedUser.user_id,
          relationship_type: selectedRelationType,
        }
      });

      toast.success(`Relationship request sent to ${selectedUser.display_name}`);
      setSelectedUser(null);
      setSelectedRelationType('');
      setSearchQuery('');
      setSearchResults([]);
      loadRelationships();
    } catch (err) {
      console.error('Error sending request:', err);
      toast.error('Failed to send relationship request');
    } finally {
      setIsSending(false);
    }
  };

  const respondToRequest = async (relationshipId: string, accept: boolean) => {
    if (!user) return;

    try {
      if (accept) {
        await supabase
          .from('user_relationships')
          .update({ 
            status: 'confirmed',
            confirmed_at: new Date().toISOString()
          })
          .eq('id', relationshipId);

        // Log to DHF
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'relationship_confirmed',
          event_category: 'social',
          context_snippet: 'Confirmed a relationship request',
          metadata: { relationship_id: relationshipId }
        });

        toast.success('Relationship confirmed!');
      } else {
        await supabase
          .from('user_relationships')
          .update({ status: 'rejected' })
          .eq('id', relationshipId);

        toast.info('Relationship request declined');
      }

      loadRelationships();
    } catch (err) {
      console.error('Error responding to request:', err);
      toast.error('Failed to respond to request');
    }
  };

  const getRelationLabel = (rel: Relationship): string => {
    if (rel.requester_id === user?.id) {
      return rel.requester_label || rel.relationship_type;
    }
    return rel.recipient_label || rel.relationship_type;
  };

  const getOtherUser = (rel: Relationship) => {
    if (rel.requester_id === user?.id) {
      return rel.recipient_profile;
    }
    return rel.requester_profile;
  };

  const isIncoming = (rel: Relationship) => rel.recipient_id === user?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-pink-500" />
        <h3 className="text-lg font-semibold text-foreground">Family & Relationships</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Connect with family members. Zoe can message them on your behalf through Zoe Orb.
      </p>

      {/* Add New Relationship */}
      <Card className="border-border/50 bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add Relationship
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Search by username or name</Label>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background"
            />
          </div>

          {/* Search Results */}
          {(searchResults.length > 0 || isSearching) && (
            <div className="border border-border rounded-md bg-background max-h-32 overflow-y-auto">
              {isSearching ? (
                <div className="p-2 text-center text-sm text-muted-foreground">Searching...</div>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.user_id}
                    onClick={() => {
                      setSelectedUser(result);
                      setSearchResults([]);
                      setSearchQuery(result.username);
                    }}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted transition-colors"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={result.profile_photo_url} />
                      <AvatarFallback className="text-xs">{result.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">{result.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{result.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
              <Avatar className="w-8 h-8">
                <AvatarImage src={selectedUser.profile_photo_url} />
                <AvatarFallback>{selectedUser.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedUser.display_name}</p>
                <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => {
                setSelectedUser(null);
                setSearchQuery('');
              }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Relationship Type */}
          {selectedUser && (
            <div className="space-y-2">
              <Label className="text-xs">This person is my...</Label>
              <Select value={selectedRelationType} onValueChange={setSelectedRelationType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Send Button */}
          {selectedUser && selectedRelationType && (
            <Button
              onClick={sendRelationshipRequest}
              disabled={isSending}
              className="w-full"
              size="sm"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Request
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRequests.map((rel) => {
                const otherUser = getOtherUser(rel);
                const incoming = isIncoming(rel);

                return (
                  <div key={rel.id} className="flex items-center gap-2 p-2 bg-background rounded-md">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={otherUser?.profile_photo_url} />
                      <AvatarFallback>{otherUser?.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{otherUser?.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {incoming ? `Wants to add you as ${rel.recipient_label}` : `Awaiting confirmation as ${rel.requester_label}`}
                      </p>
                    </div>
                    {incoming ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-500" onClick={() => respondToRequest(rel.id, true)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => respondToRequest(rel.id, false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmed Relationships */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            My Relationships ({relationships.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : relationships.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No relationships yet. Add family members above.
            </p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {relationships.map((rel) => {
                  const otherUser = getOtherUser(rel);
                  const label = getRelationLabel(rel);

                  return (
                    <div key={rel.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={otherUser?.profile_photo_url} />
                        <AvatarFallback>{otherUser?.display_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{otherUser?.display_name}</p>
                        <p className="text-xs text-muted-foreground">@{otherUser?.username}</p>
                      </div>
                      <Badge className="capitalize bg-pink-500/20 text-pink-400 border-pink-500/30">
                        {label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Zoe Integration Note */}
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-primary">💡 Zoe Orb Integration:</span> Once confirmed, you can ask Zoe to send messages to your relationships. 
          Try saying: "Zoe, tell my son to call me" or "Send a message to my father".
        </p>
      </div>
    </div>
  );
};

export default RelationshipManager;
