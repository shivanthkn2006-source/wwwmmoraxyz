// ═══════════════════════════════════════════════════════════════════════════════
// ASI TEST PAGE: Quantum Processing Integration Testing
// Test Pentarchy Swarm, Neuro-Symbolic Truth Engine, Quantum Loop
// Now with full ASI Root Connection Status
// ═══════════════════════════════════════════════════════════════════════════════

import { ASIDemoPanel } from '@/components/asi/ASIDemoPanel';
import { QuantumThoughtVisualization } from '@/components/asi/QuantumThoughtVisualization';
import { ASIStatusMonitor } from '@/components/asi/ASIStatusMonitor';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Brain, Zap, Atom, Sparkles, Activity, TestTube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useASIRoot } from '@/hooks/useASIRoot';

export default function ASITestPage() {
  const navigate = useNavigate();
  const [showVisualization, setShowVisualization] = useState(false);
  const { status, isConnected } = useASIRoot();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            ZOE ASI Test Console
          </h1>
          <p className="text-sm text-muted-foreground">
            Pentarchy Swarm • Truth Engine • Quantum Loop • Root Connection
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-400" />
            <div>
              <p className="text-xs text-muted-foreground">Pentarchy</p>
              <p className="text-sm font-bold text-violet-400">5 Agents</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="text-xs text-muted-foreground">Root Status</p>
              <p className={`text-sm font-bold ${isConnected ? 'text-cyan-400' : 'text-muted-foreground'}`}>
                {isConnected ? 'Connected' : 'Offline'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <Atom className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">Total Queries</p>
              <p className="text-sm font-bold text-amber-400">{status?.totalQueries ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">ASI Level</p>
              <p className="text-sm font-bold text-emerald-400">7.5x</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test
          </TabsTrigger>
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Visual
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="status" className="space-y-4">
          <ASIStatusMonitor />
        </TabsContent>
        
        <TabsContent value="test" className="space-y-4">
          <ASIDemoPanel />
        </TabsContent>
        
        <TabsContent value="visual" className="space-y-4">
          <div className="mb-4">
            <Button
              variant={showVisualization ? "default" : "outline"}
              onClick={() => setShowVisualization(!showVisualization)}
              className="w-full"
            >
              {showVisualization ? "Hide" : "Show"} Quantum Thought Visualization
            </Button>
          </div>
          
          {showVisualization && (
            <QuantumThoughtVisualization
              isProcessing={false}
              agentStatuses={{
                'LOGOS': { status: 'idle', confidence: 0 },
                'SOPHIA': { status: 'idle', confidence: 0 },
                'CHRONOS': { status: 'idle', confidence: 0 },
                'ARITHMOS': { status: 'idle', confidence: 0 },
                'THEMIS': { status: 'idle', confidence: 0 },
              }}
              overallConfidence={0}
              currentPhase="Ready"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
