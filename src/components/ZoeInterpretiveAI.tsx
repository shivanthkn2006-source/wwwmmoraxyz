import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, Zap, TrendingUp, Sparkles, 
  Users, Target, Lightbulb, ChevronDown, ChevronUp,
  Activity, Cpu, Database, RefreshCw, Eye, Search, Headphones, Shield, Globe,
  Save, FolderOpen, BookOpen, Trash2, Download, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useZoeMultiAgent, type AgentMode } from '@/hooks/useZoeMultiAgent';
import { ZoeInterpretiveAITutorial } from './ZoeInterpretiveAITutorial';
import { useAutoSaveNotes } from '@/hooks/useAutoSaveNotes';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import BusinessServiceRegistration from './BusinessServiceRegistration';
import PremiumImageGeneration from './PremiumImageGeneration';
import ServiceAIAgent from './ServiceAIAgent';
import {
  VisualAnalysisModal,
  UniversalSearchModal,
  KnowledgeManagementModal,
  ErrorPredictionModal,
  KnowledgeSynthesisModal
} from './SpecializedCapabilityModals';
import { ZoeOrbIcon } from './ZoeOrbIcon';

const specializedCapabilities = [
  { name: 'Task Decomposition', icon: '🔍', agents: ['PLANNER', 'COORDINATOR'], actionType: null },
  { name: 'Autonomous Planning', icon: '🎯', agents: ['PLANNER', 'EXECUTOR'], actionType: null },
  { name: 'Continuous Learning', icon: '🧠', agents: ['LEARNING', 'OPTIMIZER'], actionType: null },
  { name: 'Agent Coordination', icon: '🤝', agents: ['COORDINATOR'], actionType: null },
  { name: 'Predictive Intelligence', icon: '🔮', agents: ['LEARNING', 'RESEARCHER'], actionType: null },
  { name: 'Workflow Optimization', icon: '⚡', agents: ['OPTIMIZER', 'EXECUTOR'], actionType: null },
  { name: 'Visual Analysis', icon: '👁️', agents: ['RESEARCHER'], description: 'Face detection, emotion recognition, content ID', actionType: 'visual_analysis' },
  { name: 'Universal Search', icon: '🔎', agents: ['RESEARCHER', 'COORDINATOR'], description: 'Multi-modal platform-wide search', actionType: 'universal_search' },
  { name: 'Knowledge Management', icon: '📚', agents: ['RESEARCHER', 'LEARNING'], description: 'Scan, tag & organize support libraries', actionType: 'knowledge_management' },
  { name: 'Intelligent Automation', icon: '🤖', agents: ['EXECUTOR', 'PLANNER'], description: 'Chatbots for repetitive inquiries', actionType: null },
  { name: 'Generative Content', icon: '✨', agents: ['RESEARCHER', 'EXECUTOR'], description: 'Tailored help & instant summaries', actionType: 'image_generation' },
  { name: '24/7 Service AI', icon: '🎧', agents: ['PLANNER', 'RESEARCHER', 'EXECUTOR'], description: '94% autonomous resolution rate', actionType: 'business_registration' },
  { name: 'Error Prediction', icon: '🛡️', agents: ['OPTIMIZER', 'LEARNING'], description: 'Proactive system health monitoring', actionType: 'error_prediction' },
  { name: 'Knowledge Synthesis', icon: '🌐', agents: ['RESEARCHER', 'LEARNING', 'COORDINATOR'], description: 'Cross-domain integration', actionType: 'knowledge_synthesis' }
];

interface ExpandedContentProps {
  modes: any[];
  selectedMode: AgentMode;
  setSelectedMode: (mode: AgentMode) => void;
  command: string;
  setCommand: (cmd: string) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleExecute: () => void;
  isProcessing: boolean;
  lastResponse: any;
  agentHistory: any[];
  handleCapabilityClick: (actionType: string | null) => void;
}

const ExpandedContent = ({
  modes,
  selectedMode,
  setSelectedMode,
  command,
  setCommand,
  handleKeyPress,
  handleExecute,
  isProcessing,
  lastResponse,
  agentHistory,
  handleCapabilityClick
}: ExpandedContentProps) => (
  <>
    {/* Mode Selection - ONI Styled */}
    <div className="space-y-2">
      <label className="text-xs font-medium oni-data-text flex items-center gap-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        <Network className="w-3 h-3 text-[hsl(var(--oni-cyan))]" />
        Operating Mode
      </label>
      <div className="grid grid-cols-2 gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.id}
              whileHover={{ scale: 1.02, x: 3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMode(mode.id)}
              className={`relative p-3 rounded-lg transition-all group oni-data-strip ${
                selectedMode === mode.id
                  ? 'border-[hsl(var(--oni-cyan))]/50 bg-gradient-to-br from-[hsl(var(--oni-purple))]/20 to-[hsl(var(--oni-cyan))]/10 shadow-[0_0_15px_hsl(var(--oni-cyan)/0.3)]'
                  : 'border-white/10 bg-[hsl(var(--oni-void))]/80 hover:bg-white/5 hover:border-[hsl(var(--oni-cyan))]/30'
              }`}
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <div className="flex flex-col items-start gap-1">
                <Icon className={`w-4 h-4 ${
                  selectedMode === mode.id ? 'text-[hsl(var(--oni-cyan))]' : 'text-muted-foreground'
                }`} />
                <div className="text-left">
                  <div className="text-xs font-semibold text-foreground" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    {mode.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {mode.description}
                  </div>
                </div>
              </div>
              {selectedMode === mode.id && (
                <motion.div
                  layoutId="selectedMode"
                  className="absolute inset-0 border-2 border-[hsl(var(--oni-cyan))]/50 rounded-lg pointer-events-none shadow-[0_0_10px_hsl(var(--oni-cyan)/0.4)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>

    {/* Command Input - ONI Stealth Style */}
    <div className="space-y-2">
      <label className="text-xs font-medium oni-data-text flex items-center gap-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        <Lightbulb className="w-3 h-3 text-[hsl(var(--oni-cyan))]" />
        Neural Command
      </label>
      <div className="flex gap-2">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="E.g., Optimize my daily workflow..."
          className="bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-cyan))]/30 text-sm focus:border-[hsl(var(--oni-cyan))]/70 focus:shadow-[0_0_10px_hsl(var(--oni-cyan)/0.3)] transition-all"
          style={{ backdropFilter: 'blur(12px)', fontFamily: "'Share Tech Mono', monospace" }}
          disabled={isProcessing}
        />
        <Button
          onClick={handleExecute}
          disabled={isProcessing || !command.trim()}
          className="bg-gradient-to-r from-[hsl(var(--oni-purple))] to-[hsl(var(--oni-cyan))] hover:shadow-[0_0_20px_hsl(var(--oni-cyan)/0.5)] transition-all"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>

    {/* Active Agents Indicator - ONI Waterfall Style */}
    {lastResponse && (
      <motion.div
        key={lastResponse.message}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* System Status - ONI Neural Panel */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-[hsl(var(--oni-purple))]/10 to-[hsl(var(--oni-cyan))]/10 border border-[hsl(var(--oni-cyan))]/30 shadow-[0_0_15px_hsl(var(--oni-cyan)/0.2)]" style={{ backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[hsl(var(--oni-cyan))] animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-foreground" style={{ fontFamily: "'Orbitron', sans-serif" }}>Neural Core Active</div>
              <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {lastResponse.systemStatus.agents_active} agents • {lastResponse.systemStatus.operations_completed} ops
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-[hsl(var(--oni-cyan))]/50 text-[hsl(var(--oni-cyan))] shadow-[0_0_8px_hsl(var(--oni-cyan)/0.4)]">
            <span className="w-1.5 h-1.5 bg-[hsl(var(--oni-cyan))] rounded-full mr-1.5 animate-pulse" />
            Online
          </Badge>
        </div>

        {/* Response - ONI Waterfall Data Stream */}
        <div className="relative p-3 rounded-lg bg-[hsl(var(--oni-void))]/90 border border-[hsl(var(--oni-cyan))]/20 space-y-2 max-h-[400px] overflow-y-auto" style={{ backdropFilter: 'blur(16px)' }}>
          {/* Sentiment Line */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[hsl(var(--oni-cyan))] via-[hsl(var(--oni-purple))] to-[hsl(var(--oni-cyan))] rounded-l-lg animate-pulse" />
          
          <div className="flex items-center gap-2 ml-2">
            <Cpu className="w-3 h-3 text-[hsl(var(--oni-cyan))]" />
            <span className="text-xs font-medium text-foreground" style={{ fontFamily: "'Orbitron', sans-serif" }}>Neural Response</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap ml-2 oni-decode-text" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {lastResponse.message}
          </p>
          
          {/* Agent Executions - Neural Nodes */}
          {lastResponse.agentExecutions && lastResponse.agentExecutions.length > 0 && (
            <div className="mt-3 space-y-1.5 ml-2">
              {lastResponse.agentExecutions.map((execution: any, idx: number) => (
                <div 
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded bg-[hsl(var(--oni-purple))]/10 border border-[hsl(var(--oni-purple))]/30 oni-neural-node"
                >
                  <Database className="w-3 h-3 text-[hsl(var(--oni-cyan))] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {execution.agentsInvolved.map((agent: string, i: number) => (
                        <Badge 
                          key={i} 
                          variant="outline" 
                          className="text-[9px] px-1 py-0 border-[hsl(var(--oni-cyan))]/40 text-[hsl(var(--oni-cyan))]"
                        >
                          {agent}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {execution.functionName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coordination Log - ONI Terminal */}
        {lastResponse.coordinationLog && lastResponse.coordinationLog.length > 0 && (
          <div className="p-2 rounded-lg bg-[hsl(var(--oni-void))] border border-[hsl(var(--oni-cyan))]/20 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-[hsl(var(--oni-cyan))]/30" style={{ backdropFilter: 'blur(8px)' }}>
            {lastResponse.coordinationLog.map((log: string, idx: number) => (
              <div key={idx} className="text-[10px] text-[hsl(var(--oni-cyan))]/70 py-0.5" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                <span className="text-[hsl(var(--oni-purple))]">›</span> {log}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    )}

    {/* Specialized Capabilities - ONI Neural Grid */}
    <div className="p-3 rounded-lg bg-gradient-to-br from-[hsl(var(--oni-purple))]/10 to-[hsl(var(--oni-cyan))]/5 border border-[hsl(var(--oni-cyan))]/20 shadow-[0_0_20px_hsl(var(--oni-purple)/0.1)]" style={{ backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3 h-3 text-[hsl(var(--oni-cyan))]" />
        <span className="text-xs font-medium text-foreground" style={{ fontFamily: "'Orbitron', sans-serif" }}>Neural Capabilities</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {specializedCapabilities.map((cap, idx) => (
          <motion.div 
            key={idx}
            onClick={() => handleCapabilityClick(cap.actionType)}
            whileHover={{ x: 3, scale: 1.01 }}
            className={`p-2 rounded-lg border transition-all cursor-pointer group oni-data-strip ${
              cap.actionType 
                ? 'bg-[hsl(var(--oni-void))]/80 border-[hsl(var(--oni-purple))]/30 hover:bg-[hsl(var(--oni-purple))]/15 hover:border-[hsl(var(--oni-cyan))]/50 hover:shadow-[0_0_12px_hsl(var(--oni-cyan)/0.3)]' 
                : 'bg-[hsl(var(--oni-void))]/60 border-white/5 hover:bg-white/5'
            }`}
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0">{cap.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-foreground mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {cap.name}
                </div>
                {cap.description && (
                  <div className="text-[9px] text-muted-foreground mb-1.5">
                    {cap.description}
                  </div>
                )}
                <div className="flex flex-wrap gap-0.5">
                  {cap.agents.map((agent, i) => (
                    <Badge 
                      key={i}
                      variant="outline"
                      className="text-[8px] px-1 py-0 border-[hsl(var(--oni-cyan))]/30 text-[hsl(var(--oni-cyan))]"
                    >
                      {agent}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20 space-y-3">
        <div className="text-[11px] font-bold text-foreground mb-2">
          Enterprise Customer Service AI
        </div>
        
        <div className="space-y-2 text-[10px] text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">📚</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">Knowledge Management:</span>
              <span className="block mt-0.5">Scan, tag & organize massive support libraries.</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">🤖</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">Intelligent Automation:</span>
              <span className="block mt-0.5">Advanced chatbots handle repetitive inquiries autonomously.</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">✨</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">Generative Content:</span>
              <span className="block mt-0.5">Instantly create tailored help content.</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">🎧</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">24/7 Service:</span>
              <span className="block mt-0.5">94% autonomous resolution rate.</span>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-white/10 space-y-1.5">
          <div className="text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-purple-400" />
              <span className="font-semibold text-foreground">Vision AI:</span>
              <span>Face detection, emotion analysis</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Search className="w-3 h-3 text-cyan-400" />
              <span className="font-semibold text-foreground">Universal Search:</span>
              <span>Multi-modal search</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-orange-400" />
              <span className="font-semibold text-foreground">Proactive:</span>
              <span>Scan for future errors</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-blue-400" />
              <span className="font-semibold text-foreground">Knowledge Synthesis:</span>
              <span>Cross-domain insights</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Stats - ONI Cortical Display */}
    <div className="grid grid-cols-2 gap-2 text-center">
      <div className="p-2 rounded-lg bg-[hsl(var(--oni-void))]/80 border border-[hsl(var(--oni-purple))]/30" style={{ backdropFilter: 'blur(8px)' }}>
        <div className="text-lg font-bold text-[hsl(var(--oni-purple))]" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 10px hsl(var(--oni-purple))' }}>{agentHistory.length}</div>
        <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Neural Ops</div>
      </div>
      <div className="p-2 rounded-lg bg-[hsl(var(--oni-void))]/80 border border-[hsl(var(--oni-cyan))]/30" style={{ backdropFilter: 'blur(8px)' }}>
        <div className="text-lg font-bold text-[hsl(var(--oni-cyan))]" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 10px hsl(var(--oni-cyan))' }}>
          {lastResponse?.systemStatus?.learning_enabled ? 'Active' : 'Standby'}
        </div>
        <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Learning Core</div>
      </div>
    </div>
  </>
);

interface ZoeInterpretiveAIProps {
  embedded?: boolean;
}

const ZoeInterpretiveAI = ({ embedded = false }: ZoeInterpretiveAIProps) => {
  // In embedded mode, always expanded; in floating mode, start collapsed
  const [isExpanded, setIsExpanded] = useState(embedded ? true : false);
  const [command, setCommand] = useState('');
  const [selectedMode, setSelectedMode] = useState<AgentMode>('autonomous');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSavedTasks, setShowSavedTasks] = useState(false);
  const [savedTasks, setSavedTasks] = useState<any[]>([]);
  const [taskName, setTaskName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // Modal states for specialized capabilities
  const [showBusinessRegistration, setShowBusinessRegistration] = useState(false);
  const [showServiceAIAgent, setShowServiceAIAgent] = useState(false);
  const [showImageGeneration, setShowImageGeneration] = useState(false);
  const [showVisualAnalysis, setShowVisualAnalysis] = useState(false);
  const [showUniversalSearch, setShowUniversalSearch] = useState(false);
  const [showKnowledgeManagement, setShowKnowledgeManagement] = useState(false);
  const [showErrorPrediction, setShowErrorPrediction] = useState(false);
  const [showKnowledgeSynthesis, setShowKnowledgeSynthesis] = useState(false);
  
  const { 
    executeMultiAgentCommand, 
    isProcessing, 
    lastResponse,
    agentHistory,
    agentTypes,
    saveTask,
    getSavedTasks,
    loadTask,
    deleteTask
  } = useZoeMultiAgent();
  
  const { exportToPDF } = useAutoSaveNotes('interpretive');

  // Load saved tasks when opening the saved tasks dialog
  useEffect(() => {
    if (showSavedTasks) {
      loadSavedTasks();
    }
  }, [showSavedTasks]);

  // Listen for open-service-ai-agent event
  useEffect(() => {
    const handleOpenServiceAgent = () => {
      setShowServiceAIAgent(true);
    };
    window.addEventListener('open-service-ai-agent', handleOpenServiceAgent);
    return () => window.removeEventListener('open-service-ai-agent', handleOpenServiceAgent);
  }, []);

  const loadSavedTasks = async () => {
    const tasks = await getSavedTasks();
    setSavedTasks(tasks);
  };

  const modes = [
    {
      id: 'autonomous' as AgentMode,
      icon: Zap,
      label: 'Autonomous',
      description: 'Execute with minimal human intervention',
      color: 'from-purple-500/20 to-pink-500/20'
    },
    {
      id: 'collaborative' as AgentMode,
      icon: Users,
      label: 'Collaborative',
      description: 'Multiple agents working together',
      color: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      id: 'adaptive' as AgentMode,
      icon: TrendingUp,
      label: 'Adaptive',
      description: 'Learn and adapt from interactions',
      color: 'from-green-500/20 to-emerald-500/20'
    },
    {
      id: 'predictive' as AgentMode,
      icon: Target,
      label: 'Predictive',
      description: 'Anticipate needs proactively',
      color: 'from-orange-500/20 to-amber-500/20'
    }
  ];

  const handleExecute = async () => {
    if (!command.trim()) {
      toast.error('Please enter a command');
      return;
    }

    try {
      await executeMultiAgentCommand(command, selectedMode);
      toast.success('Multi-agent system executed successfully!', {
        description: 'Check the response below'
      });
    } catch (error) {
      console.error('Execution error:', error);
      // Error is already handled in the hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  const handleSaveTask = async () => {
    if (!taskName.trim()) {
      toast.error('Please enter a task name');
      return;
    }
    const success = await saveTask(taskName);
    if (success) {
      setShowSaveDialog(false);
      setTaskName('');
    }
  };

  const handleLoadTask = async (taskId: string) => {
    await loadTask(taskId);
    setShowSavedTasks(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    const success = await deleteTask(taskId);
    if (success) {
      loadSavedTasks();
    }
  };

  const handleTryExample = (example: string, mode: string) => {
    setCommand(example);
    setSelectedMode(mode as AgentMode);
    setIsExpanded(true);
  };

  const handleCapabilityClick = (actionType: string | null) => {
    if (!actionType) {
      toast.info('This capability is triggered via command input');
      return;
    }
    switch (actionType) {
      case 'business_registration':
        setShowBusinessRegistration(true);
        break;
      case 'service_ai_agent':
        setShowServiceAIAgent(true);
        break;
      case 'image_generation':
        setShowImageGeneration(true);
        break;
      case 'visual_analysis':
        setShowVisualAnalysis(true);
        break;
      case 'universal_search':
        setShowUniversalSearch(true);
        break;
      case 'knowledge_management':
        setShowKnowledgeManagement(true);
        break;
      case 'error_prediction':
        setShowErrorPrediction(true);
        break;
      case 'knowledge_synthesis':
        setShowKnowledgeSynthesis(true);
        break;
      default:
        toast.info('Feature coming soon');
    }
  };

  return (
    <>
      <ZoeInterpretiveAITutorial 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onTryExample={handleTryExample}
      />

      {/* Save Task Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-purple-400" />
              Save Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Enter task name..."
              className="bg-white/5 border-white/10"
              onKeyPress={(e) => e.key === 'Enter' && handleSaveTask()}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveTask}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Tasks Dialog */}
      <Dialog open={showSavedTasks} onOpenChange={setShowSavedTasks}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-purple-500/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-400" />
              Saved Tasks
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {savedTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No saved tasks yet</p>
                </div>
              ) : (
                savedTasks.map((task) => (
                  <Card key={task.id} className="p-4 bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground mb-1">{task.task_name}</h4>
                        <p className="text-xs text-muted-foreground mb-2 truncate">
                          {task.command}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {task.mode}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadTask(task.id)}
                          className="border-purple-500/30 hover:bg-purple-500/10"
                        >
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTask(task.id)}
                          className="border-red-500/30 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Main Panel - ONI Neuro-Glass Container */}
      <div className={embedded 
        ? "w-full" 
        : "fixed bottom-[72px] right-1 left-1 sm:left-auto sm:right-2 sm:w-[340px] md:w-[380px] lg:w-[420px] z-[60]"
      }>
        <motion.div
          initial={embedded ? { opacity: 0, y: 20 } : { y: 100, opacity: 0 }}
          animate={embedded ? { opacity: 1, y: 0 } : { y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={embedded ? "" : "max-h-[calc(100vh-140px)]"}
        >
          <Card className={`oni-neuro-glass border border-[hsl(var(--oni-cyan))]/30 shadow-[0_0_20px_hsl(var(--oni-purple)/0.2)] bg-[hsl(var(--oni-void))]/95 ${embedded ? '' : 'max-h-[calc(100vh-140px)] overflow-hidden flex flex-col'}`} style={{ backdropFilter: 'blur(20px)' }}>
            {/* Header - ONI Holographic Style */}
            <div 
              className={`p-3 sm:p-4 transition-all duration-200 border-b border-[hsl(var(--oni-cyan))]/20 ${embedded ? '' : 'cursor-pointer hover:bg-[hsl(var(--oni-cyan))]/5 active:bg-[hsl(var(--oni-cyan))]/10'}`}
              onClick={() => !embedded && setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-white/10 rounded-xl blur-sm" />
                    <div className="relative bg-white/10 backdrop-blur-md rounded-xl p-1.5 sm:p-2 border border-white/20 shadow-lg">
                      <ZoeOrbIcon size="md" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5 sm:gap-2 flex-wrap" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                      <span className="truncate text-[hsl(var(--oni-cyan))]" style={{ textShadow: '0 0 10px hsl(var(--oni-cyan))' }}>Zoe Interpretive AI</span>
                      <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 border-[hsl(var(--oni-purple))]/50 text-[hsl(var(--oni-purple))] shadow-[0_0_8px_hsl(var(--oni-purple)/0.4)] flex-shrink-0">
                        Multi-Agent
                      </Badge>
                    </h3>
                    <p className="text-[10px] sm:text-xs text-[hsl(var(--oni-cyan))]/70 truncate" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Vision • Search • Service • Intelligence</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTutorial(true);
                    }}
                    className="border-[hsl(var(--oni-cyan))]/30 hover:bg-[hsl(var(--oni-cyan))]/10 hover:shadow-[0_0_10px_hsl(var(--oni-cyan)/0.3)] h-8 w-8 p-0 transition-all"
                    title="Tutorial"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[hsl(var(--oni-cyan))]" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSavedTasks(true);
                    }}
                    className="border-[hsl(var(--oni-cyan))]/30 hover:bg-[hsl(var(--oni-cyan))]/10 hover:shadow-[0_0_10px_hsl(var(--oni-cyan)/0.3)] h-8 w-8 p-0 transition-all"
                    title="Saved Tasks"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-[hsl(var(--oni-cyan))]" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToPDF();
                    }}
                    className="bg-gradient-to-r from-[hsl(var(--oni-purple))] to-[hsl(var(--oni-cyan))] hover:shadow-[0_0_15px_hsl(var(--oni-cyan)/0.5)] h-8 px-2 text-[10px] sm:text-xs hidden sm:flex transition-all"
                    title="Export to PDF"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden md:inline">Export</span>
                  </Button>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-1"
                  >
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--oni-cyan))]" />
                  </motion.div>
                </div>
              </div>
            </div>

          {/* Expandable Content */}
          {embedded ? (
            // Embedded mode: always visible, scrollable
            <div className="px-2 sm:px-3 pb-2 sm:pb-3 space-y-2 sm:space-y-3 overflow-y-auto flex-1">
              <ExpandedContent 
                modes={modes}
                selectedMode={selectedMode}
                setSelectedMode={setSelectedMode}
                command={command}
                setCommand={setCommand}
                handleKeyPress={handleKeyPress}
                handleExecute={handleExecute}
                isProcessing={isProcessing}
                lastResponse={lastResponse}
                agentHistory={agentHistory}
                handleCapabilityClick={handleCapabilityClick}
              />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-y-auto flex-1 max-h-[calc(100vh-260px)]"
                >
                  <div className="px-3 pb-3 space-y-3">
                    <ExpandedContent 
                      modes={modes}
                      selectedMode={selectedMode}
                      setSelectedMode={setSelectedMode}
                      command={command}
                      setCommand={setCommand}
                      handleKeyPress={handleKeyPress}
                      handleExecute={handleExecute}
                      isProcessing={isProcessing}
                      lastResponse={lastResponse}
                      agentHistory={agentHistory}
                      handleCapabilityClick={handleCapabilityClick}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </Card>
      </motion.div>
      </div>

      {/* Specialized Capability Modals */}
      <BusinessServiceRegistration 
        isOpen={showBusinessRegistration} 
        onClose={() => setShowBusinessRegistration(false)} 
      />
      <PremiumImageGeneration 
        isOpen={showImageGeneration} 
        onClose={() => setShowImageGeneration(false)} 
      />
      <VisualAnalysisModal 
        isOpen={showVisualAnalysis} 
        onClose={() => setShowVisualAnalysis(false)} 
      />
      <UniversalSearchModal 
        isOpen={showUniversalSearch} 
        onClose={() => setShowUniversalSearch(false)} 
      />
      <KnowledgeManagementModal 
        isOpen={showKnowledgeManagement} 
        onClose={() => setShowKnowledgeManagement(false)} 
      />
      <ErrorPredictionModal 
        isOpen={showErrorPrediction} 
        onClose={() => setShowErrorPrediction(false)} 
      />
      <KnowledgeSynthesisModal 
        isOpen={showKnowledgeSynthesis} 
        onClose={() => setShowKnowledgeSynthesis(false)} 
      />
      <ServiceAIAgent 
        isOpen={showServiceAIAgent} 
        onClose={() => setShowServiceAIAgent(false)}
        businessName="Universe of Life"
        businessContext="You are the customer service AI for the Universe of Life platform. Help users with questions about Huddle events, WebDrop creative tools, Universal Timeline exploration, Solar System Explorer, Zoe Dreams AI, voice commands, profile settings, and general platform navigation."
      />
    </>
  );
};

export default ZoeInterpretiveAI;
