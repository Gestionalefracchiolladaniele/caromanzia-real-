import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useReadingStore } from '../reading-store';

// When react-native-share is installed, replace the shareNative calls below
// with RNShare.open({ ... }) for WhatsApp/Telegram/Instagram targeting.

interface Props {
  onSave?: () => void;
  isSaving?: boolean;
}

export function ReadingResult({ onSave, isSaving }: Props) {
  const { deckType, cards, aiText, followups, dreamText, extractedSymbols } = useReadingStore(
    (s) => ({
      deckType: s.deckType,
      cards: s.cards,
      aiText: s.aiText,
      followups: s.followups,
      dreamText: s.dreamText,
      extractedSymbols: s.extractedSymbols,
    }),
  );

  const isDream = deckType === 'sogni';

  function buildShareText(): string {
    const header = isDream
      ? `🌙 Interpretazione del Sogno — Cartomanzia AI\n\n`
      : `🔮 Lettura dei Tarocchi — Cartomanzia AI\n\n`;

    const body = isDream
      ? `Sogno: "${dreamText}"\n\n${aiText}`
      : `Carte: ${cards.map((c) => `${c.name_it}${c.reversed ? ' (R)' : ''}`).join(', ')}\n\n${aiText}`;

    const followupSection =
      followups.length > 0
        ? `\n\n--- Approfondimenti ---\n` +
          followups.map((f) => `D: ${f.question}\nR: ${f.answer}`).join('\n\n')
        : '';

    return `${header}${body}${followupSection}`;
  }

  async function handleShare() {
    try {
      await Share.share({
        message: buildShareText(),
        title: isDream ? 'Il mio sogno interpretato' : 'La mia lettura dei tarocchi',
      });
    } catch {
      // user cancelled
    }
  }

  async function handleShareWhatsApp() {
    // Placeholder — install react-native-share and replace with:
    // import RNShare from 'react-native-share';
    // await RNShare.open({ message: buildShareText(), social: RNShare.Social.WHATSAPP });
    await handleShare();
  }

  async function handleShareTelegram() {
    // Placeholder — same pattern as WhatsApp above
    await handleShare();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isDream ? '🌙 Interpretazione del Sogno' : '🔮 Lettura Completata'}
        </Text>
        {!isDream && cards.length > 0 && (
          <Text style={styles.cardList}>
            {cards.map((c) => `${c.name_it}${c.reversed ? ' (R)' : ''}`).join(' · ')}
          </Text>
        )}
        {isDream && extractedSymbols.length > 0 && (
          <Text style={styles.cardList}>
            Simboli: {extractedSymbols.map((s) => s.symbol).join(' · ')}
          </Text>
        )}
      </View>

      {/* AI interpretation */}
      <View style={styles.divider} />
      <View style={styles.aiSection}>
        <Text style={styles.aiText}>{aiText}</Text>
      </View>

      {/* Followups */}
      {followups.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Approfondimenti</Text>
          {followups.map((f, i) => (
            <View key={i} style={styles.followupBlock}>
              <Text style={styles.followupQ}>D: {f.question}</Text>
              <Text style={styles.followupA}>{f.answer}</Text>
            </View>
          ))}
        </>
      )}

      {/* Actions */}
      <View style={styles.divider} />
      <View style={styles.actions}>
        <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={isSaving} activeOpacity={0.8}>
          {isSaving ? (
            <ActivityIndicator color="#100c1e" />
          ) : (
            <Text style={styles.saveBtnText}>Salva Lettura</Text>
          )}
        </TouchableOpacity>

        <View style={styles.shareRow}>
          <ShareButton label="Condividi" onPress={handleShare} />
          <ShareButton label="WhatsApp" onPress={handleShareWhatsApp} color="#25D366" />
          <ShareButton label="Telegram" onPress={handleShareTelegram} color="#229ED9" />
        </View>
      </View>
    </ScrollView>
  );
}

function ShareButton({
  label,
  onPress,
  color = '#D4AF37',
}: {
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.shareBtn, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.shareBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#100c1e',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 6,
  },
  cardList: {
    fontSize: 12,
    color: '#a89bc2',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#D4AF37',
    opacity: 0.25,
    marginVertical: 16,
  },
  aiSection: {
    backgroundColor: '#1e1630',
    borderRadius: 12,
    padding: 16,
  },
  aiText: {
    color: '#f0e6ff',
    fontSize: 15,
    lineHeight: 24,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#D4AF37',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  followupBlock: {
    marginBottom: 14,
    backgroundColor: '#1e1630',
    borderRadius: 10,
    padding: 12,
  },
  followupQ: {
    color: '#D4AF37',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 4,
  },
  followupA: {
    color: '#d0c0f0',
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    gap: 12,
  },
  saveBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#100c1e',
    fontWeight: '700',
    fontSize: 16,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
});
