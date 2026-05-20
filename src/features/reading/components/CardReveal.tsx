import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DeckType, TarotCard } from '@/types';
import cardsIT from '@/data/tarot-cards-it.json';

function getCardDimensions(total: number, deckType?: DeckType): { w: number; h: number } {
  if (deckType === 'sogni') return { w: 72, h: 120 };
  if (deckType === 'sincronia') return { w: 90, h: 150 };
  if (deckType === 'tre_carte') return { w: 70, h: 117 };
  if (total === 1) return { w: 90, h: 150 };
  if (total <= 3) return { w: 70, h: 117 };
  if (total <= 5) return { w: 60, h: 100 };
  return { w: 50, h: 83 };
}

interface CardItemProps {
  card: TarotCard;
  index: number;
  total: number;
  deckType?: DeckType;
  revealed: boolean;
  onPress: () => void;
}

function TarotCardItem({ card, index, total, deckType, revealed, onPress }: CardItemProps) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (revealed && !hasAnimated.current) {
      hasAnimated.current = true;
      const delay = index * (total <= 3 ? 700 : total <= 5 ? 800 : 500);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(flipAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [revealed]);

  const { w, h } = getCardDimensions(total, deckType);

  const rotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['90deg', '90deg', '0deg'],
  });

  const opacity = flipAnim.interpolate({
    inputRange: [0, 0.45, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const borderColor = card.reversed ? '#C0392B' : '#D4AF37';
  const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1, 0] });

  return (
    <Pressable onPress={onPress} style={{ width: w, height: h, overflow: 'hidden' }}>
      {/* Dorso carta (quando non rivelata) */}
      <Animated.View
        style={[
          styles.cardFace,
          StyleSheet.absoluteFillObject,
          { opacity: backOpacity },
        ]}
      >
        <View style={[styles.cardBack, { width: w, height: h }]}>
          <Text style={styles.cardBackSymbol}>✦</Text>
        </View>
      </Animated.View>

      {/* Fronte carta (quando rivelata) */}
      <Animated.View
        style={[
          styles.cardFace,
          StyleSheet.absoluteFillObject,
          {
            width: w,
            height: h,
            transform: [{ rotateY }, { scale: scaleAnim }],
            opacity,
          },
        ]}
      >
        <View
          style={[
            styles.cardInner,
            {
              width: w,
              height: h,
              borderColor,
              shadowColor: borderColor,
            },
            card.reversed && styles.cardReversed,
          ]}
        >
          {card.image ? (
            <Image
              source={card.image}
              style={[
                styles.cardImage,
                card.reversed && styles.cardImageReversed,
              ]}
              resizeMode="cover"
            />
          ) : (
            // Fallback se immagine mancante
            <View style={styles.cardImageFallback}>
              <Text style={[styles.cardFallbackNumber, { color: borderColor }]}>
                {card.number !== undefined ? String(card.number).padStart(2, '0') : '—'}
              </Text>
              <Text style={[styles.cardFallbackName, { color: borderColor }]} numberOfLines={2}>
                {card.name_it}
              </Text>
            </View>
          )}

          {/* Overlay con nome in basso */}
          <View style={styles.cardNameOverlay}>
            <Text style={styles.cardNameText} numberOfLines={1}>{card.name_it}</Text>
          </View>

          {/* Indicatore rovesciata */}
          {card.reversed && (
            <View style={styles.reversedBadge}>
              <Text style={styles.reversedText}>↓</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ── Card Detail Modal ──────────────────────────────────────────────

interface DetailModalProps {
  card: TarotCard | null;
  onClose: () => void;
}

function getItalianCard(card: TarotCard) {
  const itCard = cardsIT.cards.find((c: any) => c.name_short === card.id);
  if (!itCard) return null;
  return {
    meaning_up: itCard.meaning_up,
    meaning_rev: itCard.meaning_rev,
    desc: itCard.desc,
  };
}

function CardDetailModal({ card, onClose }: DetailModalProps) {
  if (!card) return null;

  const isReversed = card.reversed;
  const gold = '#D4AF37';
  const red = '#C0392B';
  const accentColor = isReversed ? red : gold;

  const itCard = getItalianCard(card);
  const meaning = isReversed
    ? (itCard?.meaning_rev || card.meaning_rev)
    : (itCard?.meaning_up || card.meaning_up);
  const descText = itCard?.desc || card.desc;
  const keywords = isReversed ? card.reversed_keywords : card.keywords;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>

          {/* Immagine carta grande */}
          {card.image && (
            <View style={styles.modalImageWrapper}>
              <Image
                source={card.image}
                style={[
                  styles.modalImage,
                  isReversed && styles.modalImageReversed,
                ]}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Header */}
          <View style={styles.modalHeader}>
            {card.arcana === 'major' && card.number !== undefined && (
              <Text style={styles.modalNumber}>{String(card.number).padStart(2, '0')}</Text>
            )}
            <Text style={styles.modalTitle}>{card.name_it}</Text>
            <Text style={styles.modalSubtitle}>{card.name}</Text>
            {card.suit && <Text style={styles.modalSuit}>{card.suit}</Text>}
          </View>

          {/* Orientamento */}
          <View style={[styles.modalOrient, { borderColor: accentColor }]}>
            <Text style={[styles.modalOrientText, { color: accentColor }]}>
              {isReversed ? '↓ ROVESCIATA' : '↑ DIRITTA'}
            </Text>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Keywords */}
            {keywords.length > 0 && (
              <>
                <Text style={styles.modalSection}>Parole chiave</Text>
                <View style={styles.kwRow}>
                  {keywords.map((kw, i) => (
                    <View key={i} style={[styles.kwChip, { borderColor: accentColor }]}>
                      <Text style={[styles.kwText, { color: accentColor }]}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Significato */}
            {meaning && (
              <>
                <Text style={styles.modalSection}>Significato</Text>
                <Text style={styles.modalMeaning}>{meaning}</Text>
              </>
            )}

            {/* Descrizione carta */}
            {descText && (
              <>
                <Text style={styles.modalSection}>Descrizione</Text>
                <Text style={styles.modalDesc}>{descText}</Text>
              </>
            )}
          </ScrollView>

          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>CHIUDI</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── CardReveal ─────────────────────────────────────────────────────

interface CardRevealProps {
  cards: TarotCard[];
  revealedCount: number;
  positions?: string[];
  deckType?: DeckType;
}

export function CardReveal({ cards, revealedCount, positions, deckType }: CardRevealProps) {
  const [selectedCard, setSelectedCard] = useState<TarotCard | null>(null);
  const total = cards.length;

  if (total === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal={total > 5}
        scrollEnabled={total > 5}
        contentContainerStyle={[
          styles.cardsRow,
          total > 5 && styles.cardsRowScroll,
          total <= 5 && styles.cardsRowCentered,
        ]}
        showsHorizontalScrollIndicator={false}
      >
        {cards.map((card, i) => (
          <View key={card.id + i} style={styles.cardWrapper}>
            <TarotCardItem
              card={card}
              index={i}
              total={total}
              deckType={deckType}
              revealed={i < revealedCount}
              onPress={() => i < revealedCount && setSelectedCard(card)}
            />
            {/* Etichetta posizione (Tre Carte / Celtic Cross) */}
            {positions && positions[i] && i < revealedCount && (
              <Text style={styles.positionLabel} numberOfLines={1}>{positions[i]}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  cardsRow: {
    gap: 8,
    paddingHorizontal: 8,
  },
  cardsRowCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsRowScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  cardFace: {
    borderRadius: 6,
  },
  cardBack: {
    backgroundColor: '#2a1060',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackSymbol: {
    color: '#D4AF37',
    fontSize: 18,
    opacity: 0.8,
  },
  cardInner: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderRadius: 6,
    backgroundColor: '#0d0a1e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  cardReversed: {
    borderStyle: 'dashed',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageReversed: {
    transform: [{ rotate: '180deg' }],
  },
  cardImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(26,10,46,0.95)',
  },
  cardFallbackNumber: {
    fontSize: 12,
    fontFamily: 'Georgia',
    letterSpacing: 1,
    opacity: 0.7,
  },
  cardFallbackName: {
    fontSize: 10,
    fontFamily: 'Georgia',
    textAlign: 'center',
    letterSpacing: 0.4,
    lineHeight: 13,
  },
  cardNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,5,20,0.75)',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  cardNameText: {
    color: '#e8d5a0',
    fontSize: 8,
    fontFamily: 'Georgia',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  reversedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(192,57,43,0.8)',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reversedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  positionLabel: {
    color: '#9a7cb0',
    fontSize: 9,
    fontFamily: 'Georgia',
    textAlign: 'center',
    letterSpacing: 0.3,
    maxWidth: 90,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#140d2e',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    borderRadius: 10,
    width: '100%',
    maxWidth: 340,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalImageWrapper: {
    alignItems: 'center',
    backgroundColor: '#0d0a1e',
    paddingVertical: 16,
  },
  modalImage: {
    width: 120,
    height: 200,
    borderRadius: 4,
  },
  modalImageReversed: {
    transform: [{ rotate: '180deg' }],
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 20,
    gap: 2,
  },
  modalNumber: {
    color: '#D4AF37',
    fontSize: 11,
    fontFamily: 'Georgia',
    opacity: 0.6,
    letterSpacing: 2,
  },
  modalTitle: {
    color: '#F0D060',
    fontSize: 20,
    fontFamily: 'Georgia',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    color: '#9a8060',
    fontSize: 12,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
  },
  modalSuit: {
    color: '#c4a0f0',
    fontSize: 11,
    fontFamily: 'Georgia',
    marginTop: 2,
  },
  modalOrient: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 14,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalOrientText: {
    fontSize: 11,
    fontFamily: 'Georgia',
    letterSpacing: 1,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 220,
    paddingHorizontal: 20,
  },
  modalSection: {
    color: '#9a8060',
    fontSize: 11,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  kwRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  kwChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  kwText: {
    fontSize: 11,
    fontFamily: 'Georgia',
  },
  modalMeaning: {
    color: '#c4a878',
    fontSize: 12,
    fontFamily: 'Georgia',
    lineHeight: 18,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  modalDesc: {
    color: '#a890c8',
    fontSize: 11,
    fontFamily: 'Georgia',
    lineHeight: 17,
    marginBottom: 12,
  },
  modalClose: {
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.2)',
  },
  modalCloseText: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    letterSpacing: 1.5,
    fontSize: 12,
    fontWeight: '600',
  },
});
