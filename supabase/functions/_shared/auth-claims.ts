/**
 * Version-safe JWT claim resolution for edge functions.
 *
 * `auth.getClaims()` only exists on newer @supabase/supabase-js builds. Several
 * functions in this project pin older versions (2.39.x / 2.49.x), where calling
 * it throws `auth.getClaims is not a function`, so the function 500s instead of
 * returning a clean 401. This helper prefers getClaims when it exists and falls
 * back to `auth.getUser(token)`, always returning the getClaims result shape:
 *
 *   const { data, error } = await resolveClaims(client, token);
 *   const userId = data?.claims?.sub;
 */

export interface AuthClaims {
  sub: string;
  email?: string;
  role?: string;
}

export interface ResolvedClaims {
  data: { claims: AuthClaims } | null;
  error: { message: string } | null;
}

// deno-lint-ignore no-explicit-any
export async function resolveClaims(client: any, token: string): Promise<ResolvedClaims> {
  if (!client?.auth || !token) {
    return { data: null, error: { message: 'missing token' } };
  }

  try {
    if (typeof client.auth.getClaims === 'function') {
      try {
        const { data, error } = await client.auth.getClaims(token);
        if (!error && data?.claims?.sub) {
          return { data: { claims: data.claims as AuthClaims }, error: null };
        }
      } catch {
        // fall through to getUser
      }
    }

    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.id) {
      return { data: null, error: { message: error?.message ?? 'invalid token' } };
    }
    return {
      data: {
        claims: {
          sub: data.user.id,
          email: data.user.email ?? undefined,
          role: data.user.role ?? undefined,
        },
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'auth failure' } };
  }
}
