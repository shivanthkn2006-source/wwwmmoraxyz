import { describe, expect, it } from 'vitest';
import { classifyUpload } from '@/pages/home/homeFeedUtils';

describe('unified Home upload classification', () => {
  it.each([
    ['clip.mp4', 'video/mp4', 'video'],
    ['photo.jpg', 'image/jpeg', 'image'],
    ['guide.pdf', 'application/pdf', 'pdf'],
    ['notes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
  ])('classifies %s', (name, type, expected) => {
    expect(classifyUpload({ name, type })).toBe(expected);
  });

  it('rejects executable files', () => {
    expect(classifyUpload({ name: 'danger.exe', type: 'application/x-msdownload' })).toBeNull();
  });
});