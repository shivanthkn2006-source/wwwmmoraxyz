/**
 * ADMIN FRIEND REQUESTS — inbox plus member search.
 *
 * Shows the pending requests waiting on the signed-in administrator with
 * accept/reject actions, and a narrow name/handle search over real accounts so
 * a connection can be started from here. Search returns only a member id, name,
 * handle and photo — no personal profile details of strangers.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FriendRequestCard from '@/components/FriendRequestCard';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { searchDirectory, type DirectoryProfile } from '@/lib/friendDirectory';
import { useAuth } from '@/lib/auth';

const AdminFriendRequests: React.FC = () => {
  const { user } = useAuth();
  const { receivedRequests, sentRequests, loading, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } =
    useFriendRequests();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryProfile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const runSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const found = await searchDirectory(query, user?.id ?? null, 10);
    setResults(found);
    setSearching(false);
  }, [query, user?.id]);

  useEffect(() => {
    if (refreshKey > 0) void runSearch();
  }, [refreshKey, runSearch]);

  return (
    <Card data-admin-friend-requests>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-sm font-semibold">Friend requests</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Waiting on you ({receivedRequests.length}) · sent by you ({sentRequests.length})
          </p>
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading requests…
            </p>
          )}
          {!loading && receivedRequests.length === 0 && (
            <p className="text-sm text-muted-foreground">No requests waiting for a decision.</p>
          )}
          {receivedRequests.map((request) => (
            <FriendRequestCard
              key={request.id}
              request={request}
              onAccept={acceptFriendRequest}
              onReject={rejectFriendRequest}
            />
          ))}
        </div>

        <div className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a member by name or @handle"
              aria-label="Find a member"
            />
            <Button type="submit" size="sm" variant="outline" disabled={searching}>
              {searching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          </form>

          {results && results.length === 0 && (
            <p className="text-sm text-muted-foreground">No members matched that name or handle.</p>
          )}
          {(results || []).map((profile) => (
            <div
              key={profile.user_id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              data-directory-result={profile.user_id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile.profile_photo_url || ''} alt={profile.display_name || 'Member'} />
                  <AvatarFallback>{(profile.display_name || profile.username || 'M').charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{profile.display_name || 'Member'}</p>
                  <p className="truncate text-xs text-muted-foreground">@{profile.username || 'unknown'}</p>
                </div>
              </div>
              <Button size="sm" onClick={() => void sendFriendRequest(profile.user_id)}>
                <UserPlus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                Add
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminFriendRequests;
