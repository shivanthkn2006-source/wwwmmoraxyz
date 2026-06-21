import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Bug, Lightbulb, Share2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type FeedbackType = 'bug' | 'feature' | 'general';

const FeedbackCollectionPanel = () => {
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    setSubmitting(true);
    try {
      // Only save feedback if user is authenticated (UUID required)
      if (!user?.id) {
        toast.error('Please sign in to submit feedback');
        setSubmitting(false);
        return;
      }
      
      // Save feedback to database
      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        from_user_id: user.id,
        type: 'feedback',
        context_data: {
          feedback_type: feedbackType,
          feedback_text: feedback,
          timestamp: new Date().toISOString(),
          domain: 'mmora.xyz'
        }
      });

      if (error) throw error;

      toast.success('Feedback submitted successfully! Thank you for helping improve Universe of Life.');
      setFeedback('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const shareToSocial = (platform: 'twitter' | 'discord' | 'facebook') => {
    const text = encodeURIComponent(`Check out Universe of Life at mmora.xyz - An AI-powered platform with Zoe AI, Universal Timeline, and more! 🌌`);
    const url = encodeURIComponent('https://mmora.xyz');

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      discord: 'https://discord.gg/your-discord-link', // Replace with actual Discord invite
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
    toast.info(`Opening ${platform} sharing...`);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Beta Feedback</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Help us improve Universe of Life by sharing your thoughts
        </p>
      </div>

      {/* Feedback Form */}
      <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Feedback Type</label>
          <Select value={feedbackType} onValueChange={(value) => setFeedbackType(value as FeedbackType)}>
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Bug Report
                </div>
              </SelectItem>
              <SelectItem value="feature">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Feature Request
                </div>
              </SelectItem>
              <SelectItem value="general">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  General Feedback
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Your Feedback</label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={
              feedbackType === 'bug' 
                ? 'Describe the bug you encountered...' 
                : feedbackType === 'feature'
                ? 'Describe the feature you would like to see...'
                : 'Share your thoughts about Universe of Life...'
            }
            className="min-h-[120px] bg-background/50"
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={submitting}
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </Card>

      {/* Share to Social */}
      <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Share2 className="w-4 h-4" />
          Share with Community
        </div>
        <p className="text-xs text-muted-foreground">
          Join our community to connect with other beta testers
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => shareToSocial('twitter')}
            className="gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Twitter
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => shareToSocial('discord')}
            className="gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Discord
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => shareToSocial('facebook')}
            className="gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Facebook
          </Button>
        </div>
      </Card>

      {/* Domain Info */}
      <Card className="p-3 bg-primary/10 backdrop-blur-xl border-primary/20">
        <p className="text-xs text-center text-foreground">
          Universe of Life is live at <span className="font-semibold text-primary">mmora.xyz</span>
        </p>
      </Card>
    </div>
  );
};

export default FeedbackCollectionPanel;
