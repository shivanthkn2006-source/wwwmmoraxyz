/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - INTEGRATED PANEL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Mail panel that integrates within Zoe Infinity interface.
 * Sliding panel with Priority Stream, Compose, and Gatekeeper.
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mail, 
  Plus,
  Mic,
  RefreshCw,
  Shield,
  Loader2,
} from 'lucide-react';
import { PriorityStream } from './PriorityStream';
import { MailCompose } from './MailCompose';
import { VoiceComposer } from './VoiceComposer';
import { GatekeeperOrb } from './GatekeeperOrb';
import { MailSidebar } from './MailSidebar';
import { useZoeInfinityMail } from '@/hooks/useZoeInfinityMail';
import { useMailSentinel } from './useMailSentinel';
import { 
  MailMessage, 
  MailFolder, 
  MailFolderStats, 
  ComposeDraft,
  IroncladStatus,
  GatekeeperVerdict,
} from './types';

interface ZoeMailPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock data for demo
const MOCK_MESSAGES: MailMessage[] = [
  {
    id: '1',
    threadId: 't1',
    senderEmail: 'john@company.com',
    senderName: 'John Smith',
    senderVerified: true,
    subject: 'Q4 Strategy Meeting - Urgent',
    preview: 'Hi, we need to discuss the quarterly results before Friday. Can you join us at 3pm?',
    body: 'Hi, we need to discuss the quarterly results before Friday. Can you join us at 3pm? This is critical for the board presentation next week.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    receivedAt: new Date(Date.now() - 1000 * 60 * 15),
    isRead: false,
    isStarred: true,
    isArchived: false,
    isDeleted: false,
    priority: 'urgent',
    labels: ['work', 'urgent'],
    gatekeeperVerdict: 'meeting' as GatekeeperVerdict,
    gatekeeperSummary: 'Meeting request for Q4 strategy discussion, flagged as urgent.',
    gatekeeperAction: { type: 'book_meeting', description: 'Add to calendar' },
    gatekeeperConfidence: 0.95,
    spamScore: 0,
    phishingIndicators: [],
    encryptionStatus: 'tls',
  },
  {
    id: '2',
    threadId: 't2',
    senderEmail: 'sarah@startup.io',
    senderName: 'Sarah Chen',
    senderVerified: true,
    subject: 'Investment Opportunity - Series B',
    preview: 'Following up on our conversation about the Series B round. We have some exciting news to share.',
    body: 'Following up on our conversation about the Series B round. We have some exciting news to share. Our valuation has increased significantly.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    receivedAt: new Date(Date.now() - 1000 * 60 * 45),
    isRead: false,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    priority: 'high',
    labels: ['financial'],
    gatekeeperVerdict: 'financial' as GatekeeperVerdict,
    gatekeeperSummary: 'Financial opportunity - Series B investment update.',
    gatekeeperConfidence: 0.92,
    spamScore: 0,
    phishingIndicators: [],
    encryptionStatus: 'tls',
    attachments: [{ id: 'att1', filename: 'proposal.pdf', mimeType: 'application/pdf', size: 1024000, scanned: true, safe: true }],
  },
  {
    id: '3',
    threadId: 't3',
    senderEmail: 'mom@gmail.com',
    senderName: 'Mom',
    senderVerified: true,
    subject: 'Sunday dinner?',
    preview: 'Hey sweetie! Are you free for dinner this Sunday? Dad wants to make his famous lasagna.',
    body: 'Hey sweetie! Are you free for dinner this Sunday? Dad wants to make his famous lasagna. Bring that nice person you mentioned!',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    receivedAt: new Date(Date.now() - 1000 * 60 * 120),
    isRead: true,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    priority: 'normal',
    labels: ['personal'],
    gatekeeperVerdict: 'personal' as GatekeeperVerdict,
    gatekeeperSummary: 'Personal message from family - Sunday dinner invitation.',
    gatekeeperConfidence: 0.98,
    spamScore: 0,
    phishingIndicators: [],
    encryptionStatus: 'tls',
  },
  {
    id: '4',
    threadId: 't4',
    senderEmail: 'newsletter@techcrunch.com',
    senderName: 'TechCrunch Daily',
    senderVerified: false,
    subject: 'AI Startups Raise $500M This Week',
    preview: 'The hottest AI deals, funding rounds, and tech news you need to know.',
    body: 'The hottest AI deals, funding rounds, and tech news you need to know. Plus exclusive interviews with top founders.',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    receivedAt: new Date(Date.now() - 1000 * 60 * 180),
    isRead: true,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    priority: 'low',
    labels: ['newsletter'],
    gatekeeperVerdict: 'newsletter' as GatekeeperVerdict,
    gatekeeperSummary: 'Newsletter - Tech industry updates.',
    gatekeeperConfidence: 0.99,
    spamScore: 0.1,
    phishingIndicators: [],
    encryptionStatus: 'tls',
  },
];

const MOCK_FOLDER_STATS: MailFolderStats[] = [
  { folder: 'inbox' as MailFolder, totalCount: 24, unreadCount: 8, lastUpdated: new Date() },
  { folder: 'sent' as MailFolder, totalCount: 156, unreadCount: 0, lastUpdated: new Date() },
  { folder: 'drafts' as MailFolder, totalCount: 3, unreadCount: 0, lastUpdated: new Date() },
  { folder: 'starred' as MailFolder, totalCount: 12, unreadCount: 2, lastUpdated: new Date() },
  { folder: 'archive' as MailFolder, totalCount: 892, unreadCount: 0, lastUpdated: new Date() },
  { folder: 'spam' as MailFolder, totalCount: 47, unreadCount: 0, lastUpdated: new Date() },
  { folder: 'trash' as MailFolder, totalCount: 12, unreadCount: 0, lastUpdated: new Date() },
];

const MOCK_IRONCLAD_STATUS: IroncladStatus = {
  enabled: true,
  tunnelActive: true,
  encryptionLevel: 'high',
  exitNode: 'Zurich, CH',
  ipMasked: true,
  bytesEncrypted: 1024 * 1024 * 256,
};

export const ZoeMailPanel = memo(function ZoeMailPanel({
  isOpen,
  onClose,
}: ZoeMailPanelProps) {
  // Use real data hook - FIX: Include notification queue functionality
  const { 
    inboxMessages: realInboxMessages, 
    sentMessages: realSentMessages, 
    isLoading,
    refetch,
    markAsRead,
    toggleStar,
    archiveMessage,
    deleteMessage,
    pendingNotifications,
    markNotificationAnnounced,
  } = useZoeInfinityMail();

  // Mail Sentinel for AI analysis
  const {
    analyzeEmail,
    batchProcess,
    isAnalyzing,
    analysisToGatekeeperAction,
  } = useMailSentinel();

  // Track analyzed message IDs to avoid re-analyzing
  const analyzedIdsRef = useRef<Set<string>>(new Set());

  // Merge real data with mock for demo (real data takes priority)
  const [localInboxMessages, setLocalInboxMessages] = useState<MailMessage[]>(MOCK_MESSAGES);
  const [localSentMessages, setLocalSentMessages] = useState<MailMessage[]>([]);
  
  // Sync real data when it loads + trigger Mail Sentinel analysis
  useEffect(() => {
    if (realInboxMessages.length > 0) {
      // Merge: real messages first, then mock messages (avoiding duplicates)
      const realIds = new Set(realInboxMessages.map(m => m.id));
      const mockFiltered = MOCK_MESSAGES.filter(m => !realIds.has(m.id));
      setLocalInboxMessages([...realInboxMessages, ...mockFiltered]);
      
      // Analyze new messages with Mail Sentinel (skip already analyzed)
      const unanalyzedMessages = realInboxMessages.filter(
        m => !analyzedIdsRef.current.has(m.id) && !m.gatekeeperVerdict
      );
      
      if (unanalyzedMessages.length > 0 && unanalyzedMessages.length <= 5) {
        // Batch analyze new messages
        unanalyzedMessages.forEach(msg => {
          analyzedIdsRef.current.add(msg.id);
          analyzeEmail({
            senderName: msg.senderName,
            senderEmail: msg.senderEmail,
            subject: msg.subject,
            preview: msg.preview || msg.body?.substring(0, 500) || '',
            receivedAt: msg.receivedAt instanceof Date ? msg.receivedAt : new Date(msg.receivedAt),
            senderVerified: msg.senderVerified,
          }).then(analysis => {
            if (analysis) {
              setLocalInboxMessages(prev => prev.map(m => 
                m.id === msg.id ? {
                  ...m,
                  gatekeeperVerdict: analysis.category as GatekeeperVerdict,
                  gatekeeperSummary: analysis.summary,
                  gatekeeperAction: analysisToGatekeeperAction(analysis),
                  gatekeeperConfidence: 1 - analysis.phishingRisk,
                  priority: analysis.priority,
                  spamScore: analysis.phishingRisk,
                } : m
              ));
            }
          });
        });
      }
    }
  }, [realInboxMessages, analyzeEmail, analysisToGatekeeperAction]);

  useEffect(() => {
    if (realSentMessages.length > 0) {
      setLocalSentMessages(realSentMessages);
    }
  }, [realSentMessages]);

  const [currentFolder, setCurrentFolder] = useState<MailFolder>('inbox' as MailFolder);
  const [showCompose, setShowCompose] = useState(false);
  const [showVoiceComposer, setShowVoiceComposer] = useState(false);
  const [isGatekeeperActive, setIsGatekeeperActive] = useState(true);
  const [isGatekeeperProcessing, setIsGatekeeperProcessing] = useState(false);
  const [spamBlockedToday] = useState(12);
  const [showSidebar, setShowSidebar] = useState(false);

  // Track archived and deleted messages separately
  const [archivedMessages, setArchivedMessages] = useState<MailMessage[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<MailMessage[]>([]);

  // Compute which messages to show based on current folder
  const displayMessages = (() => {
    switch (currentFolder) {
      case 'sent':
        return localSentMessages;
      case 'starred':
        return localInboxMessages.filter(m => m.isStarred);
      case 'archive':
        return archivedMessages;
      case 'trash':
        return deletedMessages;
      case 'spam':
        return localInboxMessages.filter(m => m.gatekeeperVerdict === 'spam');
      case 'newsletters':
        return localInboxMessages.filter(m => m.gatekeeperVerdict === 'newsletter');
      case 'meetings':
        return localInboxMessages.filter(m => m.gatekeeperVerdict === 'meeting');
      case 'financial':
        return localInboxMessages.filter(m => m.gatekeeperVerdict === 'financial');
      default:
        return localInboxMessages.filter(m => !m.isArchived && !m.isDeleted);
    }
  })();

  // Compute dynamic folder stats
  const folderStats: MailFolderStats[] = [
    { folder: 'inbox' as MailFolder, totalCount: localInboxMessages.filter(m => !m.isArchived && !m.isDeleted).length, unreadCount: localInboxMessages.filter(m => !m.isRead && !m.isArchived && !m.isDeleted).length, lastUpdated: new Date() },
    { folder: 'sent' as MailFolder, totalCount: localSentMessages.length, unreadCount: 0, lastUpdated: new Date() },
    { folder: 'drafts' as MailFolder, totalCount: 0, unreadCount: 0, lastUpdated: new Date() },
    { folder: 'starred' as MailFolder, totalCount: localInboxMessages.filter(m => m.isStarred).length, unreadCount: localInboxMessages.filter(m => m.isStarred && !m.isRead).length, lastUpdated: new Date() },
    { folder: 'archive' as MailFolder, totalCount: archivedMessages.length, unreadCount: 0, lastUpdated: new Date() },
    { folder: 'spam' as MailFolder, totalCount: localInboxMessages.filter(m => m.gatekeeperVerdict === 'spam').length, unreadCount: 0, lastUpdated: new Date() },
    { folder: 'trash' as MailFolder, totalCount: deletedMessages.length, unreadCount: 0, lastUpdated: new Date() },
    { folder: 'newsletters' as MailFolder, totalCount: localInboxMessages.filter(m => m.gatekeeperVerdict === 'newsletter').length, unreadCount: localInboxMessages.filter(m => m.gatekeeperVerdict === 'newsletter' && !m.isRead).length, lastUpdated: new Date() },
    { folder: 'meetings' as MailFolder, totalCount: localInboxMessages.filter(m => m.gatekeeperVerdict === 'meeting').length, unreadCount: localInboxMessages.filter(m => m.gatekeeperVerdict === 'meeting' && !m.isRead).length, lastUpdated: new Date() },
    { folder: 'financial' as MailFolder, totalCount: localInboxMessages.filter(m => m.gatekeeperVerdict === 'financial').length, unreadCount: localInboxMessages.filter(m => m.gatekeeperVerdict === 'financial' && !m.isRead).length, lastUpdated: new Date() },
  ];

  const handleFolderSelect = useCallback((folder: MailFolder) => {
    setCurrentFolder(folder);
    setShowSidebar(false);
  }, []);

  const handleCompose = useCallback(() => {
    setShowCompose(true);
  }, []);

  const handleSendDraft = useCallback((draft: ComposeDraft) => {
    console.log('[ZoeMail] Sending message:', draft);
    
    // Create a MailMessage from the draft and add to sent folder
    // For sent messages, senderEmail/Name is the user, subject shows "To: recipient"
    const sentMessage: MailMessage = {
      id: draft.id,
      threadId: draft.threadId || `thread-${Date.now()}`,
      senderEmail: 'you@example.com', // Would come from user profile
      senderName: `To: ${draft.to[0]}`, // Display recipient in sent folder
      senderVerified: true,
      subject: draft.subject,
      preview: draft.body.substring(0, 100),
      body: draft.body,
      timestamp: new Date(),
      receivedAt: new Date(),
      isRead: true,
      isStarred: false,
      isArchived: false,
      isDeleted: false,
      priority: 'normal',
      labels: ['sent', `to:${draft.to.join(',')}`],
      gatekeeperVerdict: 'personal' as GatekeeperVerdict,
      gatekeeperConfidence: 1,
      spamScore: 0,
      phishingIndicators: [],
      encryptionStatus: 'tls',
      attachments: draft.attachments?.map((file, idx) => ({
        id: `att-${idx}`,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        scanned: true,
        safe: true,
      })),
    };
    
    setLocalSentMessages(prev => [sentMessage, ...prev]);
    setShowCompose(false);
    setShowVoiceComposer(false);
  }, []);

  const handleMessageSelect = useCallback((message: MailMessage) => {
    console.log('[ZoeMail] Message selected:', message.id);
    // Mark as read when selected - both locally and in DB
    if (!message.isRead) {
      markAsRead(message.id);
      setLocalInboxMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, isRead: true } : m
      ));
    }
  }, [markAsRead]);

  // Sync gatekeeper processing state with Mail Sentinel
  useEffect(() => {
    setIsGatekeeperProcessing(isAnalyzing);
  }, [isAnalyzing]);

  const handleGatekeeperClick = useCallback(async () => {
    // Re-analyze all unanalyzed messages in current view
    const unanalyzedMessages = displayMessages.filter(m => !m.gatekeeperVerdict);
    if (unanalyzedMessages.length === 0) {
      console.log('[ZoeMail] All messages already analyzed');
      return;
    }
    
    setIsGatekeeperProcessing(true);
    
    // Use batch processing for efficiency
    const batchPayload = unanalyzedMessages.slice(0, 10).map(msg => ({
      id: msg.id,
      sender: msg.senderName,
      senderEmail: msg.senderEmail,
      subject: msg.subject,
      bodyPreview: msg.preview || msg.body?.substring(0, 300) || '',
    }));
    
    const results = await batchProcess(batchPayload);
    
    if (results) {
      setLocalInboxMessages(prev => prev.map(m => {
        const result = results.find(r => r.id === m.id);
        if (result) {
          analyzedIdsRef.current.add(m.id);
          return {
            ...m,
            gatekeeperVerdict: result.category as GatekeeperVerdict,
            gatekeeperSummary: result.summary,
            priority: result.priority as MailMessage['priority'],
          };
        }
        return m;
      }));
    }
    
    setIsGatekeeperProcessing(false);
  }, [displayMessages, batchProcess]);

  const handleRefresh = useCallback(() => {
    setIsGatekeeperProcessing(true);
    refetch();
    setTimeout(() => setIsGatekeeperProcessing(false), 1500);
  }, [refetch]);

  // Archive handler - move message from inbox to archive
  const handleArchive = useCallback((messageId: string) => {
    console.log('[ZoeMail] Archiving message:', messageId);
    archiveMessage(messageId);
    const message = localInboxMessages.find(m => m.id === messageId);
    if (message) {
      setLocalInboxMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isArchived: true } : m
      ));
      setArchivedMessages(prev => [{ ...message, isArchived: true }, ...prev]);
    }
  }, [localInboxMessages, archiveMessage]);

  // Delete handler - move message from inbox to trash
  const handleDelete = useCallback((messageId: string) => {
    console.log('[ZoeMail] Deleting message:', messageId);
    deleteMessage(messageId);
    const message = localInboxMessages.find(m => m.id === messageId);
    if (message) {
      setLocalInboxMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isDeleted: true } : m
      ));
      setDeletedMessages(prev => [{ ...message, isDeleted: true }, ...prev]);
    }
  }, [localInboxMessages, deleteMessage]);

  // Star/Unstar handler
  const handleStar = useCallback((messageId: string) => {
    console.log('[ZoeMail] Toggling star:', messageId);
    toggleStar(messageId);
    setLocalInboxMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isStarred: !m.isStarred } : m
    ));
  }, [toggleStar]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
        >
          {/* Main Mail Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-full md:w-[90%] lg:w-[80%] xl:w-[70%] 
                       flex flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(10,10,10,0.98) 0%, rgba(5,5,5,0.99) 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '-20px 0 80px -20px rgba(0,0,0,0.8)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-4 
                           border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-4">
                {/* Mobile Sidebar Toggle */}
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="md:hidden p-2 rounded-lg text-white/60 hover:text-white 
                             hover:bg-white/10 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 
                                  flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">Zoe Mail</h2>
                    <p className="text-xs text-white/40">Priority Stream</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Gatekeeper Orb */}
                <GatekeeperOrb
                  isActive={isGatekeeperActive}
                  isProcessing={isGatekeeperProcessing}
                  processingCount={isGatekeeperProcessing ? 3 : 0}
                  spamBlockedToday={spamBlockedToday}
                  onClick={handleGatekeeperClick}
                />

                {/* Refresh */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={isGatekeeperProcessing}
                  className="p-2 rounded-lg text-white/60 hover:text-white 
                             hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${isGatekeeperProcessing ? 'animate-spin' : ''}`} />
                </motion.button>

                {/* Voice Compose */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowVoiceComposer(true)}
                  className="p-2 rounded-lg bg-gradient-to-r from-violet-500/20 to-purple-500/20 
                             border border-violet-500/30 text-violet-400
                             hover:from-violet-500/30 hover:to-purple-500/30 transition-all"
                  title="Voice Compose"
                >
                  <Mic className="w-5 h-5" />
                </motion.button>

                {/* Compose */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCompose}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl
                             bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium
                             hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Compose</span>
                </motion.button>

                {/* Close */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white 
                             hover:bg-white/10 transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar - Desktop */}
              <div className="hidden md:block w-64 flex-shrink-0 border-r border-white/5">
                <MailSidebar
                  currentFolder={currentFolder}
                  folders={folderStats}
                  ironcladStatus={MOCK_IRONCLAD_STATUS}
                  onFolderSelect={handleFolderSelect}
                  onCompose={handleCompose}
                />
              </div>

              {/* Sidebar - Mobile Overlay */}
              <AnimatePresence>
                {showSidebar && (
                  <motion.div
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="absolute inset-y-0 left-0 w-72 z-10 md:hidden
                               border-r border-white/10"
                    style={{
                      background: 'rgba(10,10,10,0.98)',
                    }}
                  >
                    <MailSidebar
                      currentFolder={currentFolder}
                      folders={folderStats}
                      ironcladStatus={MOCK_IRONCLAD_STATUS}
                      onFolderSelect={handleFolderSelect}
                      onCompose={handleCompose}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Priority Stream */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <PriorityStream
                  messages={displayMessages}
                  isLoading={isGatekeeperProcessing}
                  onMessageSelect={handleMessageSelect}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onStar={handleStar}
                />
              </div>
            </div>

            {/* Ironclad Status Bar */}
            <div className="flex items-center justify-between px-4 md:px-6 py-2 
                           border-t border-white/10 bg-black/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-white/50">Ironclad VPN Active</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/40">
                <span>{MOCK_IRONCLAD_STATUS.encryptionLevel}</span>
                <span>•</span>
                <span>{MOCK_IRONCLAD_STATUS.exitNode}</span>
              </div>
            </div>
          </motion.div>

          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={onClose}
          />

          {/* Compose Modal */}
          <MailCompose
            isOpen={showCompose}
            onClose={() => setShowCompose(false)}
            onSend={handleSendDraft}
          />

          {/* Voice Composer Modal */}
          <VoiceComposer
            isOpen={showVoiceComposer}
            onClose={() => setShowVoiceComposer(false)}
            onSend={handleSendDraft}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default ZoeMailPanel;
