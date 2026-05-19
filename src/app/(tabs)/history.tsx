import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ElaborateFrame } from '@/components/ui/ElaborateFrame';
import { GoldButton } from '@/components/ui/GoldButton';
import { TabBar, type TabId } from '@/components/ui/TabBar';
import { TitleBox } from '@/components/ui/TitleBox';
import { useAuthStore } from '@/lib/auth-store';
import { fetchReadings } from '@/lib/supabase-readings';
import { useReadingStore } from '@/features/reading/reading-store';
import type { DeckType, LifeArea, EmotionalState, Urgency, Reading } from '@/types';

/* ─── Types ── */

type Period = 'month' | 'three_months' | 'all' | 'custom';

/* ─── Helpers ── */

function getPeriodStart(period: Period, customStart?: string): string {
  if (period === 'custom' && customStart) return new Date(customStart).toISOString();
  const now = new Date();
  if (period === 'month') { now.setDate(1); now.setHours(0, 0, 0, 0); return now.toISOString(); }
  if (period === 'three_months') { now.setMonth(now.getMonth() - 3); now.setHours(0, 0, 0, 0); return now.toISOString(); }
  return '2000-01-01T00:00:00.000Z';
}

function getPeriodEnd(period: Period, customEnd?: string): string | null {
  if (period === 'custom' && customEnd) {
    const d = new Date(customEnd); d.setHours(23, 59, 59, 999); return d.toISOString();
  }
  return null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

const DECK_ICON: Record<DeckType, string> = {
  tre_carte: '🃏',
  celtic_cross: '✝',
  sincronia: '⚡',
  sogni: '🌙',
  situazioni: '🌟',
};

const DECK_LABEL: Record<DeckType, string> = {
  tre_carte: 'Tre Carte',
  celtic_cross: 'Croce Celtica',
  sincronia: 'Sincronicità',
  sogni: 'Sogni',
  situazioni: 'Situazioni',
};

const LIFE_AREA_LABEL: Record<LifeArea, string> = {
  love: '❤️ Amore',
  work: '💼 Lavoro',
  money: '💰 Finanze',
  health: '🏥 Salute',
  spiritual: '✨ Spirituale',
  study: '🎓 Studio',
  relations: '🤝 Relazioni',
  generale: '🌐 Generale',
};

/* ─── CalendarPicker (identico ad analytics.tsx) ── */

interface CalendarPickerProps {
  visible: boolean;
  startDate: string;
  endDate: string;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
}

function CalendarPicker({ visible, startDate, endDate, onApply, onClose }: CalendarPickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selStart, setSelStart] = useState(startDate);
  const [selEnd, setSelEnd] = useState(endDate);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setSelStart(startDate); setSelEnd(endDate); setSelectingEnd(false); setError('');
      const base = startDate ? new Date(startDate) : today;
      setViewYear(base.getFullYear()); setViewMonth(base.getMonth());
    }
  }, [visible]);

  const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const DAY_NAMES = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

  function buildCalendarDays() {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function formatDay(day: number): string {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function isInRange(d: string) { return !!selStart && !!selEnd && d > selStart && d < selEnd; }
  function isSelected(d: string) { return d === selStart || d === selEnd; }
  function isToday(d: string) { return d === today.toISOString().split('T')[0]; }

  function handleDayPress(day: number) {
    const dateStr = formatDay(day);
    if (!selectingEnd) {
      setSelStart(dateStr); setSelEnd(''); setSelectingEnd(true); setError('');
    } else {
      if (dateStr < selStart) { setSelStart(dateStr); setSelEnd(selStart); }
      else setSelEnd(dateStr);
      setSelectingEnd(false);
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1);
  }

  function handleApply() {
    if (!selStart) { setError('Seleziona la data di inizio'); return; }
    if (!selEnd) { setError('Seleziona anche la data di fine'); return; }
    onApply(selStart, selEnd); onClose();
  }

  const cells = buildCalendarDays();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={calStyles.overlay}>
        <View style={calStyles.container}>
          <View style={calStyles.header}>
            <Pressable onPress={onClose} style={calStyles.closeBtn}>
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="#D4AF37">
                <Path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </Svg>
            </Pressable>
            <Text style={calStyles.title}>Seleziona Periodo</Text>
            <View style={{ width: 32 }} />
          </View>
          <View style={calStyles.body}>
            <View style={calStyles.selectionInfo}>
              <View style={calStyles.selField}>
                <Text style={calStyles.selLabel}>INIZIO</Text>
                <Text style={[calStyles.selValue, !selStart && calStyles.selValueEmpty]}>{selStart || '—'}</Text>
              </View>
              <View style={calStyles.selArrow}>
                <Svg width="16" height="16" viewBox="0 0 24 24" fill="#D4AF37"><Path d="M8 5v14l11-7z" /></Svg>
              </View>
              <View style={calStyles.selField}>
                <Text style={calStyles.selLabel}>FINE</Text>
                <Text style={[calStyles.selValue, !selEnd && calStyles.selValueEmpty]}>{selEnd || '—'}</Text>
              </View>
            </View>
            <Text style={calStyles.hint}>{selectingEnd ? 'Tocca per selezionare la data di fine' : 'Tocca per selezionare la data di inizio'}</Text>
            <View style={calStyles.monthNav}>
              <Pressable onPress={prevMonth} style={calStyles.navBtn} hitSlop={8}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37"><Path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></Svg>
              </Pressable>
              <Text style={calStyles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <Pressable onPress={nextMonth} style={calStyles.navBtn} hitSlop={8}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37"><Path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></Svg>
              </Pressable>
            </View>
            <View style={calStyles.daysHeader}>
              {DAY_NAMES.map((d) => <Text key={d} style={calStyles.dayName}>{d}</Text>)}
            </View>
            <View style={calStyles.grid}>
              {cells.map((day, idx) => {
                if (!day) return <View key={idx} style={calStyles.dayCell} />;
                const dateStr = formatDay(day);
                const selected = isSelected(dateStr);
                const inRange = isInRange(dateStr);
                const todayDate = isToday(dateStr);
                return (
                  <Pressable key={idx} style={[calStyles.dayCell, selected && calStyles.dayCellSelected, inRange && calStyles.dayCellInRange, todayDate && !selected && calStyles.dayCellToday]} onPress={() => handleDayPress(day)}>
                    <Text style={[calStyles.dayText, selected && calStyles.dayTextSelected, inRange && calStyles.dayTextInRange, todayDate && !selected && calStyles.dayTextToday]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
            {error ? <Text style={calStyles.error}>{error}</Text> : null}
            <Pressable style={[calStyles.applyBtn, (!selStart || !selEnd) && calStyles.applyBtnDisabled]} onPress={handleApply}>
              <Text style={calStyles.applyBtnText}>Applica filtro</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,6,25,0.92)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  container: { width: '100%', maxWidth: 360, backgroundColor: 'rgba(36,21,80,0.98)', borderRadius: 16, borderWidth: 1.5, borderColor: '#D4AF37', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.2)' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#D4AF37', fontFamily: 'Georgia', letterSpacing: 0.8 },
  body: { padding: 16, gap: 12 },
  selectionInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52,26,106,0.5)', borderRadius: 10, padding: 12 },
  selField: { flex: 1, alignItems: 'center', gap: 2 },
  selLabel: { fontSize: 9, color: '#a890c8', fontFamily: 'Georgia', textTransform: 'uppercase', letterSpacing: 1 },
  selValue: { fontSize: 13, color: '#F0D060', fontFamily: 'Georgia', fontWeight: '700' },
  selValueEmpty: { color: '#7a6090' },
  selArrow: { paddingHorizontal: 8 },
  hint: { fontSize: 11, color: '#a890c8', fontFamily: 'Georgia', textAlign: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#D4AF37', fontFamily: 'Georgia' },
  daysHeader: { flexDirection: 'row' },
  dayName: { flex: 1, textAlign: 'center', fontSize: 10, color: '#a890c8', fontFamily: 'Georgia', fontWeight: '700', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100/7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  dayCellSelected: { backgroundColor: '#D4AF37' },
  dayCellInRange: { backgroundColor: 'rgba(212,175,55,0.2)', borderRadius: 0 },
  dayCellToday: { borderWidth: 1, borderColor: 'rgba(212,175,55,0.5)' },
  dayText: { fontSize: 13, color: '#E8D5A3', fontFamily: 'Georgia' },
  dayTextSelected: { color: '#140d2e', fontWeight: '700' },
  dayTextInRange: { color: '#D4AF37' },
  dayTextToday: { color: '#D4AF37', fontWeight: '700' },
  error: { fontSize: 12, color: '#e05050', fontFamily: 'Georgia', textAlign: 'center' },
  applyBtn: { backgroundColor: '#D4AF37', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  applyBtnDisabled: { opacity: 0.5 },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#140d2e', fontFamily: 'Georgia' },
});

/* ─── PeriodSelector (identico ad analytics.tsx) ── */

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: 'month', label: 'Mese' },
  { id: 'three_months', label: '3 mesi' },
  { id: 'all', label: 'Tutto' },
];

interface PeriodSelectorProps {
  value: Period;
  onChange: (p: Period) => void;
  customStart: string;
  customEnd: string;
  onCalendarPress: () => void;
}

function PeriodSelector({ value, onChange, customStart, customEnd, onCalendarPress }: PeriodSelectorProps) {
  return (
    <View style={periodStyles.wrap}>
      <View style={periodStyles.row}>
        {PERIODS.map((p) => (
          <Pressable key={p.id} style={[periodStyles.chip, value === p.id && periodStyles.chipActive]} onPress={() => onChange(p.id)}>
            <Text style={[periodStyles.chipText, value === p.id && periodStyles.chipTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
        <Pressable style={[periodStyles.calBtn, value === 'custom' && periodStyles.chipActive]} onPress={onCalendarPress}>
          <Svg width="16" height="16" viewBox="0 0 24 24" fill={value === 'custom' ? '#D4AF37' : '#a890c8'}>
            <Path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
          </Svg>
        </Pressable>
      </View>
      {value === 'custom' && customStart && customEnd && (
        <Text style={periodStyles.customLabel}>{customStart} → {customEnd}</Text>
      )}
    </View>
  );
}

const periodStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 8, gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(52,26,106,0.85)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', alignItems: 'center' },
  chipActive: { backgroundColor: '#5a2d9a', borderColor: '#D4AF37' },
  chipText: { fontSize: 11, color: '#a890c8', fontFamily: 'Georgia' },
  chipTextActive: { color: '#D4AF37', fontWeight: '700' },
  calBtn: { width: 40, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(52,26,106,0.85)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', alignItems: 'center', justifyContent: 'center' },
  customLabel: { fontSize: 11, color: '#D4AF37', fontFamily: 'Georgia', textAlign: 'center', letterSpacing: 0.5 },
});

/* ─── ReadingDetail modal ── */

interface ReadingDetailProps {
  reading: Reading | null;
  onClose: () => void;
  onFollowup: (reading: Reading) => void;
}

function ReadingDetail({ reading, onClose, onFollowup }: ReadingDetailProps) {
  if (!reading) return null;

  const cardsArr = reading.cards ?? [];
  const cardNames = cardsArr.map((c) => c.name_it);
  const cardReversals = cardsArr.map((c) => !!c.reversed);
  const ctx = reading.context;
  const followupCount = (reading.followups ?? []).length;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={detailStyles.overlay}>
        <View style={detailStyles.container}>
          {/* Header */}
          <View style={detailStyles.header}>
            <Pressable onPress={onClose} style={detailStyles.closeBtn}>
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="#D4AF37">
                <Path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </Svg>
            </Pressable>
            <View style={detailStyles.headerCenter}>
              <Text style={detailStyles.headerIcon}>{DECK_ICON[reading.deck_type]}</Text>
              <Text style={detailStyles.headerTitle}>{DECK_LABEL[reading.deck_type]}</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={detailStyles.scroll} contentContainerStyle={detailStyles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Meta */}
            <Text style={detailStyles.date}>{formatDate(reading.created_at)}</Text>
            {ctx && (
              <View style={detailStyles.metaRow}>
                <Text style={detailStyles.metaChip}>{LIFE_AREA_LABEL[ctx.life_area]}</Text>
              </View>
            )}

            {/* Carte */}
            <Text style={detailStyles.sectionLabel}>CARTE ESTRATTE</Text>
            <View style={detailStyles.cardsGrid}>
              {cardNames.map((name, i) => (
                <View key={i} style={detailStyles.cardChip}>
                  <Text style={detailStyles.cardChipName}>{name.trim()}</Text>
                  {cardReversals[i] && <Text style={detailStyles.cardChipRev}>↓</Text>}
                </View>
              ))}
            </View>

            {/* Summary */}
            <Text style={detailStyles.sectionLabel}>INTERPRETAZIONE</Text>
            <Text style={detailStyles.summaryText}>{reading.summary}</Text>

            {/* Followup count */}
            {followupCount > 0 && (
              <Text style={detailStyles.followupCount}>
                {followupCount} domanda{followupCount > 1 ? 'e di approfondimento' : ' di approfondimento'}
              </Text>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={detailStyles.footer}>
            <GoldButton onPress={() => onFollowup(reading)} style={detailStyles.followupBtn}>
              NUOVA LETTURA DA QUESTA
            </GoldButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,6,25,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 400, maxHeight: '85%', backgroundColor: 'rgba(20,13,46,0.98)', borderRadius: 16, borderWidth: 1.5, borderColor: '#D4AF37', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.2)' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 13, color: '#D4AF37', fontFamily: 'Georgia', fontWeight: '700', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  date: { color: '#a890c8', fontFamily: 'Georgia', fontSize: 12, textAlign: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  metaChip: { color: '#c4a0f0', fontFamily: 'Georgia', fontSize: 12, backgroundColor: 'rgba(90,45,154,0.3)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  sectionLabel: { color: '#8B7020', fontFamily: 'Georgia', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 6 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(36,21,80,0.8)', borderWidth: 1, borderColor: '#8B7020', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  cardChipName: { color: '#F0D060', fontFamily: 'Georgia', fontSize: 11 },
  cardChipRev: { color: '#C0392B', fontSize: 10 },
  summaryText: { color: '#e8dfc8', fontFamily: 'Georgia', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  followupCount: { color: '#a890c8', fontFamily: 'Georgia', fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
  relatedNote: { color: '#7a6090', fontFamily: 'Georgia', fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(212,175,55,0.2)' },
  followupBtn: { alignSelf: 'center', paddingHorizontal: 24 },
});

/* ─── Stats helpers ── */

interface HistoryStats {
  total: number;
  topCard: string | null;
  topCardPct: number;
  topArea: string | null;
  topAreaPct: number;
  topSpread: string | null;
  topSpreadPct: number;
}

function computeStats(readings: Reading[]): HistoryStats {
  if (readings.length === 0) return { total: 0, topCard: null, topCardPct: 0, topArea: null, topAreaPct: 0, topSpread: null, topSpreadPct: 0 };

  const n = readings.length;

  // Carta più frequente (conta apparizioni su tutte le letture)
  const cardCount: Record<string, number> = {};
  for (const r of readings) {
    for (const c of r.cards ?? []) {
      cardCount[c.name_it] = (cardCount[c.name_it] ?? 0) + 1;
    }
  }
  const topCardEntry = Object.entries(cardCount).sort((a, b) => b[1] - a[1])[0];
  const topCard = topCardEntry?.[0] ?? null;
  const topCardPct = topCard ? Math.round((topCardEntry[1] / n) * 100) : 0;

  // Area di vita più selezionata
  const areaCount: Record<string, number> = {};
  for (const r of readings) {
    const area = r.context?.life_area;
    if (area) areaCount[area] = (areaCount[area] ?? 0) + 1;
  }
  const topAreaEntry = Object.entries(areaCount).sort((a, b) => b[1] - a[1])[0];
  const topAreaKey = topAreaEntry?.[0] ?? null;
  const topArea = topAreaKey ? LIFE_AREA_LABEL[topAreaKey as LifeArea] : null;
  const topAreaPct = topAreaEntry ? Math.round((topAreaEntry[1] / n) * 100) : 0;

  // Spread più usato
  const spreadCount: Record<string, number> = {};
  for (const r of readings) {
    spreadCount[r.deck_type] = (spreadCount[r.deck_type] ?? 0) + 1;
  }
  const topSpreadEntry = Object.entries(spreadCount).sort((a, b) => b[1] - a[1])[0];
  const topSpreadKey = topSpreadEntry?.[0] ?? null;
  const topSpread = topSpreadKey ? DECK_LABEL[topSpreadKey as DeckType] : null;
  const topSpreadPct = topSpreadEntry ? Math.round((topSpreadEntry[1] / n) * 100) : 0;

  return { total: n, topCard, topCardPct, topArea, topAreaPct, topSpread, topSpreadPct };
}

/* ─── StatsBar component ── */

function StatsBar({ stats }: { stats: HistoryStats }) {
  if (stats.total === 0) return null;
  return (
    <View style={statsStyles.wrap}>
      <View style={statsStyles.row}>
        <View style={statsStyles.stat}>
          <Text style={statsStyles.statValue}>{stats.total}</Text>
          <Text style={statsStyles.statLabel}>Letture</Text>
        </View>
        {stats.topSpread && (
          <View style={statsStyles.stat}>
            <Text style={statsStyles.statValue} numberOfLines={1}>{stats.topSpread}</Text>
            <Text style={statsStyles.statPct}>{stats.topSpreadPct}%</Text>
            <Text style={statsStyles.statLabel}>Spread preferito</Text>
          </View>
        )}
        {stats.topArea && (
          <View style={statsStyles.stat}>
            <Text style={statsStyles.statValue} numberOfLines={1}>{stats.topArea}</Text>
            <Text style={statsStyles.statPct}>{stats.topAreaPct}%</Text>
            <Text style={statsStyles.statLabel}>Area preferita</Text>
          </View>
        )}
      </View>
      {stats.topCard && (
        <View style={statsStyles.topCardRow}>
          <Text style={statsStyles.topCardLabel}>🃏 Carta più frequente: </Text>
          <Text style={statsStyles.topCardName}>{stats.topCard}</Text>
          <Text style={statsStyles.topCardPct}> {stats.topCardPct}%</Text>
        </View>
      )}
    </View>
  );
}

const statsStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(36,21,80,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  statValue: {
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  statPct: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    color: '#a890c8',
    fontFamily: 'Georgia',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  topCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.15)',
    paddingTop: 8,
  },
  topCardLabel: {
    color: '#a890c8',
    fontFamily: 'Georgia',
    fontSize: 11,
  },
  topCardName: {
    color: '#D4AF37',
    fontFamily: 'Georgia',
    fontSize: 11,
    fontWeight: '700',
  },
  topCardPct: {
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 11,
    fontWeight: '700',
  },
});

/* ─── Main Screen ── */

export default function HistoryScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const setFollowupFrom = useReadingStore.getState().setFollowupFrom;
  const setDeck = useReadingStore.getState().setDeck;

  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filterDeck, setFilterDeck] = useState<DeckType | 'all'>('all');
  const [selectedReading, setSelectedReading] = useState<Reading | null>(null);
  const [contextSelected, setContextSelected] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split('T')[0];
  const monthAgo = (() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; })();

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const since = getPeriodStart(period, customStart);
    const until = getPeriodEnd(period, customEnd) ?? undefined;

    fetchReadings({
      user_id: userId,
      since,
      until,
      deck_type: filterDeck !== 'all' ? filterDeck : undefined,
      limit: 100,
    })
      .then(setReadings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, period, customStart, customEnd, filterDeck]);

  function handlePeriodChange(p: Period) {
    if (p !== 'custom') { setCustomStart(''); setCustomEnd(''); }
    setPeriod(p);
  }

  function handleApplyCustom(start: string, end: string) {
    setCustomStart(start); setCustomEnd(end); setPeriod('custom');
  }

  function handleFollowup(reading: Reading) {
    const ctx = reading.context;
    setFollowupFrom({
      reading_id: reading.id,
      emotional_state: ctx.emotional_state as EmotionalState,
      life_area: ctx.life_area as LifeArea,
      urgency: ctx.urgency as Urgency,
      deck_type: reading.deck_type,
      summary: reading.summary ?? '',
    });
    setDeck(reading.deck_type);
    setSelectedReading(null);
    router.push('/(tabs)/reading' as any);
  }

  function toggleContextSelect(id: string) {
    setContextSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleUseAsContext() {
    const selected = readings.filter((r) => contextSelected.has(r.id));
    const summaries = selected.map((r) =>
      `[${DECK_LABEL[r.deck_type]} — ${formatDate(r.created_at)}]: ${r.summary || r.ai_interpretation?.slice(0, 120) || ''}`
    );
    const combinedContext = summaries.join('\n\n');
    useReadingStore.getState().setContextReadings(
      [...contextSelected],
      summaries,
    );
    useReadingStore.getState().setFreeContext(combinedContext.slice(0, 500));
    setContextSelected(new Set());
    router.push('/(tabs)/reading' as any);
  }

  const handleNav = (id: TabId) => {
    router.push(`/(tabs)/${id}` as any);
  };

  const DECK_FILTERS: Array<{ id: DeckType | 'all'; label: string }> = [
    { id: 'all', label: 'Tutti' },
    { id: 'tre_carte', label: '🃏 Tre Carte' },
    { id: 'celtic_cross', label: '✝ Celtica' },
    { id: 'sincronia', label: '⚡ Sincronia' },
    { id: 'sogni', label: '🌙 Sogni' },
  ];

  return (
    <View style={styles.screen}>
      <ElaborateFrame />

      <View style={styles.inner}>
        <View style={styles.titleArea}>
          <TitleBox sub={`${readings.length} lettura${readings.length !== 1 ? 'e' : ''}`}>CRONOLOGIA</TitleBox>
        </View>

        {/* Period selector con calendario */}
        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          customStart={customStart}
          customEnd={customEnd}
          onCalendarPress={() => setCalendarOpen(true)}
        />

        {/* Filtri deck */}
        <View style={styles.deckFiltersWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckFiltersRow}>
            {DECK_FILTERS.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.deckChip, filterDeck === f.id && styles.deckChipActive]}
                onPress={() => setFilterDeck(f.id)}
              >
                <Text style={[styles.deckChipText, filterDeck === f.id && styles.deckChipTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {!loading && readings.length > 0 && (
          <Text style={styles.contextHint}>Tieni premuto una lettura per selezionarla come contesto</Text>
        )}
        {!loading && <StatsBar stats={computeStats(readings)} />}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#D4AF37" size="large" />
          </View>
        ) : (
          <>
          {contextSelected.size > 0 && (
            <Pressable style={styles.contextBtn} onPress={handleUseAsContext}>
              <Text style={styles.contextBtnText}>
                ✦ Usa {contextSelected.size} lettura{contextSelected.size > 1 ? 'e' : ''} come contesto
              </Text>
            </Pressable>
          )}

          <FlatList
            data={readings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isCtxSelected = contextSelected.has(item.id);
              return (
                <Pressable
                  style={[styles.card, isCtxSelected && styles.cardSelected]}
                  onPress={() => setSelectedReading(item)}
                  onLongPress={() => toggleContextSelect(item.id)}
                >
                  {/* Checkbox contesto */}
                  <Pressable
                    style={[styles.contextCheck, isCtxSelected && styles.contextCheckActive]}
                    onPress={() => toggleContextSelect(item.id)}
                    hitSlop={8}
                  >
                    <Text style={styles.contextCheckText}>{isCtxSelected ? '✓' : ''}</Text>
                  </Pressable>

                  {/* Timeline dot */}
                  <View style={styles.timelineDot}>
                    <Text style={styles.timelineIcon}>{DECK_ICON[item.deck_type]}</Text>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardDeckLabel}>{DECK_LABEL[item.deck_type]}</Text>
                      <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                    </View>

                    {item.context && (
                      <Text style={styles.cardArea}>{LIFE_AREA_LABEL[item.context.life_area]}</Text>
                    )}

                    <Text style={styles.cardSummary} numberOfLines={2}>{item.summary || item.ai_interpretation}</Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardCards}>
                        {(item.cards ?? []).length} carte · {(item.followups ?? []).length} domande
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>🔮</Text>
                <Text style={styles.emptyText}>Nessuna lettura in questo periodo</Text>
                <Pressable onPress={() => handleNav('reading')}>
                  <Text style={styles.emptyAction}>Inizia la tua prima lettura →</Text>
                </Pressable>
              </View>
            }
          />
          </>
        )}

        <TabBar active="history" onChange={handleNav} />
      </View>

      <CalendarPicker
        visible={calendarOpen}
        startDate={customStart || monthAgo}
        endDate={customEnd || today}
        onApply={handleApplyCustom}
        onClose={() => setCalendarOpen(false)}
      />

      <ReadingDetail
        reading={selectedReading}
        onClose={() => setSelectedReading(null)}
        onFollowup={handleFollowup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#140d2e', overflow: 'hidden' },
  inner: { flex: 1, zIndex: 5 },
  titleArea: { paddingTop: 40 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deckFiltersWrap: { height: 44, marginBottom: 4 },
  deckFiltersRow: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  deckChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(52,26,106,0.85)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  deckChipActive: { backgroundColor: '#5a2d9a', borderColor: '#D4AF37' },
  deckChipText: { color: '#a890c8', fontFamily: 'Georgia', fontSize: 11 },
  deckChipTextActive: { color: '#D4AF37', fontWeight: '700' },
  list: { padding: 16, gap: 12, paddingBottom: 16 },
  contextBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#5a2d9a',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  contextBtnText: {
    color: '#F0D060',
    fontFamily: 'Georgia',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1.5,
    borderColor: '#8B7020',
    borderRadius: 10,
    padding: 14,
  },
  cardSelected: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(90,45,154,0.4)',
  },
  contextCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#8B7020',
    backgroundColor: 'rgba(20,13,46,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  contextCheckActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#F0D060',
  },
  contextCheckText: {
    color: '#140d2e',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  timelineDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#5a2d9a',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timelineIcon: { fontSize: 18 },
  cardContent: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDeckLabel: { color: '#F0D060', fontFamily: 'Georgia', fontSize: 12, fontWeight: '700' },
  cardDate: { color: '#a890c8', fontFamily: 'Georgia', fontSize: 10, flexShrink: 0 },
  cardArea: { color: '#c4a0f0', fontFamily: 'Georgia', fontSize: 11 },
  cardSummary: { color: '#e8dfc8', fontFamily: 'Georgia', fontSize: 12, fontStyle: 'italic', lineHeight: 17 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  cardCards: { color: '#7a6090', fontFamily: 'Georgia', fontSize: 10 },
  cardRelated: { color: '#D4AF37', fontFamily: 'Georgia', fontSize: 10 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#a890c8', fontFamily: 'Georgia', fontSize: 14, textAlign: 'center' },
  emptyAction: { color: '#D4AF37', fontFamily: 'Georgia', fontSize: 13 },
  contextHint: {
    color: '#5a4a70',
    fontFamily: 'Georgia',
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 4,
    marginHorizontal: 16,
  },
});
