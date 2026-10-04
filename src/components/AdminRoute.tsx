// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTE COMPONENT
// Restricts access to admin users only (verified server-side). Anyone else sees the
// ordinary "page isn't available" screen, so typed admin addresses reveal nothing,
// and the attempt is reported to live monitoring.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { checkRootAdminStatusServerSide } from '@/components/security/securityConfig';
import NotFound from '@/pages/NotFound';

interface AdminRouteProps {
  children: React.ReactNode;
  featureName?: string;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
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
        const { isAdmin: hasAccess } = await checkRootAdminStatusServerSide();
        setIsAdmin(hasAccess);
      } catch (error) {
        console.error('[AdminRoute] Access check failed:', error);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    };
    if (!authLoading) checkAdminAccess();
  }, [user, authLoading]);

  if (authLoading || isChecking) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  if (!user || !isAdmin) return <NotFound adminProbe />;

  return <>{children}</>;
};

export default AdminRoute;
