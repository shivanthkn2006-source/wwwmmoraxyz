/**
 * Zoe Infinity - Full Conversation History PDF Export
 * Uses jsPDF to generate a styled PDF with ALL messages from the database.
 * Completely free - no external APIs needed.
 */

import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

interface ZoeMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  media_url?: string | null;
  media_type?: string | null;
}

/**
 * Fetch ALL Zoe Infinity messages for a user from the database
 */
export async function fetchAllConversations(userId: string): Promise<ZoeMessage[]> {
  const allMessages: ZoeMessage[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('zoe_infinity_messages')
      .select('id, role, content, created_at, media_url, media_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('[ConversationPDF] Fetch error:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allMessages.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }

  console.log(`[ConversationPDF] Fetched ${allMessages.length} total messages`);
  return allMessages;
}

/**
 * Strip SSML/XML tags from text (same as InfinityStream)
 */
function stripSSML(text: string): string {
  if (!text) return '';
  return text
    .replace(/<break[^>]*\/?>/gi, '')
    .replace(/<\/?(speak|prosody|emphasis|say-as|sub|phoneme|audio|mark|desc|voice|lang|p|s|w)\b[^>]*>/gi, '')
    .replace(/<[a-z]+[^>]*\/>/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Group messages by date for better PDF readability
 */
function groupByDate(messages: ZoeMessage[]): Map<string, ZoeMessage[]> {
  const groups = new Map<string, ZoeMessage[]>();
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(msg);
  }
  return groups;
}

/**
 * Internal renderer used by both DB-export and local fallback-export
 */
function buildAndSaveConversationPDF(messages: ZoeMessage[], userName: string): boolean {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ═══ COVER PAGE ═══
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setTextColor(250, 250, 250);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Zoe Infinity', pageWidth / 2, 60, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Complete Conversation History', pageWidth / 2, 75, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(100, 200, 255);
  doc.text(`User: ${userName}`, pageWidth / 2, 100, { align: 'center' });

  const firstDate = new Date(messages[0].created_at).toLocaleDateString();
  const lastDate = new Date(messages[messages.length - 1].created_at).toLocaleDateString();
  doc.setTextColor(150, 150, 150);
  doc.text(`${firstDate} — ${lastDate}`, pageWidth / 2, 110, { align: 'center' });
  doc.text(`Total Messages: ${messages.length}`, pageWidth / 2, 120, { align: 'center' });

  const exportDate = new Date().toLocaleString();
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Exported: ${exportDate}`, pageWidth / 2, 140, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('Powered by Zoe AI — M\'mora Platform', pageWidth / 2, pageHeight - 20, { align: 'center' });

  // ═══ CONVERSATION PAGES ═══
  const grouped = groupByDate(messages);

  for (const [dateLabel, dayMessages] of grouped) {
    doc.addPage();
    y = margin;

    // Date header
    doc.setFillColor(20, 20, 30);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 200, 255);
    doc.text(dateLabel, margin, y + 5);
    y += 12;

    doc.setDrawColor(50, 50, 70);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    for (const msg of dayMessages) {
      const isUser = msg.role === 'user';
      const speaker = isUser ? userName : 'Zoe';
      const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const cleanContent = stripSSML(msg.content);

      // Check page overflow
      const lines = doc.splitTextToSize(cleanContent, contentWidth - 10);
      const blockHeight = 8 + lines.length * 5 + 6;

      if (y + blockHeight > pageHeight - 15) {
        // Page footer
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 60);
        doc.text(`Zoe Infinity — ${dateLabel}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

        doc.addPage();
        doc.setFillColor(20, 20, 30);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        y = margin;
      }

      // Speaker + timestamp
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isUser ? 136 : 250, isUser ? 136 : 250, isUser ? 136 : 250);
      doc.text(`${speaker}`, margin + 2, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(time, pageWidth - margin - 2, y + 4, { align: 'right' });

      y += 7;

      // Message content
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(isUser ? 160 : 220, isUser ? 160 : 220, isUser ? 160 : 220);

      for (const line of lines) {
        if (y > pageHeight - 15) {
          doc.addPage();
          doc.setFillColor(20, 20, 30);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          y = margin;
        }
        doc.text(line, margin + 4, y);
        y += 5;
      }

      // Media attachment note
      if (msg.media_url) {
        doc.setFontSize(7);
        doc.setTextColor(100, 200, 255);
        doc.text(`[${msg.media_type || 'media'} attachment]`, margin + 4, y);
        y += 5;
      }

      y += 4; // spacing between messages
    }

    // Page footer
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(`Zoe Infinity — ${dateLabel}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `zoe-infinity-conversations-${timestamp}.pdf`;
  doc.save(filename);
  console.log(`[ConversationPDF] ✅ PDF saved: ${filename} (${messages.length} messages)`);

  return true;
}

/**
 * Generate a full PDF of all Zoe Infinity conversations from backend messages
 */
export async function generateConversationPDF(
  userId: string,
  userName: string = 'User'
): Promise<boolean> {
  try {
    console.log('[ConversationPDF] Starting PDF generation...');

    if (!userId) {
      console.warn('[ConversationPDF] Missing user ID for backend export');
      return false;
    }

    const messages = await fetchAllConversations(userId);
    if (messages.length === 0) {
      console.warn('[ConversationPDF] No messages found');
      return false;
    }

    return buildAndSaveConversationPDF(messages, userName);
  } catch (err) {
    console.error('[ConversationPDF] Generation failed:', err);
    return false;
  }
}

/**
 * Fallback export from currently loaded chat messages (works without backend fetch)
 */
export function generateConversationPDFFromMessages(
  messages: Array<{
    role: string;
    content: string;
    timestamp?: Date | string;
    created_at?: string;
    media_url?: string | null;
    media_type?: string | null;
  }>,
  userName: string = 'User'
): boolean {
  try {
    const normalized: ZoeMessage[] = messages
      .filter((m) => typeof m?.content === 'string' && m.content.trim().length > 0)
      .map((m, index) => ({
        id: `local-${index}-${Date.now()}`,
        role: m.role || 'assistant',
        content: m.content,
        created_at: m.created_at || (m.timestamp instanceof Date ? m.timestamp.toISOString() : (m.timestamp || new Date().toISOString())),
        media_url: m.media_url ?? null,
        media_type: m.media_type ?? null,
      }));

    if (normalized.length === 0) {
      console.warn('[ConversationPDF] No local messages found');
      return false;
    }

    console.log(`[ConversationPDF] Fallback export with ${normalized.length} local messages`);
    return buildAndSaveConversationPDF(normalized, userName);
  } catch (err) {
    console.error('[ConversationPDF] Local fallback generation failed:', err);
    return false;
  }
}

export function generateConversationPDFLast24Hours(
  messages: Array<{
    role: string;
    content: string;
    timestamp?: Date | string;
    created_at?: string;
    media_url?: string | null;
    media_type?: string | null;
  }>,
  userName: string = 'User'
): boolean {
  const since = Date.now() - (24 * 60 * 60 * 1000);

  const filtered = messages.filter((message) => {
    const rawDate = message.created_at || message.timestamp;
    const value = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate || Date.now()).getTime();
    return Number.isFinite(value) && value >= since;
  });

  return generateConversationPDFFromMessages(filtered, userName);
}
