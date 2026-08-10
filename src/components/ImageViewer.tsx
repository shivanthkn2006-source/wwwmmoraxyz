import React from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
  alt?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, onClose, alt = 'Full-size image' }) => {
  const downloadImage = async () => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `zoe-image-${Date.now()}.${blob.type.includes('jpeg') ? 'jpg' : blob.type.includes('webp') ? 'webp' : 'png'}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      const anchor = document.createElement('a');
      anchor.href = imageUrl;
      anchor.download = `zoe-image-${Date.now()}.png`;
      anchor.target = '_blank';
      anchor.click();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[12000] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="secondary" size="icon" onClick={(event) => { event.stopPropagation(); void downloadImage(); }} aria-label="Download full-size image">
          <Download className="w-5 h-5" />
        </Button>
        <Button variant="secondary" size="icon" onClick={onClose} aria-label="Close full-size image">
          <X className="w-5 h-5" />
        </Button>
      </div>
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default ImageViewer;
