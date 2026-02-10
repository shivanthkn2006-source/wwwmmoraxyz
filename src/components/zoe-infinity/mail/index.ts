/**
 * ZOE INFINITY MAIL - MODULE EXPORTS
 * Standalone module for Agentic Email System.
 */

// Core components
export { MailStream } from './MailStream';
export { PriorityStream } from './PriorityStream';
export { MailCompose } from './MailCompose';
export { VoiceComposer } from './VoiceComposer';
export { MailSidebar } from './MailSidebar';
export { GatekeeperOrb } from './GatekeeperOrb';
export { ZoeMailPanel } from './ZoeMailPanel';

// Ironclad (VPN) components
export { 
  IroncladShield, 
  LockingAnimation,
  secureFetch,
  initIroncladSession,
  destroyIroncladSession,
  getIroncladStats,
} from './ironclad';

// Mail Sentinel (Agent) hook
export { useMailSentinel } from './useMailSentinel';
export type { EmailAnalysis, BriefingData, DraftResponse } from './useMailSentinel';

// Types
export * from './types';
