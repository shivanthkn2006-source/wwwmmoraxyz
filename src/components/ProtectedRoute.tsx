import IconOrbitLoader from '@/components/core/IconOrbitLoader';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, session, loading, initialized } = useAuth();

  // Show spinner if we are still explicitly loading OR if the initial session
  // check hasn't finished yet (even if the 1.5s warning timeout fired).
  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <IconOrbitLoader />
      </div>
    );
  }

  // Once initialized=true, we know we've definitely checked for a session.
  if (!user && !session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
