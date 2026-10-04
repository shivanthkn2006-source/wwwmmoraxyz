import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { trackActivity } from "@/lib/visitTracker";

/**
 * Shown for any address that doesn't exist — and, on purpose, for admin addresses opened by anyone
 * who isn't the admin, so guessed URLs never reveal what exists. Each case is reported to live monitoring.
 */
const NotFound = ({ adminProbe = false }: { adminProbe?: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const typed = `${window.location.host}${location.pathname}${location.search}`.slice(0, 120);
    trackActivity(adminProbe ? "admin_probe" : "page_not_found", typed);
  }, [location.pathname, location.search, adminProbe]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">M'Mora</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">This page isn't available</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Sorry, the page you're looking for doesn't exist or can't be opened from this address.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate("/home", { replace: true })}
            className="h-12 rounded-full bg-primary text-base font-medium text-primary-foreground transition-opacity active:opacity-80"
          >
            Go to Home
          </button>
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home", { replace: true }))}
            className="h-12 rounded-full text-base font-medium text-primary transition-opacity active:opacity-60"
          >
            Go Back
          </button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
