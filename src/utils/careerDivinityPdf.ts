/**
 * CAREER DIVINITY PDF GENERATOR
 * Generates a beautifully formatted PDF of the Divine Decree
 */

import { jsPDF } from 'jspdf';
import { VedicComputationResult } from '@/hooks/useVedicComputation';

interface PdfFormData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
}

export const generateCareerDivinityPdf = (
  result: VedicComputationResult,
  formData: PdfFormData
): void => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Helper functions
  const centerText = (text: string, yPos: number, size: number = 12) => {
    doc.setFontSize(size);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
  };

  const addSection = (title: string, content: string, yPos: number): number => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 120, 40);
    doc.text(title, margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(content, pageWidth - margin * 2);
    doc.text(lines, margin, yPos);
    return yPos + lines.length * 5 + 8;
  };

  const checkPageBreak = (neededSpace: number): void => {
    if (y + neededSpace > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // COVER / HEADER
  // ═══════════════════════════════════════════════════════════════════
  
  // Decorative header bar
  doc.setFillColor(25, 25, 55);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Title
  doc.setTextColor(255, 200, 100);
  doc.setFont('helvetica', 'bold');
  centerText('ZOE DIVINE DECREE', 20, 22);
  
  doc.setTextColor(200, 180, 120);
  doc.setFont('helvetica', 'normal');
  centerText('Career Divinity • Temple of Time', 30, 12);
  
  doc.setTextColor(150, 150, 150);
  centerText('ॐ अगस्त्य मुनये नमः', 40, 10);

  y = 60;

  // ═══════════════════════════════════════════════════════════════════
  // SUBJECT INFO
  // ═══════════════════════════════════════════════════════════════════
  
  doc.setFillColor(250, 245, 235);
  doc.rect(margin, y, pageWidth - margin * 2, 25, 'F');
  doc.setDrawColor(200, 170, 100);
  doc.rect(margin, y, pageWidth - margin * 2, 25, 'S');

  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(formData.name.toUpperCase(), margin + 5, y + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Cosmic ID: ${result.decree.cosmicId}`, margin + 5, y + 18);
  
  const birthInfo = `${formData.birthDate} | ${formData.birthTime || 'Time Unknown'} | ${formData.birthPlace || 'Location Unknown'}`;
  doc.text(birthInfo, pageWidth - margin - 5 - doc.getTextWidth(birthInfo), y + 18);

  y += 35;

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: CELESTIAL BLUEPRINT
  // ═══════════════════════════════════════════════════════════════════
  
  checkPageBreak(60);
  doc.setFillColor(255, 248, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 55, 'F');
  
  doc.setTextColor(180, 100, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. THE CELESTIAL BLUEPRINT (The Roots)', margin + 3, y + 8);
  
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  let sectionY = y + 16;
  
  // Sun Sign
  doc.setFont('helvetica', 'bold');
  doc.text(`Sun Sign (Soul): ${result.chart.sunSign.english} (${result.chart.sunSign.name}) ${result.chart.sunSign.symbol}`, margin + 5, sectionY);
  doc.setFont('helvetica', 'italic');
  const sunLines = doc.splitTextToSize(`Meaning: ${result.decree.sunSignMeaning}`, pageWidth - margin * 2 - 10);
  doc.text(sunLines, margin + 5, sectionY + 5);
  sectionY += 5 + sunLines.length * 4 + 4;

  // Moon Sign
  doc.setFont('helvetica', 'bold');
  doc.text(`Moon Sign (Mind): ${result.chart.moonSign.english} (${result.chart.moonSign.name}) ${result.chart.moonSign.symbol}`, margin + 5, sectionY);
  doc.setFont('helvetica', 'italic');
  const moonLines = doc.splitTextToSize(`Meaning: ${result.decree.moonSignMeaning}`, pageWidth - margin * 2 - 10);
  doc.text(moonLines, margin + 5, sectionY + 5);
  sectionY += 5 + moonLines.length * 4 + 4;

  // Nakshatra
  doc.setFont('helvetica', 'bold');
  doc.text(`Nakshatra: ${result.chart.nakshatra.name} ${result.chart.nakshatra.symbol} (Ruled by ${result.chart.nakshatra.lord})`, margin + 5, sectionY);

  y += 60;

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: NUMEROLOGY
  // ═══════════════════════════════════════════════════════════════════
  
  checkPageBreak(35);
  doc.setFillColor(240, 248, 255);
  doc.rect(margin, y, pageWidth - margin * 2, 30, 'F');
  
  doc.setTextColor(50, 100, 150);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. THE NUMEROLOGY (The Vibration)', margin + 3, y + 8);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const numPlanets = ['', 'Sun', 'Moon', 'Jupiter', 'Rahu', 'Mercury', 'Venus', 'Ketu', 'Saturn', 'Mars'];
  doc.text(`Psychic Number: ${result.chart.psychicNumber} (${numPlanets[result.chart.psychicNumber]})`, margin + 5, y + 16);
  doc.text(`Destiny Number: ${result.chart.destinyNumber} (${numPlanets[result.chart.destinyNumber]})`, pageWidth / 2, y + 16);
  
  doc.setFont('helvetica', 'italic');
  const clashLines = doc.splitTextToSize(`The Clash: ${result.decree.numerologyClash}`, pageWidth - margin * 2 - 10);
  doc.text(clashLines, margin + 5, y + 24);

  y += 35;

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: TOP CAREER PATHS
  // ═══════════════════════════════════════════════════════════════════
  
  const careers = result.decree?.topCareerPaths ?? [];
  const careerSectionHeight = 15 + careers.length * 18;
  checkPageBreak(careerSectionHeight);
  
  doc.setFillColor(255, 250, 240);
  doc.rect(margin, y, pageWidth - margin * 2, careerSectionHeight, 'F');
  
  doc.setTextColor(150, 100, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. THE ULTIMATE PROFESSION (Top Career Paths)', margin + 3, y + 8);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  
  let careerY = y + 16;
  careers.forEach((career, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${idx + 1}. ${career.title} (${career.compatibility}% Match)`, margin + 5, careerY);
    doc.setFont('helvetica', 'italic');
    const reasonLines = doc.splitTextToSize(`Why: ${career.reason}`, pageWidth - margin * 2 - 15);
    doc.text(reasonLines, margin + 10, careerY + 5);
    careerY += 8 + reasonLines.length * 4;
  });

  y += careerSectionHeight + 5;

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: ACTION PLAN & WARNING
  // ═══════════════════════════════════════════════════════════════════
  
  checkPageBreak(45);
  doc.setFillColor(240, 255, 245);
  doc.rect(margin, y, pageWidth - margin * 2, 40, 'F');
  
  doc.setTextColor(40, 120, 80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("4. ZOE'S ACTION PLAN", margin + 3, y + 8);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const actionLines = doc.splitTextToSize(result.decree.actionPlan, pageWidth - margin * 2 - 10);
  doc.text(actionLines, margin + 5, y + 16);
  
  doc.setTextColor(180, 80, 40);
  doc.setFont('helvetica', 'bold');
  doc.text('Warning:', margin + 5, y + 28);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 60, 40);
  const warnLines = doc.splitTextToSize(result.decree.warningNote, pageWidth - margin * 2 - 10);
  doc.text(warnLines, margin + 5, y + 34);

  y += 50;

  // ═══════════════════════════════════════════════════════════════════
  // EXTRAS: GEMSTONE, MANTRA, LUCKY NUMBERS
  // ═══════════════════════════════════════════════════════════════════
  
  checkPageBreak(50);
  doc.setFillColor(250, 248, 255);
  doc.rect(margin, y, pageWidth - margin * 2, 45, 'F');
  
  doc.setTextColor(120, 80, 150);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DIVINE GUIDANCE', margin + 3, y + 8);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Recommended Gemstone: ${result.decree.gemstone}`, margin + 5, y + 18);
  doc.text(`Daily Mantra: ${result.decree.mantra}`, margin + 5, y + 26);
  doc.text(`Deity: ${result.decree.deity}`, margin + 5, y + 34);
  doc.text(`Lucky Colors: ${result.decree.luckyColors.join(', ')}`, margin + 5, y + 42);
  doc.text(`Lucky Numbers: ${result.decree.luckyNumbers.join(', ')}`, pageWidth / 2, y + 42);

  y += 55;

  // ═══════════════════════════════════════════════════════════════════
  // SOUL PURPOSE & DHARMA
  // ═══════════════════════════════════════════════════════════════════
  
  checkPageBreak(35);
  doc.setFillColor(255, 252, 245);
  doc.rect(margin, y, pageWidth - margin * 2, 30, 'F');
  
  doc.setTextColor(150, 120, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SOUL PURPOSE', margin + 5, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const purposeLines = doc.splitTextToSize(result.decree.soulPurpose, pageWidth - margin * 2 - 10);
  doc.text(purposeLines, margin + 5, y + 14);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 120, 50);
  doc.text('DHARMA PATH', margin + 5, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const dharmaLines = doc.splitTextToSize(result.decree.dharmaPath, pageWidth - margin * 2 - 10);
  doc.text(dharmaLines, margin + 5, y + 30);

  // ═══════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════
  
  const footerY = pageHeight - 15;
  doc.setFillColor(25, 25, 55);
  doc.rect(0, footerY - 5, pageWidth, 20, 'F');
  
  doc.setTextColor(180, 160, 120);
  doc.setFontSize(8);
  centerText('Generated by Zoe Career Divinity Engine • M\'Mora Foundation • Temple of Time', footerY);
  
  doc.setTextColor(120, 120, 120);
  centerText(`Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, footerY + 5);

  // Save the PDF
  const filename = `${formData.name.replace(/\s+/g, '_')}_Divine_Decree_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
