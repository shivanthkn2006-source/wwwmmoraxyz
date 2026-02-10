import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64 encode helper
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'No audio data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ACRCLOUD_ACCESS_KEY = Deno.env.get('ACRCLOUD_ACCESS_KEY');
    const ACRCLOUD_ACCESS_SECRET = Deno.env.get('ACRCLOUD_ACCESS_SECRET');
    const ACRCLOUD_HOST = Deno.env.get('ACRCLOUD_HOST') || 'identify-us-west-2.acrcloud.com';

    if (!ACRCLOUD_ACCESS_KEY || !ACRCLOUD_ACCESS_SECRET) {
      throw new Error('ACRCloud credentials not configured');
    }

    console.log('[IdentifySong] Processing audio sample...');

    // Decode base64 audio
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signatureVersion = '1';
    const dataType = 'audio';

    // Create signature string
    const stringToSign = [
      'POST',
      '/v1/identify',
      ACRCLOUD_ACCESS_KEY,
      dataType,
      signatureVersion,
      timestamp.toString()
    ].join('\n');

    // Generate HMAC-SHA1 signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(ACRCLOUD_ACCESS_SECRET);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(stringToSign));
    const signature = toBase64(signatureBuffer);

    // Prepare form data
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'audio/mp3' });
    formData.append('sample', blob, 'sample.mp3');
    formData.append('access_key', ACRCLOUD_ACCESS_KEY);
    formData.append('data_type', dataType);
    formData.append('signature_version', signatureVersion);
    formData.append('signature', signature);
    formData.append('sample_bytes', bytes.length.toString());
    formData.append('timestamp', timestamp.toString());

    // Call ACRCloud API
    const response = await fetch(`https://${ACRCLOUD_HOST}/v1/identify`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[IdentifySong] ACRCloud error:', response.status, errorText);
      throw new Error(`ACRCloud API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[IdentifySong] Result:', JSON.stringify(result));

    // Parse result
    if (result.status?.code === 0 && result.metadata?.music?.length > 0) {
      const music = result.metadata.music[0];
      return new Response(
        JSON.stringify({
          success: true,
          identified: true,
          song: {
            title: music.title,
            artist: music.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
            album: music.album?.name || 'Unknown',
            release_date: music.release_date,
            genre: music.genres?.map((g: any) => g.name).join(', '),
            duration: music.duration_ms ? Math.round(music.duration_ms / 1000) : null,
            spotify_id: music.external_metadata?.spotify?.track?.id,
            youtube_id: music.external_metadata?.youtube?.vid,
            score: music.score
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          identified: false,
          message: 'Could not identify the song. Try with a clearer audio sample.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[IdentifySong] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
