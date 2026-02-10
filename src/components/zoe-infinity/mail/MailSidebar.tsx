/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - SIDEBAR NAVIGATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Minimal, dark sidebar with folder navigation and Gatekeeper status.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Inbox, 
  Send, 
  FileText, 
  Star, 
  Archive, 
  Trash2, 
  AlertTriangle,
  Calendar,
  Newspaper,
  CreditCard,
  Shield,
  ShieldCheck,
  Sparkles,
  Plus
} from 'lucide-react';
import { MailFolder, MailFolderStats, IroncladStatus } from './types';

interface MailSidebarProps {
  currentFolder: MailFolder;
  folders: MailFolderStats[];
  ironcladStatus: IroncladStatus;
  onFolderSelect: (folder: MailFolder) => void;
  onCompose: () => void;
}

const FOLDER_CONFIG: Record<MailFolder, { icon: typeof Inbox; label: string }> = {
  inbox: { icon: Inbox, label: 'Inbox' },
  sent: { icon: Send, label: 'Sent' },
  drafts: { icon: FileText, label: 'Drafts' },
  starred: { icon: Star, label: 'Starred' },
  archive: { icon: Archive, label: 'Archive' },
  spam: { icon: AlertTriangle, label: 'Spam' },
  trash: { icon: Trash2, label: 'Trash' },
  newsletters: { icon: Newspaper, label: 'Newsletters' },
  meetings: { icon: Calendar, label: 'Meetings' },
  financial: { icon: CreditCard, label: 'Financial' },
};

const PRIMARY_FOLDERS: MailFolder[] = ['inbox', 'starred', 'sent', 'drafts'];
const SMART_FOLDERS: MailFolder[] = ['newsletters', 'meetings', 'financial'];
const SYSTEM_FOLDERS: MailFolder[] = ['archive', 'spam', 'trash'];

export const MailSidebar = memo(function MailSidebar({
  currentFolder,
  folders,
  ironcladStatus,
  onFolderSelect,
  onCompose,
}: MailSidebarProps) {
  const getFolderStats = (folder: MailFolder) => {
    return folders.find(f => f.folder === folder);
  };

  const renderFolderButton = (folder: MailFolder) => {
    const config = FOLDER_CONFIG[folder];
    const stats = getFolderStats(folder);
    const isActive = currentFolder === folder;
    const Icon = config.icon;

    return (
      <motion.button
        key={folder}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onFolderSelect(folder)}
        className={`
          w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg
          transition-all duration-200 group
          ${isActive 
            ? 'bg-white/10 text-white' 
            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
          <span className="text-sm">{config.label}</span>
        </div>
        
        {stats && stats.unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`
              min-w-[20px] h-5 flex items-center justify-center
              text-xs font-medium rounded-full
              ${isActive 
                ? 'bg-cyan-500 text-black' 
                : 'bg-white/10 text-white/60'
              }
            `}
          >
            {stats.unreadCount > 99 ? '99+' : stats.unreadCount}
          </motion.span>
        )}
      </motion.button>
    );
  };

  return (
    <div 
      className="w-56 flex-shrink-0 flex flex-col h-full border-r border-white/5"
      style={{ 
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Compose Button */}
      <div className="p-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                     bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium
                     hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Compose</span>
        </motion.button>
      </div>

      {/* Folder Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-6">
        {/* Primary folders */}
        <div className="space-y-1">
          {PRIMARY_FOLDERS.map(renderFolderButton)}
        </div>

        {/* Smart folders (Gatekeeper sorted) */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/30">
              Smart Folders
            </span>
          </div>
          {SMART_FOLDERS.map(renderFolderButton)}
        </div>

        {/* System folders */}
        <div className="space-y-1">
          {SYSTEM_FOLDERS.map(renderFolderButton)}
        </div>
      </div>

      {/* Ironclad VPN Status */}
      <div className="p-3 border-t border-white/5">
        <div 
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg
            ${ironcladStatus.enabled && ironcladStatus.tunnelActive
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-white/5 border border-white/5'
            }
          `}
        >
          {ironcladStatus.enabled && ironcladStatus.tunnelActive ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <Shield className="w-4 h-4 text-white/30" />
          )}
          
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${
              ironcladStatus.enabled && ironcladStatus.tunnelActive
                ? 'text-emerald-400'
                : 'text-white/40'
            }`}>
              {ironcladStatus.enabled && ironcladStatus.tunnelActive
                ? 'Ironclad Active'
                : 'Ironclad Off'
              }
            </p>
            {ironcladStatus.enabled && ironcladStatus.tunnelActive && (
              <p className="text-[10px] text-white/30 truncate">
                {ironcladStatus.encryptionLevel.toUpperCase()} • {ironcladStatus.exitNode || 'Direct'}
              </p>
            )}
          </div>
          
          {ironcladStatus.enabled && ironcladStatus.tunnelActive && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-emerald-400"
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default MailSidebar;
