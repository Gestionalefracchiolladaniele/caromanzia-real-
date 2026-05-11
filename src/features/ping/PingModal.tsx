import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ALL_CARDS } from '@/features/reading/tarot-cards';
import { insertNotification } from '@/lib/supabase-notifications';
import { useAuthStore } from '@/lib/auth-store';
import type { TarotCard } from '@/types';
import { checkPingLimit, formatCooldown } from './ping-limits';

interface PingModalProps {
  visible: boolean;
  targetUserId: string;
  targetUserName: string;
  onClose: () => void;
  onSent: () => void;
}

type Step = 'grid' | 'preview';

export function PingModal({ visible, targetUserId, targetUserName, onClose, onSent }: PingModalProps) {
  const user = useAuthStore((s) => s.user);
  const { width, height } = useWindowDimensions();

  const [step, setStep] = useState<Step>('grid');
  const [selectedCard, setSelectedCard] = useState<TarotCard | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [cooldownMsg, setCooldownMsg] = useState('');

  useEffect(() => {
    if (!visible || !user?.id) return;
    setStep('grid');
    setSelectedCard(null);
    setNote('');

    setChecking(true);
    checkPingLimit(user.id, targetUserId)
      .then((status) => {
        setCanSend(status.canSend);
        if (!status.canSend && status.cooldownUntil) {
          setCooldownMsg(`Hai già inviato una carta di recente. Riprova ${formatCooldown(status.cooldownUntil)}.`);
        }
      })
      .catch(() => setCanSend(true))
      .finally(() => setChecking(false));
  }, [visible, user?.id, targetUserId]);

  const handleCardPress = useCallback((card: TarotCard) => {
    setSelectedCard({ ...card, reversed: false });
    setStep('preview');
  }, []);

  const handleSend = async () => {
    if (!user?.id || !selectedCard) return;
    setSending(true);
    try {
      await insertNotification({
        user_id: targetUserId,
        type: 'ping',
        actor_id: user.id,
        card_id: selectedCard.number,
        note: note.trim() || undefined,
      });
      onSent();
      onClose();
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Invio fallito');
    } finally {
      setSending(false);
    }
  };

  // Calcola dimensione cella adattiva: container = min(width-40, 480), padding 12 totale, 5 colonne con margin 3
  const containerW = Math.min(width - 40, 480);
  const cellSize = Math.floor((containerW - 12 - 5 * 6) / 5); // 12 = padding griglia 6*2, 6 = margin*2 per cella
  const cellH = Math.floor(cellSize * 1.54);

  const renderCardItem = useCallback(({ item }: { item: typeof ALL_CARDS[0] }) => (
    <Pressable
      style={[styles.gridItem, { width: cellSize }]}
      onPress={() => handleCardPress({ ...item, reversed: false })}
    >
      {item.image ? (
        <Image source={item.image} style={[styles.gridImage, { width: cellSize, height: cellH }]} resizeMode="cover" />
      ) : (
        <View style={[styles.gridImageFallback, { width: cellSize, height: cellH }]}>
          <Text style={styles.gridFallbackText}>{item.name_it.slice(0, 2)}</Text>
        </View>
      )}
      <Text style={styles.gridName} numberOfLines={1}>{item.name_it}</Text>
    </Pressable>
  ), [handleCardPress, cellSize, cellH]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { width: Math.min(width - 40, 480), maxHeight: height * 0.85 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={step === 'preview' ? () => setStep('grid') : onClose}
              style={styles.backBtn}
              hitSlop={8}
            >
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37">
                <Path d={step === 'preview'
                  ? 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'
                  : 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'} />
              </Svg>
            </Pressable>
            <Text style={styles.headerTitle}>
              {step === 'grid' ? `Carta per ${targetUserName}` : 'Anteprima'}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          {checking ? (
            <View style={styles.center}>
              <ActivityIndicator color="#D4AF37" />
            </View>
          ) : !canSend ? (
            <View style={styles.center}>
              <Text style={styles.cooldownText}>{cooldownMsg}</Text>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Chiudi</Text>
              </Pressable>
            </View>
          ) : step === 'grid' ? (
            <FlatList
              data={ALL_CARDS as TarotCard[]}
              keyExtractor={(item) => item.id}
              numColumns={5}
              key="ping-grid-5"
              renderItem={renderCardItem}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              style={styles.flatList}
            />
          ) : (
            /* Preview step */
            <View style={styles.preview}>
              {selectedCard && (
                <>
                  <View style={styles.previewImageWrap}>
                    {selectedCard.image ? (
                      <Image source={selectedCard.image} style={styles.previewImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.previewImageFallback}>
                        <Text style={styles.previewFallbackText}>{selectedCard.name_it}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.previewCardName}>{selectedCard.name_it}</Text>

                  <View style={styles.keywordsRow}>
                    {selectedCard.keywords.slice(0, 3).map((kw) => (
                      <View key={kw} style={styles.kwChip}>
                        <Text style={styles.kwChipText}>{kw}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.noteWrap}>
                    <Text style={styles.noteLabel}>Messaggio (opzionale)</Text>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Un pensiero per questa persona..."
                      placeholderTextColor="#7a6090"
                      value={note}
                      onChangeText={setNote}
                      maxLength={60}
                      multiline
                      numberOfLines={3}
                    />
                    <Text style={styles.noteCount}>{note.length}/60</Text>
                  </View>

                  <Pressable
                    style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={sending}
                  >
                    {sending ? (
                      <ActivityIndicator color="#140d2e" />
                    ) : (
                      <Text style={styles.sendBtnText}>Invia carta</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,6,25,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'rgba(36,21,80,0.98)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4AF37',
    fontFamily: 'Georgia',
    letterSpacing: 1,
  },
  flatList: {
    flexGrow: 0,
  },
  center: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  cooldownText: {
    fontSize: 14,
    color: '#a890c8',
    fontFamily: 'Georgia',
    textAlign: 'center',
    lineHeight: 22,
  },
  closeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  closeBtnText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    padding: 6,
    paddingBottom: 16,
  },
  gridItem: {
    width: 56,
    margin: 3,
    alignItems: 'center',
    gap: 2,
  },
  gridImage: {
    width: 56,
    height: 86,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  gridImageFallback: {
    width: 56,
    height: 86,
    borderRadius: 5,
    backgroundColor: '#3d1a6e',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridFallbackText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  gridName: {
    fontSize: 8,
    color: '#a890c8',
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  preview: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  previewImageWrap: {
    width: 130,
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewImageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3d1a6e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFallbackText: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Georgia',
    textAlign: 'center',
    padding: 8,
  },
  previewCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F0D060',
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  kwChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(90,45,154,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  kwChipText: {
    color: '#c4a0f0',
    fontSize: 11,
    fontFamily: 'Georgia',
  },
  noteWrap: {
    width: '100%',
    gap: 4,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a890c8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  noteInput: {
    backgroundColor: 'rgba(52,26,106,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#F0E6FF',
    textAlignVertical: 'top',
    minHeight: 64,
  },
  noteCount: {
    fontSize: 10,
    color: '#7a6090',
    textAlign: 'right',
  },
  sendBtn: {
    width: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#140d2e',
    fontFamily: 'Georgia',
  },
});
