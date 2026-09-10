import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bug, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceCommandsSettings from '@/components/VoiceCommandsSettings';
import { ZOE_COMMAND_CATALOG, ZOE_COMMAND_COUNT } from '@/features/zoe-handsfree/commandCatalog';

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

        <div className="p-4 space-y-8">
          <section aria-labelledby="zoe-command-catalog">
            <h2 id="zoe-command-catalog" className="text-base font-semibold">
              Everything you can say to Zoe
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {ZOE_COMMAND_COUNT} spoken commands. Every one of them replies in Zoe&apos;s
              Deepgram voice through your selected headset.
            </p>

            <div className="mt-4 space-y-5">
              {ZOE_COMMAND_CATALOG.map((group) => (
                <div key={group.area} className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
                    {group.area}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {group.commands.map((command) => (
                      <li key={command.example} className="text-sm">
                        <span className="font-medium">&ldquo;{command.example}&rdquo;</span>
                        <span className="text-muted-foreground"> — {command.does}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <VoiceCommandsSettings />
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandsPage;
