// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT OPTIC-X: Quantum Camera Page
// Full-screen 2050 Cybernetic Camera Experience
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { QuantumCameraCanvas } from '@/components/quantum-camera';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const QuantumCameraPage: React.FC = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
    toast.success('Quantum capture complete!', {
      description: 'Your 2050-grade image is ready',
    });
  };

  const handleDownload = () => {
    if (capturedImage) {
      const link = document.createElement('a');
      link.href = capturedImage;
      link.download = `quantum-capture-${Date.now()}.png`;
      link.click();
      toast.success('Downloaded!');
    }
  };

  const handleShare = async () => {
    if (capturedImage && navigator.share) {
      try {
        const blob = await fetch(capturedImage).then(r => r.blob());
        const file = new File([blob], 'quantum-capture.png', { type: 'image/png' });
        await navigator.share({
          title: 'Quantum Camera Capture',
          text: 'Captured with 2050 Cybernetic Optics',
          files: [file],
        });
      } catch (e) {
        toast.error('Share failed');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-background">
      {/* Back Button */}
      <Link to="/home">
        <Button
          variant="ghost"
          className="absolute top-4 left-4 z-50 text-primary hover:text-primary/80 hover:bg-primary/10"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
      </Link>

      {/* Title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <h1 className="text-lg font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
          PROJECT OPTIC-X
        </h1>
        <p className="text-xs text-muted-foreground text-center">Quantum Camera System</p>
      </div>

      {/* Main Camera Canvas */}
      <QuantumCameraCanvas
        className="w-full h-full"
        showControls={true}
        onCapture={handleCapture}
      />

      {/* Captured Image Preview */}
      {capturedImage && (
        <div className="absolute bottom-24 left-4 z-50 flex items-end gap-2">
          <div className="relative group">
            <img
              src={capturedImage}
              alt="Captured"
            className="w-20 h-20 object-cover rounded-lg border-2 border-primary/50 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => window.open(capturedImage, '_blank')}
          />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 text-white" />
              </Button>
              {navigator.share && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 text-white" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuantumCameraPage;
