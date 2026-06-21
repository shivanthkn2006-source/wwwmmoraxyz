// Index page - Redirects to appropriate destination
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect based on auth status
  return <Navigate to={user ? "/home" : "/auth"} replace />;
};

export default Index;
