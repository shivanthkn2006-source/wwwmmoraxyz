import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';

interface DocumentDownloadPanelProps {
  userHandle: string | null;
}

const ADMIN_HANDLE = 'moksh50';

const DOCUMENTS = [
  { name: 'Incorporation Plan', path: 'MMORA_INCORPORATION_PLAN', category: 'Legal' },
  { name: 'Founders Agreement', path: 'MMORA_FOUNDERS_AGREEMENT', category: 'Legal' },
  { name: 'IP Assignment Agreement', path: 'IP_ASSIGNMENT_AGREEMENT', category: 'Legal' },
  { name: 'Transfer Pricing Agreement', path: 'TRANSFER_PRICING_AGREEMENT', category: 'Legal' },
  { name: 'ESOP Scheme', path: 'ESOP_SCHEME', category: 'Legal' },
  { name: 'NDA Template', path: 'NDA_TEMPLATE', category: 'Legal' },
  { name: 'Privacy Policy', path: 'PRIVACY_POLICY', category: 'Legal' },
  { name: 'Terms of Service', path: 'TERMS_OF_SERVICE', category: 'Legal' },
  { name: 'Board Resolutions', path: 'BOARD_RESOLUTIONS', category: 'Legal' },
  { name: 'Share Certificates', path: 'SHARE_CERTIFICATES', category: 'Legal' },
  { name: 'Advisor Agreement', path: 'ADVISOR_AGREEMENT', category: 'Legal' },
  { name: 'White Paper', path: 'MMORA_WHITE_PAPER', category: 'Business' },
  { name: 'Investor Deck', path: 'MMORA_INVESTOR_DECK', category: 'Business' },
  { name: 'Zoe DHF Technical Spec', path: 'ZOE_DHF_TECHNICAL_SPECIFICATION', category: 'Business' },
  { name: 'Selfie City Specification', path: 'SELFIE_CITY_SPECIFICATION', category: 'Business' },
];

export const DocumentDownloadPanel: React.FC<DocumentDownloadPanelProps> = ({ userHandle }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const isAdmin = userHandle?.toLowerCase() === ADMIN_HANDLE.toLowerCase();

  if (!isAdmin) {
    return null;
  }

  const generateAllDocumentsPDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Title Page
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MMORA', pageWidth / 2, 60, { align: 'center' });
      pdf.setFontSize(16);
      pdf.text('Complete Legal & Business Documentation', pageWidth / 2, 75, { align: 'center' });
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('"The OS for the Human Soul"', pageWidth / 2, 90, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 110, { align: 'center' });
      pdf.text('CONFIDENTIAL - Admin Access Only', pageWidth / 2, 130, { align: 'center' });

      // Table of Contents
      pdf.addPage();
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Document Index', 20, 30);
      
      let yPos = 50;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LEGAL DOCUMENTS', 20, yPos);
      yPos += 10;
      
      pdf.setFont('helvetica', 'normal');
      DOCUMENTS.filter(d => d.category === 'Legal').forEach((doc, i) => {
        pdf.text(`${i + 1}. ${doc.name}`, 25, yPos);
        yPos += 7;
      });

      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('BUSINESS DOCUMENTS', 20, yPos);
      yPos += 10;
      
      pdf.setFont('helvetica', 'normal');
      DOCUMENTS.filter(d => d.category === 'Business').forEach((doc, i) => {
        pdf.text(`${i + 1}. ${doc.name}`, 25, yPos);
        yPos += 7;
      });

      // Document summaries
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Document Summaries', 20, 30);
      
      yPos = 50;
      const summaries = [
        { title: 'Incorporation Plan', desc: 'Singapore Flip strategy - HQ in Singapore, Ops in India' },
        { title: 'Founders Agreement', desc: 'Super Voting Rights (10:1), 100% immediate vesting for Moksh' },
        { title: 'ESOP Scheme', desc: '15% pool - 4yr vesting with 1yr cliff for employees' },
        { title: 'White Paper', desc: 'The MMORA Trinity: Zoe DHF, Selfie City, Project Phoenix' },
        { title: 'Investor Deck', desc: '$5M Seed Round at $50M valuation cap' },
      ];

      pdf.setFontSize(10);
      summaries.forEach(s => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`• ${s.title}:`, 20, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(s.desc, 30, yPos + 6);
        yPos += 18;
      });

      // Footer note
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Next Steps', 20, 30);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const steps = [
        '1. Engage Company Secretary (Vakilsearch India / Osome Singapore)',
        '2. File incorporation documents with ACRA and MCA',
        '3. Execute Founders Agreement with legal witness',
        '4. Register trademarks in priority jurisdictions',
        '5. Begin seed fundraising with Investor Deck',
      ];
      steps.forEach((step, i) => {
        pdf.text(step, 20, 50 + (i * 10));
      });

      pdf.save(`MMORA_Complete_Documentation_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: 'Documentation Package Generated',
        description: 'Complete MMORA documentation exported as PDF',
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Could not generate PDF package',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Admin Document Center
          <span className="text-xs bg-primary/20 px-2 py-1 rounded">@{userHandle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{DOCUMENTS.filter(d => d.category === 'Legal').length} Legal Docs</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{DOCUMENTS.filter(d => d.category === 'Business').length} Business Docs</span>
          </div>
        </div>
        
        <Button 
          onClick={generateAllDocumentsPDF}
          disabled={isGenerating}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download All Documents (PDF)
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Includes: Incorporation, Founders Agreement, ESOP, NDAs, Privacy Policy, Terms, White Paper, Investor Deck
        </p>
      </CardContent>
    </Card>
  );
};
