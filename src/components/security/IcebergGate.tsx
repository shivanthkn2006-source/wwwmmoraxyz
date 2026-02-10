// ═══════════════════════════════════════════════════════════════════════════════
// ICEBERG GATE - React component for hiding Tier 6 features
// Shows "Coming Soon" or 404 to non-admins
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';
import { 
  checkTier6Access, 
  getCamouflageResponse, 
  getPublicName,
  type Tier6Feature 
} from '@/core/security/ProtocolIceberg';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IcebergGateProps {
  feature: Tier6Feature;
  children: React.ReactNode;
  fallbackRoute?: string;
}

/**
 * ICEBERG GATE - Wraps Tier 6 features
 * Non-admins see camouflage (Coming Soon/404), never "Access Denied"
 */
export const IcebergGate: React.FC<IcebergGateProps> = ({ 
  feature, 
  children,
  fallbackRoute = '/'
}) => {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      if (data?.username) {
        setUsername(data.username);
      }
      setLoading(false);
    };

    fetchUsername();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-gpu-spin" />
      </div>
    );
  }

  // THE LOCK - Check if user has access
  const hasAccess = checkTier6Access(username, feature, true);

  if (hasAccess) {
    return <>{children}</>;
  }

  // THE CAMOUFLAGE - What non-admins see
  const camouflage = getCamouflageResponse(feature);
  const publicName = getPublicName(feature);

  if (camouflage === 'redirect') {
    return <Navigate to={fallbackRoute} replace />;
  }

  if (camouflage === '404') {
    return <NotFoundCamouflage />;
  }

  // Coming Soon page
  return <ComingSoonCamouflage featureName={publicName} />;
};

/**
 * 404 Camouflage - Looks like a normal 404 page
 */
const NotFoundCamouflage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-8xl font-bold text-muted-foreground/30 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a 
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go Home
        </a>
      </motion.div>
    </div>
  );
};

/**
 * Coming Soon Camouflage - Builds anticipation without revealing secrets
 */
const ComingSoonCamouflage: React.FC<{ featureName: string }> = ({ featureName }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8 animate-gpu-glow-pulse">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Coming Soon
        </h1>
        
        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
          <Clock className="w-5 h-5" />
          <span>We're working on something special</span>
        </div>
        
        <p className="text-muted-foreground mb-8">
          {featureName} is currently in development. 
          Stay tuned for updates!
        </p>
        
        <a 
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          Return Home
        </a>
      </motion.div>
    </div>
  );
};

export default IcebergGate;
