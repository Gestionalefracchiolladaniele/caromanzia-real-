import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ElaborateFrame } from '@/components/ui/ElaborateFrame';
import { TabBar, type TabId } from '@/components/ui/TabBar';
import { TitleBox } from '@/components/ui/TitleBox';
import { ALL_CARDS } from '@/features/reading/tarot-cards';
import type { TarotCard } from '@/types';

type ArcanaFilter = 'tutti' | 'major' | 'denari' | 'coppe' | 'spade' | 'bastoni';

const FILTERS: Array<{ id: ArcanaFilter; label: string }> = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'major', label: 'Arcani Maggiori' },
  { id: 'denari', label: 'Denari' },
  { id: 'coppe', label: 'Coppe' },
  { id: 'spade', label: 'Spade' },
  { id: 'bastoni', label: 'Bastoni' },
];

const SUIT_MAP: Record<string, ArcanaFilter> = {
  pentacles: 'denari',
  coins: 'denari',
  cups: 'coppe',
  swords: 'spade',
  wands: 'bastoni',
};

export default function CardsScreen() {
  const allCards = ALL_CARDS;
  const [filter, setFilter] = useState<ArcanaFilter>('tutti');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TarotCard | null>(null);
  const [reversed, setReversed] = useState(false);

  const handleNav = (id: TabId) => router.push(`/(tabs)/${id}` as any);

  const filtered = useMemo(() => {
    let cards = allCards;
    if (filter !== 'tutti') {
      if (filter === 'major') {
        cards = cards.filter((c) => c.arcana === 'major');
      } else {
        cards = cards.filter((c) => c.suit && SUIT_MAP[c.suit.toLowerCase()] === filter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      cards = cards.filter(
        (c) => c.name.toLowerCase().includes(q) || c.name_it.toLowerCase().includes(q),
      );
    }
    return cards;
  }, [allCards, filter, search]);

  return (
    <View style={styles.screen}>
      <ElaborateFrame />

      <View style={styles.inner}>
        <View style={styles.titleArea}>
          <TitleBox sub="78 Arcani">CARTE</TitleBox>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Cerca carta..."
            placeholderTextColor="#7a6090"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterWrap}>
          <FlatList
            horizontal
            data={FILTERS}
            keyExtractor={(f) => f.id}
            contentContainerStyle={styles.filterList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.chip, filter === item.id && styles.chipActive]}
                onPress={() => setFilter(item.id)}
              >
                <Text style={[styles.chipText, filter === item.id && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        </View>

        <FlatList
          key="cards-grid-5"
          data={filtered}
          keyExtractor={(c) => c.id}
          numColumns={5}
          style={styles.gridList}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable style={styles.cell} onPress={() => { setSelected(item); setReversed(false); }}>
              {item.image ? (
                <Image source={item.image} style={styles.cardImg} />
              ) : (
                <View style={styles.cardPlaceholder}>
                  <Text style={styles.cardPlaceholderText}>{item.name_it[0]}</Text>
                </View>
              )}
              <Text style={styles.cardName} numberOfLines={2}>{item.name_it}</Text>
            </Pressable>
          )}
        />

        <TabBar active="cards" onChange={handleNav} />
      </View>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalImgWrap}>
                  {selected.image ? (
                    <Image
                      source={selected.image}
                      style={[styles.modalImg, reversed && styles.modalImgReversed]}
                    />
                  ) : (
                    <View style={[styles.modalImgPlaceholder, reversed && styles.modalImgReversed]}>
                      <Text style={styles.cardPlaceholderText}>{selected.name_it[0]}</Text>
                    </View>
                  )}
                </View>

                <Pressable
                  style={styles.reverseToggle}
                  onPress={() => setReversed((r) => !r)}
                >
                  <Text style={styles.reverseToggleText}>
                    {reversed ? '↑ Diritta' : '↓ Rovesciata'}
                  </Text>
                </Pressable>

                <Text style={styles.modalTitle}>{selected.name_it}</Text>
                <Text style={styles.modalSub}>{selected.name}</Text>

                <View style={styles.keywordsRow}>
                  {(reversed ? selected.reversed_keywords : selected.keywords).slice(0, 4).map((k) => (
                    <View key={k} style={styles.kwChip}>
                      <Text style={styles.kwText}>{k}</Text>
                    </View>
                  ))}
                </View>

                {(reversed ? selected.meaning_rev : selected.meaning_up) && (
                  <Text style={styles.meaning}>
                    {reversed ? selected.meaning_rev : selected.meaning_up}
                  </Text>
                )}

                {selected.desc && (
                  <Text style={styles.desc}>{selected.desc}</Text>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#140d2e', overflow: 'hidden' },
  inner: { flex: 1, zIndex: 5 },
  titleArea: { paddingTop: 40 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  search: {
    backgroundColor: 'rgba(52,26,106,0.7)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#F0E6FF',
  },
  filterWrap: { height: 48, marginBottom: 4 },
  filterList: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(52,26,106,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  chipActive: { backgroundColor: '#5a2d9a', borderColor: '#D4AF37' },
  chipText: { fontSize: 13, color: '#a890c8' },
  chipTextActive: { color: '#D4AF37', fontWeight: '600' },
  gridList: { flex: 1 },
  grid: { paddingHorizontal: 6, paddingBottom: 24 },
  cell: { flex: 1, margin: 2, alignItems: 'center' },
  cardImg: { width: 70, height: 110, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)' },
  cardPlaceholder: {
    width: 70,
    height: 110,
    borderRadius: 3,
    backgroundColor: '#5a2d9a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  cardPlaceholderText: { fontSize: 12, color: '#D4AF37', fontWeight: '700' },
  cardName: { fontSize: 7, color: '#a890c8', marginTop: 2, textAlign: 'center', width: 70 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,6,25,0.88)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1e0e3a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    borderColor: '#D4AF37',
    padding: 24,
    maxHeight: '88%',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(90,45,154,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#D4AF37', fontSize: 14, fontWeight: '700' },
  modalScroll: { alignItems: 'center', paddingBottom: 16 },
  modalImgWrap: { marginTop: 8, marginBottom: 12 },
  modalImg: { width: 140, height: 240, borderRadius: 8, borderWidth: 2, borderColor: '#D4AF37' },
  modalImgReversed: { transform: [{ rotate: '180deg' }] },
  modalImgPlaceholder: {
    width: 140,
    height: 240,
    borderRadius: 8,
    backgroundColor: '#5a2d9a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  reverseToggle: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 12,
  },
  reverseToggleText: { fontSize: 13, color: '#D4AF37' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#F0E6FF', fontFamily: 'Georgia', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#a890c8', marginBottom: 12 },
  keywordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 14 },
  kwChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(90,45,154,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  kwText: { fontSize: 11, color: '#D4AF37' },
  meaning: { fontSize: 14, color: '#F0E6FF', textAlign: 'center', lineHeight: 20, marginBottom: 10 },
  desc: { fontSize: 12, color: '#a890c8', textAlign: 'center', lineHeight: 17 },
});
