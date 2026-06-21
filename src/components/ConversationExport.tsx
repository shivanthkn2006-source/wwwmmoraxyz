import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileDown } from 'lucide-react';
import { downloadAsText, downloadAsPDF, exportToText, exportToPDF } from '@/utils/conversationExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

interface ConversationExportProps {
  messages: Array<{ role: string; content: string; created_at: string }>;
  userName?: string;
}

export const ConversationExport: React.FC<ConversationExportProps> = ({ messages, userName = 'User' }) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportText = () => {
    if (messages.length === 0) {
      toast({
        title: 'No messages',
        description: 'There are no messages to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const textContent = exportToText(messages, userName);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadAsText(textContent, `zoe-conversation-${timestamp}.txt`);
      
      toast({
        title: 'Export successful',
        description: `Conversation exported as text file`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export conversation',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (messages.length === 0) {
      toast({
        title: 'No messages',
        description: 'There are no messages to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      await downloadAsPDF(messages, userName, `zoe-conversation-${timestamp}.pdf`);
      
      toast({
        title: 'Export initiated',
        description: 'Opening print dialog for PDF export',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export conversation',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isExporting || messages.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportText} className="gap-2">
          <FileText className="h-4 w-4" />
          Export as Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
          <FileDown className="h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};