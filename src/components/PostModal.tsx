import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PostCard from '@/components/PostCard';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  onUpdate: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

const PostModal: React.FC<PostModalProps> = ({
  isOpen,
  onClose,
  post,
  onUpdate,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-background">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background border-b border-border">
          <div className="flex items-center gap-2">
            {hasPrevious && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevious}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                className="h-8 w-8"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-4">
          <PostCard post={post} onUpdate={onUpdate} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostModal;
