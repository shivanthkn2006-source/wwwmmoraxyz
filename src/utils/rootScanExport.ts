import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

type ScanStatus = 'healthy' | 'warning' | 'critical' | 'fixed';

interface ScanResult {
  category: string;
  status: ScanStatus;
  message: string;
  details?: unknown;
  autoFixable?: boolean;
  fixApplied?: boolean;
}

interface GodModeScanReport {
  timestamp: string;
  requestId: string;
  overallHealth: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  scanDuration: number;
  results: ScanResult[];
  fixes?: {
    attempted: number;
    successful: number;
    failed: number;
    details: string[];
  };
  recommendations?: string[];
  zoeNarrative?: string;
}

const statusLabel = (s: ScanStatus) => {
  switch (s) {
    case 'healthy':
      return 'HEALTHY';
    case 'warning':
      return 'WARNING';
    case 'critical':
      return 'CRITICAL';
    case 'fixed':
      return 'FIXED';
    default:
      return String(s).toUpperCase();
  }
};

export async function exportRootScanAsPDF(userId: string) {
  console.log('[RootScanPDF] Starting root scan export...');

  const { data, error } = await supabase.functions.invoke('zoe-god-mode', {
    body: {
      action: 'full_scan',
      userId,
      // keep backward compatible with function implementations that ignore extra fields
      source: 'root_scan_pdf',
    },
  });

  if (error) {
    console.error('[RootScanPDF] Backend scan failed:', error);
    throw new Error(error.message || 'Root scan failed');
  }

  // Many functions return { report } or the report directly — normalize.
  const report: GodModeScanReport | null =
    (data?.report as GodModeScanReport) ?? (data as GodModeScanReport) ?? null;

  if (!report || !report.timestamp || !Array.isArray(report.results)) {
    console.error('[RootScanPDF] Unexpected scan payload:', data);
    throw new Error('Root scan returned unexpected data');
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
  const margin = 14;
  const lineHeight = 6;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = margin;

  const addPageIfNeeded = (extra: number = lineHeight) => {
    if (y + extra > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const addText = (
    text: string,
    opts?: { fontSize?: number; bold?: boolean; indent?: number; color?: [number, number, number] }
  ) => {
    const fontSize = opts?.fontSize ?? 10;
    const bold = opts?.bold ?? false;
    const indent = opts?.indent ?? 0;
    const color = opts?.color ?? ([0, 0, 0] as [number, number, number]);

    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(color[0], color[1], color[2]);
    const lines = pdf.splitTextToSize(text, pageWidth - margin * 2 - indent);
    for (const line of lines) {
      addPageIfNeeded();
      pdf.text(line, margin + indent, y);
      y += lineHeight;
    }
  };

  const addSection = (title: string) => {
    y += 2;
    addPageIfNeeded(10);
    // header bar
    pdf.setFillColor(30, 30, 30);
    pdf.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 2, y);
    y += 8;
    pdf.setTextColor(0, 0, 0);
  };

  // Title
  addText('ZOE PLATFORM ROOT SCAN REPORT', { fontSize: 18, bold: true });
  addText(`Generated: ${new Date(report.timestamp).toLocaleString()}`, { fontSize: 10 });
  addText(`Request ID: ${report.requestId}`, { fontSize: 9 });
  addText(`Overall Health: ${report.overallHealth}/100`, { fontSize: 11, bold: true });
  addText(`Overall Status: ${String(report.overallStatus).toUpperCase()}`, { fontSize: 11, bold: true });
  addText(`Scan Duration: ${Math.round(report.scanDuration)}ms`, { fontSize: 9 });
  y += 4;

  addSection('1) COMPONENT STATUS (LIVE SCAN)');
  if (report.results.length === 0) {
    addText('No scan results returned. (This usually means no users were processed or the scan is not configured.)');
  } else {
    report.results.forEach((r, idx) => {
      addText(`${idx + 1}. [${statusLabel(r.status)}] ${r.category}`, { bold: true });
      addText(r.message, { indent: 4 });
      if (r.autoFixable) addText('Auto-fixable: YES', { indent: 4 });
      if (r.fixApplied) addText('Fix applied: YES', { indent: 4 });
      y += 2;
    });
  }

  if (report.fixes) {
    addSection('2) AUTO-FIX SUMMARY');
    addText(`Attempted: ${report.fixes.attempted}`, { bold: true });
    addText(`Successful: ${report.fixes.successful}`, { bold: true });
    addText(`Failed: ${report.fixes.failed}`, { bold: true });
    if (report.fixes.details?.length) {
      y += 2;
      report.fixes.details.forEach((d) => addText(`• ${d}`, { indent: 4 }));
    }
  }

  if (report.recommendations?.length) {
    addSection('3) RECOMMENDATIONS');
    report.recommendations.forEach((rec) => addText(`• ${rec}`, { indent: 2 }));
  }

  if (report.zoeNarrative) {
    addSection('4) ZOE NARRATIVE');
    addText(report.zoeNarrative);
  }

  // Verify non-empty
  const blob = pdf.output('blob');
  console.log('[RootScanPDF] PDF blob bytes:', blob.size);
  if (blob.size < 1500) {
    throw new Error('PDF generated but appears empty (blob too small)');
  }

  const filename = `zoe-root-scan-${new Date(report.timestamp).toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
  console.log('[RootScanPDF] Download initiated:', filename);
}
