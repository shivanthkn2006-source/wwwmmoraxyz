/**
 * ZOE AGENT HOST — renders nothing.
 * Bridges existing platform events to the headless realtime agent so no
 * button, icon or layout anywhere has to change:
 *   window.dispatchEvent(new Event('zoe-agent-start'))  → Zoe goes live
 *   window.dispatchEvent(new Event('zoe-agent-stop'))   → Zoe disconnects
 */
import { useEffect } from 'react';
import { useZoeAgent } from '@/contexts/ZoeAgentProvider';

export const ZoeAgentHost = () => {
  const { startListening, stopListening } = useZoeAgent();

  useEffect(() => {
    const start = () => { void startListening(); };
    const stop = () => stopListening();
    window.addEventListener('zoe-agent-start', start);
    window.addEventListener('zoe-agent-stop', stop);
    window.addEventListener('zoe-stop-speaking', stop);
    return () => {
      window.removeEventListener('zoe-agent-start', start);
      window.removeEventListener('zoe-agent-stop', stop);
      window.removeEventListener('zoe-stop-speaking', stop);
    };
  }, [startListening, stopListening]);

  return null;
};

export default ZoeAgentHost;
