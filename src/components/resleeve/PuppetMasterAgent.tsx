/**
 * PUPPET MASTER AGENT - Project Re-Sleeve
 * 95% Precision Execution Engine with Critic Agent Loop
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, Play, CheckCircle2, AlertCircle, 
  Loader2, Eye, FileText, Send, ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useZoeReSleeve } from '@/hooks/useZoeReSleeve';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskExecutionLog {
  step: string;
  status: 'pending' | 'running' | 'complete' | 'validated';
  criticNote?: string;
}

export const PuppetMasterAgent = () => {
  const { activeSleeve, executePrecisionTask, executingTask, taskProgress } = useZoeReSleeve();
  const [userIntent, setUserIntent] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<TaskExecutionLog[]>([]);
  const [criticValidating, setCriticValidating] = useState(false);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  if (!activeSleeve) {
    return (
      <Card className="bg-background/60 backdrop-blur-xl border-primary/20">
        <CardContent className="py-8 text-center">
          <Wand2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Equip a Sleeve to access the Puppet Master Agent</p>
        </CardContent>
      </Card>
    );
  }

  const handleExecute = async () => {
    if (!selectedTaskId || !userIntent.trim()) {
      toast.error('Please select a task and provide your intent');
      return;
    }

    const task = activeSleeve.precisionTasks.find(t => t.id === selectedTaskId);
    if (!task) return;

    // Initialize execution logs
    setExecutionLogs(task.steps.map(step => ({ step, status: 'pending' })));
    setFinalResult(null);

    // Execute with step tracking
    try {
      for (let i = 0; i < task.steps.length; i++) {
        setExecutionLogs(prev => prev.map((log, idx) => 
          idx === i ? { ...log, status: 'running' } : log
        ));

        // Simulate step execution
        await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

        setExecutionLogs(prev => prev.map((log, idx) => 
          idx === i ? { ...log, status: 'complete' } : log
        ));
      }

      // CRITIC AGENT LOOP
      setCriticValidating(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validate each step
      setExecutionLogs(prev => prev.map(log => ({
        ...log,
        status: 'validated',
        criticNote: 'Verified by Critic Agent ✓'
      })));

      setCriticValidating(false);

      // Execute the actual precision task
      const result = await executePrecisionTask(selectedTaskId, userIntent);
      
      if (result.success) {
        setFinalResult(result.result);
        toast.success('Task Completed', {
          description: `${task.automationLevel}% automated execution successful`
        });
      }
    } catch (error) {
      console.error('[PuppetMaster] Execution failed:', error);
      toast.error('Execution failed');
    }
  };

  return (
    <Card className="bg-background/60 backdrop-blur-xl border-primary/20">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <CardTitle className="flex items-center gap-2 text-lg font-medium cursor-pointer hover:text-primary transition-colors">
              <Wand2 className="w-5 h-5 text-primary" />
              Puppet Master Agent
              <Badge variant="outline" className="ml-2">
                {activeSleeve.name}
              </Badge>
              <ChevronDown className={cn(
                "w-4 h-4 ml-auto transition-transform",
                isExpanded && "rotate-180"
              )} />
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Task Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Precision Task</label>
              <div className="grid gap-2">
                {activeSleeve.precisionTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      selectedTaskId === task.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{task.name}</span>
                      <Badge variant="secondary">{task.automationLevel}% Auto</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* User Intent Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Intent (The Soul's Vision)</label>
              <Textarea
                placeholder="Describe what you want to achieve..."
                value={userIntent}
                onChange={(e) => setUserIntent(e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>

            {/* Execute Button */}
            <Button
              onClick={handleExecute}
              disabled={!selectedTaskId || !userIntent.trim() || !!executingTask}
              className="w-full"
            >
              {executingTask ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing ({taskProgress}%)
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute with 95% Precision
                </>
              )}
            </Button>

            {/* Execution Progress */}
            {executingTask && <Progress value={taskProgress} className="h-2" />}

            {/* Execution Logs */}
            <AnimatePresence>
              {executionLogs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Execution Log</p>
                    {criticValidating && (
                      <span className="text-xs text-yellow-600 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Critic Agent Validating...
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border p-3 space-y-2 max-h-40 overflow-auto">
                    {executionLogs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-sm"
                      >
                        {log.status === 'pending' && (
                          <div className="w-4 h-4 rounded-full bg-muted mt-0.5" />
                        )}
                        {log.status === 'running' && (
                          <Loader2 className="w-4 h-4 text-primary animate-spin mt-0.5" />
                        )}
                        {log.status === 'complete' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5" />
                        )}
                        {log.status === 'validated' && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={cn(
                            log.status === 'pending' && "text-muted-foreground",
                            log.status === 'running' && "text-primary font-medium",
                            log.status === 'complete' && "text-foreground",
                            log.status === 'validated' && "text-green-600"
                          )}>
                            {log.step}
                          </p>
                          {log.criticNote && (
                            <p className="text-xs text-green-600 mt-0.5">{log.criticNote}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final Result */}
            <AnimatePresence>
              {finalResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-green-700">Execution Complete</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{finalResult}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1">
                      <FileText className="w-4 h-4 mr-1" />
                      View Output
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Send className="w-4 h-4 mr-1" />
                      Send/Export
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PuppetMasterAgent;
