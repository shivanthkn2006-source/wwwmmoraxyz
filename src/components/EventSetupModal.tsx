import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface EventSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEventDate?: string | null;
  currentEventType?: string | null;
  currentEventCustomDetails?: string | null;
  currentEventRecurring?: boolean | null;
}

const EVENT_TYPES = [
  { value: 'birthday', label: '🎂 Birthday' },
  { value: 'fundraising', label: '💝 Fundraising Event' },
  { value: 'talk', label: '🎤 Talk/Speech' },
  { value: 'other', label: '🎉 Other Event' }
];

const EventSetupModal: React.FC<EventSetupModalProps> = ({ 
  isOpen, 
  onClose, 
  currentEventDate,
  currentEventType,
  currentEventCustomDetails,
  currentEventRecurring
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedType, setSelectedType] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(true);
  const [step, setStep] = useState<'date' | 'type' | 'custom'>('date');

  useEffect(() => {
    if (currentEventDate) {
      setSelectedDate(new Date(currentEventDate));
      setStep('type');
    }
    if (currentEventType) {
      setSelectedType(currentEventType);
    }
    if (currentEventCustomDetails) {
      try {
        const details = JSON.parse(currentEventCustomDetails);
        setCustomTitle(details.title || '');
        setCustomDescription(details.description || '');
        setCustomNotes(details.notes || '');
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    if (currentEventRecurring !== null && currentEventRecurring !== undefined) {
      setIsRecurring(currentEventRecurring);
    }
  }, [currentEventDate, currentEventType, currentEventCustomDetails, currentEventRecurring]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setStep('type');
    }
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    if (type === 'other') {
      setStep('custom');
    }
  };

  const handleSave = async () => {
    if (!user || !selectedDate || !selectedType) return;

    setLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      let customDetails = null;
      if (selectedType === 'other' && (customTitle || customDescription || customNotes)) {
        customDetails = JSON.stringify({
          title: customTitle,
          description: customDescription,
          notes: customNotes
        });
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          event_date: formattedDate,
          event_type: selectedType,
          event_custom_details: customDetails,
          event_recurring: isRecurring
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Event saved!',
        description: `Your ${selectedType} event is set for ${format(selectedDate, 'PPP')}${isRecurring ? ' (recurring annually)' : ''}`,
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: 'Failed to save event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearEvent = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          event_date: null,
          event_type: null,
          event_custom_details: null,
          event_recurring: true
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Event cleared',
        description: 'Your event reminder has been removed',
      });
      
      setSelectedDate(undefined);
      setSelectedType('');
      setCustomTitle('');
      setCustomDescription('');
      setCustomNotes('');
      setIsRecurring(true);
      setStep('date');
      onClose();
    } catch (error: any) {
      console.error('Error clearing event:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {step === 'date' ? 'Select Event Date' : step === 'type' ? 'Choose Event Type' : 'Event Details'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'date' && (
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="pointer-events-auto"
              />
            </div>
          )}

          {step === 'type' && (
            <div className="space-y-3">
              <Label className="text-foreground">What type of event?</Label>
              <div className="grid grid-cols-2 gap-3">
                {EVENT_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={selectedType === type.value ? 'default' : 'outline'}
                    className={`h-auto py-4 ${
                      selectedType === type.value 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                        : 'hover:bg-primary/10 hover:text-foreground'
                    }`}
                    onClick={() => handleTypeSelect(type.value)}
                  >
                    <span className="text-center">{type.label}</span>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="recurring" className="text-sm text-muted-foreground cursor-pointer">
                  Repeat annually (recurring event)
                </Label>
              </div>
            </div>
          )}

          {step === 'custom' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customTitle" className="text-foreground">Event Title</Label>
                <Input
                  id="customTitle"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Product Launch, Concert, etc."
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customDescription" className="text-foreground">Event Description</Label>
                <Textarea
                  id="customDescription"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Describe your event..."
                  className="bg-background min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customNotes" className="text-foreground">Custom Notes/Message</Label>
                <Textarea
                  id="customNotes"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  className="bg-background min-h-[60px]"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {currentEventDate && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClearEvent}
                disabled={loading}
                className="text-destructive hover:bg-destructive/10"
              >
                Clear Event
              </Button>
            )}
            
            <div className="flex gap-2 ml-auto">
              {(step === 'type' || step === 'custom') && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(step === 'custom' ? 'type' : 'date')}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              <Button 
                type="button"
                onClick={handleSave}
                disabled={loading || !selectedDate || !selectedType || (selectedType === 'other' && step === 'type')}
              >
                {loading ? 'Saving...' : 'Save Event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventSetupModal;
