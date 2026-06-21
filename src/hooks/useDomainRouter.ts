/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DOMAIN-BASED ROUTER — Zoe Infinity Standalone Detection
 * Routes myzoe.xyz domain directly to Zoe Infinity experience
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Domains that should load Zoe Infinity standalone
const ZOE_INFINITY_DOMAINS = [
  'myzoe.xyz',
  'www.myzoe.xyz',
];

// Routes that are allowed on Zoe Infinity domain
const ZOE_INFINITY_ALLOWED_ROUTES = [
  '/zoe-infinity',
  '/zoe-infinity/auth',
  '/zoe-infinity/mail',
  '/genesis-imprint',
  '/install-app',
];

export const useDomainRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hostname = window.location.hostname;
    const isZoeInfinityDomain = ZOE_INFINITY_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (isZoeInfinityDomain) {
      // Redirect /auth to Zoe Infinity's dedicated auth page
      if (location.pathname === '/auth') {
        console.log('[DomainRouter] Redirecting /auth to /zoe-infinity/auth (standalone domain)');
        navigate('/zoe-infinity/auth', { replace: true });
        return;
      }

      // Check if current route is allowed for Zoe Infinity domain
      const isAllowedRoute = ZOE_INFINITY_ALLOWED_ROUTES.some(
        route => location.pathname.startsWith(route)
      );

      // Redirect to Zoe Infinity if not on allowed route
      if (!isAllowedRoute && location.pathname !== '/zoe-infinity') {
        console.log('[DomainRouter] Redirecting to Zoe Infinity (standalone domain detected)');
        navigate('/zoe-infinity', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  // Return domain info for conditional rendering
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isZoeInfinityDomain = ZOE_INFINITY_DOMAINS.some(
    domain => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  return {
    isZoeInfinityDomain,
    hostname,
  };
};

/**
 * Check if current domain is Zoe Infinity standalone
 * Use this for hiding M'mora navigation elements
 */
export const isZoeInfinityStandaloneDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return ZOE_INFINITY_DOMAINS.some(
    domain => hostname === domain || hostname.endsWith(`.${domain}`)
  );
};
