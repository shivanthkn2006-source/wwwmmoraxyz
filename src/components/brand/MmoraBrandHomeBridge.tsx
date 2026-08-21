/**
 * M'Mora brand → Home connector.
 *
 * There is no single shared logo component across the platform, so instead of
 * touching every surface this bridge installs ONE delegated click/keyboard
 * handler. Any brand mark that carries `data-mmora-logo` (the "M" alpha in
 * M'Mora Live, wordmarks, future logos) becomes a link to the M'Mora home page.
 *
 * Purely behavioural — no styling, no layout, no DOM changes.
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const MMORA_LOGO_ATTR = 'data-mmora-logo';
export const MMORA_HOME_ROUTE = '/home';

/** Spread onto any brand mark to make it navigate home. */
export const mmoraLogoProps = {
  [MMORA_LOGO_ATTR]: 'true',
  role: 'link',
  tabIndex: 0,
  'aria-label': "Go to M'Mora home",
  style: { cursor: 'pointer' } as React.CSSProperties,
};

export const MmoraBrandHomeBridge: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const resolve = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      return target.closest<HTMLElement>(`[${MMORA_LOGO_ATTR}]`);
    };

    const goHome = (el: HTMLElement) => {
      // Let any local handler (e.g. closing a fullscreen overlay) run first.
      el.dispatchEvent(new CustomEvent('mmora:brand-home', { bubbles: true }));
      if (location.pathname !== MMORA_HOME_ROUTE) navigate(MMORA_HOME_ROUTE);
    };

    const onClick = (e: MouseEvent) => {
      const el = resolve(e.target);
      if (!el || el.dataset.mmoraLogo === 'false') return;
      goHome(el);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = resolve(e.target);
      if (!el || el.dataset.mmoraLogo === 'false') return;
      e.preventDefault();
      goHome(el);
    };

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navigate, location.pathname]);

  return null;
};

export default MmoraBrandHomeBridge;
