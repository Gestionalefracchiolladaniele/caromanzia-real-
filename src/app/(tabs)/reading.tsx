import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DivineMascot } from '@/components/ui/DivineMascot';
import { ElaborateFrame } from '@/components/ui/ElaborateFrame';
import { GoldButton } from '@/components/ui/GoldButton';
import { TabBar, type TabId } from '@/components/ui/TabBar';
import { TitleBox } from '@/components/ui/TitleBox';
import { CardReveal } from '@/features/reading/components/CardReveal';
import { CelticCrossLayout } from '@/features/reading/components/CelticCrossLayout';
import { FollowupPanel } from '@/features/reading/components/FollowupPanel';
import { drawCardsForDeck, drawCardsForDream, TRE_CARTE_POSITIONS, SINCRONIA_POSITIONS } from '@/features/reading/tarot-cards';
import { useReadingStore, READING_MASCOT_MESSAGES } from '@/features/reading/reading-store';
import { streamGeminiReading, streamGeminiFollowup, streamGeminiCelticPhase, selectDreamCards, selectSituationCards, streamGeminiSituationInterpretation, generateReadingSummary } from '@/lib/gemini';
import { useAuthStore } from '@/lib/auth-store';
import { saveReading, fetchPriorReadings } from '@/lib/supabase-readings';
import {
  initAudio, playBackground, fadeOutBackground,
  stopTts, pauseTts, resumeTts, setBgEnabled, setTtsEnabled, isBgEnabled, isTtsEnabled,
} from '@/lib/audio-manager';
import { speakText } from '@/lib/google-tts';
import type { DeckType, EmotionalState, LifeArea, Urgency } from '@/types';

/* ── Questionnaire data ── */
const EMOTIONAL_OPTIONS: { label: string; value: EmotionalState }[] = [
  { label: '😔 Triste', value: 'sad' },
  { label: '😐 Neutro', value: 'neutral' },
  { label: '🙂 Bene', value: 'good' },
  { label: '😊 Benissimo', value: 'great' },
];

const LIFE_AREA_OPTIONS: { label: string; value: LifeArea }[] = [
  { label: '❤️ Amore', value: 'love' },
  { label: '💼 Lavoro', value: 'work' },
  { label: '💰 Finanze', value: 'money' },
  { label: '🏥 Salute', value: 'health' },
  { label: '✨ Spirituale', value: 'spiritual' },
  { label: '🎓 Studio', value: 'study' },
  { label: '🤝 Relazioni', value: 'relations' },
  { label: '🌐 Generale', value: 'generale' },
];

const URGENCY_OPTIONS: { label: string; value: Urgency }[] = [
  { label: '⏮ Passato', value: 'past' },
  { label: '⏺ Presente', value: 'present' },
  { label: '⏭ Futuro', value: 'future' },
  { label: '💡 Consiglio', value: 'advice' },
];

interface SpreadMode {
  id: DeckType;
  icon: string;
  name: string;
  sub: string;
  focus: string;
  time: string;
  free: boolean;
}

const SPREADS: SpreadMode[] = [
  { id: 'tre_carte', icon: '🃏', name: 'TRE CARTE', sub: 'Prospettiva Temporale', focus: 'Passato, Presente, Futuro', time: '~5 min', free: true },
  { id: 'celtic_cross', icon: '✝', name: 'CROCE CELTICA', sub: 'Esplorazione Profonda', focus: 'Radici, Influenze, Esito', time: '~15 min', free: false },
  { id: 'sincronia', icon: '⚡', name: 'SINCRONICITÀ', sub: 'Risposta Sì/No', focus: 'Una domanda diretta', time: '~2 min', free: true },
  { id: 'sogni', icon: '🌙', name: 'SOGNI', sub: 'Interpretazione Onirica', focus: 'Simboli del sogno + AI', time: '~5 min', free: true },
  { id: 'situazioni', icon: '🌟', name: 'SITUAZIONI', sub: 'Analisi Dinamiche', focus: 'Forze in gioco + risoluzioni', time: '~5 min', free: true },
];

export default function ReadingScreen() {
  const phase = useReadingStore((s) => s.phase);
  const emotionalState = useReadingStore((s) => s.emotionalState);
  const lifeArea = useReadingStore((s) => s.lifeArea);
  const urgency = useReadingStore((s) => s.urgency);
  const deckType = useReadingStore((s) => s.deckType);
  const cards = useReadingStore((s) => s.cards);
  const revealedCount = useReadingStore((s) => s.revealedCount);
  const aiText = useReadingStore((s) => s.aiText);
  const isStreaming = useReadingStore((s) => s.isStreaming);
  const followups = useReadingStore((s) => s.followups);
  const followupFrom = useReadingStore((s) => s.followupFrom);

  const userId = useAuthStore((s) => s.user?.id);
  const userName = useAuthStore((s) => s.user?.name);
  const userAvatar = useAuthStore((s) => s.user?.avatar_url);

  const freeContext = useReadingStore((s) => s.freeContext);
  const userQuestion = useReadingStore((s) => s.userQuestion);

  const shuffleTapCount = useReadingStore((s) => s.shuffleTapCount);
  const celticPhase = useReadingStore((s) => s.celticPhase);
  const celticPhaseTexts = useReadingStore((s) => s.celticPhaseTexts);

  const {
    setQuestionnaire,
    setDeck,
    setPhase,
    setCards,
    revealNextCard,
    appendAiText,
    setIsStreaming,
    addFollowup,
    setPriorReadings,
    setFreeContext,
    setUserQuestion,
    incrementShuffleTap,
    setCelticPhase,
    appendCelticPhaseText,
    reset,
  } = useReadingStore.getState();

  // Questionnaire selections — pre-popolati da followupFrom se presente
  const [selEmotional, setSelEmotional] = React.useState<EmotionalState | null>(
    followupFrom?.emotional_state ?? null,
  );
  const [selArea, setSelArea] = React.useState<LifeArea | null>(
    followupFrom?.life_area ?? null,
  );
  const [selUrgency, setSelUrgency] = React.useState<Urgency | null>(
    followupFrom?.urgency ?? null,
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [aiSummary, setAiSummary] = React.useState<string>('');
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  // Audio state
  const [musicOn, setMusicOn] = React.useState(isBgEnabled());
  const [ttsOn, setTtsOn] = React.useState(isTtsEnabled());
  const [isPlaying, setIsPlaying] = React.useState(false);
  const ttsAbortRef = useRef<AbortController | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shuffleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bridgeScaleAnim = useRef(new Animated.Value(1)).current;
  const cardSwayAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  // Pre-compute translateY per evitare new Animated.Value() nel render (causa drop frames)
  const cardSwayTranslateY = useRef(
    cardSwayAnims.map((anim) => anim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }))
  ).current;
  const deckRotateAnim = useRef(new Animated.Value(0)).current;
  const deckSpreadAnim = useRef(new Animated.Value(0)).current;

  const needsUrgency = deckType !== 'tre_carte' && deckType !== 'sogni' && deckType !== 'situazioni';
  const needsQuestion = deckType === 'sincronia' || deckType === 'tre_carte';
  const needsDreamText = deckType === 'sogni';
  const needsSituationText = deckType === 'situazioni';
  const canProceed = selEmotional !== null && selArea !== null
    && (needsUrgency ? selUrgency !== null : true)
    && (needsQuestion ? userQuestion.trim().length > 0 : true)
    && (needsDreamText ? freeContext.trim().length > 0 : true)
    && (needsSituationText ? freeContext.trim().length > 0 : true);

  // Auto-save stato lettura in MMKV ad ogni cambio di fase
  useEffect(() => {
    useReadingStore.getState().saveToStorage();
  }, [phase]);

  // Carica prior readings quando entra nel questionnaire
  useEffect(() => {
    if (phase !== 'questionnaire' || !userId) return;
    fetchPriorReadings(userId, 5).then(setPriorReadings).catch(() => {});
  }, [phase, userId]);

  // Genera riassunto AI in background appena entra in saving — non blocca l'UI
  useEffect(() => {
    if (phase !== 'saving' || !aiText || aiSummary || summaryLoading) return;
    let cancelled = false;
    setSummaryLoading(true);
    generateReadingSummary({
      cardNames: cards.map((c) => c.name_it),
      userQuestion: userQuestion.trim() || undefined,
      dreamText: deckType === 'sogni' ? freeContext.trim() || undefined : undefined,
      aiInterpretation: aiText,
      followups,
    })
      .then((s) => { if (!cancelled) setAiSummary(s); })
      .catch(() => { if (!cancelled) setAiSummary(aiText.slice(0, 200)); })
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [phase, aiText]);

  // Pre-popola questionnaire se followupFrom cambia
  useEffect(() => {
    if (followupFrom) {
      setSelEmotional(followupFrom.emotional_state);
      setSelArea(followupFrom.life_area);
      setSelUrgency(followupFrom.urgency);
    }
  }, [followupFrom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      ttsAbortRef.current?.abort();
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);
      fadeOutBackground(800);
    };
  }, []);

  // Init audio on mount
  useEffect(() => {
    initAudio().catch(() => {});
  }, []);

  // Avvia musica quando entra in shuffling, fermala quando salva/chiude
  useEffect(() => {
    if (['shuffling', 'revealing', 'interpreting', 'followup',
         'celtic_phase1', 'celtic_phase2', 'celtic_phase3', 'celtic_phase4'].includes(phase)) {
      playBackground().catch(() => {});
    } else if (['saving', 'closing', 'deck_selection'].includes(phase)) {
      fadeOutBackground(1200).catch(() => {});
    }
  }, [phase]);

  // Parla il testo AI appena isStreaming finisce nella fase interpreting — solo se ttsOn
  useEffect(() => {
    if (isStreaming || !ttsOn || !aiText) return;
    if (phase !== 'interpreting' && !['celtic_phase1','celtic_phase2','celtic_phase3','celtic_phase4'].includes(phase)) return;
    setIsPlaying(true);
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = new AbortController();
    speakText(aiText, ttsAbortRef.current.signal)
      .catch(() => {})
      .finally(() => setIsPlaying(false));
  }, [isStreaming, ttsOn]);

  // AI parte in background appena entri in revealing (tutte le letture tranne Celtic Cross)
  useEffect(() => {
    if (phase !== 'revealing' || cards.length === 0 || deckType === 'celtic_cross') return;
    startAIBackgroundInterpretation();
  }, [phase, cards.length, deckType]);

  async function startAIBackgroundInterpretation() {
    const state = useReadingStore.getState();
    const { emotionalState: es, lifeArea: la, urgency: urg, deckType: dt, cards: c, freeContext: fc, userQuestion: uq } = state;
    if (!es || !la || !dt) return;

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const ctx = {
      emotional_state: es,
      life_area: la,
      urgency: urg ?? 'present',
      deck_type: dt,
      cards: c,
      free_context: fc.trim() || undefined,
      user_question: uq.trim() || undefined,
    };

    setIsStreaming(true);

    try {
      if (dt === 'situazioni') {
        await streamGeminiSituationInterpretation(
          ctx,
          (chunk) => appendAiText(chunk),
          () => setIsStreaming(false),
          signal,
        );
      } else {
        await streamGeminiReading(
          ctx,
          (chunk) => appendAiText(chunk),
          () => setIsStreaming(false),
          signal,
          state.priorReadings,
          state.followupFrom?.summary,
        );
      }
    } catch {
      setIsStreaming(false);
    }
  }

  // Quando tutte le carte sono rivelate → vai a interpreting/followup
  useEffect(() => {
    if (phase !== 'revealing' || deckType === 'celtic_cross') return;
    if (cards.length > 0 && revealedCount >= cards.length) {
      setPhase('interpreting');
    }
  }, [revealedCount, cards.length, phase, deckType]);

  function handleRevealCard() {
    if (phase !== 'revealing' || deckType === 'celtic_cross') return;
    if (revealedCount < cards.length) {
      revealNextCard();
    }
  }

  const maxFollowups = deckType === 'sincronia' ? 1 : deckType === 'tre_carte' ? 3 : deckType === 'celtic_cross' ? 5 : deckType === 'situazioni' ? 3 : 3;

  async function handleFollowup(question: string) {
    if (!emotionalState || !lifeArea || !deckType) return;
    if (followups.length >= maxFollowups) return;

    addFollowup(question, '');
    setIsStreaming(true);

    abortRef.current = new AbortController();
    let answer = '';

    try {
      await streamGeminiFollowup(
        aiText,
        question,
        (chunk) => { answer += chunk; },
        () => {
          setIsStreaming(false);
          const state = useReadingStore.getState();
          const updated = [...state.followups];
          updated[updated.length - 1] = { question, answer };
          useReadingStore.setState({ followups: updated });
        },
        abortRef.current.signal,
      );
    } catch {
      setIsStreaming(false);
    }
  }

  async function handleSaveReading() {
    if (!userId || !emotionalState || !lifeArea || !deckType) return;
    if (needsUrgency && !urgency) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      // Usa il summary già pronto (generato in background), altrimenti fallback veloce
      const summary = aiSummary || aiText.slice(0, 200);

      await saveReading({
        user_id: userId,
        deck_type: deckType,
        cards,
        ai_interpretation: aiText,
        summary,
        context: {
          emotional_state: emotionalState,
          life_area: lifeArea,
          urgency: urgency || 'present',
          deck_type: deckType,
          cards,
          free_context: freeContext.trim() || undefined,
          user_question: userQuestion.trim() || undefined,
        },
        followups,
        question: userQuestion.trim() || null,
        dream_text: deckType === 'sogni' ? freeContext.trim() || null : null,
      });
      handleReset();
      setTimeout(() => {
        router.replace('/(tabs)/history' as any);
      }, 100);
    } catch (e) {
      console.error('Save error:', e);
      setSaveError('Salvataggio fallito. Riprova.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleStartDeck(id: DeckType) {
    setDeck(id);
    setPhase('questionnaire');
  }

  // Riferimento per evitare doppio proceed (tap + timeout)
  const revealStartedRef = useRef(false);

  async function proceedToRevealing(currentDeckType: DeckType) {
    if (revealStartedRef.current) return;
    revealStartedRef.current = true;
    if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);

    if (currentDeckType === 'sogni') {
      try {
        const [ids] = await Promise.all([
          selectDreamCards(freeContext.trim(), selEmotional!, selArea!),
          new Promise((r) => setTimeout(r, 600)),
        ]);
        setCards(drawCardsForDream(ids as string[]));
      } catch {
        await new Promise((r) => setTimeout(r, 600));
        setCards(drawCardsForDeck('tre_carte').concat(drawCardsForDeck('tre_carte').slice(0, 2)));
      }
      setPhase('revealing');
    } else if (currentDeckType === 'situazioni') {
      try {
        const [ids] = await Promise.all([
          selectSituationCards(freeContext.trim(), selEmotional!, selArea!),
          new Promise((r) => setTimeout(r, 600)),
        ]);
        setCards(drawCardsForDream(ids as string[]));
      } catch {
        await new Promise((r) => setTimeout(r, 600));
        setCards(drawCardsForDeck('tre_carte').concat(drawCardsForDeck('tre_carte').slice(0, 2)));
      }
      setPhase('revealing');
    } else if (currentDeckType === 'celtic_cross') {
      setCards(drawCardsForDeck(currentDeckType));
      useReadingStore.setState({ celticPhase: 0, celticPhaseTexts: [] });
      setPhase('revealing');
    } else {
      setCards(drawCardsForDeck(currentDeckType));
      setPhase('revealing');
    }
  }

  async function handleQuestionnaireSubmit() {
    if (!canProceed || !deckType) return;
    revealStartedRef.current = false;
    setQuestionnaire(selEmotional!, selArea!, selUrgency ?? 'present');
    setPhase('shuffling');
    useReadingStore.setState({ shuffleTapCount: 0 });
    // Reset animazioni shuffle
    deckRotateAnim.setValue(0);
    deckSpreadAnim.setValue(0);
    cardSwayAnims.forEach((a) => a.setValue(0));
  }

  function animateShuffle(tap: number) {
    if (tap === 1) {
      // TAP 1: swirl del mazzo con easing naturale
      Animated.sequence([
        Animated.timing(deckRotateAnim, { toValue: 1, duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
        Animated.timing(deckRotateAnim, { toValue: -0.5, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(deckRotateAnim, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      // Le carte svolazzano con staggering naturale
      cardSwayAnims.forEach((anim, i) => {
        Animated.sequence([
          Animated.delay(i * 50),
          Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
      });
    } else if (tap === 2) {
      // TAP 2: spread a ventaglio
      Animated.spring(deckSpreadAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else if (tap === 3) {
      // TAP 3: raccolta rapida + fade out
      Animated.parallel([
        Animated.timing(deckSpreadAnim, { toValue: 0, duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1), useNativeDriver: true }),
        Animated.timing(bridgeScaleAnim, { toValue: 0, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  }

  function handleBridgeTap() {
    const newCount = shuffleTapCount + 1;
    incrementShuffleTap();

    // Animazione bounce bottone
    Animated.sequence([
      Animated.timing(bridgeScaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(bridgeScaleAnim, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.timing(bridgeScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    animateShuffle(newCount);

    if (newCount >= 3 && deckType) {
      setTimeout(() => proceedToRevealing(deckType as DeckType), 500);
    }
  }

  function handleToggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    setBgEnabled(next);
    if (next) playBackground().catch(() => {});
  }

  function handleToggleTts() {
    const next = !ttsOn;
    setTtsOn(next);
    setTtsEnabled(next);
    if (!next) {
      ttsAbortRef.current?.abort();
      stopTts().catch(() => {});
      setIsPlaying(false);
    }
  }

  function handlePlayTts() {
    if (!ttsOn || !aiText) return;
    if (isPlaying) {
      pauseTts().catch(() => {});
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      ttsAbortRef.current?.abort();
      ttsAbortRef.current = new AbortController();
      resumeTts().catch(() => {
        speakText(aiText, ttsAbortRef.current!.signal)
          .catch(() => {})
          .finally(() => setIsPlaying(false));
      });
    }
  }

  function handlePauseTts() {
    pauseTts().catch(() => {});
    setIsPlaying(false);
  }

  function handleRequestReset() {
    const activePhases = ['shuffling', 'revealing', 'interpreting', 'followup',
      'celtic_phase1', 'celtic_phase2', 'celtic_phase3', 'celtic_phase4'];
    if (activePhases.includes(phase)) {
      setShowResetConfirm(true);
    } else {
      handleReset();
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    ttsAbortRef.current?.abort();
    stopTts().catch(() => {});
    fadeOutBackground(800).catch(() => {});
    if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);
    revealStartedRef.current = false;
    reset();
    setSelEmotional(null);
    setSelArea(null);
    setSelUrgency(null);
    setFreeContext('');
    setUserQuestion('');
    bridgeScaleAnim.setValue(1);
    deckRotateAnim.setValue(0);
    deckSpreadAnim.setValue(0);
    cardSwayAnims.forEach((a) => a.setValue(0));
  }

  // Celtic Cross: gestione fasi progressive
  const PHASE_CARD_INDICES = [[0,1],[2,3],[4,5],[6,7,8,9]];

  async function handleCelticRevealPhase(phaseIndex: number) {
    if (!emotionalState || !lifeArea || !deckType) return;
    const newPhase = phaseIndex + 1;
    setCelticPhase(newPhase);

    // Rivela le carte di questa fase
    const cardIndices = PHASE_CARD_INDICES[phaseIndex];
    const phaseCards = cardIndices.map((i) => cards[i]).filter(Boolean);
    const allRevealedIndices = new Set<number>();
    for (let p = 0; p <= phaseIndex; p++) {
      PHASE_CARD_INDICES[p].forEach((i) => allRevealedIndices.add(i));
    }
    const allRevealedCards = [...allRevealedIndices].sort((a,b) => a-b).map((i) => cards[i]).filter(Boolean);

    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      await streamGeminiCelticPhase(
        {
          emotional_state: emotionalState,
          life_area: lifeArea,
          urgency: urgency ?? 'present',
          user_question: userQuestion.trim() || undefined,
          free_context: freeContext.trim() || undefined,
          phaseIndex: phaseIndex + 1,
          phaseCards,
          allRevealedCards,
          previousPhaseTexts: celticPhaseTexts.slice(0, phaseIndex),
        },
        (chunk) => appendCelticPhaseText(phaseIndex, chunk),
        () => setIsStreaming(false),
        abortRef.current.signal,
      );
    } catch {
      setIsStreaming(false);
    }
  }

  async function handleCelticPhaseQuestion(phaseIndex: number, question: string) {
    if (!emotionalState || !lifeArea) return;
    const phaseText = celticPhaseTexts[phaseIndex] ?? '';
    addFollowup(question, '');
    setIsStreaming(true);

    abortRef.current = new AbortController();
    let answer = '';
    try {
      await streamGeminiFollowup(
        phaseText,
        question,
        (chunk) => { answer += chunk; },
        () => {
          setIsStreaming(false);
          const state = useReadingStore.getState();
          const updated = [...state.followups];
          updated[updated.length - 1] = { question, answer };
          useReadingStore.setState({ followups: updated });
        },
        abortRef.current.signal,
      );
    } catch {
      setIsStreaming(false);
    }
  }

  const handleNav = (id: TabId) => {
    router.push(`/(tabs)/${id}` as any);
  };

  // Modal conferma reset
  const ResetConfirmModal = () => (
    <Modal visible={showResetConfirm} transparent animationType="fade" onRequestClose={() => setShowResetConfirm(false)} statusBarTranslucent>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Interrompere la lettura?</Text>
          <Text style={styles.confirmBody}>Interrompendo la lettura perderai tutti i progressi attuali. Vuoi proseguire?</Text>
          <View style={styles.confirmButtons}>
            <Pressable style={styles.confirmCancel} onPress={() => setShowResetConfirm(false)}>
              <Text style={styles.confirmCancelText}>Annulla</Text>
            </Pressable>
            <Pressable style={styles.confirmProceed} onPress={() => { setShowResetConfirm(false); handleReset(); }}>
              <Text style={styles.confirmProceedText}>Procedi</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ── Render phases ──

  if (phase === 'deck_selection') {
    const hasSaved = useReadingStore.getState().hasPersisted();
    return (
      <View style={styles.screen}>
        <ElaborateFrame />
        <View style={styles.inner}>
          <View style={styles.titleArea}>
            <TitleBox sub="Scegli la modalità di lettura">SESSIONI LETTURA</TitleBox>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {hasSaved && (
              <Pressable
                style={styles.resumeBanner}
                onPress={() => useReadingStore.getState().restoreFromStorage()}
              >
                <Text style={styles.resumeBannerText}>🔮 Riprendi lettura interrotta →</Text>
              </Pressable>
            )}
            {SPREADS.map((sp) => (
              <View key={sp.id} style={styles.spreadCard}>
                <View style={styles.spreadIcon}>
                  <Text style={styles.spreadIconText}>{sp.icon}</Text>
                </View>
                <View style={styles.spreadInfo}>
                  <View style={styles.spreadNameRow}>
                    <Text style={styles.spreadName}>{sp.name}</Text>
                    {sp.free && (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>GRATIS</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.spreadSub}>{sp.sub}</Text>
                  <Text style={styles.spreadFocus}>Focus: {sp.focus} · {sp.time}</Text>
                </View>
                <GoldButton onPress={() => handleStartDeck(sp.id)} style={styles.beginBtn}>INIZIA</GoldButton>
              </View>
            ))}
          </ScrollView>

          <TabBar active="reading" onChange={handleNav} />
        </View>
      </View>
    );
  }

  if (phase === 'questionnaire') {
    return (
      <View style={styles.screen}>
        <ElaborateFrame />
        <View style={styles.inner}>
          <View style={styles.titleArea}>
            <TitleBox sub="Raccontaci di te prima della lettura">PRIMA DI INIZIARE</TitleBox>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {followupFrom && (
              <View style={styles.followupBanner}>
                <Text style={styles.followupBannerText}>
                  Approfondimento lettura precedente — modifica se qualcosa è cambiato
                </Text>
                <Text style={styles.followupBannerSummary} numberOfLines={2}>
                  "{followupFrom.summary}"
                </Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Come ti senti oggi?</Text>
            <View style={styles.chipsWrap}>
              {EMOTIONAL_OPTIONS.map((opt) => (
                <Pressable key={opt.value} onPress={() => setSelEmotional(opt.value)} style={[styles.chip, selEmotional === opt.value && styles.chipActive]}>
                  <Text style={[styles.chipText, selEmotional === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Area di vita che ti interessa?</Text>
            <View style={styles.chipsWrap}>
              {LIFE_AREA_OPTIONS.map((opt) => (
                <Pressable key={opt.value} onPress={() => setSelArea(opt.value)} style={[styles.chip, selArea === opt.value && styles.chipActive]}>
                  <Text style={[styles.chipText, selArea === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            {needsUrgency && (
              <>
                <Text style={styles.sectionLabel}>Cosa vuoi esplorare?</Text>
                <View style={styles.chipsWrap}>
                  {URGENCY_OPTIONS.map((opt) => (
                    <Pressable key={opt.value} onPress={() => setSelUrgency(opt.value)} style={[styles.chip, selUrgency === opt.value && styles.chipActive]}>
                      <Text style={[styles.chipText, selUrgency === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {deckType === 'tre_carte' && (
              <Text style={[styles.sectionLabel, styles.infoLabel]}>Lettura: Passato → Presente → Futuro</Text>
            )}

            {needsDreamText ? (
              <>
                <Text style={styles.sectionLabel}>Descrivi il tuo sogno</Text>
                <TextInput
                  style={[styles.textArea, styles.textAreaTall]}
                  value={freeContext}
                  onChangeText={setFreeContext}
                  placeholder="Racconta il sogno nei dettagli: luoghi, persone, emozioni, simboli che ricordi…"
                  placeholderTextColor="#5a4a70"
                  multiline
                  maxLength={500}
                  numberOfLines={5}
                />
              </>
            ) : needsSituationText ? (
              <>
                <Text style={styles.sectionLabel}>Descrivi la situazione</Text>
                <TextInput
                  style={[styles.textArea, styles.textAreaTall]}
                  value={freeContext}
                  onChangeText={setFreeContext}
                  placeholder="Descrivi la situazione in dettaglio: le persone coinvolte, le dinamiche, cosa ti preoccupa o ti incuriosisce…"
                  placeholderTextColor="#5a4a70"
                  multiline
                  maxLength={500}
                  numberOfLines={5}
                />
                <Text style={styles.sectionLabel}>
                  Hai una domanda specifica? <Text style={styles.optionalLabel}>(opzionale)</Text>
                </Text>
                <TextInput
                  style={styles.textArea}
                  value={userQuestion}
                  onChangeText={setUserQuestion}
                  placeholder="Es: come si svilupperà questa situazione?"
                  placeholderTextColor="#5a4a70"
                  multiline
                  maxLength={200}
                  numberOfLines={2}
                />
              </>
            ) : (
              <>
                <Text style={styles.sectionLabel}>
                  Hai una domanda specifica?
                  {!needsQuestion && <Text style={styles.optionalLabel}>(opzionale)</Text>}
                </Text>
                <TextInput
                  style={styles.textArea}
                  value={userQuestion}
                  onChangeText={setUserQuestion}
                  placeholder={needsQuestion ? "Es: questo è il momento giusto?" : "Es: devo accettare questa offerta di lavoro?"}
                  placeholderTextColor="#5a4a70"
                  multiline
                  maxLength={200}
                  numberOfLines={2}
                />

                <Text style={styles.sectionLabel}>Vuoi aggiungere contesto? <Text style={styles.optionalLabel}>(opzionale)</Text></Text>
                <TextInput
                  style={styles.textArea}
                  value={freeContext}
                  onChangeText={setFreeContext}
                  placeholder="Descrivi la situazione, dettagli rilevanti…"
                  placeholderTextColor="#5a4a70"
                  multiline
                  maxLength={300}
                  numberOfLines={3}
                />
              </>
            )}

            <GoldButton
              onPress={handleQuestionnaireSubmit}
              style={StyleSheet.flatten([styles.proceedBtn, !canProceed && styles.proceedBtnDisabled])}
            >
              INIZIA LA LETTURA →
            </GoldButton>

            <Pressable onPress={handleReset} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Torna alla selezione</Text>
            </Pressable>
          </ScrollView>

          <TabBar active="reading" onChange={handleNav} />
        </View>
      </View>
    );
  }

  if (phase === 'shuffling') {
    const tapsDone = shuffleTapCount;

    const SHUFFLE_LABELS = [
      'MESCOLA LE CARTE',
      'SENTI L\'ENERGIA',
      'RIVELA IL DESTINO',
    ];
    const SHUFFLE_ICONS = ['🃏', '✨', '🔮'];
    const SHUFFLE_SUBS = [
      'Concentrati sulla tua domanda',
      'Lascia che l\'energia fluisca',
      'Le carte ti aspettano…',
    ];

    const currentLabel = tapsDone < 3 ? SHUFFLE_LABELS[tapsDone] : 'Rivelazione…';
    const currentIcon  = tapsDone < 3 ? SHUFFLE_ICONS[tapsDone] : '✦';
    const currentSub   = tapsDone < 3 ? SHUFFLE_SUBS[tapsDone] : '';

    // Animazioni carte a ventaglio
    const deckRotateDeg = deckRotateAnim.interpolate({
      inputRange: [-0.5, 0, 1],
      outputRange: ['-30deg', '0deg', '360deg'],
    });
    const spreadOffsets = [-60, -30, 0, 30, 60];

    return (
      <View style={styles.screen}>
        <ElaborateFrame />
        <View style={[styles.inner, styles.centered]}>
          <DivineMascot message={READING_MASCOT_MESSAGES.shuffling!} width={300} />

          {/* Deck animato */}
          <View style={styles.shuffleDeck}>
            {cardSwayAnims.map((anim, i) => {
              const spreadX = deckSpreadAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, spreadOffsets[i]],
              });
              const swayRotate = anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: ['0deg', `${(i - 2) * 15}deg`, '0deg'],
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.shuffleCard,
                    {
                      transform: [
                        { translateX: spreadX },
                        { rotate: swayRotate },
                        { rotate: i === 2 ? deckRotateDeg : '0deg' },
                        { translateY: cardSwayTranslateY[i] },
                      ],
                      zIndex: i,
                      opacity: tapsDone >= 3 ? 0.3 : 1,
                    },
                  ]}
                >
                  <View style={styles.shuffleCardInner}>
                    <Text style={styles.shuffleCardSymbol}>✦</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* Bottone bridge */}
          <Animated.View style={[styles.bridgeWrap, { transform: [{ scale: bridgeScaleAnim }] }]}>
            <Pressable
              onPress={tapsDone < 3 ? handleBridgeTap : undefined}
              style={[styles.bridgeBtn, tapsDone >= 3 && styles.bridgeBtnDone]}
            >
              <Text style={styles.bridgeBtnIcon}>{currentIcon}</Text>
              <Text style={styles.bridgeBtnLabel}>{currentLabel}</Text>
              {currentSub ? <Text style={styles.bridgeBtnSub}>{currentSub}</Text> : null}
            </Pressable>
          </Animated.View>

          {/* Indicatori tap (3 dots) */}
          <View style={styles.bridgeDots}>
            {[0,1,2].map((i) => (
              <View key={i} style={[styles.bridgeDot, i < tapsDone && styles.bridgeDotActive]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Fase saving — mostra summary + bottoni
  if (phase === 'saving') {
    const EMOTIONAL_LABEL_IT: Record<string, string> = { sad: 'Difficoltà', neutral: 'Equilibrio', good: 'Sereno', great: 'Energia positiva' };
    const AREA_LABEL_IT: Record<string, string> = { love: 'Amore', work: 'Lavoro', money: 'Finanze', health: 'Salute', spiritual: 'Spirituale' };
    const URGENCY_LABEL_IT: Record<string, string> = { past: 'Passato', present: 'Presente', future: 'Futuro', advice: 'Consiglio' };

    const primaryCards = cards.slice(0, 3);
    const extraCards = cards.slice(3);

    return (
      <View style={styles.screen}>
        <ElaborateFrame />
        <View style={styles.inner}>
          <View style={styles.titleArea}>
            <TitleBox sub="Lettura completata">SALVA LETTURA</TitleBox>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Contesto lettura */}
            <View style={styles.savingContextRow}>
              {emotionalState && <View style={styles.savingCtxChip}><Text style={styles.savingCtxText}>{EMOTIONAL_LABEL_IT[emotionalState]}</Text></View>}
              {lifeArea && <View style={styles.savingCtxChip}><Text style={styles.savingCtxText}>{AREA_LABEL_IT[lifeArea]}</Text></View>}
              {urgency && <View style={styles.savingCtxChip}><Text style={styles.savingCtxText}>{URGENCY_LABEL_IT[urgency]}</Text></View>}
            </View>

            {(userQuestion.trim() || (deckType === 'sogni' && freeContext.trim())) ? (
              <Text style={styles.savingQuestion}>
                {`"${deckType === 'sogni' && !userQuestion.trim() ? freeContext.trim().slice(0, 80) + (freeContext.length > 80 ? '…' : '') : userQuestion.trim()}"`}
              </Text>
            ) : null}

            {/* Carte primarie con immagine */}
            <Text style={styles.savingCardsLabel}>CARTE PRINCIPALI</Text>
            <View style={styles.savingPrimaryCards}>
              {primaryCards.map((c, i) => (
                <View key={i} style={styles.savingPrimaryCard}>
                  {c.image ? (
                    <Image
                      source={c.image}
                      style={[styles.savingCardImg, c.reversed && styles.savingCardImgReversed]}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.savingCardImgPlaceholder}>
                      <Text style={styles.savingCardImgPlaceholderText}>{c.name_it[0]}</Text>
                    </View>
                  )}
                  <Text style={styles.savingPrimaryCardName} numberOfLines={2}>{c.name_it}</Text>
                  <Text style={[styles.savingPrimaryCardOrient, c.reversed && styles.savingPrimaryCardRev]}>
                    {c.reversed ? '↓ Rovesciata' : '↑ Diritta'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Carte extra (se > 3) piccole */}
            {extraCards.length > 0 && (
              <View style={styles.savingCardsRow}>
                {extraCards.slice(0, 5).map((c, i) => (
                  <View key={i} style={styles.savingCardThumb}>
                    <Text style={styles.savingCardName} numberOfLines={1}>{c.name_it}</Text>
                    {c.reversed && <Text style={styles.savingCardRev}>↓</Text>}
                  </View>
                ))}
                {cards.length > 8 && (
                  <View style={styles.savingCardThumb}>
                    <Text style={styles.savingCardName}>+{cards.length - 8}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Riassunto AI */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>RIASSUNTO</Text>
              <Text style={styles.summaryText}>
                {aiSummary || 'Il riassunto sarà disponibile nella cronologia dopo il salvataggio.'}
              </Text>
            </View>

            {saveError && <Text style={styles.saveError}>{saveError}</Text>}

            <GoldButton onPress={handleSaveReading} style={styles.saveBtn}>
              {isSaving ? 'Salvataggio…' : 'SALVA NELLA CRONOLOGIA'}
            </GoldButton>

            <Pressable onPress={handleReset} style={styles.backBtn}>
              <Text style={styles.backBtnText}>✕ Nuova lettura (senza salvare)</Text>
            </Pressable>
          </ScrollView>

          <TabBar active="reading" onChange={handleNav} />
        </View>
      </View>
    );
  }

  const hideTabBar = ['shuffling', 'revealing', 'interpreting', 'followup',
    'celtic_phase1', 'celtic_phase2', 'celtic_phase3', 'celtic_phase4'].includes(phase);

  // Celtic Cross — stesso wrapper delle altre letture, croce geometrica nella revealZone
  if (deckType === 'celtic_cross' && ['revealing', 'interpreting', 'followup',
    'celtic_phase1', 'celtic_phase2', 'celtic_phase3', 'celtic_phase4'].includes(phase)) {
    const celticMascotMsg = READING_MASCOT_MESSAGES[phase];
    const showCelticMascot = celticMascotMsg && (phase === 'revealing' || phase.startsWith('celtic_phase'));

    return (
      <>
      <View style={styles.screen}>
        <ElaborateFrame />
        <View style={styles.inner}>
          {/* Header: reset + salva */}
          <View style={styles.revealHeader}>
            <Pressable onPress={handleRequestReset} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>✕ Nuova lettura</Text>
            </Pressable>
            {phase === 'followup' && (
              <Pressable onPress={() => setPhase('saving')} style={styles.saveShortcutBtn}>
                <Text style={styles.saveShortcutText}>Salva →</Text>
              </Pressable>
            )}
          </View>

          {/* DivineMascot — stesso pattern altre letture */}
          {showCelticMascot && (
            <View style={styles.mascotContainer}>
              <DivineMascot message={celticMascotMsg!} width={260} />
            </View>
          )}

          {/* Zona carte / chat — flex 1 */}
          <View style={styles.celticRevealZone}>
            {phase === 'followup' ? (
              <FollowupPanel
                aiText={aiText}
                isStreaming={isStreaming}
                followups={followups}
                onAskFollowup={handleFollowup}
                maxFollowups={maxFollowups}
                ttsOn={ttsOn}
                isPlaying={isPlaying}
                onPlayTts={handlePlayTts}
                onPauseTts={handlePauseTts}
              />
            ) : (
              <CelticCrossLayout
                cards={cards}
                celticPhase={celticPhase}
                celticPhaseTexts={celticPhaseTexts}
                isStreaming={isStreaming}
                onRevealPhase={handleCelticRevealPhase}
                onAskPhaseQuestion={handleCelticPhaseQuestion}
                onProceedToFollowup={() => {
                  const allText = celticPhaseTexts.join('\n\n');
                  useReadingStore.setState({ aiText: allText });
                  setPhase('followup');
                }}
              />
            )}
          </View>

          {/* User bar — identica alle altre letture */}
          <View style={styles.readingUserBar}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.readingUserAvatar} />
            ) : (
              <View style={styles.readingUserAvatarPlaceholder}>
                <Text style={styles.readingUserAvatarInitial}>
                  {(userName ?? 'U').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.readingUserInfo}>
              <Text style={styles.readingUserName}>{userName ?? 'Tu'}</Text>
              <Text style={styles.readingUserSub}>Lettura personale · Croce Celtica</Text>
            </View>
          </View>

          {/* Audio bar — identica alle altre letture */}
          <View style={styles.audioBar}>
            <Pressable onPress={handleToggleMusic} style={[styles.audioBtn, !musicOn && styles.audioBtnOff]}>
              <Svg width="16" height="16" viewBox="0 0 24 24" fill={musicOn ? '#D4AF37' : '#5a4a30'}>
                <Path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
              </Svg>
              <Text style={[styles.audioBtnText, !musicOn && styles.audioBtnTextOff]}>
                {musicOn ? 'Musica' : 'Musica off'}
              </Text>
            </Pressable>
            <Pressable onPress={handleToggleTts} style={[styles.audioBtn, !ttsOn && styles.audioBtnOff]}>
              <Svg width="16" height="16" viewBox="0 0 24 24" fill={ttsOn ? '#D4AF37' : '#5a4a30'}>
                <Path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z" />
              </Svg>
              <Text style={[styles.audioBtnText, !ttsOn && styles.audioBtnTextOff]}>
                {ttsOn ? 'Voce' : 'Voce off'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      <ResetConfirmModal />
      </>
    );
  }

  // Revealing + interpreting + followup phases — shared layout (non-Celtic)
  const mascotMsg = READING_MASCOT_MESSAGES[phase];
  // DivineMascot: sempre visibile in revealing e interpreting (anche con testo)
  const showMascot = phase === 'revealing' || phase === 'interpreting';

  return (
    <View style={styles.screen}>
      <ElaborateFrame />
      <View style={styles.inner}>
        <View style={styles.revealZone}>
          <View style={styles.revealHeader}>
            <Pressable onPress={handleRequestReset} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>✕ Nuova lettura</Text>
            </Pressable>
            {phase === 'interpreting' && aiText.length === 0 && <Text style={styles.phaseLabel}>Le carte leggono…</Text>}
            {phase === 'followup' && (
              <Pressable onPress={() => setPhase('saving')} style={styles.saveShortcutBtn}>
                <Text style={styles.saveShortcutText}>Salva →</Text>
              </Pressable>
            )}
          </View>

          {/* DivineMascot overlay — non assoluto, sopra le carte */}
          {showMascot && mascotMsg && (
            <View style={styles.mascotContainer}>
              <DivineMascot message={mascotMsg} width={280} />
            </View>
          )}

          <Pressable
            onPress={handleRevealCard}
            style={styles.cardRevealPressable}
            disabled={phase !== 'revealing' || revealedCount >= cards.length}
          >
            <CardReveal
              cards={cards}
              revealedCount={revealedCount}
              deckType={deckType ?? undefined}
              positions={
                deckType === 'sincronia' ? SINCRONIA_POSITIONS
                : deckType === 'sogni' || deckType === 'situazioni' ? undefined
                : TRE_CARTE_POSITIONS
              }
            />
          </Pressable>
        </View>

        {/* Avatar + Name lettura personale */}
        <View style={styles.readingUserBar}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.readingUserAvatar} />
          ) : (
            <View style={styles.readingUserAvatarPlaceholder}>
              <Text style={styles.readingUserAvatarInitial}>
                {(userName ?? 'U').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.readingUserInfo}>
            <Text style={styles.readingUserName}>{userName ?? 'Lettore'}</Text>
            <Text style={styles.readingUserSub}>Lettura personale</Text>
          </View>
        </View>

        <View style={styles.chatZone}>
          {(phase === 'interpreting' || phase === 'followup') && (
            <FollowupPanel
              aiText={aiText}
              isStreaming={isStreaming}
              followups={followups}
              onAskFollowup={handleFollowup}
              maxFollowups={maxFollowups}
              ttsOn={ttsOn}
              isPlaying={isPlaying}
              onPlayTts={handlePlayTts}
              onPauseTts={handlePauseTts}
            />
          )}
          {phase === 'revealing' && revealedCount < cards.length && (
            <View style={styles.revealingHint}>
              <Text style={styles.revealingHintText}>
                TAP per rivelare · {revealedCount}/{cards.length}
              </Text>
            </View>
          )}
        </View>

        {/* Audio controls — visibili durante lettura attiva */}
        {['interpreting', 'followup', 'revealing',
          'celtic_phase1', 'celtic_phase2', 'celtic_phase3', 'celtic_phase4'].includes(phase) && (
          <View style={styles.audioBar}>
            <Pressable onPress={handleToggleMusic} style={[styles.audioBtn, !musicOn && styles.audioBtnOff]}>
              <Svg width="16" height="16" viewBox="0 0 24 24" fill={musicOn ? '#D4AF37' : '#5a4a30'}>
                <Path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
              </Svg>
              <Text style={[styles.audioBtnText, !musicOn && styles.audioBtnTextOff]}>
                {musicOn ? 'Musica' : 'Musica off'}
              </Text>
            </Pressable>
            <Pressable onPress={handleToggleTts} style={[styles.audioBtn, !ttsOn && styles.audioBtnOff]}>
              <Svg width="16" height="16" viewBox="0 0 24 24" fill={ttsOn ? '#D4AF37' : '#5a4a30'}>
                <Path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z" />
              </Svg>
              <Text style={[styles.audioBtnText, !ttsOn && styles.audioBtnTextOff]}>
                {ttsOn ? 'Voce' : 'Voce off'}
              </Text>
            </Pressable>
          </View>
        )}

        {!hideTabBar && <TabBar active="reading" onChange={handleNav} />}
      </View>
      <ResetConfirmModal />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#140d2e',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    zIndex: 5,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    paddingTop: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 16,
    gap: 10,
  },
  sectionLabel: {
    color: '#c4a878',
    fontSize: 14,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  infoLabel: {
    color: '#9a8060',
    fontStyle: 'italic',
    fontSize: 13,
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: 'rgba(36,21,80,0.95)',
    borderWidth: 1.5,
    borderColor: '#6B5010',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#F0D060',
  },
  chipText: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#0d0918',
  },
  proceedBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  proceedBtnDisabled: {
    opacity: 0.4,
  },
  optionalLabel: {
    color: '#5a4a70',
    fontFamily: 'Georgia',
    fontSize: 12,
    fontStyle: 'italic',
  },
  textArea: {
    backgroundColor: 'rgba(26,10,46,0.95)',
    borderWidth: 1.5,
    borderColor: '#6B5010',
    borderRadius: 8,
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  textAreaTall: {
    minHeight: 110,
  },
  followupBanner: {
    backgroundColor: 'rgba(90,45,154,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  followupBannerText: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  followupBannerSummary: {
    color: '#a890c8',
    fontFamily: 'Georgia',
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  spreadCard: {
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1.5,
    borderColor: '#8B7020',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  spreadIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#5a2d9a',
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  spreadIconText: { fontSize: 24 },
  spreadInfo: { flex: 1, gap: 4 },
  spreadNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spreadName: {
    color: '#F0D060',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
  },
  freeBadge: {
    backgroundColor: 'rgba(42,107,42,0.6)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  freeBadgeText: { color: '#90EE90', fontSize: 10, fontFamily: 'Georgia' },
  spreadSub: { color: '#c4a0f0', fontSize: 13, fontFamily: 'Georgia' },
  spreadFocus: { color: '#a890c8', fontSize: 11, fontFamily: 'Georgia' },
  beginBtn: { flexShrink: 0, paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { alignSelf: 'center', marginTop: 8, paddingVertical: 10 },
  backBtnText: { color: '#a890c8', fontFamily: 'Georgia', fontSize: 13 },
  shuffleDeck: {
    width: 160,
    height: 110,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  shuffleCard: {
    position: 'absolute',
    width: 56,
    height: 88,
  },
  shuffleCardInner: {
    width: 56,
    height: 88,
    backgroundColor: '#2a1060',
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleCardSymbol: {
    color: '#D4AF37',
    fontSize: 18,
    opacity: 0.7,
  },
  bridgeWrap: {
    marginTop: 8,
  },
  bridgeBtn: {
    backgroundColor: 'rgba(90,45,154,0.55)',
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 20,
    paddingHorizontal: 36,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
    minWidth: 220,
  },
  bridgeBtnDone: {
    opacity: 0.4,
  },
  bridgeBtnIcon: {
    fontSize: 34,
  },
  bridgeBtnLabel: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  bridgeBtnSub: {
    color: '#c4a0f0',
    fontFamily: 'Georgia',
    fontSize: 11,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  bridgeDots: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  bridgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(212,175,55,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  bridgeDotActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#F0D060',
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    pointerEvents: 'none',
  },
  celticMascotWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  celticRevealZone: {
    flex: 1,
    minHeight: 0,
  },
  revealZone: {
    flex: 5,
    paddingTop: 4,
    paddingHorizontal: 8,
    minHeight: 0,
    justifyContent: 'flex-start',
  },
  cardRevealPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  revealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 36,
    marginBottom: 6,
  },
  resetBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  resetBtnText: { color: '#9a8060', fontFamily: 'Georgia', fontSize: 12 },
  phaseLabel: { color: '#D4AF37', fontFamily: 'Georgia', fontSize: 12, letterSpacing: 0.5 },
  saveShortcutBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  saveShortcutText: { color: '#D4AF37', fontFamily: 'Georgia', fontSize: 13, fontWeight: '700' },
  chatZone: {
    flex: 4,
    minHeight: 160,
  },
  readingUserBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
    backgroundColor: 'rgba(20,13,46,0.7)',
  },
  readingUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  readingUserAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5a2d9a',
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingUserAvatarInitial: {
    color: '#D4AF37',
    fontSize: 20,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  readingUserInfo: {
    gap: 2,
    flex: 1,
    marginRight: 12,
  },
  readingUserName: {
    color: '#F0D060',
    fontSize: 15,
    fontFamily: 'Georgia',
    fontWeight: '700',
    letterSpacing: 0.5,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  readingUserSub: {
    color: '#a890c8',
    fontSize: 11,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
  },
  revealingHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealingHintText: {
    color: '#6B5010',
    fontFamily: 'Georgia',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  // Saving phase
  savingContextRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingTop: 4,
  },
  savingCtxChip: {
    backgroundColor: 'rgba(90,45,154,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savingCtxText: {
    color: '#c4a0f0',
    fontFamily: 'Georgia',
    fontSize: 11,
  },
  savingQuestion: {
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  savingCardsLabel: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  savingPrimaryCards: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  savingPrimaryCard: {
    flex: 1,
    maxWidth: 110,
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 6,
  },
  savingCardImg: {
    width: 60,
    height: 96,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  savingCardImgReversed: {
    transform: [{ rotate: '180deg' }],
  },
  savingCardImgPlaceholder: {
    width: 60,
    height: 96,
    borderRadius: 4,
    backgroundColor: '#5a2d9a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  savingCardImgPlaceholderText: {
    color: '#D4AF37',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  savingPrimaryCardName: {
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 12,
    textAlign: 'center',
  },
  savingPrimaryCardOrient: {
    color: '#a890c8',
    fontSize: 10,
    textAlign: 'center',
  },
  savingPrimaryCardRev: {
    color: '#c05050',
  },
  savingCardsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  savingCardThumb: {
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1,
    borderColor: '#8B7020',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2,
  },
  savingCardName: {
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 11,
    maxWidth: 80,
    textAlign: 'center',
  },
  savingCardRev: {
    color: '#C0392B',
    fontSize: 10,
  },
  summaryBox: {
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1.5,
    borderColor: '#8B7020',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  summaryLabel: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  summaryText: {
    color: '#e8dfc8',
    fontFamily: 'Georgia',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  saveBtn: {
    alignSelf: 'center',
    paddingHorizontal: 32,
    marginTop: 8,
  },
  saveError: {
    color: '#e05050',
    fontFamily: 'Georgia',
    fontSize: 12,
    textAlign: 'center',
  },
  audioBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(20,13,46,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,112,32,0.2)',
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(90,45,154,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  audioBtnOff: {
    backgroundColor: 'rgba(36,21,80,0.4)',
    borderColor: 'rgba(90,74,48,0.3)',
  },
  audioBtnText: {
    color: '#D4AF37',
    fontSize: 11,
    fontFamily: 'Georgia',
  },
  audioBtnTextOff: {
    color: '#5a4a30',
  },
  resumeBanner: {
    backgroundColor: 'rgba(90,45,154,0.4)',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  resumeBannerText: {
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,6,25,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(36,21,80,0.98)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    padding: 24,
    gap: 14,
  },
  confirmTitle: {
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  confirmBody: {
    color: '#c4a0f0',
    fontFamily: 'Georgia',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.4)',
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#a890c8',
    fontFamily: 'Georgia',
    fontSize: 14,
  },
  confirmProceed: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
  },
  confirmProceedText: {
    color: '#140d2e',
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '700',
  },
});
