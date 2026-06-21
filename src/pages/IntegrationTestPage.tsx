import React, { useState } from 'react';
import { DigitalOntologyTestSuite } from '@/components/DigitalOntologyTestSuite';
import { ZoeDiagnosticsPanel } from '@/components/ZoeDiagnosticsPanel';
import { PermissionDashboard } from '@/components/PermissionDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Mic, MessageSquare, Volume2, Zap, Info, CheckCircle2, Activity, Stethoscope, Shield } from 'lucide-react';

const IntegrationTestPage = () => {
  const [activeTab, setActiveTab] = useState('permissions');

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Zoe Integration Test Suite
        </h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Guide
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              DB Tests
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="permissions">
            <div className="space-y-4">
              <PermissionDashboard />
              
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    About Platform Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    MMora requires various browser permissions to enable its full feature set.
                    Use the one-click activation above to grant all permissions at once.
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><strong>Microphone</strong> - Voice commands, Zoe conversations</li>
                    <li><strong>Camera</strong> - Face ID, AR effects, Zoe vision</li>
                    <li><strong>Location</strong> - Selfie City, weather, nearby features</li>
                    <li><strong>Notifications</strong> - Alerts, reminders, updates</li>
                    <li><strong>Motion/Orientation</strong> - AR experiences (iOS)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="diagnostics">
            <div className="space-y-4">
              <ZoeDiagnosticsPanel />
              
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-primary" />
                    What This Tests
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Speech Synthesis</strong> - Browser text-to-speech support</li>
                    <li><strong>Speech Recognition</strong> - Voice input capabilities</li>
                    <li><strong>Voice Output</strong> - Zoe's voice response system</li>
                    <li><strong>Zoe Chat</strong> - Main chat edge function</li>
                    <li><strong>Zoe Agent</strong> - Agentic AI capabilities</li>
                    <li><strong>Zoe Service AI</strong> - Customer service AI</li>
                    <li><strong>Database</strong> - Zoe settings persistence</li>
                    <li><strong>Network</strong> - API connectivity</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="guide">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-green-500" />
                    Step 1: Wake Word Activation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    To activate Zoe, simply say one of the following wake words:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Hey Zoe', 'OK Zoe', 'Hi Zoe', 'Zoe'].map(word => (
                      <Badge key={word} variant="secondary" className="text-sm">
                        "{word}"
                      </Badge>
                    ))}
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    <strong>Note:</strong> Ensure your microphone is enabled. You'll see the Zoe orb 
                    pulse when she's listening.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Step 2: Speak Your Command
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">
                    After Zoe is listening, speak your command naturally. Examples:
                  </p>
                  <div className="grid gap-2">
                    <div className="bg-muted/30 p-2 rounded text-sm">
                      <strong>Navigation:</strong> "Open home", "Go to profile", "Show messages"
                    </div>
                    <div className="bg-muted/30 p-2 rounded text-sm">
                      <strong>Content:</strong> "Create post about technology", "Update my bio to..."
                    </div>
                    <div className="bg-muted/30 p-2 rounded text-sm">
                      <strong>AI Features:</strong> "Open timeline", "Show my intelligence", "Analyze dreams"
                    </div>
                    <div className="bg-muted/30 p-2 rounded text-sm">
                      <strong>Huddle:</strong> "Show online users", "Zoom in", "Find users in New York"
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-purple-500" />
                    Step 3: Alternative Interaction Methods
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline">Tap Orb</Badge>
                      <span className="text-sm text-muted-foreground">
                        Opens the quick chat panel for typing
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline">Double-Tap</Badge>
                      <span className="text-sm text-muted-foreground">
                        Opens full Zoe AI Companion page
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline">Mic Button</Badge>
                      <span className="text-sm text-muted-foreground">
                        Toggle voice commands on/off manually
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline">Drag</Badge>
                      <span className="text-sm text-muted-foreground">
                        Move Zoe's orb anywhere on screen
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-500">
                    <Info className="w-5 h-5" />
                    Browser Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Chrome, Edge, or Safari recommended (best speech recognition)</li>
                    <li>Microphone permission must be granted</li>
                    <li>HTTPS required for voice features</li>
                    <li>Firefox has limited speech recognition support</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="tests">
            <DigitalOntologyTestSuite />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IntegrationTestPage;
