// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION REQUEST CARD
// Visual approval UI for actions that exceed the Sovereignty Leash
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Check, 
  X,
  Lock,
  Unlock,
  Mail,
  MessageSquare,
  Home,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PermissionRequest, 
  RiskLevel, 
  RISK_COLORS,
  ActionCategory,
  CATEGORY_ICONS 
} from '@/types/matterBridge';

interface PermissionRequestCardProps {
  request: PermissionRequest;
  onApprove: (request: PermissionRequest) => void;
  onReject: (request: PermissionRequest) => void;
  isProcessing?: boolean;
}

const RiskIcon: React.FC<{ level: RiskLevel }> = ({ level }) => {
  switch (level) {
    case 'low':
      return <Shield className="w-5 h-5 text-emerald-400" />;
    case 'medium':
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    case 'high':
      return <AlertTriangle className="w-5 h-5 text-orange-400" />;
    case 'critical':
      return <Lock className="w-5 h-5 text-red-400" />;
    default:
      return <Shield className="w-5 h-5" />;
  }
};

const ActionIcon: React.FC<{ actionId: string }> = ({ actionId }) => {
  const iconClass = "w-8 h-8";
  
  switch (actionId) {
    case 'lock_door':
      return <Lock className={`${iconClass} text-blue-400`} />;
    case 'unlock_door':
      return <Unlock className={`${iconClass} text-red-400`} />;
    case 'send_message':
    case 'draft_email':
      return <Mail className={`${iconClass} text-purple-400`} />;
    case 'draft_sms':
      return <MessageSquare className={`${iconClass} text-green-400`} />;
    case 'execute_payment':
    case 'execute_trade':
      return <DollarSign className={`${iconClass} text-yellow-400`} />;
    case 'turn_off_lights':
      return <Home className={`${iconClass} text-orange-400`} />;
    default:
      return <Zap className={`${iconClass} text-cyan-400`} />;
  }
};

export const PermissionRequestCard: React.FC<PermissionRequestCardProps> = ({
  request,
  onApprove,
  onReject,
  isProcessing = false
}) => {
  const colors = RISK_COLORS[request.riskLevel];
  const expiresIn = new Date(request.expiresAt).getTime() - Date.now();
  const expiresMinutes = Math.max(0, Math.floor(expiresIn / 60000));
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`
          relative overflow-hidden
          bg-background/80 backdrop-blur-xl
          ${colors.border} border-2
          shadow-2xl
        `}>
          {/* Glow effect based on risk level */}
          <div className={`
            absolute inset-0 opacity-20
            ${request.riskLevel === 'critical' ? 'bg-gradient-to-br from-red-500/20 to-transparent' : ''}
            ${request.riskLevel === 'high' ? 'bg-gradient-to-br from-orange-500/20 to-transparent' : ''}
            ${request.riskLevel === 'medium' ? 'bg-gradient-to-br from-yellow-500/20 to-transparent' : ''}
            ${request.riskLevel === 'low' ? 'bg-gradient-to-br from-emerald-500/20 to-transparent' : ''}
          `} />
          
          <CardHeader className="relative pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                  <ActionIcon actionId={request.actionId} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Permission Required
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {request.actionName}
                  </p>
                </div>
              </div>
              
              <Badge 
                variant="outline" 
                className={`${colors.bg} ${colors.text} ${colors.border} uppercase text-xs font-bold`}
              >
                <RiskIcon level={request.riskLevel} />
                <span className="ml-1">{request.riskLevel}</span>
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="relative space-y-4">
            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {request.description}
            </p>
            
            {/* Reason for approval */}
            <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-4 h-4 mt-0.5 ${colors.text}`} />
                <p className={`text-sm ${colors.text}`}>
                  {request.reason}
                </p>
              </div>
            </div>
            
            {/* Budget impact if applicable */}
            {request.budgetImpact !== undefined && request.budgetImpact > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <span className="text-muted-foreground">Budget impact:</span>
                <span className="font-mono font-semibold text-yellow-400">
                  ${request.budgetImpact.toFixed(2)}
                </span>
              </div>
            )}
            
            {/* Expiration timer */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                Expires in {expiresMinutes} minute{expiresMinutes !== 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Parameters preview */}
            {Object.keys(request.parameters).length > 0 && (
              <div className="p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Parameters:</p>
                <pre className="text-xs font-mono text-foreground/80 overflow-x-auto">
                  {JSON.stringify(request.parameters, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="relative flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => onReject(request)}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
            
            <Button
              className={`flex-1 ${
                request.riskLevel === 'critical' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-primary hover:bg-primary/90'
              }`}
              onClick={() => onApprove(request)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="animate-gpu-spin">
                  <Zap className="w-4 h-4 mr-2" />
                </div>
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Approve & Execute
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default PermissionRequestCard;
