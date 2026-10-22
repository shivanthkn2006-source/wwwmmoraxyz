import { describe, expect, it } from 'vitest';
import { editReferenceUrl } from '../../supabase/functions/edit-image/reference-url';

const BACKEND = 'https://project.supabase.co';

describe('edit-image reference download origins', () => {
  it.each([
    'https://project.supabase.co/storage/v1/object/sign/identity/u/photo.jpg?token=x',
    'https://lh3.googleusercontent.com/a/abc=s96-c',
  ])('accepts reviewed photo origin %s', (url) => {
    expect(editReferenceUrl(url, BACKEND)).toBe(url);
  });

  it.each([
    'http://169.254.169.254/latest/meta-data/', 'https://127.0.0.1/x', 'https://[::1]/x',
    'https://attacker.example/photo.jpg', 'https://project.supabase.co.attacker.example/storage/v1/object/x',
    'https://project.supabase.co@attacker.example/storage/v1/object/x',
    'https://user:pass@project.supabase.co/storage/v1/object/x',
    'https://project.supabase.co:8443/storage/v1/object/x', 'http://project.supabase.co/storage/v1/object/x',
    'https://project.supabase.co/rest/v1/profiles', 'https://project.supabase.co/functions/v1/x',
    'http://lh3.googleusercontent.com/a/x', 'file:///etc/passwd', '', 42,
  ])('rejects %s before any download', (url) => {
    expect(editReferenceUrl(url, BACKEND)).toBeNull();
  });

  it('rejects storage URLs when the backend address is missing', () => {
    expect(editReferenceUrl('https://project.supabase.co/storage/v1/object/x', undefined)).toBeNull();
  });
});
