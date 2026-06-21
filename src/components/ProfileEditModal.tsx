import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VoiceCommandsSettings from '@/components/VoiceCommandsSettings';
import ZoeSettings from '@/components/ZoeSettings';
import ZoeVoiceSettings from '@/components/ZoeVoiceSettings';
import HuddleVoiceCommands from '@/components/HuddleVoiceCommands';
import RelationshipManager from '@/components/RelationshipManager';
import { BookOpen, Sparkles, Heart } from 'lucide-react';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import { compressImage } from '@/utils/mediaCompression';
import { CANONICAL_CITIES, normalizeCityRaw, findNearestCity } from '@/utils/cityHelpers';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
}

const INTERESTS_CATEGORIES = {
  'Creative & Artistic': ['Art', 'Painting', 'Design', 'Writing', 'Photography', 'Filmmaking', 'Music', 'Dance', 'Fashion', 'Calligraphy'],
  'Intellectual & Academic': ['Reading', 'Philosophy', 'Psychology', 'History', 'Languages', 'Literature', 'Science', 'Astronomy', 'Education', 'Research'],
  'Tech & Digital': ['Technology', 'Coding', 'Gaming', 'AI', 'Robotics', 'Blogging', 'Podcasts', 'Editing', 'Crypto', 'Design (UI/UX)'],
  'Active & Physical': ['Sports', 'Fitness', 'Yoga', 'Hiking', 'Cycling', 'Running', 'Skateboarding', 'Swimming', 'Dancing', 'Martial Arts'],
  'Lifestyle & Social': ['Travel', 'Cooking', 'Baking', 'Gardening', 'Volunteering', 'Fashion', 'Minimalism', 'Collecting', 'Cars', 'Local Event']
};

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, profile }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    profession: '',
    field_of_study: '',
    gender: '',
    hobbies: [] as string[],
    profile_visibility: 'public',
    location_enabled: false,
    city: '',
    birth_date: '',
    birth_place: '',
    birth_time: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        profession: profile.profession || '',
        field_of_study: profile.field_of_study || '',
        gender: profile.gender || '',
        hobbies: profile.hobbies || [],
        profile_visibility: profile.profile_visibility || 'public',
        location_enabled: profile.location_enabled || false,
        city: profile.city || '',
        birth_date: profile.birth_date || '',
        birth_place: profile.birth_place || '',
        birth_time: profile.birth_time || '',
      });
      setPhotoPreview(profile.profile_photo_url || '');
    }
  }, [profile]);

  const handleLocationToggle = async (enabled: boolean) => {
    if (enabled) {
      setLocationLoading(true);
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
          });
        });

        const { latitude, longitude } = position.coords;

        // Reverse geocode using Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              'User-Agent': 'Webdrop/1.0',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Geocoding failed');
        }

        const data = await response.json();
        const address = data.address || {};
        
        // Try to extract city from various fields
        const rawCity = address.city || 
                       address.town || 
                       address.village || 
                       address.county || 
                       address.state;

        // Normalize to canonical city
        let canonicalCity = normalizeCityRaw(rawCity);

        // If not found in synonyms, find nearest anchor city
        if (!canonicalCity) {
          const NEAREST_THRESHOLD_KM = 200;
          const { city: nearestCity, distance } = findNearestCity(latitude, longitude);
          
          if (distance <= NEAREST_THRESHOLD_KM) {
            canonicalCity = nearestCity;
            toast({
              title: 'Location approximated',
              description: `${nearestCity} (~${Math.round(distance)} km away)`,
            });
          } else {
            toast({
              title: 'City not supported',
              description: `Please select manually. Nearest: ${nearestCity} (${Math.round(distance)} km)`,
              variant: 'destructive',
            });
            setLocationLoading(false);
            return;
          }
        } else {
          toast({
            title: 'Location detected',
            description: `City: ${canonicalCity}`,
          });
        }

        setFormData(prev => ({ ...prev, city: canonicalCity!, locationEnabled: true }));
      } catch (error) {
        console.error('Location error:', error);
        toast({
          title: 'Location error',
          description: 'Unable to get location. Please select city manually or check permissions.',
          variant: 'destructive',
        });
        setFormData(prev => ({ ...prev, location_enabled: false }));
      } finally {
        setLocationLoading(false);
      }
    } else {
      setFormData(prev => ({ ...prev, location_enabled: false }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleHobbyToggle = (hobby: string) => {
    setFormData(prev => ({
      ...prev,
      hobbies: prev.hobbies.includes(hobby)
        ? prev.hobbies.filter(h => h !== hobby)
        : [...prev.hobbies, hobby]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let photoUrl = profile?.profile_photo_url;

      if (photoFile) {
        const compressionResult = await compressImage(photoFile, 500);
        if (!compressionResult.success || !compressionResult.file) {
          throw new Error('Failed to compress photo');
        }
        const fileName = `${user.id}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, compressionResult.file, { 
            upsert: true,
            cacheControl: '0'
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload photo');
        }
        
        // Generate signed URL (expires in 1 year)
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('avatars')
          .createSignedUrl(fileName, 31536000);
        
        if (urlError || !signedUrlData?.signedUrl) {
          throw new Error('Failed to generate signed URL');
        }
        
        photoUrl = signedUrlData.signedUrl;
      }

      const updateData = {
        display_name: formData.display_name,
        username: formData.username,
        bio: formData.bio,
        profession: formData.profession,
        field_of_study: formData.field_of_study,
        gender: formData.gender,
        hobbies: formData.hobbies,
        profile_photo_url: photoUrl,
        profile_visibility: formData.profile_visibility,
        location_enabled: formData.location_enabled,
        city: formData.location_enabled ? formData.city : profile.city,
        birth_date: formData.birth_date || null,
        birth_place: formData.birth_place || null,
        birth_time: formData.birth_time || null,
      };

      const { error, data } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log('Profile updated successfully:', data);

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      });
      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="relationships" className="flex items-center gap-1">
              <Heart className="w-3 h-3" /> Family
            </TabsTrigger>
            <TabsTrigger value="zoe">Zoe</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={photoPreview} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {formData.display_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md bg-muted hover:bg-muted/80 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Change Photo</span>
                </label>
              </div>

              <div className="flex justify-center py-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open('/zoe-user-guide', '_blank')}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  📚 Zoe Docs
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="bg-background border-border"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="bg-background border-border"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="bg-background border-border"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profession">Profession</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_of_study">Field of Study</Label>
                <Input
                  id="field_of_study"
                  value={formData.field_of_study}
                  onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Interests</Label>
                <div className="space-y-4">
                  {Object.entries(INTERESTS_CATEGORIES).map(([category, interests]) => (
                    <div key={category} className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {interests.map((interest) => (
                          <Button
                            key={interest}
                            type="button"
                            variant={formData.hobbies.includes(interest) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleHobbyToggle(interest)}
                            className="text-xs"
                          >
                            {interest}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile_visibility">Profile Visibility</Label>
                <Select
                  value={formData.profile_visibility}
                  onValueChange={(value) => setFormData({ ...formData, profile_visibility: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="location_enabled">Share Location</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable this to share your city location
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={formData.location_enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newValue = !formData.location_enabled;
                      setFormData({ ...formData, location_enabled: newValue });
                      handleLocationToggle(newValue);
                    }}
                    disabled={locationLoading}
                  >
                    {locationLoading ? 'Loading...' : formData.location_enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                {formData.location_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <select
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background"
                      required={formData.location_enabled}
                    >
                      <option value="">Select city</option>
                      {CANONICAL_CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="space-y-2">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Personal Timeline Data (for Zoe AI Predictions)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable Zoe to create your personal cosmic timeline and predict your future
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Birth Date</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_place">Birth Place</Label>
                  <Input
                    id="birth_place"
                    type="text"
                    placeholder="City, Country"
                    value={formData.birth_place}
                    onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_time">Birth Time (optional)</Label>
                  <Input
                    id="birth_time"
                    type="time"
                    value={formData.birth_time}
                    onChange={(e) => setFormData({ ...formData, birth_time: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="relationships" className="space-y-4">
            <RelationshipManager />
          </TabsContent>

          <TabsContent value="zoe" className="space-y-4">
            <ZoeSettings />
          </TabsContent>

          <TabsContent value="voice" className="space-y-4">
            <ZoeVoiceSettings />
            <div className="pt-4 border-t border-border/50">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Huddle</h3>
              <HuddleVoiceCommands />
            </div>
            <div className="pt-4 border-t border-border/50">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Voice Commands</h3>
              <VoiceCommandsSettings />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditModal;
