import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bug, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceCommandsSettings from '@/components/VoiceCommandsSettings';

const VoiceCommandsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 bg-background backdrop-blur-sm border-b border-border p-4 z-50 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold flex-1">Voice Commands</h1>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => navigate('/voice-command-history')}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            History
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => navigate('/voice-command-test')}
            className="gap-2"
          >
            <Bug className="w-4 h-4" />
            Test
          </Button>
        </div>

        <div className="p-4">
          <VoiceCommandsSettings />
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandsPage;
