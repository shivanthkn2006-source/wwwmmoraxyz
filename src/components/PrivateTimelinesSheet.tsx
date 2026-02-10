import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Heart, Plus, UserPlus, X, Camera, Upload, Image, Trash2 } from 'lucide-react';
import { usePrivateTimelines } from '@/hooks/usePrivateTimelines';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import VideoCreationModal from '@/components/VideoCreationModal';
import PostModal from '@/components/PostModal';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PrivateTimelinePost {
  id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    display_name: string;
    username: string;
    profile_photo_url: string | null;
  };
}

interface PrivateTimelinesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PrivateTimelinesSheet: React.FC<PrivateTimelinesSheetProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { timelines, loading, createTimeline, addMemberToTimeline, removeMemberFromTimeline, deleteTimeline } = usePrivateTimelines();
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [posts, setPosts] = useState<PrivateTimelinePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PrivateTimelinePost | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const selectedTimeline = timelines.find(t => t.id === selectedTimelineId);

  useEffect(() => {
    if (selectedTimelineId) {
      fetchTimelinePosts(selectedTimelineId);
    }
  }, [selectedTimelineId]);

  const fetchTimelinePosts = async (timelineId: string) => {
    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (display_name, username, profile_photo_url)
        `)
        .eq('private_timeline_id', timelineId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching timeline posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleUserSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    let queryBuilder = supabase
      .from('profiles')
      .select('user_id, display_name, username, profile_photo_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('user_id', user?.id)
      .limit(10);

    const { data } = await queryBuilder;

    // Filter out existing members if in a timeline
    let filteredResults = data || [];
    if (selectedTimelineId && selectedTimeline) {
      const memberIds = new Set(selectedTimeline.members.map(m => m.user_id));
      filteredResults = filteredResults.filter(p => !memberIds.has(p.user_id));
    }

    setSearchResults(filteredResults);
  };

  const handleCreateTimeline = async (selectedUserId: string) => {
    const timelineId = await createTimeline(selectedUserId);
    if (timelineId) {
      toast.success('Private timeline created!');
      setSelectedTimelineId(timelineId);
    } else {
      toast.error('Failed to create timeline');
    }
    setShowUserSearch(false);
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTimelineId) return;
    
    // Check if user is already a member
    const isAlreadyMember = selectedTimeline?.members.some(m => m.user_id === userId);
    if (isAlreadyMember) {
      toast.error('This user is already a member of this timeline');
      setShowUserSearch(false);
      return;
    }
    
    const success = await addMemberToTimeline(selectedTimelineId, userId);
    if (success) {
      toast.success('Member added to timeline');
    } else {
      toast.error('Failed to add member');
    }
    setShowUserSearch(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTimelineId) return;
    const success = await removeMemberFromTimeline(selectedTimelineId, userId);
    if (success) {
      toast.success('Member removed from timeline');
    } else {
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteTimeline = async () => {
    if (!selectedTimelineId) return;
    
    const success = await deleteTimeline(selectedTimelineId);
    if (success) {
      toast.success('Private timeline deleted');
      setSelectedTimelineId(null);
      setShowDeleteDialog(false);
    } else {
      toast.error('Failed to delete timeline');
    }
  };

  const handleWebdropClick = () => {
    if (selectedTimelineId) {
      navigate('/webdrop', { state: { privateTimelineId: selectedTimelineId } });
      onOpenChange(false);
    }
  };

  const handleCameraClick = () => {
    if (selectedTimelineId) {
      setShowVideoModal(true);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !selectedTimelineId || !user) return;
    
    const file = event.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: 'image',
          visibility: 'personal',
          private_timeline_id: selectedTimelineId,
        });

      if (postError) throw postError;

      toast.success('Image uploaded successfully!');
      await fetchTimelinePosts(selectedTimelineId);
      
      // Reset input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
              Private Timelines
            </SheetTitle>
            <SheetDescription>
              Share special moments with someone special
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {!selectedTimelineId ? (
              // Timeline List View
              <>
                <Button
                  onClick={() => setShowUserSearch(true)}
                  className="w-full"
                  variant="default"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Private Timeline
                </Button>

                <div className="space-y-3">
                  {timelines.map((timeline) => {
                    const otherMember = timeline.members.find(m => m.user_id !== user?.id);
                    return (
                      <div
                        key={timeline.id}
                        onClick={() => setSelectedTimelineId(timeline.id)}
                        className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={otherMember?.profile_photo_url || undefined} />
                          <AvatarFallback>{otherMember?.display_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {timeline.name || `Timeline with ${otherMember?.display_name}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {timeline.members.length} member{timeline.members.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                      </div>
                    );
                  })}

                  {timelines.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No private timelines yet</p>
                      <p className="text-sm">Create one to share special moments</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Timeline Detail View
              <>
                <Button
                  onClick={() => setSelectedTimelineId(null)}
                  variant="ghost"
                  className="mb-4"
                >
                  ← Back to timelines
                </Button>

                {/* Timeline Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {selectedTimeline?.members.map(member => (
                      <Avatar key={member.user_id} className="w-10 h-10">
                        <AvatarImage src={member.profile_photo_url || undefined} />
                        <AvatarFallback>{member.display_name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowUserSearch(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Member
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mb-6">
                  <Button onClick={handleWebdropClick} variant="outline" className="flex-1">
                    <Upload className="w-4 h-4 mr-2" />
                    Webdrop
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 relative"
                    disabled={uploadingImage}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingImage}
                    />
                    <Image className="w-4 h-4 mr-2" />
                    {uploadingImage ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button onClick={handleCameraClick} variant="outline" className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Camera
                  </Button>
                </div>

                {/* Members List */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Members</h3>
                  <div className="space-y-2">
                    {selectedTimeline?.members.map(member => (
                      <div key={member.user_id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.profile_photo_url || undefined} />
                            <AvatarFallback>{member.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{member.display_name}</div>
                            <div className="text-xs text-muted-foreground">@{member.username}</div>
                          </div>
                        </div>
                        {member.user_id !== user?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.user_id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Posts */}
                <div>
                  <h3 className="font-medium mb-3">Posts</h3>
                  {loadingPosts ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : posts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {posts.map((post) => (
                        <div
                          key={post.id}
                          className="aspect-square rounded-lg overflow-hidden border border-border cursor-pointer"
                          onClick={() => {
                            setSelectedPost(post);
                            setShowPostModal(true);
                          }}
                        >
                          {post.media_url ? (
                            post.media_type === 'video' ? (
                              <video src={post.media_url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={post.media_url} alt="Private timeline post" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 p-4 flex items-center justify-center">
                              <p className="text-sm text-foreground line-clamp-6">{post.content}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No posts yet</p>
                      <p className="text-sm">Share your first moment together</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {showUserSearch && (
        <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedTimelineId ? "Add Member to Timeline" : "Create Private Timeline With"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search by username or name..."
                onChange={(e) => handleUserSearch(e.target.value)}
              />
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {searchResults.map((profile) => (
                  <div
                    key={profile.user_id}
                    onClick={() => {
                      if (selectedTimelineId) {
                        handleAddMember(profile.user_id);
                      } else {
                        handleCreateTimeline(profile.user_id);
                      }
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer"
                  >
                    <Avatar>
                      <AvatarImage src={profile.profile_photo_url || undefined} />
                      <AvatarFallback>{profile.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{profile.display_name}</div>
                      <div className="text-sm text-muted-foreground">@{profile.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showVideoModal && selectedTimelineId && (
        <VideoCreationModal
          open={showVideoModal}
          onOpenChange={setShowVideoModal}
          privateTimelineId={selectedTimelineId}
          onComplete={() => {
            setShowVideoModal(false);
            if (selectedTimelineId) fetchTimelinePosts(selectedTimelineId);
          }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Private Timeline</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this private timeline? This will remove all posts and members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTimeline} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Timeline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showPostModal && selectedPost && (
        <PostModal
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
          post={selectedPost}
          onUpdate={() => {
            if (selectedTimelineId) {
              fetchTimelinePosts(selectedTimelineId);
            }
          }}
        />
      )}
    </>
  );
};

export default PrivateTimelinesSheet;
