import { playTtsAudio } from './audio-manager';

const MAX_CHARS = 800;

function splitText(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    let end = MAX_CHARS;
    if (remaining.length > MAX_CHARS) {
      const lastPunct = Math.max(
        remaining.lastIndexOf('. ', MAX_CHARS),
        remaining.lastIndexOf('! ', MAX_CHARS),
        remaining.lastIndexOf('? ', MAX_CHARS),
        remaining.lastIndexOf('\n', MAX_CHARS),
      );
      end = lastPunct > MAX_CHARS * 0.5 ? lastPunct + 1 : MAX_CHARS;
    }
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  return chunks;
}

function toSsml(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);

  const ssmlParts = sentences.map((sentence, i) => {
    const trimmed = sentence.trim();
    if (!trimmed) return '';

    // Enfasi leggera su parole chiave mistiche — naturale, non esagerata
    const withEmphasis = trimmed.replace(
      /\b(destino|anima|verità|segreto|luce|ombra|trasformazione|scelta|momento)\b/gi,
      '<emphasis level="moderate">$1</emphasis>',
    );

    // Domande — ritmo sospeso + pausa strength-based (più naturale del time)
    if (trimmed.endsWith('?')) {
      return `<s><prosody rate="0.90">${withEmphasis}</prosody></s><break strength="strong"/>`;
    }

    // Frasi brevi — rivelazione, peso, pausa lunga
    if (trimmed.length < 45) {
      return `<s><prosody rate="0.87">${withEmphasis}</prosody></s><break strength="x-strong"/>`;
    }

    // Alterna ritmo: 1.05 ↔ 0.97 per naturalezza conversazionale
    if (i % 2 === 0) {
      return `<s><prosody rate="1.05">${withEmphasis}</prosody></s><break strength="strong"/>`;
    } else {
      return `<s><prosody rate="0.97">${withEmphasis}</prosody></s><break strength="strong"/>`;
    }
  });

  // Wrappa tutto in <p> (paragrafo) come raccomandato da Google
  return `<speak><p>${ssmlParts.join(' ')}</p></speak>`;
}

export async function speakText(text: string, signal?: AbortSignal): Promise<void> {
  const chunks = splitText(text.trim());
  const apiKey = 'AIzaSyBvR8ShUKoSd8RfIjMCbdMmbiozCzLdmTE';

  for (const chunk of chunks) {
    if (signal?.aborted) return;
    if (!chunk) continue;
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { ssml: toSsml(chunk) },
            voice: {
              languageCode: 'it-IT',
              name: 'it-IT-Standard-A',
              ssmlGender: 'FEMALE',
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 1.0,
              pitch: -2.0,
              volumeGainDb: 2.0,
              effectsProfileId: ['headphone-class-device'],
            },
          }),
        }
      );

      if (!response.ok) continue;
      const data = await response.json();
      if (!data?.audioContent) continue;

      if (signal?.aborted) return;
      await playTtsAudio(data.audioContent);
      const estimatedDurationMs = (chunk.length / 15) * 1000;
      await new Promise((r) => setTimeout(r, estimatedDurationMs));
    } catch {}
  }
}
