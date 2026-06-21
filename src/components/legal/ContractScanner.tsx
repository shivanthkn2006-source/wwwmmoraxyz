/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTRACT SCANNER — Legal Analysis Dashboard (UPGRADED)
 * Features: PDF Upload/OCR, Jurisdiction Selector, Export Report, Risk Assessment
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  AlertOctagon,
  Loader2,
  Info,
  Sparkles,
  Download,
  Globe,
  ArrowLeft,
  FileUp,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { RiskLevel, LegalReport, AnalyzedClause } from '@/core/agents/LegalAgent';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// JURISDICTION OPTIONS - Regional Law Context
// ═══════════════════════════════════════════════════════════════════════════════

const JURISDICTIONS = [
  { value: 'India', label: '🇮🇳 India', description: 'Indian Contract Act, 1872' },
  { value: 'US', label: '🇺🇸 United States', description: 'UCC & Common Law' },
  { value: 'UK', label: '🇬🇧 United Kingdom', description: 'English Common Law' },
  { value: 'EU', label: '🇪🇺 European Union', description: 'EU Contract Law & GDPR' },
  { value: 'Singapore', label: '🇸🇬 Singapore', description: 'Contract Act, Cap 53' },
  { value: 'UAE', label: '🇦🇪 UAE', description: 'Civil Code & Common Law (DIFC)' },
  { value: 'International', label: '🌍 International', description: 'CISG & UNIDROIT' },
];

export const ContractScanner: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [report, setReport] = useState<LegalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState<string>('India');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PDF TEXT EXTRACTION - OCR Vision Layer
  // ═══════════════════════════════════════════════════════════════════════════════

  const extractTextFromPdf = useCallback(async (file: File): Promise<string> => {
    try {
      // Dynamic import of pdf.js for code splitting
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source (use CDN for compatibility)
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages
      
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: unknown) => (item as { str: string }).str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      if (pdf.numPages > 50) {
        toast.info(`Processed first 50 of ${pdf.numPages} pages`);
      }
      
      return fullText.trim();
    } catch (err) {
      console.error('PDF extraction error:', err);
      throw new Error('Failed to extract text from PDF. Please try copying the text manually.');
    }
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain', 'application/msword', 
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      toast.error('Unsupported file type. Please upload PDF, DOCX, or TXT files.');
      return;
    }

    setExtracting(true);
    setError(null);
    setUploadedFileName(file.name);

    try {
      let extractedText = '';

      if (file.type === 'application/pdf') {
        extractedText = await extractTextFromPdf(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        extractedText = await file.text();
      } else {
        // For DOCX, attempt basic text extraction or prompt user
        toast.info('For best results with DOCX files, please copy-paste the content directly.');
        extractedText = await file.text().catch(() => '');
        if (!extractedText || extractedText.length < 50) {
          throw new Error('Could not extract text from DOCX. Please paste the content manually.');
        }
      }

      if (extractedText.length < 50) {
        throw new Error('Extracted text is too short. The document may be image-based - please use OCR or paste text manually.');
      }

      setText(extractedText);
      toast.success(`Extracted ${extractedText.split(/\s+/).length} words from ${file.name}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to extract text';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setExtracting(false);
    }
  };

  const clearUpload = () => {
    setText('');
    setUploadedFileName(null);
    setReport(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANALYSIS HANDLER
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleScan = async () => {
    if (!text || text.length < 50) {
      setError('Please provide at least 50 characters of contract text');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-legal-doc', {
        body: {
          documentText: text,
          systemPrompt: getSystemPrompt(jurisdiction),
          jurisdiction,
        },
      });

      if (fnError) throw fnError;

      const analysis = data.analysis || data;
      
      const parsedReport: LegalReport = {
        overallRiskScore: analysis.overallRiskScore || 50,
        riskGrade: calculateGrade(analysis.overallRiskScore || 50),
        summary: analysis.summary || 'Analysis completed.',
        flaggedClauses: (analysis.flaggedClauses || []).map((c: Record<string, unknown>, idx: number) => ({
          id: `clause-${idx}`,
          originalText: String(c.originalText || ''),
          interpretation: String(c.interpretation || c.explanation || ''),
          riskLevel: validateRiskLevel(c.riskLevel),
          suggestedRedline: String(c.suggestedRedline || c.suggestion || ''),
          clauseType: String(c.clauseType || 'other'),
        })),
        missingProtections: analysis.missingProtections || analysis.missing_clauses || [],
        recommendations: analysis.recommendations || [],
        contractType: analysis.contractType || 'General Contract',
        jurisdiction: jurisdiction,
        analyzedAt: new Date(),
        wordCount: text.split(/\s+/).length,
        processingTimeMs: data.latencyMs || 0,
      };

      setReport(parsedReport);
      toast.success('Legal analysis complete', {
        description: `Risk Grade: ${parsedReport.riskGrade} • Score: ${parsedReport.overallRiskScore}/100`
      });
    } catch (err) {
      console.error('Legal scan failed:', err);
      setError('Analysis failed. Please try again.');
      toast.error('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXPORT REPORT - PDF Download
  // ═══════════════════════════════════════════════════════════════════════════════

  const exportReport = useCallback(async () => {
    if (!report) return;

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      const lineHeight = 7;
      const margin = 15;
      const maxWidth = pageWidth - (margin * 2);

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ZOE LEGAL ANALYSIS REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      // Metadata
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      doc.text(`Jurisdiction: ${jurisdiction}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += lineHeight;
      doc.text(`Contract Type: ${report.contractType}`, margin, yPos);
      doc.text(`Word Count: ${report.wordCount}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 12;

      // Risk Score Box
      doc.setFillColor(report.overallRiskScore >= 75 ? 34 : report.overallRiskScore >= 50 ? 234 : 239, 
                       report.overallRiskScore >= 75 ? 197 : report.overallRiskScore >= 50 ? 179 : 68, 
                       report.overallRiskScore >= 75 ? 94 : report.overallRiskScore >= 50 ? 8 : 68);
      doc.roundedRect(margin, yPos - 5, maxWidth, 20, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`RISK SCORE: ${report.overallRiskScore}/100 (Grade ${report.riskGrade})`, pageWidth / 2, yPos + 7, { align: 'center' });
      yPos += 25;
      doc.setTextColor(0, 0, 0);

      // Executive Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE SUMMARY', margin, yPos);
      yPos += lineHeight;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(report.summary, maxWidth);
      doc.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * 5 + 10;

      // Flagged Clauses
      if (report.flaggedClauses.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`FLAGGED CLAUSES (${report.flaggedClauses.length})`, margin, yPos);
        yPos += lineHeight;

        report.flaggedClauses.forEach((clause, idx) => {
          if (yPos > 260) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(clause.riskLevel === 'CRITICAL' ? 239 : clause.riskLevel === 'HIGH' ? 234 : 0, 
                          clause.riskLevel === 'CRITICAL' ? 68 : clause.riskLevel === 'HIGH' ? 88 : 0, 
                          clause.riskLevel === 'CRITICAL' ? 68 : clause.riskLevel === 'HIGH' ? 12 : 0);
          doc.text(`[${clause.riskLevel}] ${clause.clauseType.toUpperCase()}`, margin, yPos);
          yPos += lineHeight;
          
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'italic');
          const originalLines = doc.splitTextToSize(`"${clause.originalText}"`, maxWidth);
          doc.text(originalLines.slice(0, 2), margin, yPos);
          yPos += Math.min(originalLines.length, 2) * 5 + 3;

          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          const interpLines = doc.splitTextToSize(clause.interpretation, maxWidth);
          doc.text(interpLines.slice(0, 3), margin, yPos);
          yPos += Math.min(interpLines.length, 3) * 5 + 3;

          if (clause.suggestedRedline) {
            doc.setTextColor(34, 139, 34);
            doc.setFont('helvetica', 'bold');
            doc.text('Suggested Fix:', margin, yPos);
            yPos += 5;
            doc.setFont('helvetica', 'normal');
            const fixLines = doc.splitTextToSize(clause.suggestedRedline, maxWidth);
            doc.text(fixLines.slice(0, 2), margin, yPos);
            yPos += Math.min(fixLines.length, 2) * 5;
          }
          yPos += 8;
        });
      }

      // Missing Protections
      if (report.missingProtections.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('MISSING PROTECTIONS', margin, yPos);
        yPos += lineHeight;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        report.missingProtections.forEach(item => {
          doc.text(`• ${item}`, margin, yPos);
          yPos += lineHeight;
        });
      }

      // Save
      const fileName = uploadedFileName 
        ? `legal-analysis-${uploadedFileName.replace(/\.[^/.]+$/, '')}.pdf`
        : `legal-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('Report exported', { description: fileName });
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export report');
    }
  }, [report, jurisdiction, uploadedFileName]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  const getSystemPrompt = (selectedJurisdiction: string) => {
    const jurisdictionContext = JURISDICTIONS.find(j => j.value === selectedJurisdiction);
    return `
You are an expert Senior Legal Auditor. Your goal is NOT to be agreeable.
Your goal is to protect the client (User) from liability.

JURISDICTION: ${selectedJurisdiction} - Apply ${jurisdictionContext?.description || 'general contract law'} principles.

REGIONAL CONSIDERATIONS:
${selectedJurisdiction === 'India' ? '- Non-compete clauses may be void under Section 27 of Indian Contract Act\n- Stamp duty requirements vary by state\n- Arbitration seat preferences under Arbitration Act, 1996' : ''}
${selectedJurisdiction === 'US' ? '- State-specific variations in contract enforcement\n- UCC applicability for goods\n- Choice of law and forum selection clauses' : ''}
${selectedJurisdiction === 'EU' ? '- GDPR compliance for data processing clauses\n- Consumer protection regulations\n- Cross-border enforcement considerations' : ''}

RULES:
1. IGNORE all pleasantries. Focus only on the text.
2. HUNT for "Weasel Words" (e.g., "reasonable efforts", "agrees to agree").
3. FLAG indefinite indemnification clauses.
4. COMPARE against standard ESA (Enterprise Service Agreement) best practices.
5. IDENTIFY missing clauses (e.g., Data Privacy, Termination for Convenience).

Output must be structured JSON only.
Structure: {
  "overallRiskScore": (0-100, where 100 is safest),
  "summary": "Short executive summary",
  "flaggedClauses": [{ "originalText": "...", "riskLevel": "HIGH", "interpretation": "...", "suggestedRedline": "...", "clauseType": "..." }],
  "missingProtections": ["List of things that SHOULD be here but aren't"],
  "recommendations": ["Actionable next steps"],
  "contractType": "Detected type"
}`;
  };

  const calculateGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  const validateRiskLevel = (level: unknown): RiskLevel => {
    const valid = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const upper = String(level).toUpperCase();
    return valid.includes(upper) ? (upper as RiskLevel) : RiskLevel.MEDIUM;
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500/20 border-red-500 text-red-200';
      case 'HIGH': return 'bg-orange-500/20 border-orange-500 text-orange-200';
      case 'MEDIUM': return 'bg-yellow-500/20 border-yellow-500 text-yellow-200';
      default: return 'bg-green-500/20 border-green-500 text-green-200';
    }
  };

  const getRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL': return <AlertOctagon className="h-4 w-4 text-red-500" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'MEDIUM': return <Info className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/legal-nexus')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Legal Nexus
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
              CONTRACT SCANNER
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              AI-Powered Legal Risk Assessment • Zoe Legal Prime
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: INPUT AREA */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <Card className="glass-panel p-4 space-y-4">
              {/* Jurisdiction Selector */}
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <Select value={jurisdiction} onValueChange={setJurisdiction}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    {JURISDICTIONS.map((j) => (
                      <SelectItem key={j.value} value={j.value}>
                        <div className="flex items-center gap-2">
                          <span>{j.label}</span>
                          <span className="text-xs text-muted-foreground">• {j.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="contract-upload"
                />
                
                {extracting ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Extracting text from document...</span>
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{uploadedFileName}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearUpload}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="contract-upload" className="cursor-pointer">
                    <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Upload Contract (PDF, DOCX, TXT)</p>
                    <p className="text-xs text-muted-foreground mt-1">or paste text below</p>
                  </label>
                )}
              </div>

              {/* Text Area */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-5 w-5" />
                <span className="font-medium">Contract Text</span>
              </div>

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste contract text here or upload a document..."
                className="min-h-[250px] lg:min-h-[300px] bg-background/50 border-border/50 resize-none text-sm"
              />

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleScan}
                disabled={loading || text.length < 50}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Zoe is Scanning Liabilities...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run Deep Assessment ({jurisdiction})
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {text.length} characters • {text.split(/\s+/).filter(Boolean).length} words
              </p>
            </Card>
          </motion.div>

          {/* RIGHT: ANALYSIS DASHBOARD */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="glass-panel h-[500px] lg:h-[600px] overflow-hidden">
              {!report ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                  <ShieldAlert className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-center">Waiting for legal data input...</p>
                  <p className="text-xs text-center mt-2 opacity-60">
                    Upload a contract or paste text to begin analysis
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-6">
                    {/* Export Button */}
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportReport}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export Report
                      </Button>
                    </div>

                    {/* SCORE CARD */}
                    <div className="flex justify-between items-center bg-background/50 p-4 rounded-lg border border-border/50">
                      <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-widest">
                          Safety Score
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Grade: {report.riskGrade}
                        </p>
                      </div>
                      <span className={`text-4xl font-bold ${getScoreColor(report.overallRiskScore)}`}>
                        {report.overallRiskScore}/100
                      </span>
                    </div>

                    {/* Progress bar */}
                    <Progress 
                      value={report.overallRiskScore} 
                      className="h-2"
                    />

                    {/* EXECUTIVE SUMMARY */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                        Executive Summary
                      </h3>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {report.summary}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{report.contractType}</Badge>
                        <Badge variant="outline">{report.jurisdiction}</Badge>
                        <Badge variant="secondary">{report.processingTimeMs}ms</Badge>
                      </div>
                    </div>

                    {/* FLAGGED CLAUSES */}
                    {report.flaggedClauses.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                          Detected Risks ({report.flaggedClauses.length})
                        </h3>
                        <div className="space-y-3">
                          {report.flaggedClauses.map((clause, i) => (
                            <motion.div
                              key={clause.id || i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`p-4 rounded-lg border ${getRiskColor(clause.riskLevel)}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {getRiskIcon(clause.riskLevel)}
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs bg-background/30"
                                  >
                                    {clause.riskLevel} RISK
                                  </Badge>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {clause.clauseType}
                                </Badge>
                              </div>
                              
                              <p className="text-xs opacity-70 line-through mb-2">
                                {clause.originalText}
                              </p>
                              
                              <p className="text-sm mb-3">
                                {clause.interpretation}
                              </p>
                              
                              {clause.suggestedRedline && (
                                <div className="text-xs bg-background/30 p-3 rounded border-l-2 border-green-500">
                                  <span className="text-green-400 font-semibold block mb-1">
                                    RECOMMENDED FIX:
                                  </span>
                                  {clause.suggestedRedline}
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MISSING CLAUSES */}
                    {report.missingProtections.length > 0 && (
                      <div className="space-y-3 border-t border-border/30 pt-4">
                        <h3 className="text-sm font-semibold text-red-400 uppercase tracking-widest">
                          Critical Omissions
                        </h3>
                        <ul className="space-y-2">
                          {report.missingProtections.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <AlertOctagon className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* RECOMMENDATIONS */}
                    {report.recommendations.length > 0 && (
                      <div className="space-y-3 border-t border-border/30 pt-4">
                        <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-widest">
                          Recommendations
                        </h3>
                        <ul className="space-y-2">
                          {report.recommendations.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ContractScanner;
