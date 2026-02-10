// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY MODE PANEL - Phoenix Auto-Reply Settings
// Enable your Phoenix to respond on your behalf
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, MessageSquare, FileText, Brain, 
  AlertTriangle, CheckCircle, Info 
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { usePhoenixEngine } from '@/hooks/usePhoenixEngine';

export const LegacyModePanel: React.FC = () => {
  const { profile, toggleLegacyMode } = usePhoenixEngine();

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Complete consciousness sync to enable Legacy Mode
        </p>
      </div>
    );
  }

  const canEnableLegacy = profile.sync_score >= 80 && profile.resonance_verified;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Main Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-4 sm:p-6 rounded-2xl",
          "bg-gradient-to-br from-amber-500/10 to-amber-600/5",
          "border border-amber-500/20"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Legacy Mode
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Allow your Phoenix to respond on your behalf when you're offline
            </p>
          </div>
          <Switch
            checked={profile.legacy_mode_enabled}
            onCheckedChange={toggleLegacyMode}
            disabled={!canEnableLegacy}
            className="data-[state=checked]:bg-amber-500"
          />
        </div>

        {/* Requirements */}
        {!canEnableLegacy && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-500">
                <p className="font-medium">Requirements not met:</p>
                <ul className="mt-1 space-y-1">
                  {profile.sync_score < 80 && (
                    <li>• Sync score must be at least 80% (currently {profile.sync_score?.toFixed(1)}%)</li>
                  )}
                  {!profile.resonance_verified && (
                    <li>• Complete Mirror Test verification</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Active Status */}
        {profile.legacy_mode_enabled && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 font-medium">
                Legacy Mode Active - Phoenix will respond when you're offline
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Permissions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h4 className="text-sm font-medium text-foreground">Permissions</h4>
        
        <div className={cn(
          "p-3 sm:p-4 rounded-xl bg-card border border-primary/10",
          "flex items-center justify-between gap-4"
        )}>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Direct Messages</p>
              <p className="text-xs text-muted-foreground">Reply to personal messages</p>
            </div>
          </div>
          <Switch 
            checked={profile.legacy_permissions?.messages || false}
            disabled={!profile.legacy_mode_enabled}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <div className={cn(
          "p-3 sm:p-4 rounded-xl bg-card border border-primary/10",
          "flex items-center justify-between gap-4"
        )}>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Post Comments</p>
              <p className="text-xs text-muted-foreground">Respond to comments on your posts</p>
            </div>
          </div>
          <Switch 
            checked={profile.legacy_permissions?.posts || false}
            disabled={!profile.legacy_mode_enabled}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <div className={cn(
          "p-3 sm:p-4 rounded-xl bg-card border border-primary/10",
          "flex items-center justify-between gap-4 opacity-50"
        )}>
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Decisions</p>
              <p className="text-xs text-muted-foreground">Make choices on your behalf</p>
            </div>
          </div>
          <Switch 
            checked={false}
            disabled
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="p-3 bg-card/50 border border-primary/10 rounded-lg"
      >
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            All Phoenix responses are marked with a Phoenix icon so recipients know 
            it's your AI, not you directly. You can review and approve messages later.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
