import { GoogleGenerativeAI } from '@google/generative-ai';

import type { DeckType, DreamSymbol, EmotionalState, LifeArea, TarotCard, Urgency } from '@/types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const CARTOMANTE_PERSONA = `Sei una cartomante con trent'anni di pratica negli arcani, nella numerologia e nella psicologia simbolica junghiana.
Regole ferree:
- Italiano formale, diretto, mai melodrammatico né vago
- Connetti ogni carta alle altre e al contesto specifico dell'utente — niente interpretazioni generiche
- Se ci sono carte in contrasto, evidenzia la tensione e il suo significato
- Parla in prima persona singolare, come se stessi leggendo dal vivo
- Max 180 parole. Chiudi con un'azione concreta o una domanda che tocchi il nucleo della questione`;

export interface ReadingContext {
  emotional_state: EmotionalState;
  life_area: LifeArea;
  urgency: Urgency;
  deck_type: DeckType;
  cards: TarotCard[];
  question?: string;
  free_context?: string;
  user_question?: string;
}

export interface PriorReadingSummary {
  date: string;       // YYYY-MM-DD
  summary: string;    // 300 char max
  card_names: string; // CSV es. "Mago, Sacerdotessa, Imperatrice"
  life_area: LifeArea;
}

const DECK_LABEL: Record<DeckType, string> = {
  tre_carte: 'Tre Carte (passato, presente, futuro)',
  celtic_cross: 'Celtic Cross (10 posizioni)',
  sincronia: 'Sincronicità Sì/No',
  sogni: 'Interpretazione Onirica',
  situazioni: 'Interpretazione Situazione (5 carte)',
};

const EMOTIONAL_LABEL: Record<EmotionalState, string> = {
  sad: 'difficoltà emotiva',
  neutral: 'equilibrio',
  good: 'serenità',
  great: 'energia positiva',
};

const LIFE_AREA_LABEL: Record<LifeArea, string> = {
  love: 'amore e relazioni',
  work: 'lavoro e carriera',
  money: 'finanze',
  health: 'salute',
  spiritual: 'crescita spirituale',
  study: 'studio e apprendimento',
  relations: 'relazioni (amici, famiglia)',
  generale: 'vita in generale',
};

const URGENCY_LABEL: Record<Urgency, string> = {
  past: 'radici nel passato',
  present: 'situazione presente',
  future: 'sviluppi futuri',
  advice: 'consiglio pratico',
};

function buildCardList(cards: TarotCard[]): string {
  return cards
    .map((c, i) => {
      const orient = c.reversed ? '(rovesciata)' : '(diritta)';
      const kw = c.keywords.slice(0, 3).join(', ');
      const cardName = c.name_it || c.name || 'Carta Sconosciuta';
      return `${i + 1}. ${cardName} ${orient} — ${kw}`;
    })
    .join('\n');
}

function buildHistoryBlock(prior: PriorReadingSummary[]): string {
  if (prior.length === 0) return '';
  const lines = prior
    .slice(0, 5)
    .map((r) => `• ${r.date} [${LIFE_AREA_LABEL[r.life_area]}]: ${r.summary} (${r.card_names})`)
    .join('\n');
  return `\nLetture precedenti dell'utente (usa per rilevare pattern ed evoluzione):\n${lines}\n`;
}

function buildPrompt(ctx: ReadingContext, prior: PriorReadingSummary[] = [], followupSummary?: string): string {
  const contextLines = [
    `- Stato emotivo: ${EMOTIONAL_LABEL[ctx.emotional_state]}`,
    `- Area: ${LIFE_AREA_LABEL[ctx.life_area]}`,
    `- Focus: ${URGENCY_LABEL[ctx.urgency]}`,
    `- Tipo spread: ${DECK_LABEL[ctx.deck_type]}`,
    ctx.user_question ? `- Domanda specifica: ${ctx.user_question}` : '',
    ctx.free_context ? `- Contesto aggiuntivo: ${ctx.free_context}` : '',
    ctx.question ? `- Domanda: ${ctx.question}` : '',
  ].filter(Boolean).join('\n');

  const priorBlock = buildHistoryBlock(prior);
  const followupBlock = followupSummary
    ? `\nQuesta lettura è un approfondimento di una precedente. Contesto della lettura precedente:\n"${followupSummary}"\nCollegati esplicitamente a quanto emerso prima.\n`
    : '';
  const patternNote = prior.length > 0
    ? 'Se noti pattern ricorrenti o evoluzioni rispetto alle letture precedenti, menzionali esplicitamente.'
    : '';

  return `${CARTOMANTE_PERSONA}
${priorBlock}${followupBlock}
Sessione attuale:
${contextLines}

Carte estratte:
${buildCardList(ctx.cards)}

Fornisci un'interpretazione precisa, connessa e personalizzata. ${patternNote} Parla direttamente all'utente usando "tu".`;
}

export async function streamGeminiReading(
  ctx: ReadingContext,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
  prior: PriorReadingSummary[] = [],
  followupSummary?: string,
): Promise<void> {
  if (!GEMINI_API_KEY) {
    onChunk('⚠️ Chiave Gemini non configurata. Imposta EXPO_PUBLIC_GEMINI_API_KEY.');
    onDone();
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContentStream(buildPrompt(ctx, prior, followupSummary));

    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      try {
        const text = chunk.text();
        if (text) onChunk(text);
      } catch (e) {
        console.warn('Reading chunk parse error, continuing:', e);
        continue;
      }
    }
  } catch (err) {
    console.error('Gemini streaming error:', err);
    onChunk('⚠️ Errore nella lettura IA. Riprova.');
  }

  onDone();
}

interface DreamContext {
  emotional_state: EmotionalState;
  life_area: LifeArea;
  dream_text: string;
  extracted_symbols: DreamSymbol[];
  user_question?: string;
}

const DREAM_ANALYST_PERSONA = `Sei uno psicologo junghiano specializzato in analisi dei sogni e simbologia dell'inconscio.
Regole ferree:
- Italiano formale, empatico ma preciso — mai banalizzare
- Interpreta i simboli del sogno come messaggi dell'inconscio, non come previsioni letterali
- Connetti i simboli tra loro e al contesto emotivo e di vita dell'utente
- Se compaiono archetipi junghiani (Ombra, Anima, Sé), nominali esplicitamente
- Max 180 parole. Termina con una domanda aperta che inviti l'utente a esplorare il proprio interno`;

function buildDreamPrompt(ctx: DreamContext): string {
  const symbolLines = ctx.extracted_symbols.length
    ? ctx.extracted_symbols.map((s) => `• ${s.symbol}: ${s.meaning}`).join('\n')
    : '(nessun simbolo riconosciuto)';

  return `${DREAM_ANALYST_PERSONA}

Contesto dell'utente:
- Stato emotivo: ${ctx.emotional_state}
- Area di vita: ${ctx.life_area}
${ctx.user_question ? `- Domanda: ${ctx.user_question}` : ''}

Testo del sogno:
"${ctx.dream_text}"

Simboli riconosciuti e significati:
${symbolLines}

Fornisci un'interpretazione psicologica e simbolica del sogno. Parla direttamente all'utente. Termina con una domanda aperta.`;
}

const CARD_IDS = [
  'ar00','ar01','ar02','ar03','ar04','ar05','ar06','ar07','ar08','ar09','ar10',
  'ar11','ar12','ar13','ar14','ar15','ar16','ar17','ar18','ar19','ar20','ar21',
  'cuac','cu02','cu03','cu04','cu05','cu06','cu07','cu08','cu09','cu10','cupa','cukn','cuqu','cuki',
  'peac','pe02','pe03','pe04','pe05','pe06','pe07','pe08','pe09','pe10','pepa','pekn','pequ','peki',
  'swac','sw02','sw03','sw04','sw05','sw06','sw07','sw08','sw09','sw10','swpa','swkn','swqu','swki',
  'waac','wa02','wa03','wa04','wa05','wa06','wa07','wa08','wa09','wa10','wapa','wakn','waqu','waki',
];

export async function selectDreamCards(
  dreamText: string,
  emotionalState: EmotionalState,
  lifeArea: LifeArea,
): Promise<string[]> {
  if (!GEMINI_API_KEY) return CARD_IDS.slice(0, 5);

  const prompt = `Sei un esperto di tarocchi. Analizza questo sogno e scegli esattamente 5 carte dei tarocchi che rispecchiano i simboli, le emozioni e i temi presenti.

Sogno: "${dreamText}"
Stato emotivo: ${emotionalState}
Area di vita: ${LIFE_AREA_LABEL[lifeArea]}

IDs disponibili: ${CARD_IDS.join(',')}

Rispondi SOLO con 5 ID carta separati da virgola, nessun altro testo. Esempio: ar18,cu07,sw09,ar13,wa08`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const chosen = text
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((id) => CARD_IDS.includes(id))
    .slice(0, 5);

  if (chosen.length < 5) {
    const fallback = CARD_IDS.filter((id) => !chosen.includes(id));
    while (chosen.length < 5) chosen.push(fallback[chosen.length]);
  }

  return chosen;
}

export async function streamGeminiDreamInterpretation(
  ctx: DreamContext,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!GEMINI_API_KEY) {
    onChunk('⚠️ Chiave Gemini non configurata. Imposta EXPO_PUBLIC_GEMINI_API_KEY.');
    onDone();
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContentStream(buildDreamPrompt(ctx));

    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      try {
        const text = chunk.text();
        if (text) onChunk(text);
      } catch (e) {
        console.warn('Dream chunk parse error, continuing:', e);
        continue;
      }
    }
  } catch (err) {
    console.error('Dream interpretation error:', err);
    onChunk('⚠️ Errore interpretazione sogno. Riprova.');
  }

  onDone();
}

export async function streamGeminiFollowup(
  previousAnswer: string,
  followupQuestion: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!GEMINI_API_KEY) {
    onChunk('⚠️ Chiave Gemini non configurata.');
    onDone();
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `${CARTOMANTE_PERSONA}

Interpretazione appena fornita:
${previousAnswer}

L'utente chiede: "${followupQuestion}"

Rispondi in modo preciso e diretto (max 80 parole). Mantieni il tono autorevole.`;

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      try {
        const text = chunk.text();
        if (text) onChunk(text);
      } catch (e) {
        console.warn('Followup chunk parse error, continuing:', e);
        continue;
      }
    }
  } catch (err) {
    console.error('Followup error:', err);
    onChunk('⚠️ Errore nel recupero approfondimento. Riprova.');
  }

  onDone();
}

// ─── Celtic Cross interpretazione progressiva per fase ───────────────────────

const CELTIC_PHASE_LABELS = [
  '', // 0 non usato
  'Centro della croce: Situazione (carta 1) e Ostacolo (carta 2 — il blocco)',
  'Radici e movimento: Fondamenta (carta 3, base inconscia) e Passato (carta 4, ciò che si lascia)',
  'Asse del tempo: Avvenire immediato (carta 5) e Prossimo futuro (carta 6)',
  'Colonna del destino: Atteggiamento (carta 7), Influenze esterne (carta 8), Speranze e paure (carta 9), Risultato finale (carta 10)',
];

export interface CelticPhaseContext {
  emotional_state: EmotionalState;
  life_area: LifeArea;
  urgency: Urgency;
  user_question?: string;
  free_context?: string;
  phaseIndex: number;          // 1..4
  phaseCards: TarotCard[];     // solo le carte di questa fase
  allRevealedCards: TarotCard[]; // tutte le carte finora rivelate
  previousPhaseTexts: string[]; // testi AI delle fasi precedenti
}

export async function streamGeminiCelticPhase(
  ctx: CelticPhaseContext,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!GEMINI_API_KEY) {
    onChunk('⚠️ Chiave Gemini non configurata.');
    onDone();
    return;
  }

  try {
    const phaseLabel = CELTIC_PHASE_LABELS[ctx.phaseIndex];
    const phaseCardList = ctx.phaseCards
      .map((c) => {
        const cardName = c.name_it || c.name || 'Carta Sconosciuta';
        return `• ${cardName} ${c.reversed ? '(rovesciata)' : '(diritta)'} — ${c.keywords.slice(0, 3).join(', ')}`;
      })
      .join('\n');

    const allCardList = ctx.allRevealedCards
      .map((c, i) => {
        const cardName = c.name_it || c.name || 'Carta Sconosciuta';
        return `${i + 1}. ${cardName} ${c.reversed ? '(rovesciata)' : '(diritta)'}`;
      })
      .join('\n');

    const prevTexts = ctx.previousPhaseTexts.length > 0
      ? `\nInterpretazioni precedenti da integrare:\n${ctx.previousPhaseTexts.map((t, i) => `Fase ${i + 1}: ${t}`).join('\n\n')}\n`
      : '';

    const prompt = `${CARTOMANTE_PERSONA}

Stai conducendo una lettura Celtic Cross (Croce Celtica) in modo progressivo, fase per fase.
Area di vita: ${LIFE_AREA_LABEL[ctx.life_area]}
Stato emotivo: ${EMOTIONAL_LABEL[ctx.emotional_state]}
Focus: ${URGENCY_LABEL[ctx.urgency]}
${ctx.user_question ? `Domanda: ${ctx.user_question}` : ''}
${ctx.free_context ? `Contesto: ${ctx.free_context}` : ''}

Tutte le carte rivelate finora:
${allCardList}
${prevTexts}
Fase attuale — ${phaseLabel}:
${phaseCardList}

Interpreta SOLO le carte di questa fase (max 100 parole), collegandole al contesto precedente se presente. Sii diretto e concreto. Non ripetere interpretazioni già date.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      try {
        const text = chunk.text();
        if (text) onChunk(text);
      } catch (e) {
        console.warn('Celtic phase chunk parse error, continuing:', e);
        continue;
      }
    }
  } catch (err) {
    console.error('Celtic phase error:', err);
    onChunk('⚠️ Errore fase Croce Celtica. Riprova.');
  }

  onDone();
}

// ─── Situazioni: selezione carte + interpretazione ───────────────────────────

export async function selectSituationCards(
  situationText: string,
  emotionalState: EmotionalState,
  lifeArea: LifeArea,
): Promise<string[]> {
  if (!GEMINI_API_KEY) return CARD_IDS.slice(0, 5);

  const prompt = `Sei un esperto di tarocchi. Analizza questa situazione e scegli esattamente 5 carte dei tarocchi che rappresentano le dinamiche in gioco, le forze contrastanti e le possibili risoluzioni.

Situazione: "${situationText}"
Stato emotivo: ${emotionalState}
Area di vita: ${LIFE_AREA_LABEL[lifeArea]}

IDs disponibili: ${CARD_IDS.join(',')}

Rispondi SOLO con 5 ID carta separati da virgola, nessun altro testo. Esempio: ar18,cu07,sw09,ar13,wa08`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const chosen = text
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((id) => CARD_IDS.includes(id))
    .slice(0, 5);

  if (chosen.length < 5) {
    const fallback = CARD_IDS.filter((id) => !chosen.includes(id));
    while (chosen.length < 5) chosen.push(fallback[chosen.length]);
  }

  return chosen;
}

const SITUATION_ANALYST_PERSONA = `Sei una cartomante con trent'anni di pratica negli arcani, specializzata nell'analisi delle situazioni complesse.
Regole ferree:
- Italiano formale, diretto, mai melodrammatico né vago
- Ogni carta rappresenta una dinamica, una forza o un potenziale nella situazione descritta
- Evidenzia le tensioni tra carte contrastanti e il loro significato nella situazione
- Connetti le carte al contesto specifico dell'utente — niente interpretazioni generiche
- Parla in prima persona singolare, come se stessi leggendo dal vivo
- Max 180 parole. Chiudi con un'azione concreta o una domanda che tocchi il nucleo della questione`;

export async function streamGeminiSituationInterpretation(
  ctx: ReadingContext,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!GEMINI_API_KEY) {
    onChunk('⚠️ Chiave Gemini non configurata. Imposta EXPO_PUBLIC_GEMINI_API_KEY.');
    onDone();
    return;
  }

  try {
    const situationText = (ctx.free_context ?? '').trim() || '(nessuna descrizione fornita)';
    const prompt = `${SITUATION_ANALYST_PERSONA}

Contesto dell'utente:
- Stato emotivo: ${EMOTIONAL_LABEL[ctx.emotional_state]}
- Area di vita: ${LIFE_AREA_LABEL[ctx.life_area]}
${ctx.urgency ? `- Focus: ${URGENCY_LABEL[ctx.urgency]}` : ''}
${ctx.user_question ? `- Domanda specifica: ${ctx.user_question}` : ''}

Situazione descritta:
"${situationText}"

Carte estratte (rappresentano le dinamiche della situazione):
${buildCardList(ctx.cards)}

Fornisci un'interpretazione che analizzi le dinamiche in gioco, le forze contrastanti e i potenziali sviluppi della situazione. Parla direttamente all'utente usando "tu".`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      try {
        const text = chunk.text();
        if (text) onChunk(text);
      } catch (e) {
        console.warn('Situation chunk parse error, continuing:', e);
        continue;
      }
    }
  } catch (err) {
    console.error('Situation interpretation error:', err);
    onChunk('⚠️ Errore interpretazione situazione. Riprova.');
  }

  onDone();
}

// ─── Riassunto sintetico della lettura per la cronologia ─────────────────────

export async function generateReadingSummary(args: {
  cardNames: string[];
  userQuestion?: string;
  dreamText?: string;
  aiInterpretation: string;
  followups?: Array<{ question: string; answer: string }>;
}): Promise<string> {
  const { cardNames, userQuestion, dreamText, aiInterpretation, followups } = args;

  if (!GEMINI_API_KEY) {
    return `Carte: ${cardNames.join(', ')}. ${aiInterpretation.slice(0, 140)}…`;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const userInputBlock = dreamText
    ? `Sogno raccontato: "${dreamText}"`
    : userQuestion
      ? `Domanda dell'utente: "${userQuestion}"`
      : 'Nessuna domanda specifica.';

  const followupBlock =
    followups && followups.length > 0
      ? followups.map((f, i) => `Approfondimento ${i + 1}:\nQ: ${f.question}\nA: ${f.answer}`).join('\n\n')
      : 'Nessun approfondimento.';

  const prompt = `Riassumi la seguente lettura di tarocchi in italiano, in massimo 60 parole.
Stile: terza persona, concreto, niente formule retoriche. Includi: il tema della domanda, le carte chiave e il messaggio centrale dell'interpretazione. Se ci sono approfondimenti, integra il loro contenuto.

Carte estratte: ${cardNames.join(', ')}

${userInputBlock}

Interpretazione:
${aiInterpretation}

${followupBlock}

Riassunto (max 60 parole):`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return `Carte: ${cardNames.join(', ')}. ${aiInterpretation.slice(0, 140)}…`;
  }
}
