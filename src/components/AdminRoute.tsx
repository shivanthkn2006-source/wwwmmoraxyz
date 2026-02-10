// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTE COMPONENT
// Restricts access to admin users only (@moksh50)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

// Admin usernames with full quantum access
const QUANTUM_ADMIN_USERS = ['moksh50', 'Moksh50'];

interface AdminRouteProps {
  children: React.ReactNode;
  featureName?: string;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children, featureName = 'this feature' }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();

        const hasAccess = profile?.username && 
          QUANTUM_ADMIN_USERS.some(admin => 
            admin.toLowerCase() === profile.username.toLowerCase()
          );

        setIsAdmin(hasAccess);
      } catch (error) {
        console.error('[AdminRoute] Access check failed:', error);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    };

    if (!authLoading) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  // Loading state - CSS animation for Safari performance
  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-gpu-spin-2s"
        />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Not admin - show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-black/80 backdrop-blur-xl p-8">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-purple-900/20" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 rounded-full blur-3xl" />
            
            <div className="relative z-10 text-center">
              {/* Lock icon with pulse - CSS animation */}
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border border-red-500/50 mb-6 animate-gpu-pulse-scale"
              >
                <Lock className="w-10 h-10 text-red-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-red-400 mb-2">
                ACCESS RESTRICTED
              </h1>
              
              <div className="flex items-center justify-center gap-2 text-red-300/60 text-sm mb-6">
                <Shield className="w-4 h-4" />
                <span>QUANTUM LEVEL PROTOCOL</span>
              </div>
              
              <p className="text-gray-400 mb-6">
                <span className="text-purple-400 font-semibold">{featureName}</span> is exclusively available to Admin @moksh50.
              </p>
              
              <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-left text-sm text-amber-300/80">
                    This feature contains proprietary Vedic algorithms and quantum-level DHF integration restricted to authorized personnel only.
                  </p>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.history.back()}
                className="mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all"
              >
                Go Back
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Admin - render children
  return <>{children}</>;
};

export default AdminRoute;
