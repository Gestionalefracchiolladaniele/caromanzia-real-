import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Line, Path, Polyline, Text as SvgText } from 'react-native-svg';

import { ElaborateFrame } from '@/components/ui/ElaborateFrame';
import { TabBar, type TabId } from '@/components/ui/TabBar';
import { TitleBox } from '@/components/ui/TitleBox';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

type Period = 'month' | 'three_months' | 'all' | 'custom';

interface DayVisit {
  date: string; // YYYY-MM-DD
  total: number;
  unique: number;
}

interface SocialStat {
  platform: 'whatsapp' | 'instagram' | 'telegram' | 'tiktok';
  count: number;
  label: string;
  color: string;
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function getPeriodStart(period: Period, customStart?: string): string {
  if (period === 'custom' && customStart) return new Date(customStart).toISOString();
  const now = new Date();
  if (period === 'month') {
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (period === 'three_months') {
    now.setMonth(now.getMonth() - 3);
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  return '2000-01-01T00:00:00.000Z';
}

function getPeriodEnd(period: Period, customEnd?: string): string | null {
  if (period === 'custom' && customEnd) {
    const d = new Date(customEnd);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }
  return null;
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

/* ─────────────────────────────────────────────
   CalendarPicker — Calendario interattivo viola/oro
───────────────────────────────────────────── */

interface CalendarPickerProps {
  visible: boolean;
  startDate: string; // YYYY-MM-DD or ''
  endDate: string;   // YYYY-MM-DD or ''
  onApply: (start: string, end: string) => void;
  onClose: () => void;
}

function CalendarPicker({ visible, startDate, endDate, onApply, onClose }: CalendarPickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11
  const [selStart, setSelStart] = useState(startDate);
  const [selEnd, setSelEnd] = useState(endDate);
  const [selectingEnd, setSelectingEnd] = useState(false); // false = seleziono inizio, true = seleziono fine
  const [error, setError] = useState('');

  // Reset quando apre
  useEffect(() => {
    if (visible) {
      setSelStart(startDate);
      setSelEnd(endDate);
      setSelectingEnd(false);
      setError('');
      // Posiziona il calendario sul mese della data inizio (o oggi)
      const base = startDate ? new Date(startDate) : today;
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
  }, [visible]);

  const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const DAY_NAMES = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

  // Genera le celle del mese corrente
  function buildCalendarDays() {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    // Lunedì = 0
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
    // Riempi fino a multiplo di 7
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function formatDay(day: number): string {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}`;
  }

  function isInRange(dateStr: string): boolean {
    if (!selStart || !selEnd) return false;
    return dateStr > selStart && dateStr < selEnd;
  }

  function isSelected(dateStr: string): boolean {
    return dateStr === selStart || dateStr === selEnd;
  }

  function isToday(dateStr: string): boolean {
    return dateStr === today.toISOString().split('T')[0];
  }

  function handleDayPress(day: number) {
    const dateStr = formatDay(day);
    if (!selectingEnd) {
      setSelStart(dateStr);
      setSelEnd('');
      setSelectingEnd(true);
      setError('');
    } else {
      if (dateStr < selStart) {
        setSelStart(dateStr);
        setSelEnd(selStart);
      } else {
        setSelEnd(dateStr);
      }
      setSelectingEnd(false);
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function handleApply() {
    if (!selStart) { setError('Seleziona la data di inizio'); return; }
    if (!selEnd) { setError('Seleziona anche la data di fine'); return; }
    onApply(selStart, selEnd);
    onClose();
  }

  const cells = buildCalendarDays();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={calStyles.overlay}>
        <View style={calStyles.container}>
          {/* Header */}
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
            {/* Indicatore selezione */}
            <View style={calStyles.selectionInfo}>
              <View style={calStyles.selField}>
                <Text style={calStyles.selLabel}>INIZIO</Text>
                <Text style={[calStyles.selValue, !selStart && calStyles.selValueEmpty]}>
                  {selStart || '—'}
                </Text>
              </View>
              <View style={calStyles.selArrow}>
                <Svg width="16" height="16" viewBox="0 0 24 24" fill="#D4AF37">
                  <Path d="M8 5v14l11-7z" />
                </Svg>
              </View>
              <View style={calStyles.selField}>
                <Text style={calStyles.selLabel}>FINE</Text>
                <Text style={[calStyles.selValue, !selEnd && calStyles.selValueEmpty]}>
                  {selEnd || '—'}
                </Text>
              </View>
            </View>

            <Text style={calStyles.hint}>
              {selectingEnd ? 'Tocca per selezionare la data di fine' : 'Tocca per selezionare la data di inizio'}
            </Text>

            {/* Navigazione mese */}
            <View style={calStyles.monthNav}>
              <Pressable onPress={prevMonth} style={calStyles.navBtn} hitSlop={8}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37">
                  <Path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </Svg>
              </Pressable>
              <Text style={calStyles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <Pressable onPress={nextMonth} style={calStyles.navBtn} hitSlop={8}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37">
                  <Path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </Svg>
              </Pressable>
            </View>

            {/* Header giorni settimana */}
            <View style={calStyles.daysHeader}>
              {DAY_NAMES.map((d) => (
                <Text key={d} style={calStyles.dayName}>{d}</Text>
              ))}
            </View>

            {/* Griglia giorni */}
            <View style={calStyles.grid}>
              {cells.map((day, idx) => {
                if (!day) return <View key={idx} style={calStyles.dayCell} />;
                const dateStr = formatDay(day);
                const selected = isSelected(dateStr);
                const inRange = isInRange(dateStr);
                const todayDate = isToday(dateStr);
                return (
                  <Pressable
                    key={idx}
                    style={[
                      calStyles.dayCell,
                      selected && calStyles.dayCellSelected,
                      inRange && calStyles.dayCellInRange,
                      todayDate && !selected && calStyles.dayCellToday,
                    ]}
                    onPress={() => handleDayPress(day)}
                  >
                    <Text style={[
                      calStyles.dayText,
                      selected && calStyles.dayTextSelected,
                      inRange && calStyles.dayTextInRange,
                      todayDate && !selected && calStyles.dayTextToday,
                    ]}>
                      {day}
                    </Text>
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

function formatDateShort(date: string): string {
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/* ─────────────────────────────────────────────
   Hooks
───────────────────────────────────────────── */

function useProfileVisits(cartomanteId: string, period: Period, customStart?: string, customEnd?: string) {
  const [data, setData] = useState<DayVisit[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [uniqueVisits, setUniqueVisits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cartomanteId) return;
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const since = getPeriodStart(period, customStart);
      const until = getPeriodEnd(period, customEnd);

      let q = supabase
        .from('profile_visits')
        .select('visitor_id, created_at')
        .eq('cartomante_id', cartomanteId)
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (until) q = q.lte('created_at', until);

      const { data: rows } = await q;
      if (cancelled || !rows) return;

      const byDay: Record<string, { total: number; visitors: Set<string> }> = {};
      for (const row of rows) {
        const day = (row.created_at as string).split('T')[0];
        if (!byDay[day]) byDay[day] = { total: 0, visitors: new Set() };
        byDay[day].total += 1;
        byDay[day].visitors.add(row.visitor_id);
      }

      const dayVisits: DayVisit[] = Object.entries(byDay).map(([date, v]) => ({
        date,
        total: v.total,
        unique: v.visitors.size,
      }));

      const tot = rows.length;
      const uniq = new Set(rows.map((r) => r.visitor_id)).size;

      setData(dayVisits);
      setTotalVisits(tot);
      setUniqueVisits(uniq);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [cartomanteId, period, customStart, customEnd]);

  return { data, totalVisits, uniqueVisits, loading };
}

function useSocialClicks(cartomanteId: string, period: Period, customStart?: string, customEnd?: string) {
  const [stats, setStats] = useState<SocialStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cartomanteId) return;
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const since = getPeriodStart(period, customStart);
      const until = getPeriodEnd(period, customEnd);

      let q = supabase
        .from('social_clicks')
        .select('platform')
        .eq('cartomante_id', cartomanteId)
        .gte('created_at', since);

      if (until) q = q.lte('created_at', until);

      const { data: rows } = await q;
      if (cancelled || !rows) return;

      const counts: Record<string, number> = {
        whatsapp: 0,
        instagram: 0,
        telegram: 0,
        tiktok: 0,
      };
      for (const row of rows) {
        if (row.platform in counts) counts[row.platform] += 1;
      }

      const PLATFORM_META: Record<string, { label: string; color: string }> = {
        whatsapp: { label: 'WhatsApp', color: '#25D366' },
        instagram: { label: 'Instagram', color: '#E1306C' },
        telegram: { label: 'Telegram', color: '#2CA5E0' },
        tiktok: { label: 'TikTok', color: '#D4AF37' },
      };

      const result: SocialStat[] = Object.entries(counts).map(([platform, count]) => ({
        platform: platform as SocialStat['platform'],
        count,
        label: PLATFORM_META[platform].label,
        color: PLATFORM_META[platform].color,
      }));

      setStats(result);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [cartomanteId, period, customStart, customEnd]);

  return { stats, loading };
}

/* ─────────────────────────────────────────────
   LineChart — Reanimated-free, SVG nativo
───────────────────────────────────────────── */

const CHART_WIDTH = Dimensions.get('window').width - 48;
const CHART_HEIGHT = 120;
const CHART_PAD_L = 28;
const CHART_PAD_B = 22;
const CHART_PAD_T = 12;
const CHART_PAD_R = 8;

function VisitsLineChart({ data }: { data: DayVisit[] }) {
  const plotW = CHART_WIDTH - CHART_PAD_L - CHART_PAD_R;
  const plotH = CHART_HEIGHT - CHART_PAD_T - CHART_PAD_B;

  const maxVal = useMemo(() => Math.max(...data.map((d) => d.total), 1), [data]);

  if (data.length === 0) {
    return (
      <View style={chartStyles.empty}>
        <Text style={chartStyles.emptyText}>Nessun dato nel periodo selezionato</Text>
      </View>
    );
  }

  // Points for total (gold) and unique (purple)
  const totalPoints = data.map((d, i) => {
    const x = CHART_PAD_L + (i / Math.max(data.length - 1, 1)) * plotW;
    const y = CHART_PAD_T + plotH - (d.total / maxVal) * plotH;
    return `${x},${y}`;
  });

  const uniquePoints = data.map((d, i) => {
    const x = CHART_PAD_L + (i / Math.max(data.length - 1, 1)) * plotW;
    const y = CHART_PAD_T + plotH - (d.unique / maxVal) * plotH;
    return `${x},${y}`;
  });

  // Y axis labels
  const yLabels = [0, Math.round(maxVal / 2), maxVal];

  // X axis: show first, middle, last
  const xLabels = data.length > 1
    ? [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]]
    : [data[0]];

  const xLabelPositions = data.length > 1
    ? [0, Math.floor(data.length / 2), data.length - 1]
    : [0];

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Grid lines */}
      {yLabels.map((val) => {
        const y = CHART_PAD_T + plotH - (val / maxVal) * plotH;
        return (
          <React.Fragment key={val}>
            <Line
              x1={CHART_PAD_L}
              y1={y}
              x2={CHART_PAD_L + plotW}
              y2={y}
              stroke="rgba(212,175,55,0.15)"
              strokeWidth="1"
            />
            <SvgText
              x={CHART_PAD_L - 4}
              y={y + 4}
              fontSize="8"
              fill="#a890c8"
              textAnchor="end"
            >
              {val}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* X axis labels */}
      {xLabelPositions.map((idx, i) => {
        const x = CHART_PAD_L + (idx / Math.max(data.length - 1, 1)) * plotW;
        return (
          <SvgText
            key={i}
            x={x}
            y={CHART_HEIGHT - 4}
            fontSize="8"
            fill="#a890c8"
            textAnchor="middle"
          >
            {formatDateShort(xLabels[i].date)}
          </SvgText>
        );
      })}

      {/* Lines */}
      <Polyline
        points={totalPoints.join(' ')}
        fill="none"
        stroke="#D4AF37"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Polyline
        points={uniquePoints.join(' ')}
        fill="none"
        stroke="#8f5fd0"
        strokeWidth="1.5"
        strokeDasharray="3,3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Axes */}
      <Line
        x1={CHART_PAD_L}
        y1={CHART_PAD_T}
        x2={CHART_PAD_L}
        y2={CHART_PAD_T + plotH}
        stroke="rgba(212,175,55,0.3)"
        strokeWidth="1"
      />
      <Line
        x1={CHART_PAD_L}
        y1={CHART_PAD_T + plotH}
        x2={CHART_PAD_L + plotW}
        y2={CHART_PAD_T + plotH}
        stroke="rgba(212,175,55,0.3)"
        strokeWidth="1"
      />
    </Svg>
  );
}

/* ─────────────────────────────────────────────
   HorizontalBarChart — Social Clicks
───────────────────────────────────────────── */

const BAR_CHART_W = Dimensions.get('window').width - 48;
const BAR_HEIGHT = 24;
const BAR_GAP = 10;
const BAR_LABEL_W = 72;

function SocialBarChart({ stats }: { stats: SocialStat[] }) {
  const total = useMemo(() => stats.reduce((s, p) => s + p.count, 0), [stats]);
  const maxCount = useMemo(() => Math.max(...stats.map((s) => s.count), 1), [stats]);
  const barW = BAR_CHART_W - BAR_LABEL_W - 52; // 52 for count text

  if (total === 0) {
    return (
      <View style={chartStyles.empty}>
        <Text style={chartStyles.emptyText}>Nessun click nel periodo selezionato</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: BAR_GAP }}>
      {stats.map((s) => {
        const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
        const w = (s.count / maxCount) * barW;
        return (
          <View key={s.platform} style={chartStyles.barRow}>
            <Text style={[chartStyles.barLabel, { color: s.color }]}>{s.label}</Text>
            <View style={chartStyles.barTrack}>
              <View
                style={[
                  chartStyles.barFill,
                  { width: Math.max(w, s.count > 0 ? 4 : 0), backgroundColor: s.color },
                ]}
              />
            </View>
            <Text style={chartStyles.barCount}>{s.count}</Text>
            <Text style={chartStyles.barPct}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  empty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#a890c8',
    fontSize: 13,
    fontFamily: 'Georgia',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 72,
    fontSize: 12,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  barTrack: {
    flex: 1,
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(52,26,106,0.6)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: BAR_HEIGHT,
    borderRadius: 4,
    opacity: 0.85,
  },
  barCount: {
    width: 24,
    color: '#F0E6FF',
    fontSize: 12,
    fontFamily: 'Georgia',
    textAlign: 'right',
  },
  barPct: {
    width: 32,
    color: '#a890c8',
    fontSize: 11,
    fontFamily: 'Georgia',
    textAlign: 'right',
  },
});

/* ─────────────────────────────────────────────
   PeriodSelector
───────────────────────────────────────────── */

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
          <Pressable
            key={p.id}
            style={[periodStyles.chip, value === p.id && periodStyles.chipActive]}
            onPress={() => onChange(p.id)}
          >
            <Text style={[periodStyles.chipText, value === p.id && periodStyles.chipTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={[periodStyles.calBtn, value === 'custom' && periodStyles.chipActive]}
          onPress={onCalendarPress}
        >
          <Svg width="16" height="16" viewBox="0 0 24 24" fill={value === 'custom' ? '#D4AF37' : '#a890c8'}>
            <Path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
          </Svg>
        </Pressable>
      </View>
      {value === 'custom' && customStart && customEnd && (
        <Text style={periodStyles.customLabel}>
          {customStart} → {customEnd}
        </Text>
      )}
    </View>
  );
}

const periodStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(52,26,106,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#5a2d9a',
    borderColor: '#D4AF37',
  },
  chipText: {
    fontSize: 11,
    color: '#a890c8',
    fontFamily: 'Georgia',
  },
  chipTextActive: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  calBtn: {
    width: 40,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(52,26,106,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customLabel: {
    fontSize: 11,
    color: '#D4AF37',
    fontFamily: 'Georgia',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

/* ─────────────────────────────────────────────
   Main Screen
───────────────────────────────────────────── */

export default function AnalyticsScreen() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const cartomanteId = user?.id ?? '';

  const today = new Date().toISOString().split('T')[0];
  const monthAgo = (() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; })();

  const { data: visitData, totalVisits, uniqueVisits, loading: loadingVisits } =
    useProfileVisits(cartomanteId, period, customStart, customEnd);

  const { stats: socialStats, loading: loadingSocial } =
    useSocialClicks(cartomanteId, period, customStart, customEnd);

  const handleNav = (id: TabId) => {
    router.push(`/(tabs)/${id}` as any);
  };

  const handleApplyCustom = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPeriod('custom');
  };

  const handlePeriodChange = (p: Period) => {
    if (p !== 'custom') { setCustomStart(''); setCustomEnd(''); }
    setPeriod(p);
  };

  const isLoading = loadingVisits || loadingSocial;

  return (
    <View style={styles.screen}>
      <ElaborateFrame />

      <View style={styles.inner}>
        <View style={styles.titleArea}>
          <TitleBox sub="Statistiche profilo">ANALYTICS</TitleBox>
        </View>

        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          customStart={customStart}
          customEnd={customEnd}
          onCalendarPress={() => setCalendarOpen(true)}
        />

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#D4AF37" size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Stat Cards */}
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalVisits}</Text>
                <Text style={styles.statLabel}>Visite totali</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#8f5fd0' }]}>{uniqueVisits}</Text>
                <Text style={styles.statLabel}>Visite uniche</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#2CA5E0' }]}>
                  {socialStats.reduce((s, p) => s + p.count, 0)}
                </Text>
                <Text style={styles.statLabel}>Click social</Text>
              </View>
            </View>

            {/* Profile Visits Chart */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Visite Profilo</Text>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#D4AF37' }]} />
                  <Text style={styles.legendText}>Totali</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#8f5fd0', opacity: 0.85 }]} />
                  <Text style={styles.legendText}>Uniche</Text>
                </View>
              </View>

              <VisitsLineChart data={visitData} />
            </View>

            {/* Social Clicks Chart */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Click Social</Text>
              <SocialBarChart stats={socialStats} />
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>
        )}

        <TabBar active="analytics" onChange={handleNav} />
      </View>

      <CalendarPicker
        visible={calendarOpen}
        startDate={customStart || monthAgo}
        endDate={customEnd || today}
        onApply={handleApplyCustom}
        onClose={() => setCalendarOpen(false)}
      />
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
  titleArea: {
    paddingTop: 40,
    marginBottom: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1.5,
    borderColor: '#8B7020',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    color: '#D4AF37',
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  statLabel: {
    color: '#a890c8',
    fontSize: 10,
    fontFamily: 'Georgia',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1.5,
    borderColor: '#8B7020',
    borderRadius: 10,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Georgia',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#a890c8',
    fontSize: 11,
    fontFamily: 'Georgia',
  },
});
