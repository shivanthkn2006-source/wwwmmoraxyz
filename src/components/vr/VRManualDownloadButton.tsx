/**
 * VR USER MANUAL DOWNLOAD BUTTON
 * Provides downloadable PDF guide for VR world
 */

import React, { useState } from 'react';
import { Download, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateVRUserManual } from '@/utils/vrUserManualGenerator';
import { toast } from 'sonner';

interface VRManualDownloadButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const VRManualDownloadButton: React.FC<VRManualDownloadButtonProps> = ({
  variant = 'outline',
  size = 'default',
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      generateVRUserManual();
      toast.success('VR User Manual downloaded successfully!');
    } catch (error) {
      console.error('Failed to generate manual:', error);
      toast.error('Failed to generate manual. Please try again.');
    } finally {
      window.setTimeout(() => setIsGenerating(false), 250);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isGenerating}
      className={`gap-2 ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <BookOpen className="w-4 h-4" />
          <Download className="w-4 h-4" />
          VR Manual
        </>
      )}
    </Button>
  );
};

export default VRManualDownloadButton;
