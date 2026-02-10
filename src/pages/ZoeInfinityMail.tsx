/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - MAIN PAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE GATEKEEPER MODEL: User <-> Zoe Agent <-> Server
 * 
 * Zoe reads every incoming email 5ms before you do.
 * - Spam? Deleted.
 * - Meeting? Auto-booked.
 * - Newsletter? Summarized.
 * 
 * This is not a list of rows. This is a "Stream of Consciousness."
 * 
 * Architecture: Standalone for future migration
 * Integration: Connected to Zoe DHF Core
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bell, Settings, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

// Mail module components (standalone)
import { 
  PriorityStream, 
  MailCompose, 
  VoiceComposer,
  MailSidebar, 
  GatekeeperOrb,
  MailMessage,
  MailFolder,
  MailFolderStats,
  IroncladStatus,
  ComposeDraft,
} from '@/components/zoe-infinity/mail';

// Voice integration
import { speakAsZoe, stopZoeSpeech, isZoeSpeaking } from '@/utils/zoeVoice';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA (Will be replaced by real Gatekeeper in Part 2)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_MESSAGES: MailMessage[] = [
  {
    id: 'msg-1',
    senderName: 'John Smith',
    senderEmail: 'john.smith@company.com',
    senderVerified: true,
    subject: 'Q4 Planning Meeting - Urgent',
    preview: 'Hi, I wanted to discuss the Q4 planning session. Can we schedule a call this week?',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    receivedAt: new Date(Date.now() - 1000 * 60 * 15),
    isRead: false,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    gatekeeperVerdict: 'meeting',
    gatekeeperSummary: 'Meeting request for Q4 planning. Sender is verified contact.',
    gatekeeperAction: {
      type: 'book_meeting',
      description: 'I can book Tuesday 2pm - your calendar is open.',
      payload: { proposedTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2) },
    },
    gatekeeperConfidence: 0.95,
    priority: 'high',
    labels: ['work', 'meetings'],
    spamScore: 0.02,
    phishingIndicators: [],
    encryptionStatus: 'tls',
  },
  {
    id: 'msg-2',
    senderName: 'TechCrunch Daily',
    senderEmail: 'newsletter@techcrunch.com',
    senderVerified: true,
    subject: 'AI Revolution: 10 Startups to Watch in 2025',
    preview: 'The AI landscape is shifting rapidly. Here are the top startups making waves...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: false,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    gatekeeperVerdict: 'newsletter',
    gatekeeperSummary: '10 AI startups: Anthropic, Perplexity, and 8 others disrupting search and productivity.',
    gatekeeperConfidence: 0.92,
    priority: 'low',
    labels: ['newsletter', 'tech'],
    spamScore: 0.1,
    phishingIndicators: [],
    encryptionStatus: 'tls',
  },
  {
    id: 'msg-3',
    senderName: 'Unknown Sender',
    senderEmail: 'prize.winner.2025@suspicious-domain.xyz',
    senderVerified: false,
    subject: 'CONGRATULATIONS! You Won $1,000,000!!!',
    preview: 'Dear valued customer, you have been selected as the winner of our grand prize...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    isRead: false,
    isStarred: false,
    isArchived: false,
    isDeleted: true, // Gatekeeper auto-deleted
    gatekeeperVerdict: 'spam',
    gatekeeperSummary: 'High-confidence spam. Suspicious domain, phishing patterns detected.',
    gatekeeperConfidence: 0.99,
    priority: 'low',
    labels: ['spam'],
    spamScore: 0.98,
    phishingIndicators: ['suspicious_domain', 'prize_scam', 'urgency_language'],
    encryptionStatus: 'none',
  },
  {
    id: 'msg-4',
    senderName: 'Sarah Johnson',
    senderEmail: 'sarah.j@personal.com',
    senderVerified: true,
    subject: 'Weekend plans?',
    preview: 'Hey! Are you free this Saturday? Was thinking we could grab brunch at that new place...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    isRead: true,
    isStarred: true,
    isArchived: false,
    isDeleted: false,
    gatekeeperVerdict: 'personal',
    gatekeeperSummary: 'Personal message from contact. Weekend brunch invitation.',
    gatekeeperConfidence: 0.88,
    priority: 'normal',
    labels: ['personal', 'friends'],
    spamScore: 0.01,
    phishingIndicators: [],
    encryptionStatus: 'tls',
  },
  {
    id: 'msg-5',
    senderName: 'Chase Bank',
    senderEmail: 'alerts@chase.com',
    senderVerified: true,
    subject: 'Your January Statement is Ready',
    preview: 'Your monthly statement for account ending in ****4532 is now available...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isRead: false,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    gatekeeperVerdict: 'financial',
    gatekeeperSummary: 'Bank statement notification. Verified sender, encrypted.',
    gatekeeperConfidence: 0.97,
    priority: 'normal',
    labels: ['financial', 'banking'],
    spamScore: 0.01,
    phishingIndicators: [],
    encryptionStatus: 'tls',
    dhfLinked: true,
    emotionalContext: {
      sentiment: 'neutral',
      urgency: 0.2,
      importance: 0.6,
    },
  },
];

const MOCK_FOLDERS: MailFolderStats[] = [
  { folder: 'inbox', totalCount: 42, unreadCount: 5, lastUpdated: new Date() },
  { folder: 'starred', totalCount: 8, unreadCount: 1, lastUpdated: new Date() },
  { folder: 'sent', totalCount: 156, unreadCount: 0, lastUpdated: new Date() },
  { folder: 'drafts', totalCount: 3, unreadCount: 0, lastUpdated: new Date() },
  { folder: 'newsletters', totalCount: 28, unreadCount: 12, lastUpdated: new Date() },
  { folder: 'meetings', totalCount: 5, unreadCount: 2, lastUpdated: new Date() },
  { folder: 'financial', totalCount: 15, unreadCount: 1, lastUpdated: new Date() },
  { folder: 'archive', totalCount: 892, unreadCount: 0, lastUpdated: new Date() },
  { folder: 'spam', totalCount: 0, unreadCount: 0, lastUpdated: new Date() },
  { folder: 'trash', totalCount: 12, unreadCount: 0, lastUpdated: new Date() },
];

export default function ZoeInfinityMail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [currentFolder, setCurrentFolder] = useState<MailFolder>('inbox');
  const [messages, setMessages] = useState<MailMessage[]>(MOCK_MESSAGES);
  const [folders, setFolders] = useState<MailFolderStats[]>(MOCK_FOLDERS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [gatekeeperProcessing, setGatekeeperProcessing] = useState(0);
  
  const [ironcladStatus, setIroncladStatus] = useState<IroncladStatus>({
    enabled: true,
    tunnelActive: true,
    encryptionLevel: 'high',
    exitNode: 'US-West',
    ipMasked: true,
    lastHandshake: new Date(),
    bytesEncrypted: 1024 * 1024 * 42, // 42MB
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GATEKEEPER SIMULATION (Will be real in Part 2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const simulateGatekeeperScan = useCallback(async () => {
    setGatekeeperProcessing(3);
    
    // Simulate progressive scanning
    await new Promise(r => setTimeout(r, 1000));
    setGatekeeperProcessing(2);
    
    await new Promise(r => setTimeout(r, 800));
    setGatekeeperProcessing(1);
    
    await new Promise(r => setTimeout(r, 600));
    setGatekeeperProcessing(0);
  }, []);

  // Initial load simulation
  useEffect(() => {
    setIsLoading(true);
    simulateGatekeeperScan().then(() => {
      setIsLoading(false);
    });
  }, [simulateGatekeeperScan]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE: Daily Briefing (Native TTS - $0 cost)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const speakDailyBriefing = useCallback(() => {
    const unreadCount = messages.filter(m => !m.isRead && !m.isDeleted).length;
    const spamBlocked = messages.filter(m => m.gatekeeperVerdict === 'spam').length;
    const meetings = messages.filter(m => m.gatekeeperVerdict === 'meeting').length;
    
    const briefing = `
      Good morning. Your inbox briefing:
      ${unreadCount} new messages require attention.
      ${spamBlocked} spam attempts blocked by Gatekeeper.
      ${meetings > 0 ? `${meetings} meeting request${meetings > 1 ? 's' : ''} pending approval.` : ''}
      Your Ironclad tunnel is active. All communications encrypted.
    `;
    
    speakAsZoe(briefing.trim(), {}, 
      () => console.log('[ZoeMail] Speaking briefing'),
      () => console.log('[ZoeMail] Briefing complete'),
    );
  }, [messages]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleFolderSelect = useCallback((folder: MailFolder) => {
    setCurrentFolder(folder);
    // Filter messages based on folder (simplified for Part 1)
  }, []);

  const handleMessageSelect = useCallback((message: MailMessage) => {
    setSelectedMessage(message);
    // Mark as read
    setMessages(prev => prev.map(m => 
      m.id === message.id ? { ...m, isRead: true } : m
    ));
  }, []);

  const handleApproveAction = useCallback((messageId: string, actionType: string) => {
    console.log('[ZoeMail] Approved action:', actionType, 'for message:', messageId);
    
    // Voice feedback
    if (voiceEnabled) {
      speakAsZoe(`Action approved. I'll handle this for you.`, {}, 
        () => {}, () => {}
      );
    }
    
    // Remove the action from the message (it's been handled)
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, gatekeeperAction: undefined } : m
    ));
  }, [voiceEnabled]);

  const handleSendMessage = useCallback((draft: ComposeDraft) => {
    console.log('[ZoeMail] Sending message:', draft);
    setIsComposeOpen(false);
    
    if (voiceEnabled) {
      speakAsZoe(`Message sent to ${draft.to.join(', ')}.`, {}, () => {}, () => {});
    }
  }, [voiceEnabled]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    await simulateGatekeeperScan();
    setIsSyncing(false);
  }, [simulateGatekeeperScan]);

  // Filter messages for current folder
  const filteredMessages = messages.filter(m => {
    if (m.isDeleted && currentFolder !== 'trash') return false;
    if (m.isArchived && currentFolder !== 'archive') return false;
    
    switch (currentFolder) {
      case 'inbox':
        return !m.isArchived && !m.isDeleted;
      case 'starred':
        return m.isStarred && !m.isDeleted;
      case 'newsletters':
        return m.gatekeeperVerdict === 'newsletter';
      case 'meetings':
        return m.gatekeeperVerdict === 'meeting';
      case 'financial':
        return m.gatekeeperVerdict === 'financial';
      case 'spam':
        return m.gatekeeperVerdict === 'spam';
      case 'trash':
        return m.isDeleted;
      case 'archive':
        return m.isArchived;
      default:
        return true;
    }
  });

  return (
    <div 
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: '#000000' }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <header 
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 
                   border-b border-white/5"
        style={{ 
          background: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/')}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10
                       transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          
          <div>
            <h1 className="text-white font-medium flex items-center gap-2">
              <span>Zoe Infinity</span>
              <span className="text-cyan-400">Mail</span>
            </h1>
            <p className="text-xs text-white/40">The Gatekeeper is watching</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Gatekeeper Orb (mini) */}
          <GatekeeperOrb
            isActive={true}
            isProcessing={gatekeeperProcessing > 0}
            processingCount={gatekeeperProcessing}
            spamBlockedToday={messages.filter(m => m.gatekeeperVerdict === 'spam').length}
            onClick={speakDailyBriefing}
          />
          
          {/* Sync button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSync}
            disabled={isSyncing}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10
                       transition-colors disabled:opacity-50"
          >
            <motion.div
              animate={isSyncing ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: isSyncing ? Infinity : 0, ease: 'linear' }}
            >
              <RefreshCw className="w-5 h-5" />
            </motion.div>
          </motion.button>
          
          {/* Voice toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (isZoeSpeaking()) stopZoeSpeech();
            }}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled 
                ? 'text-cyan-400 bg-cyan-400/10' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/10'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </motion.button>

          {/* Settings */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10
                       transition-colors"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <MailSidebar
          currentFolder={currentFolder}
          folders={folders}
          ironcladStatus={ironcladStatus}
          onFolderSelect={handleFolderSelect}
          onCompose={() => setIsComposeOpen(true)}
        />
        
        {/* Main stream */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Folder title */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-white/5">
            <h2 className="text-white text-lg font-medium capitalize">
              {currentFolder}
            </h2>
            <p className="text-xs text-white/40">
              {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
              {filteredMessages.filter(m => !m.isRead).length > 0 && 
                ` • ${filteredMessages.filter(m => !m.isRead).length} unread`
              }
            </p>
          </div>
          
          {/* Message stream */}
          <PriorityStream
            messages={filteredMessages}
            isLoading={isLoading}
            onMessageSelect={handleMessageSelect}
            onApproveAction={handleApproveAction}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          COMPOSE MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <MailCompose
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendMessage}
      />
    </div>
  );
}
