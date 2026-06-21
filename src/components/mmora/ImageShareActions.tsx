import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageShareActionsProps {
  imageUrl: string;
  prompt?: string;
}

// Social platform icons as SVG components
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const socialPlatforms = [
  { id: 'twitter', name: 'X (Twitter)', icon: TwitterIcon, color: 'bg-black hover:bg-zinc-800' },
  { id: 'instagram', name: 'Instagram', icon: InstagramIcon, color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 hover:opacity-90' },
  { id: 'tiktok', name: 'TikTok', icon: TikTokIcon, color: 'bg-black hover:bg-zinc-800' },
  { id: 'youtube', name: 'YouTube', icon: YouTubeIcon, color: 'bg-red-600 hover:bg-red-700' },
];

export default function ImageShareActions({ imageUrl, prompt }: ImageShareActionsProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'jpeg' | 'pdf' | null>(null);

  // Convert base64 to blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const base64Data = base64.split(',')[1] || base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Download as JPEG
  const downloadAsJpeg = async () => {
    setIsDownloading(true);
    setDownloadFormat('jpeg');
    
    try {
      let blob: Blob;
      
      if (imageUrl.startsWith('data:')) {
        blob = base64ToBlob(imageUrl, 'image/jpeg');
      } else {
        const response = await fetch(imageUrl);
        blob = await response.blob();
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zoe-creation-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Image saved as JPEG', { description: 'Check your downloads folder, Envoy.' });
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed', { description: 'Signal interference detected.' });
    } finally {
      setIsDownloading(false);
      setDownloadFormat(null);
    }
  };

  // Download as PDF
  const downloadAsPdf = async () => {
    setIsDownloading(true);
    setDownloadFormat('pdf');
    
    try {
      // Dynamic import jsPDF
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      doc.setFontSize(16);
      doc.setTextColor(0, 240, 255);
      doc.text('ZOE // TACTICAL VISUALIZATION', 20, 20);
      
      // Add timestamp
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated: ${new Date().toISOString()}`, 20, 30);
      
      // Add prompt if available
      if (prompt) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const splitPrompt = doc.splitTextToSize(`Prompt: ${prompt}`, 170);
        doc.text(splitPrompt, 20, 40);
      }
      
      // Add image
      const imgY = prompt ? 55 : 40;
      doc.addImage(imageUrl, 'JPEG', 20, imgY, 170, 170);
      
      // Add footer
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('Created with M\'mora 2120 // DHF Tactical Interface', 20, 285);
      
      doc.save(`zoe-tactical-${Date.now()}.pdf`);
      
      toast.success('Saved as PDF', { description: 'Tactical document archived, Envoy.' });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('PDF generation failed', { description: 'Document synthesis error.' });
    } finally {
      setIsDownloading(false);
      setDownloadFormat(null);
    }
  };

  // Share to social platform
  const shareToSocial = async (platformId: string) => {
    const shareText = prompt 
      ? `Created with ZOE AI: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`
      : 'Created with ZOE AI // M\'mora 2120';
    
    const shareUrl = window.location.href;
    
    // For base64 images, we need to copy to clipboard and guide user
    if (imageUrl.startsWith('data:')) {
      try {
        // Convert to blob and copy to clipboard
        const blob = base64ToBlob(imageUrl, 'image/png');
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        
        toast.success('Image copied to clipboard!', {
          description: 'Now paste it in your post on the platform.',
          duration: 4000
        });
      } catch (err) {
        console.warn('Clipboard copy failed, falling back to download:', err);
        // Fallback: download and guide
        await downloadAsJpeg();
        toast.info('Image downloaded - upload it to your post!', { duration: 4000 });
      }
    }
    
    // Open the platform
    let platformUrl = '';
    
    switch (platformId) {
      case 'twitter':
        platformUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'instagram':
        // Instagram doesn't have direct sharing URL, open app/web
        platformUrl = 'https://www.instagram.com/';
        toast.info('Image copied - paste in your Instagram post!', { duration: 3000 });
        break;
      case 'tiktok':
        platformUrl = 'https://www.tiktok.com/upload';
        toast.info('Image copied - upload to your TikTok!', { duration: 3000 });
        break;
      case 'youtube':
        platformUrl = 'https://studio.youtube.com/';
        toast.info('Image copied - use in your YouTube Short!', { duration: 3000 });
        break;
    }
    
    if (platformUrl) {
      window.open(platformUrl, '_blank', 'noopener,noreferrer');
    }
    
    setIsShareOpen(false);
  };

  // Native share (mobile)
  const nativeShare = async () => {
    if (!navigator.share) {
      toast.error('Native sharing not supported', { description: 'Use platform buttons instead.' });
      return;
    }
    
    try {
      let shareData: ShareData = {
        title: 'ZOE Creation',
        text: prompt || 'Created with ZOE AI // M\'mora 2120',
        url: window.location.href,
      };
      
      // Try to share with file if supported
      if (navigator.canShare && imageUrl.startsWith('data:')) {
        const blob = base64ToBlob(imageUrl, 'image/png');
        const file = new File([blob], 'zoe-creation.png', { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      }
      
      await navigator.share(shareData);
      toast.success('Shared successfully!');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 mt-4">
      {/* Download Buttons */}
      <motion.button
        onClick={downloadAsJpeg}
        disabled={isDownloading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-mono border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
      >
        {isDownloading && downloadFormat === 'jpeg' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        JPEG
      </motion.button>
      
      <motion.button
        onClick={downloadAsPdf}
        disabled={isDownloading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-mono border border-purple-500/30 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
      >
        {isDownloading && downloadFormat === 'pdf' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        PDF
      </motion.button>
      
      {/* Share Button */}
      <div className="relative">
        <motion.button
          onClick={() => setIsShareOpen(!isShareOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-500/20 text-pink-400 text-xs font-mono border border-pink-500/30 hover:bg-pink-500/30 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          SHARE
        </motion.button>
        
        {/* Share Dropdown */}
        <AnimatePresence>
          {isShareOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full left-0 mb-2 p-3 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl min-w-[200px] z-50"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-white/60 uppercase tracking-wider">Share to</span>
                <button onClick={() => setIsShareOpen(false)} className="text-white/40 hover:text-white/80">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {socialPlatforms.map((platform) => (
                  <motion.button
                    key={platform.id}
                    onClick={() => shareToSocial(platform.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-medium ${platform.color} transition-all`}
                  >
                    <platform.icon />
                    <span className="truncate">{platform.name}</span>
                  </motion.button>
                ))}
              </div>
              
              {/* Native Share (Mobile) */}
              {typeof navigator !== 'undefined' && navigator.share && (
                <motion.button
                  onClick={nativeShare}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-mono border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  More Options...
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}