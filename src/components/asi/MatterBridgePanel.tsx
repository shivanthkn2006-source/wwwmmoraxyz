// ═══════════════════════════════════════════════════════════════════════════════
// MATTER BRIDGE CONTROL PANEL
// Complete UI for managing the Executive Action Engine
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Shield,
  DollarSign,
  Home,
  MessageSquare,
  Database,
  Settings,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useZoeMatterBridge } from '@/hooks/useZoeMatterBridge';
import { PermissionRequestCard } from './PermissionRequestCard';
import { CATEGORY_ICONS } from '@/types/matterBridge';

export const MatterBridgePanel: React.FC = () => {
  const {
    isExecuting,
    pendingApprovals,
    approveAction,
    rejectAction,
    autonomyLevel,
    updateAutonomyLevel,
    dailySpent,
    dailyLimit,
    budgetRemaining,
    lastDivineReport,
    executionHistory,
    sovereigntyLeash
  } = useZoeMatterBridge();

  const [showSettings, setShowSettings] = useState(false);

  const budgetPercentUsed = (dailySpent / dailyLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <Card className="bg-gradient-to-br from-cyan-500/10 via-background to-purple-500/10 border-cyan-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Matter Bridge</CardTitle>
                <CardDescription>Executive Action Engine • Module 2</CardDescription>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={`${isExecuting ? 'border-yellow-500/50 text-yellow-400' : 'border-emerald-500/50 text-emerald-400'}`}
            >
              <Activity className="w-3 h-3 mr-1" />
              {isExecuting ? 'Executing...' : 'Ready'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Divine Report Display */}
          {lastDivineReport && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-primary/5 border border-primary/20"
            >
              <p className="text-sm italic text-foreground/80">
                "{lastDivineReport}"
              </p>
            </motion.div>
          )}

          {/* Budget Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-muted-foreground">Daily Spent</span>
              </div>
              <p className="text-lg font-mono font-semibold">
                ${dailySpent.toFixed(2)}
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Remaining</span>
              </div>
              <p className="text-lg font-mono font-semibold text-emerald-400">
                ${budgetRemaining.toFixed(2)}
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-muted-foreground">Autonomy</span>
              </div>
              <p className="text-lg font-semibold">
                {autonomyLevel}%
              </p>
            </div>
          </div>

          {/* Budget Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Daily Budget Usage</span>
              <span>${dailySpent.toFixed(2)} / ${dailyLimit.toFixed(2)}</span>
            </div>
            <Progress 
              value={budgetPercentUsed} 
              className={`h-2 ${
                budgetPercentUsed > 80 ? 'bg-red-500/20' : 
                budgetPercentUsed > 50 ? 'bg-yellow-500/20' : 'bg-emerald-500/20'
              }`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold">Pending Approvals ({pendingApprovals.length})</h3>
          </div>
          
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {pendingApprovals.map((request) => (
                <PermissionRequestCard
                  key={request.id}
                  request={request}
                  onApprove={approveAction}
                  onReject={rejectAction}
                  isProcessing={isExecuting}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Controls */}
      <Tabs defaultValue="autonomy" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="autonomy">Autonomy</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="autonomy" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Zoe Autonomy Level</label>
                  <span className="text-2xl font-bold text-primary">{autonomyLevel}%</span>
                </div>
                
                <Slider
                  value={[autonomyLevel]}
                  onValueChange={(value) => updateAutonomyLevel(value[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>🛡️ Conservative</span>
                  <span>⚖️ Balanced</span>
                  <span>🚀 Autonomous</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground mb-1">Low Risk Actions</p>
                  <p className="font-medium">
                    {autonomyLevel >= 20 ? '✅ Auto-execute' : '🔒 Require approval'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground mb-1">Medium Risk Actions</p>
                  <p className="font-medium">
                    {autonomyLevel >= 50 ? '✅ Auto-execute' : '🔒 Require approval'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground mb-1">High Risk Actions</p>
                  <p className="font-medium">
                    {autonomyLevel >= 80 ? '⚠️ Auto-execute' : '🔒 Require approval'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground mb-1">Critical Actions</p>
                  <p className="font-medium">🔒 Always require approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Budget Permissions */}
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                  <h4 className="font-semibold">Financial Limits</h4>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Single Spend</p>
                    <p className="font-mono font-semibold">${sovereigntyLeash.budget.spendLimit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Daily Limit</p>
                    <p className="font-mono font-semibold">${sovereigntyLeash.budget.dailyLimit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trade Limit</p>
                    <p className="font-mono font-semibold">${sovereigntyLeash.budget.tradeLimit}</p>
                  </div>
                </div>
              </div>

              {/* Smart Home Permissions */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="w-5 h-5 text-blue-400" />
                  <h4 className="font-semibold">Smart Home</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Allowed</p>
                    <div className="flex flex-wrap gap-1">
                      {sovereigntyLeash.smartHome.allowed.map(action => (
                        <Badge key={action} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Forbidden</p>
                    <div className="flex flex-wrap gap-1">
                      {sovereigntyLeash.smartHome.forbidden.map(action => (
                        <Badge key={action} variant="outline" className="text-xs border-red-500/30 text-red-400">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Communication Permissions */}
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <h4 className="font-semibold">Communication</h4>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${sovereigntyLeash.communication.allowDraft ? 'text-emerald-400' : 'text-red-400'}`} />
                    <span>Draft Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${sovereigntyLeash.communication.allowSend ? 'text-emerald-400' : 'text-red-400'}`} />
                    <span>Send Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${sovereigntyLeash.communication.allowSchedule ? 'text-emerald-400' : 'text-red-400'}`} />
                    <span>Schedule</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-64">
                {executionHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No actions executed yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {executionHistory.slice().reverse().map((response, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {response.actionExecuted ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-400" />
                          )}
                          <span className="text-sm">
                            {response.divineActionReport?.substring(0, 60) || 'Action processed'}...
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {response.processingMs.toFixed(0)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MatterBridgePanel;
