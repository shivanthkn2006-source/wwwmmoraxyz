# 5-digit Quick Unlock for M'Mora (signed-in devices only)

## What members get
- After a normal sign-in, a member can choose a 5-digit Quick Unlock code in Settings.
- When the app has been away or idle for 5 minutes, a warm tan lock screen covers the app. Entering the code unlocks it.
- Calls, music, Zoe's voice and VR progress keep running under the lock screen (the app is covered, never closed).
- No lock while a call is active.
- "Forgot code" signs the member out and sends them to the normal sign-in.
- The code is never a way to sign in on a new device and never replaces password, Google, passkey or face sign-in.
- Zoe Infinity keeps its own separate login; this applies to M'Mora / Zoe / DHF only.

## Protection rules
- Weak codes refused by the server: all-same (11111), straight runs (12345, 54321), and a short common-code list.
- Wrong tries: 5 wrong = 1 minute wait, 10 = 15 minutes, 15 = code erased and full sign-in required.
- Waits and counts live only on the server; reloading or editing the phone cannot reset them.
- Every set, change, lockout and erase is recorded for the member and visible to the admin.

## Steps (one at a time, each tested before the next)
1. Server storage for codes — server-only, members cannot read or change it.
2. One server function: set, check, change, remove, status.
3. Unit tests for every rule above.
4. Lock screen + Settings entry, warm tan, no blur.
5. Auto-lock timer, pausing in background tabs, skipping active calls.
6. Signed-in preview check with screenshots; audit file updated with real results.

## Technical details
- Table `public.member_quick_unlock` (user_id uuid PK, code_hash, salt, failed_attempts, locked_until, updated_at). RLS enabled with **no** client policies; GRANT only to service_role. No foreign key to auth.users.
- Edge function `quick-unlock`: identity from verified JWT (resolveClaims), body userId ignored; zod validation `^\d{5}$`; PBKDF2-SHA-256 600,000 iterations (OWASP), 16-byte salt, constant-time compare; CORS from supabase-js; atomic attempt counting via a SECURITY DEFINER function; generic error messages.
- Client calls via `invokeWithFreshSession` (no stale tokens, no /api paths).
- `QuickUnlockGate` mounted inside PlatformLayout as an overlay sibling (children stay mounted); timer uses `useManagedInterval`; Capacitor app-state + visibilitychange; skipped on auth routes, VR inspection and active calls.
- Uses existing toggle/window design tokens; no live backdrop filter (per Home/Zoe flicker rule).
- Tests in `src/test/quickUnlock*.test.ts` (weak-code rules, lockout ladder, identity binding).
- Limitation stated honestly: a quick unlock protects a device left unattended; it is not account-level authentication.
