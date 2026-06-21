/**
 * Zoe God Mode Audit Export Utility
 * 
 * Formats and exports God Mode platform scan reports as PDF
 */

import type { GodModeScanReport, ScanResult } from '@/hooks/useZoeGodMode';

export async function downloadGodModeAuditPDF(report: GodModeScanReport): Promise<void> {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const lineHeight = 6;
  let y = margin;

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number = 10, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
  };

  // Helper function to add a line separator
  const addLine = () => {
    if (y + 5 > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(150, 80, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // Add decorative header
  doc.setFillColor(75, 0, 130);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ZOE DHF GOD MODE', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text('PLATFORM AUDIT REPORT', pageWidth / 2, 25, { align: 'center' });
  
  y = 45;
  
  // Report info
  addText(`Generated: ${new Date(report.timestamp).toLocaleString()}`, 11);
  addText(`Request ID: ${report.requestId}`, 9, 'normal', [100, 100, 100]);
  addText(`Scan Duration: ${report.scanDuration}ms`, 9, 'normal', [100, 100, 100]);
  y += 5;
  addLine();
  
  // Health Overview Section
  const healthColor: [number, number, number] = 
    report.overallHealth >= 90 ? [34, 197, 94] :
    report.overallHealth >= 70 ? [245, 158, 11] :
    [220, 38, 38];
  
  addText('PLATFORM HEALTH OVERVIEW', 14, 'bold', [75, 0, 130]);
  y += 2;
  
  // Health score box
  doc.setFillColor(...healthColor);
  doc.roundedRect(margin, y, 60, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${report.overallHealth}%`, margin + 30, y + 13, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Status: ${report.overallStatus.toUpperCase()}`, margin + 70, y + 13);
  y += 28;
  
  addLine();
  
  // Scan Results Section
  addText('SCAN RESULTS', 14, 'bold', [75, 0, 130]);
  y += 3;
  
  const healthyCount = report.results.filter(r => r.status === 'healthy' || r.status === 'fixed').length;
  const warningCount = report.results.filter(r => r.status === 'warning').length;
  const criticalCount = report.results.filter(r => r.status === 'critical').length;
  
  addText(`✓ Healthy: ${healthyCount}  |  ⚠ Warnings: ${warningCount}  |  ✗ Critical: ${criticalCount}`, 10);
  y += 3;
  
  report.results.forEach((result: ScanResult) => {
    const statusColor: [number, number, number] = 
      result.status === 'healthy' ? [34, 197, 94] :
      result.status === 'fixed' ? [59, 130, 246] :
      result.status === 'warning' ? [245, 158, 11] :
      [220, 38, 38];
    
    const icon = result.status === 'healthy' ? '✓' : 
                 result.status === 'fixed' ? '🔧' :
                 result.status === 'warning' ? '⚠' : '✗';
    
    addText(`${icon} ${result.category}`, 10, 'bold', statusColor);
    addText(`   ${result.message}`, 9, 'normal', [60, 60, 60]);
    
    if (result.fixApplied) {
      addText('   [AUTO-FIXED]', 8, 'bold', [59, 130, 246]);
    }
    y += 2;
  });
  
  addLine();
  
  // Fixes Applied Section
  if (report.fixes.attempted > 0) {
    addText('FIXES APPLIED', 14, 'bold', [75, 0, 130]);
    y += 3;
    
    addText(`Attempted: ${report.fixes.attempted}  |  Successful: ${report.fixes.successful}  |  Failed: ${report.fixes.failed}`, 10);
    
    report.fixes.details.forEach(detail => {
      addText(`• ${detail}`, 9, 'normal', [60, 60, 60]);
    });
    
    y += 3;
    addLine();
  }
  
  // Recommendations Section
  addText('RECOMMENDATIONS', 14, 'bold', [75, 0, 130]);
  y += 3;
  
  report.recommendations.forEach(rec => {
    addText(`${rec}`, 10);
  });
  
  y += 5;
  addLine();
  
  // Zoe's Narrative
  addText('ZOE\'S ANALYSIS', 14, 'bold', [75, 0, 130]);
  y += 3;
  
  doc.setFillColor(245, 245, 255);
  const narrativeLines = doc.splitTextToSize(report.zoeNarrative, pageWidth - 2 * margin - 10);
  const narrativeHeight = narrativeLines.length * lineHeight + 10;
  
  if (y + narrativeHeight > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  
  doc.roundedRect(margin, y, pageWidth - 2 * margin, narrativeHeight, 3, 3, 'F');
  doc.setTextColor(75, 0, 130);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  
  y += 7;
  narrativeLines.forEach((line: string) => {
    doc.text(line, margin + 5, y);
    y += lineHeight;
  });
  y += 5;
  
  // Footer
  y += 10;
  doc.setDrawColor(75, 0, 130);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated by Zoe DHF God Mode - Platform Intelligence System', pageWidth / 2, y, { align: 'center' });
  doc.text(`© ${new Date().getFullYear()} ATLAS Core - Confidential Audit Report`, pageWidth / 2, y + 5, { align: 'center' });
  
  // Save the PDF
  const filename = `zoe-god-mode-audit-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export function formatGodModeReportText(report: GodModeScanReport): string {
  let output = '';
  
  output += '═══════════════════════════════════════════════════════\n';
  output += '         ZOE DHF GOD MODE - PLATFORM AUDIT\n';
  output += '═══════════════════════════════════════════════════════\n\n';
  
  output += `Generated: ${new Date(report.timestamp).toLocaleString()}\n`;
  output += `Request ID: ${report.requestId}\n`;
  output += `Scan Duration: ${report.scanDuration}ms\n\n`;
  
  output += '───────────────────────────────────────────────────────\n';
  output += '              PLATFORM HEALTH OVERVIEW\n';
  output += '───────────────────────────────────────────────────────\n\n';
  
  output += `Overall Health: ${report.overallHealth}%\n`;
  output += `Status: ${report.overallStatus.toUpperCase()}\n\n`;
  
  const healthyCount = report.results.filter(r => r.status === 'healthy' || r.status === 'fixed').length;
  const warningCount = report.results.filter(r => r.status === 'warning').length;
  const criticalCount = report.results.filter(r => r.status === 'critical').length;
  
  output += `Healthy: ${healthyCount} | Warnings: ${warningCount} | Critical: ${criticalCount}\n\n`;
  
  output += '───────────────────────────────────────────────────────\n';
  output += '                   SCAN RESULTS\n';
  output += '───────────────────────────────────────────────────────\n\n';
  
  report.results.forEach(result => {
    const icon = result.status === 'healthy' ? '✓' : 
                 result.status === 'fixed' ? '🔧' :
                 result.status === 'warning' ? '⚠' : '✗';
    
    output += `${icon} ${result.category}\n`;
    output += `  ${result.message}\n`;
    if (result.fixApplied) {
      output += `  [AUTO-FIXED]\n`;
    }
    output += '\n';
  });
  
  if (report.fixes.attempted > 0) {
    output += '───────────────────────────────────────────────────────\n';
    output += '                  FIXES APPLIED\n';
    output += '───────────────────────────────────────────────────────\n\n';
    
    output += `Attempted: ${report.fixes.attempted}\n`;
    output += `Successful: ${report.fixes.successful}\n`;
    output += `Failed: ${report.fixes.failed}\n\n`;
    
    report.fixes.details.forEach(detail => {
      output += `• ${detail}\n`;
    });
    output += '\n';
  }
  
  output += '───────────────────────────────────────────────────────\n';
  output += '                RECOMMENDATIONS\n';
  output += '───────────────────────────────────────────────────────\n\n';
  
  report.recommendations.forEach(rec => {
    output += `${rec}\n`;
  });
  
  output += '\n';
  output += '───────────────────────────────────────────────────────\n';
  output += '                 ZOE\'S ANALYSIS\n';
  output += '───────────────────────────────────────────────────────\n\n';
  
  output += `"${report.zoeNarrative}"\n\n`;
  
  output += '═══════════════════════════════════════════════════════\n';
  output += '                   END OF REPORT\n';
  output += '═══════════════════════════════════════════════════════\n';
  
  return output;
}
