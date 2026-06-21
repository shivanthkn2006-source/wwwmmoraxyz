import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, FileText, Edit, Trash2, Share2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type TimelineContent } from '@/hooks/useTimelineContent';

interface TimelineContentDisplayProps {
  content: TimelineContent[];
  onEdit?: (contentId: string) => void;
  onDelete?: (contentId: string) => void;
  onShare?: (contentId: string) => void;
  readOnly?: boolean;
}

/**
 * Display user-generated timeline content
 * Shows text notes, images, and annotations with management controls
 */
export const TimelineContentDisplay: React.FC<TimelineContentDisplayProps> = ({
  content,
  onEdit,
  onDelete,
  onShare,
  readOnly = false,
}) => {
  if (content.length === 0) return null;

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'text':
      case 'note':
      case 'annotation':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          User Content ({content.length})
        </h4>
      </div>

      <div className="space-y-2">
        {content.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-3 bg-accent/20 hover:bg-accent/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getContentIcon(item.content_type)}
                    <Badge variant="outline" className="text-xs">
                      {item.expertise_level}
                    </Badge>
                    {item.is_public && (
                      <Badge variant="secondary" className="text-xs">
                        Public
                      </Badge>
                    )}
                  </div>

                  {item.content_data?.text && (
                    <p className="text-sm mb-2">{item.content_data.text}</p>
                  )}

                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt="Timeline content"
                      className="w-full rounded-lg border border-border mb-2"
                    />
                  )}

                  <p className="text-xs text-muted-foreground">
                    Added {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>

                {!readOnly && (
                  <div className="flex gap-1">
                    {onShare && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onShare(item.id)}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(item.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
