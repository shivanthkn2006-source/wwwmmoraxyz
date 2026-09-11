/**
 * HEADLESS DOCUMENT BUILDER
 * =========================
 * Generates a clean, Apple-plain resume PDF entirely in memory and triggers a
 * native download. No modal, no loading screen, no layout shift — Zoe can keep
 * talking while the file lands in the user's downloads folder.
 */
import { jsPDF } from 'jspdf';

export interface ResumeData {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[] | string;
  experience?: Array<{ role?: string; company?: string; period?: string; detail?: string }> | string;
  education?: Array<{ course?: string; school?: string; period?: string }> | string;
}

const asLines = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
  return String(value).split('\n');
};

export function buildResumeDocument(data: ResumeData): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 56;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const line = (text: string, size: number, weight: 'normal' | 'bold' = 'normal', gap = 6) => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, width);
    wrapped.forEach((w: string) => {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(w, margin, y);
      y += size + 2;
    });
    y += gap;
  };

  const section = (heading: string) => {
    line(heading.toUpperCase(), 10, 'bold', 2);
    doc.setDrawColor(200);
    doc.line(margin, y - 6, margin + width, y - 6);
    y += 4;
  };

  line(data.name || 'Resume', 22, 'bold', 2);
  if (data.title) line(data.title, 12, 'normal', 4);
  const contact = [data.email, data.phone, data.location].filter(Boolean).join('  ·  ');
  if (contact) line(contact, 10, 'normal', 14);

  if (data.summary) {
    section('Summary');
    line(data.summary, 11);
  }

  const skills = Array.isArray(data.skills) ? data.skills.join(', ') : data.skills;
  if (skills) {
    section('Skills');
    line(String(skills), 11);
  }

  if (data.experience) {
    section('Experience');
    if (Array.isArray(data.experience)) {
      data.experience.forEach((job) => {
        line([job.role, job.company].filter(Boolean).join(' — ') || 'Role', 12, 'bold', 1);
        if (job.period) line(job.period, 9, 'normal', 2);
        if (job.detail) line(job.detail, 11, 'normal', 8);
      });
    } else {
      asLines(data.experience).forEach((l) => line(l, 11, 'normal', 2));
    }
  }

  if (data.education) {
    section('Education');
    if (Array.isArray(data.education)) {
      data.education.forEach((ed) => {
        line([ed.course, ed.school].filter(Boolean).join(' — ') || 'Course', 12, 'bold', 1);
        if (ed.period) line(ed.period, 9, 'normal', 6);
      });
    } else {
      asLines(data.education).forEach((l) => line(l, 11, 'normal', 2));
    }
  }

  return doc;
}

export async function triggerHeadlessResume(
  userData: ResumeData,
): Promise<{ success: boolean; message: string; fileName?: string }> {
  try {
    const doc = buildResumeDocument(userData || {});
    const blob = doc.output('blob');
    const fileName = `${(userData?.name || 'Zoe').replace(/[^\w-]+/g, '_')}_Resume.pdf`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke after the browser has had a tick to start the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);

    return { success: true, message: 'Resume generated and downloaded.', fileName };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate document.',
    };
  }
}

export default triggerHeadlessResume;
