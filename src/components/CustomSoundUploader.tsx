import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Upload, X, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { playNotificationSound } from '@/utils/notificationSounds';

interface CustomSoundUploaderProps {
  soundType: string;
  label: string;
}

export const CustomSoundUploader: React.FC<CustomSoundUploaderProps> = ({ soundType, label }) => {
  const [uploading, setUploading] = useState(false);
  const { settings, uploadCustomSound, deleteCustomSound, saveSettings } = useNotificationSettings();
  const customSoundUrl = settings.custom_sounds[soundType];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an audio file (MP3, WAV, or OGG)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadCustomSound(file, soundType);
      if (url) {
        await saveSettings({
          custom_sounds: { ...settings.custom_sounds, [soundType]: url }
        });
        toast.success('Custom sound uploaded successfully');
      } else {
        toast.error('Failed to upload sound');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload sound');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomSound(soundType);
      toast.success('Custom sound removed');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove sound');
    }
  };

  const handlePreview = () => {
    if (customSoundUrl) {
      playNotificationSound(soundType, undefined, customSoundUrl);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-medium">{label}</Label>
        {customSoundUrl && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
              disabled={uploading}
            >
              <Play className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {customSoundUrl ? (
        <div className="text-sm text-muted-foreground">
          Custom sound active
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="flex-1"
          />
          {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Upload MP3, WAV, or OGG (max 5MB)
      </p>
    </Card>
  );
};