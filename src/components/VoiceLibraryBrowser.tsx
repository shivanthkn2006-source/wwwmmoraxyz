import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Play, StopCircle, Check } from 'lucide-react';

interface Voice {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  description: string;
}

interface VoiceLibraryBrowserProps {
  selectedVoice: string;
  onSelectVoice: (voiceName: string) => void;
}

// AssemblyAI-inspired voice options with browser TTS fallback
const VOICES: Voice[] = [
  { id: 'nova', name: 'Nova', gender: 'female', description: 'Warm and friendly, great for conversations' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', description: 'Professional and clear' },
  { id: 'alloy', name: 'Alloy', gender: 'neutral', description: 'Balanced and versatile' },
  { id: 'echo', name: 'Echo', gender: 'male', description: 'Deep and authoritative' },
  { id: 'fable', name: 'Fable', gender: 'male', description: 'British accent, refined' },
  { id: 'onyx', name: 'Onyx', gender: 'male', description: 'Rich and resonant' },
];

const VoiceLibraryBrowser: React.FC<VoiceLibraryBrowserProps> = ({ selectedVoice, onSelectVoice }) => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  const handlePlaySample = async (voice: Voice) => {
    // Stop any currently playing audio
    if (currentUtterance) {
      window.speechSynthesis.cancel();
      setCurrentUtterance(null);
      if (playingVoice === voice.id) {
        setPlayingVoice(null);
        return;
      }
    }

    setPlayingVoice(voice.id);

    try {
      // Use browser's speech synthesis as fallback
      const utterance = new SpeechSynthesisUtterance(
        `Hi! I'm ${voice.name}. ${voice.description}. Let me know if you'd like to use my voice!`
      );
      
      // Find matching browser voice
      const voices = window.speechSynthesis.getVoices();
      let matchingVoice;
      
      if (voice.gender === 'male') {
        matchingVoice = voices.find(v => v.name.toLowerCase().includes('male'));
      } else if (voice.gender === 'female') {
        matchingVoice = voices.find(v => v.name.toLowerCase().includes('female'));
      } else {
        // For neutral, try to find a balanced voice
        matchingVoice = voices.find(v => 
          !v.name.toLowerCase().includes('male') && 
          !v.name.toLowerCase().includes('female')
        ) || voices[0];
      }
      
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
      
      // Adjust settings for better quality
      utterance.pitch = voice.gender === 'male' ? 0.9 : 1.1;
      utterance.rate = 1.0;
      utterance.volume = 1.0;
      
      utterance.onend = () => {
        setPlayingVoice(null);
        setCurrentUtterance(null);
      };
      
      utterance.onerror = () => {
        setPlayingVoice(null);
        setCurrentUtterance(null);
        toast({
          title: 'Error',
          description: 'Failed to play voice sample.',
          variant: 'destructive',
        });
      };
      
      setCurrentUtterance(utterance);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error playing voice sample:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate voice sample. Please try again.',
        variant: 'destructive',
      });
      setPlayingVoice(null);
    }
  };

  const handleSelectVoice = (voiceId: string) => {
    onSelectVoice(voiceId);
    toast({
      title: 'Voice Selected',
      description: `${VOICES.find(v => v.id === voiceId)?.name} is now your assistant's voice.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Library</CardTitle>
        <CardDescription>
          Listen to samples and choose your assistant's voice (powered by browser TTS)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {VOICES.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              const isPlaying = playingVoice === voice.id;

              return (
                <Card 
                  key={voice.id} 
                  className={`transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{voice.name}</h4>
                          <Badge variant={voice.gender === 'female' ? 'secondary' : voice.gender === 'male' ? 'outline' : 'default'}>
                            {voice.gender}
                          </Badge>
                          {isSelected && (
                            <Badge className="bg-primary text-primary-foreground">
                              <Check className="w-3 h-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{voice.description}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePlaySample(voice)}
                          disabled={playingVoice !== null && playingVoice !== voice.id}
                        >
                          {isPlaying ? (
                            <>
                              <StopCircle className="w-4 h-4 mr-2" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Play
                            </>
                          )}
                        </Button>
                        {!isSelected && (
                          <Button
                            size="sm"
                            onClick={() => handleSelectVoice(voice.id)}
                          >
                            Select
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default VoiceLibraryBrowser;
