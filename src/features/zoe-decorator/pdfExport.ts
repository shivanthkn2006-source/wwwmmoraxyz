import jsPDF from 'jspdf';
import type { DecoratorDesign } from './gallery';

export async function exportDesignsToPDF(designs: DecoratorDesign[], originalPhoto?: string) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Cover
  pdf.setFontSize(28); pdf.text('Zoe Infinity Decorator', pageW / 2, 140, { align: 'center' });
  pdf.setFontSize(14); pdf.setTextColor(120);
  pdf.text(new Date().toLocaleString(), pageW / 2, 170, { align: 'center' });
  pdf.text(`${designs.length} design${designs.length === 1 ? '' : 's'}`, pageW / 2, 192, { align: 'center' });
  pdf.setTextColor(0);

  // Original photo
  if (originalPhoto) {
    pdf.addPage();
    pdf.setFontSize(16); pdf.text('Original photo', 40, 50);
    try { pdf.addImage(originalPhoto, 'JPEG', 40, 70, pageW - 80, pageH - 140); } catch {}
  }

  // Variants
  for (const d of designs) {
    pdf.addPage();
    pdf.setFontSize(16);
    const title = [d.space, d.theme].filter(Boolean).join(' · ') || 'Design';
    pdf.text(title, 40, 50);
    pdf.setFontSize(10); pdf.setTextColor(120);
    pdf.text(new Date(d.createdAt).toLocaleString(), 40, 68);
    pdf.setTextColor(0);
    try { pdf.addImage(d.generatedImage, 'JPEG', 40, 90, pageW - 80, pageH - 160); } catch {}
    const promptShort = d.prompt.length > 240 ? d.prompt.slice(0, 240) + '…' : d.prompt;
    pdf.setFontSize(9); pdf.setTextColor(80);
    pdf.text(pdf.splitTextToSize(promptShort, pageW - 80), 40, pageH - 60);
  }

  pdf.save(`zoe-decorator-${Date.now()}.pdf`);
}
