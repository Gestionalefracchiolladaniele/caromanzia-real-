import { create } from 'zustand';

import type { PriorReadingSummary } from '@/lib/gemini';
import type { DeckType, DreamSymbol, EmotionalState, LifeArea, TarotCard, Urgency } from '@/types';

export type ReadingPhase =
  | 'questionnaire'
  | 'deck_selection'
  | 'shuffling'
  | 'revealing'
  | 'interpreting'
  | 'followup'
  | 'saving'
  | 'closing'
  // Dream mode
  | 'dream_input'
  | 'dream_processing'
  // Celtic Cross fasi progressive
  | 'celtic_phase1'
  | 'celtic_phase2'
  | 'celtic_phase3'
  | 'celtic_phase4';

export const READING_MASCOT_MESSAGES: Partial<Record<ReadingPhase, string>> = {
  shuffling:     'Le carte si preparano...',
  revealing:     'I simboli emergono',
  interpreting:  'Leggo il messaggio',
  followup:      'Approfondisci',
  saving:        'Lettura completata',
  celtic_phase1: 'Il cuore della croce',
  celtic_phase2: 'Le radici emergono',
  celtic_phase3: 'L\'asse del tempo',
  celtic_phase4: 'Il destino si svela',
};

export interface FollowupFrom {
  reading_id: string;
  emotional_state: EmotionalState;
  life_area: LifeArea;
  urgency: Urgency;
  deck_type: DeckType;
  summary: string;
}

interface ReadingState {
  phase: ReadingPhase;
  emotionalState: EmotionalState | null;
  lifeArea: LifeArea | null;
  urgency: Urgency | null;
  deckType: DeckType | null;
  cards: TarotCard[];
  revealedCount: number;
  aiText: string;
  isStreaming: boolean;
  followupChips: string[];
  followups: Array<{ question: string; answer: string }>;
  // Contesto storico per Gemini
  priorReadings: PriorReadingSummary[];
  // Follow-up da lettura precedente
  followupFrom: FollowupFrom | null;
  // Contesto libero e domanda opzionale
  freeContext: string;
  userQuestion: string;
  // Dream mode
  dreamText: string;
  extractedSymbols: DreamSymbol[];
  dreamQuestion: string;
  // Shuffle interattivo
  shuffleTapCount: number;
  // Celtic Cross fasi progressive (0=non iniziato, 1-4=fase corrente)
  celticPhase: number;
  // Testi AI per ogni fase Celtic Cross (accumulati)
  celticPhaseTexts: string[];

  setPhase: (phase: ReadingPhase) => void;
  setQuestionnaire: (state: EmotionalState, area: LifeArea, urgency: Urgency) => void;
  incrementShuffleTap: () => void;
  setCelticPhase: (phase: number) => void;
  appendCelticPhaseText: (phaseIndex: number, chunk: string) => void;
  setFreeContext: (text: string) => void;
  setUserQuestion: (text: string) => void;
  setDeck: (deck: DeckType) => void;
  setCards: (cards: TarotCard[]) => void;
  revealNextCard: () => void;
  appendAiText: (chunk: string) => void;
  clearAiText: () => void;
  setIsStreaming: (v: boolean) => void;
  addFollowup: (question: string, answer: string) => void;
  setPriorReadings: (prior: PriorReadingSummary[]) => void;
  setFollowupFrom: (from: FollowupFrom | null) => void;
  // Dream mode
  setDreamText: (text: string) => void;
  setExtractedSymbols: (symbols: DreamSymbol[]) => void;
  setDreamQuestion: (question: string) => void;
  reset: () => void;
}

const INITIAL: Pick<
  ReadingState,
  | 'phase' | 'emotionalState' | 'lifeArea' | 'urgency' | 'deckType'
  | 'cards' | 'revealedCount' | 'aiText' | 'isStreaming' | 'followupChips' | 'followups'
  | 'priorReadings' | 'followupFrom'
  | 'freeContext' | 'userQuestion'
  | 'dreamText' | 'extractedSymbols' | 'dreamQuestion'
  | 'celticPhase' | 'celticPhaseTexts'
> = {
  phase: 'deck_selection',
  emotionalState: null,
  lifeArea: null,
  urgency: null,
  deckType: null,
  cards: [],
  revealedCount: 0,
  aiText: '',
  isStreaming: false,
  followupChips: [],
  followups: [],
  priorReadings: [],
  followupFrom: null,
  freeContext: '',
  userQuestion: '',
  dreamText: '',
  extractedSymbols: [],
  dreamQuestion: '',
  shuffleTapCount: 0,
  celticPhase: 0,
  celticPhaseTexts: [],
};

export const useReadingStore = create<ReadingState>((set) => ({
  ...INITIAL,

  setPhase: (phase) => set({ phase }),

  incrementShuffleTap: () => set((s) => ({ shuffleTapCount: s.shuffleTapCount + 1 })),

  setCelticPhase: (celticPhase) => set({ celticPhase }),

  appendCelticPhaseText: (phaseIndex, chunk) => set((s) => {
    const texts = [...s.celticPhaseTexts];
    texts[phaseIndex] = (texts[phaseIndex] ?? '') + chunk;
    return { celticPhaseTexts: texts };
  }),

  setQuestionnaire: (emotionalState, lifeArea, urgency) =>
    set({ emotionalState, lifeArea, urgency, phase: 'shuffling' }),

  setDeck: (deckType) =>
    set({ deckType, phase: 'questionnaire' }),

  setCards: (cards) => set({ cards, revealedCount: 0 }),

  revealNextCard: () =>
    set((s) => ({ revealedCount: Math.min(s.revealedCount + 1, s.cards.length) })),

  appendAiText: (chunk) => set((s) => ({ aiText: s.aiText + chunk })),

  clearAiText: () => set({ aiText: '' }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  addFollowup: (question, answer) =>
    set((s) => ({ followups: [...s.followups, { question, answer }] })),

  setPriorReadings: (priorReadings) => set({ priorReadings }),

  setFollowupFrom: (followupFrom) => set({ followupFrom }),

  setFreeContext: (freeContext) => set({ freeContext }),

  setUserQuestion: (userQuestion) => set({ userQuestion }),

  setDreamText: (dreamText) => set({ dreamText }),

  setExtractedSymbols: (extractedSymbols) => set({ extractedSymbols }),

  setDreamQuestion: (dreamQuestion) => set({ dreamQuestion }),

  reset: () => set(INITIAL),
}));
