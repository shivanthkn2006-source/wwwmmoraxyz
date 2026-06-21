/**
 * Shared error handling utility for edge functions.
 * Returns generic error messages to clients while logging details server-side.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export function handleError(
  functionName: string,
  error: unknown,
  requestId?: string
): Response {
  // Log full error details server-side only
  const prefix = requestId ? `[${functionName}:${requestId}]` : `[${functionName}]`;
  console.error(`${prefix} Error:`, error);

  // Determine status code
  let status = 500;
  let clientMessage = 'An internal error occurred. Please try again later.';

  if (error instanceof Error) {
    // Validation errors get a 400
    if (error.name === 'ZodError' || error.message.includes('required') || error.message.includes('invalid')) {
      status = 400;
      clientMessage = 'Invalid request format. Please check your input.';
    }
  }

  // Check for Zod errors specifically
  if (typeof error === 'object' && error !== null && 'issues' in error) {
    status = 400;
    clientMessage = 'Invalid request format. Please check your input.';
  }

  return new Response(
    JSON.stringify({ error: clientMessage }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Validates JWT and returns userId or an error response.
 */
export async function validateAuth(
  req: Request,
  supabaseCreateClient: any,
): Promise<{ userId: string } | { errorResponse: Response }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  const supabase = supabaseCreateClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { userId: data.claims.sub };
}
