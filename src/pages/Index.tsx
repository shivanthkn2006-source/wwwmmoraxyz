import IconOrbitLoader from '@/components/core/IconOrbitLoader';
// Index page - Redirects to appropriate destination
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <IconOrbitLoader />
      </div>
    );
  }

  // Redirect based on auth status
  return <Navigate to={user ? "/home" : "/auth"} replace />;
};

export default Index;
