import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import type { TarotCard } from '@/types';
import cardsIT from '@/data/tarot-cards-it.json';

const POSITION_LABELS = [
  'Situazione',
  'Ostacolo',
  'Fondamenta',
  'Passato',
  'Avvenire',
  'Prossimo',
  'Atteggiamento',
  'Influenze',
  'Speranze',
  'Risultato',
];

const POSITION_MEANINGS = [
  'La situazione presente — il cuore della lettura',
  "L'ostacolo o sfida — ciò che si frappone",
  'Le fondamenta — la base inconscia del problema',
  'Il passato recente — ciò che si sta lasciando',
  "L'avvenire immediato — ciò che si avvicina",
  'Il prossimo futuro — la direzione probabile',
  "L'atteggiamento — come ti vedi nella situazione",
  "Le influenze esterne — l'ambiente circostante",
  'Speranze e paure — ciò che desideri o temi',
  "Il risultato finale — l'esito probabile",
];

// Fasi: quali carte si rivelano in ogni tap
// Fase 1: carte 0,1 (croce centrale)
// Fase 2: carte 2,3 (fondamenta + passato)
// Fase 3: carte 4,5 (avvenire + prossimo)
// Fase 4: carte 6,7,8,9 (colonna destra)
const PHASE_CARD_INDICES = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7, 8, 9],
];

const PHASE_LABELS = [
  'TAP — Rivela il centro della croce',
  'TAP — Fondamenta e Passato',
  'TAP — Avvenire e Futuro',
  'TAP — La colonna del destino',
];

const PHASE_DONE_LABELS = [
  'Centro della croce rivelato',
  'Radici rivelate',
  'Asse del tempo rivelato',
  'Destino svelato',
];

function getItalianCard(card: TarotCard) {
  const itCard = cardsIT.cards.find((c: any) => c.name_short === card.id);
  if (!itCard) return null;
  return {
    meaning_up: itCard.meaning_up,
    meaning_rev: itCard.meaning_rev,
    desc: itCard.desc,
  };
}

interface CelticCrossLayoutProps {
  cards: TarotCard[];
  celticPhase: number;
  celticPhaseTexts: string[];
  isStreaming: boolean;
  onRevealPhase: (phaseIndex: number) => void;
  onAskPhaseQuestion: (phaseIndex: number, question: string) => void;
  onProceedToFollowup: () => void;
}

interface CardDetailModal {
  card: TarotCard;
  positionIndex: number;
}

function CelticCardItem({
  card,
  index,
  revealed,
  w,
  h,
  rotated,
  onPress,
}: {
  card: TarotCard;
  index: number;
  revealed: boolean;
  w: number;
  h: number;
  rotated?: boolean;
  onPress: () => void;
}) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (revealed && !hasAnimated.current) {
      hasAnimated.current = true;
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.timing(flipAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [revealed]);

  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });

  // Dimensioni visive del wrapper (scambiate se ruotata)
  const visW = rotated ? h : w;
  const visH = rotated ? w : h;

  return (
    <Pressable onPress={revealed ? onPress : undefined} style={{ width: visW, height: visH, overflow: 'hidden' }}>
      {/* Dorso */}
      <Animated.View style={[styles.cardFace, { width: visW, height: visH, opacity: backOpacity }]}>
        <View style={[
          styles.cardBack,
          { width: w, height: h },
          rotated && { transform: [{ rotate: '90deg' }], position: 'absolute', left: (visW - w) / 2, top: (visH - h) / 2 },
        ]}>
          <Text style={styles.cardBackSymbol}>✦</Text>
        </View>
      </Animated.View>
      {/* Fronte */}
      <Animated.View style={[styles.cardFace, StyleSheet.absoluteFillObject, { opacity: frontOpacity }]}>
        <View style={[
          { width: w, height: h, overflow: 'hidden', borderRadius: 4 },
          rotated && { transform: [{ rotate: '90deg' }], position: 'absolute', left: (visW - w) / 2, top: (visH - h) / 2 },
        ]}>
          {card.image ? (
            <Image
              source={card.image}
              style={[{ width: w, height: h }, card.reversed && { transform: [{ rotate: '180deg' }] }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardPlaceholder, { width: w, height: h }]}>
              <Text style={styles.cardPlaceholderText} numberOfLines={2}>{card.name_it}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function PhaseInterpretationBlock({
  phaseIndex,
  text,
  isStreaming,
  onAskQuestion,
  questionAsked,
}: {
  phaseIndex: number;
  text: string;
  isStreaming: boolean;
  onAskQuestion: (q: string) => void;
  questionAsked: boolean;
}) {
  const [input, setInput] = useState('');

  if (!text && !isStreaming) return null;

  return (
    <View style={styles.phaseBlock}>
      <View style={styles.phaseLabelRow}>
        <Text style={styles.phaseBlockLabel}>{PHASE_DONE_LABELS[phaseIndex]}</Text>
      </View>
      <View style={styles.aiBubble}>
        <Text style={styles.aiBubbleText}>{text}</Text>
        {isStreaming && (
          <ActivityIndicator size="small" color="#D4AF37" style={{ marginTop: 6, alignSelf: 'flex-start' }} />
        )}
      </View>
      {!isStreaming && text.length > 0 && !questionAsked && (
        <View style={styles.questionRow}>
          <TextInput
            style={styles.questionInput}
            value={input}
            onChangeText={setInput}
            placeholder="Hai una domanda su questa fase?"
            placeholderTextColor="#5a4a70"
            maxLength={150}
          />
          <Pressable
            style={[styles.questionSend, !input.trim() && { opacity: 0.3 }]}
            onPress={() => { if (input.trim()) { onAskQuestion(input.trim()); setInput(''); } }}
            disabled={!input.trim()}
          >
            <Text style={styles.questionSendText}>↑</Text>
          </Pressable>
        </View>
      )}
      {questionAsked && (
        <Text style={styles.questionAskedNote}>Domanda inviata ✓</Text>
      )}
    </View>
  );
}

export function CelticCrossLayout({
  cards,
  celticPhase,
  celticPhaseTexts,
  isStreaming,
  onRevealPhase,
  onAskPhaseQuestion,
  onProceedToFollowup,
}: CelticCrossLayoutProps) {
  const { width, height } = useWindowDimensions();
  const [detail, setDetail] = useState<CardDetailModal | null>(null);
  const [questionsAsked, setQuestionsAsked] = useState<boolean[]>([false, false, false, false]);

  const availW = width - 16;
  // Dimensioni carta: 13% larghezza per essere leggibili su mobile
  const cw = Math.floor(availW * 0.13);
  const ch = Math.floor(cw * 1.65);
  // Altezza: contenere 4 carte verticali + gap
  const availH = Math.max(ch * 4 + ch + 16, height * 0.52);

  // Centro croce sul lato sinistro
  const cx = availW * 0.32;
  const cy = availH * 0.5;
  const gap = cw + 6;

  // Colonna destra: 4 carte distribuite uniformemente sull'altezza disponibile
  const colX = availW * 0.70;
  const colBottom = availH - 4;
  const colGap = Math.floor((availH - 8) / 4);

  const positions: { x: number; y: number; rotated?: boolean }[] = [
    // 0: Situazione (centro)
    { x: cx - cw / 2,    y: cy - ch / 2 },
    // 1: Ostacolo (sovrapposta al centro, ruotata 90°) — centrata su Situazione
    { x: cx - ch / 2,    y: cy - cw / 2, rotated: true },
    // 2: Fondamenta (sotto)
    { x: cx - cw / 2,    y: cy + ch / 2 + 6 },
    // 3: Passato (sinistra)
    { x: cx - cw - gap,  y: cy - ch / 2 },
    // 4: Avvenire (destra della croce)
    { x: cx + cw / 2 + 6, y: cy - ch / 2 },
    // 5: Sopra (alto)
    { x: cx - cw / 2,    y: cy - ch - ch / 2 - 6 },
    // 6-9: colonna destra dal basso verso l'alto, centrate verticalmente
    { x: colX,           y: colBottom - ch - colGap * 0 },
    { x: colX,           y: colBottom - ch - colGap * 1 },
    { x: colX,           y: colBottom - ch - colGap * 2 },
    { x: colX,           y: colBottom - ch - colGap * 3 },
  ];

  // Calcola quante carte sono rivelate in base alla fase corrente
  const revealedIndices = new Set<number>();
  for (let p = 0; p < celticPhase; p++) {
    PHASE_CARD_INDICES[p].forEach((i) => revealedIndices.add(i));
  }

  const allPhasesComplete = celticPhase >= 4;
  const nextPhaseIndex = celticPhase; // 0-based, da 0 a 3
  const hasNextPhase = celticPhase < 4;
  const currentPhaseStreaming = isStreaming;

  function handleAskQuestion(phaseIndex: number, question: string) {
    setQuestionsAsked((prev) => {
      const next = [...prev];
      next[phaseIndex] = true;
      return next;
    });
    onAskPhaseQuestion(phaseIndex, question);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Layout geometrico */}
      <View style={[styles.container, { height: availH }]}>
        {cards.map((card, i) => {
          if (i >= 10) return null;
          const pos = positions[i];
          const isRevealed = revealedIndices.has(i);
          return (
            <View
              key={card.id + i}
              style={[styles.positionWrap, {
                left: pos.x,
                top: pos.y,
                width: pos.rotated ? ch : cw,
                height: pos.rotated ? cw : ch,
                zIndex: i === 1 ? 10 : i,
              }]}
            >
              <CelticCardItem
                card={card}
                index={i}
                revealed={isRevealed}
                w={cw}
                h={ch}
                rotated={pos.rotated}
                onPress={() => setDetail({ card, positionIndex: i })}
              />
              {isRevealed && (
                <View style={styles.posLabel}>
                  <Text style={styles.posLabelText} numberOfLines={1}>{POSITION_LABELS[i]}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Controlli fasi + interpretazioni */}
      <ScrollView style={styles.phasesScroll} contentContainerStyle={styles.phasesContent} showsVerticalScrollIndicator={false}>

        {/* Interpretazioni fasi già completate */}
        {celticPhaseTexts.map((text, i) => (
          <PhaseInterpretationBlock
            key={i}
            phaseIndex={i}
            text={text}
            isStreaming={isStreaming && i === celticPhase - 1}
            onAskQuestion={(q) => handleAskQuestion(i, q)}
            questionAsked={questionsAsked[i]}
          />
        ))}

        {/* Bottone prossima fase */}
        {hasNextPhase && !currentPhaseStreaming && (
          <Pressable
            style={styles.phaseRevealBtn}
            onPress={() => onRevealPhase(nextPhaseIndex)}
          >
            <Text style={styles.phaseRevealIcon}>🃏</Text>
            <Text style={styles.phaseRevealLabel}>{PHASE_LABELS[nextPhaseIndex]}</Text>
          </Pressable>
        )}

        {/* Streaming in corso */}
        {currentPhaseStreaming && (
          <View style={styles.streamingRow}>
            <ActivityIndicator size="small" color="#D4AF37" />
            <Text style={styles.streamingText}>La cartomante legge…</Text>
          </View>
        )}

        {/* Tutte le fasi complete → passa automaticamente a followup dopo breve pausa */}
        {allPhasesComplete && !isStreaming && (
          <Pressable style={styles.proceedBtn} onPress={onProceedToFollowup}>
            <Text style={styles.proceedBtnText}>INIZIA L'APPROFONDIMENTO →</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Modal dettaglio carta */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setDetail(null)} />
          {detail && (
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalPosition}>{POSITION_LABELS[detail.positionIndex]}</Text>
                <Pressable onPress={() => setDetail(null)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.modalMeaning}>{POSITION_MEANINGS[detail.positionIndex]}</Text>
              <View style={styles.modalDivider} />
              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                {detail.card.image && (
                  <Image
                    source={detail.card.image}
                    style={[styles.modalCardImg, detail.card.reversed && { transform: [{ rotate: '180deg' }] }]}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.modalCardName}>{detail.card.name_it}</Text>
                <Text style={[styles.modalOrient, detail.card.reversed && styles.modalOrientRev]}>
                  {detail.card.reversed ? '↓ Rovesciata' : '↑ Diritta'}
                </Text>
                <View style={styles.modalKeywordsWrap}>
                  {(detail.card.reversed ? detail.card.reversed_keywords : detail.card.keywords).slice(0, 5).map((kw) => (
                    <View key={kw} style={styles.modalKeyword}>
                      <Text style={styles.modalKeywordText}>{kw}</Text>
                    </View>
                  ))}
                </View>
                {detail && (() => {
                  const itCard = getItalianCard(detail.card);
                  const descText = itCard?.desc || detail.card.desc;
                  return descText ? (
                    <Text style={styles.modalDesc}>{descText}</Text>
                  ) : null;
                })()}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  positionWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  cardFace: {
    borderRadius: 4,
  },
  cardBack: {
    backgroundColor: '#2a1060',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackSymbol: {
    color: '#D4AF37',
    fontSize: 16,
    opacity: 0.7,
  },
  cardPlaceholder: {
    backgroundColor: '#3a1d70',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8B7020',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cardPlaceholderText: {
    color: '#D4AF37',
    fontSize: 8,
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  posLabel: {
    marginTop: 3,
    backgroundColor: 'rgba(20,13,46,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    maxWidth: '100%',
  },
  posLabelText: {
    color: '#a890c8',
    fontSize: 7,
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  phasesScroll: {
    flex: 1,
  },
  phasesContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 16,
  },
  phaseBlock: {
    gap: 8,
  },
  phaseLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseBlockLabel: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  aiBubble: {
    backgroundColor: 'rgba(42,16,80,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: 10,
    borderTopLeftRadius: 2,
    padding: 10,
  },
  aiBubbleText: {
    color: '#e8dfc8',
    fontFamily: 'Georgia',
    fontSize: 13,
    lineHeight: 20,
  },
  questionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  questionInput: {
    flex: 1,
    backgroundColor: 'rgba(26,10,46,0.95)',
    borderWidth: 1.5,
    borderColor: '#6B5010',
    borderRadius: 8,
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  questionSend: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionSendText: {
    color: '#0d0918',
    fontSize: 16,
    fontWeight: 'bold',
  },
  questionAskedNote: {
    color: '#90EE90',
    fontFamily: 'Georgia',
    fontSize: 10,
    letterSpacing: 0.3,
    paddingLeft: 4,
  },
  phaseRevealBtn: {
    backgroundColor: 'rgba(90,45,154,0.5)',
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  phaseRevealIcon: {
    fontSize: 22,
  },
  phaseRevealLabel: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: '700',
  },
  streamingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  streamingText: {
    color: '#a890c8',
    fontFamily: 'Georgia',
    fontSize: 12,
    fontStyle: 'italic',
  },
  proceedBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  proceedBtnText: {
    color: '#0d0918',
    fontFamily: 'Georgia',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,6,25,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: 'rgba(36,21,80,0.98)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  modalPosition: {
    color: '#D4AF37',
    fontSize: 16,
    fontFamily: 'Georgia',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#a890c8',
    fontSize: 16,
  },
  modalMeaning: {
    color: '#c4a0f0',
    fontSize: 12,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    lineHeight: 18,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.15)',
    marginHorizontal: 16,
  },
  modalBody: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  modalCardImg: {
    width: 110,
    height: 180,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  modalCardName: {
    color: '#F0D060',
    fontSize: 18,
    fontFamily: 'Georgia',
    fontWeight: '700',
    textAlign: 'center',
  },
  modalOrient: {
    color: '#90EE90',
    fontSize: 12,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
  },
  modalOrientRev: {
    color: '#f08080',
  },
  modalKeywordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  modalKeyword: {
    backgroundColor: 'rgba(90,45,154,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  modalKeywordText: {
    color: '#D4AF37',
    fontSize: 11,
    fontFamily: 'Georgia',
  },
  modalDesc: {
    color: '#a890c8',
    fontSize: 13,
    fontFamily: 'Georgia',
    lineHeight: 20,
    textAlign: 'center',
  },
});
