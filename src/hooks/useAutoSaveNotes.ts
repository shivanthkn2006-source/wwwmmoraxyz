import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface SavedNote {
  id: string;
  title: string;
  content: string;
  featureType: 'heliosphere' | 'dreams' | 'interpretive';
  timestamp: string;
}

export const useAutoSaveNotes = (featureType: 'heliosphere' | 'dreams' | 'interpretive') => {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [currentNote, setCurrentNote] = useState<string>('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const storageKey = `${featureType}_notes`;
  const lastSaveKey = `${featureType}_last_save`;

  // Load saved notes on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem(storageKey);
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    }
  }, [storageKey]);

  // Auto-save current note every 30 seconds
  useEffect(() => {
    if (!autoSaveEnabled || !currentNote.trim()) return;

    const autoSaveInterval = setInterval(() => {
      saveCurrentNote();
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [currentNote, autoSaveEnabled]);

  const saveCurrentNote = useCallback((customTitle?: string) => {
    if (!currentNote.trim()) {
      toast.error('Nothing to save');
      return;
    }

    const newNote: SavedNote = {
      id: Date.now().toString(),
      title: customTitle || `${featureType} note - ${new Date().toLocaleString()}`,
      content: currentNote,
      featureType,
      timestamp: new Date().toISOString(),
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
    localStorage.setItem(lastSaveKey, new Date().toISOString());
    
    toast.success('Note saved successfully', {
      description: 'Auto-saved to local storage'
    });
  }, [currentNote, notes, featureType, storageKey, lastSaveKey]);

  const deleteNote = useCallback((noteId: string) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
    toast.success('Note deleted');
  }, [notes, storageKey]);

  const loadNote = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setCurrentNote(note.content);
      toast.success('Note loaded');
    }
  }, [notes]);

  const exportToPDF = useCallback(async (noteId?: string) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);

      // Title page
      doc.setFillColor(76, 29, 149); // Purple
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      
      const featureTitles = {
        heliosphere: '4K Heliosphere Explorer',
        dreams: 'Zoe Dreams AI',
        interpretive: 'Interpretive AI Multi-Agent'
      };
      
      doc.text(featureTitles[featureType], pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Notes & Documentation', pageWidth / 2, 45, { align: 'center' });

      // Reset text color for content
      doc.setTextColor(0, 0, 0);
      let yPosition = 80;

      const notesToExport = noteId 
        ? notes.filter(n => n.id === noteId)
        : notes;

      if (notesToExport.length === 0) {
        doc.setFontSize(12);
        doc.text('No notes available to export', pageWidth / 2, yPosition, { align: 'center' });
      } else {
        notesToExport.forEach((note, index) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          // Note title
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text(note.title, margin, yPosition);
          yPosition += 10;

          // Timestamp
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text(new Date(note.timestamp).toLocaleString(), margin, yPosition);
          yPosition += 10;

          // Content
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          
          const lines = doc.splitTextToSize(note.content, maxWidth);
          lines.forEach((line: string) => {
            if (yPosition > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(line, margin, yPosition);
            yPosition += 6;
          });

          yPosition += 15; // Space between notes
        });
      }

      // Footer
      const totalPages = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Universe of Life • ${featureTitles[featureType]} • Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      const filename = `${featureType}_notes_${Date.now()}.pdf`;
      doc.save(filename);
      
      toast.success('PDF exported successfully', {
        description: `Saved as ${filename}`
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  }, [notes, featureType]);

  return {
    notes,
    currentNote,
    setCurrentNote,
    autoSaveEnabled,
    setAutoSaveEnabled,
    saveCurrentNote,
    deleteNote,
    loadNote,
    exportToPDF,
  };
};
