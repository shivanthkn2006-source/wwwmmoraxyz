/**
 * Rule: every face enrollment and face login must pass the server-issued
 * live-person challenge. No image-only path may reach enrollment or token
 * issuance. These tests are tripwires over the deployed function source and
 * the client callers, so the exemption cannot be reintroduced silently.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const server = readFileSync('supabase/functions/face-verification/index.ts', 'utf8');
const loginModal = readFileSync('src/components/FaceLoginModal.tsx', 'utf8');
const setupModal = readFileSync('src/components/FaceVerificationSetup.tsx', 'utf8');

describe('face liveness gate', () => {
  it('server requires the live check for every enroll/login request, with no descriptor/image exemption', () => {
    expect(server).toContain("if (operation === 'enroll_face' || operation === 'login_with_face') {");
    expect(server).not.toContain("&& (descriptor || liveness)");
  });

  it('server rejects enroll/login requests that carry no live proof', () => {
    expect(server).toContain('a live face check is now required');
  });

  it('login screen always sends the live proof and has no photo-only fallback', () => {
    expect(loginModal).toContain("{ operation: 'login_with_face', email, liveness: proof, imageData }");
    expect(loginModal).not.toContain("{ operation: 'login_with_face', email, imageData }");
  });

  it('setup screen always sends the live proof and has no photo-only enrollment', () => {
    expect(setupModal).toContain("{ operation: 'enroll_face', liveness: proof, identityDescriptor }");
    expect(setupModal).not.toContain("{ operation: 'enroll_face', imageData }");
  });
});
