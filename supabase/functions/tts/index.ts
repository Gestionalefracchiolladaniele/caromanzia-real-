import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GOOGLE_TTS_API_KEY = Deno.env.get('GOOGLE_TTS_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[TTS] API Key present:', GOOGLE_TTS_API_KEY ? 'yes' : 'NO');
    console.log('[TTS] Calling Google TTS for text length:', text.length);

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'it-IT',
            name: 'it-IT-Standard-A',
            ssmlGender: 'FEMALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.95,
            pitch: -1.0,
          },
        }),
      },
    );

    console.log('[TTS] Response status:', response.status);

    if (!response.ok) {
      const err = await response.text();
      console.log('[TTS] Google API error:', err);
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('[TTS] Got audioContent:', data.audioContent ? 'yes' : 'NO');
    return new Response(
      JSON.stringify({ audioBase64: data.audioContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.log('[TTS] Exception:', String(e));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
