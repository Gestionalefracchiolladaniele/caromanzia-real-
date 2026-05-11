import type { DailyCard, DeckType, Reading, TarotCard } from '@/types';
import type { ReadingContext } from '@/lib/gemini';

import { supabase } from './supabase';

// ─── Save a completed reading ─────────────────────────────────────────────────

export interface SaveReadingParams {
  user_id: string;
  deck_type: DeckType;
  cards: TarotCard[];
  ai_interpretation: string;
  summary: string;
  context: ReadingContext;
  followups?: Array<{ question: string; answer: string }>;
  question?: string | null;
  dream_text?: string | null;
  is_daily?: boolean;
}

export async function saveReading(params: SaveReadingParams): Promise<Reading> {
  const { data, error } = await supabase
    .from('readings')
    .insert({
      user_id: params.user_id,
      deck_type: params.deck_type,
      cards: params.cards,
      ai_interpretation: params.ai_interpretation,
      summary: params.summary,
      context: params.context,
      followups: params.followups ?? [],
      question: params.question ?? '',
      dream_text: params.dream_text ?? null,
      is_daily: params.is_daily ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Reading;
}

// ─── Fetch readings — con filtri data per history ────────────────────────────

export interface FetchReadingsOptions {
  user_id: string;
  limit?: number;
  deck_type?: DeckType;
  since?: string;   // ISO string
  until?: string;   // ISO string
}

export async function fetchReadings(opts: FetchReadingsOptions): Promise<Reading[]> {
  let query = supabase
    .from('readings')
    .select('*')
    .eq('user_id', opts.user_id)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.deck_type) query = query.eq('deck_type', opts.deck_type);
  if (opts.since) query = query.gte('created_at', opts.since);
  if (opts.until) query = query.lte('created_at', opts.until);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Reading[];
}

// ─── Fetch ultime N letture per context Gemini (leggero) ─────────────────────

export async function fetchPriorReadings(user_id: string, limit = 5) {
  const { data } = await supabase
    .from('readings')
    .select('created_at, ai_interpretation, cards, context')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((r) => {
    const cardsArr = (r.cards as TarotCard[]) ?? [];
    const card_names = cardsArr.slice(0, 3).map((c) => c.name_it).join(', ');
    const ai = (r.ai_interpretation as string) ?? '';
    const summary = ai.replace(/\n+/g, ' ').trim().slice(0, 120) + (ai.length > 120 ? '…' : '');
    return {
      date: (r.created_at as string).split('T')[0],
      summary,
      card_names,
      life_area: (r.context as ReadingContext).life_area,
    };
  });
}

// ─── Save / upsert today's daily card ────────────────────────────────────────

export interface SaveDailyCardParams {
  user_id: string;
  card: TarotCard;
  ai_message: string;
}

export async function saveDailyCard(params: SaveDailyCardParams): Promise<DailyCard> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_cards')
    .upsert(
      {
        user_id: params.user_id,
        date: today,
        card: params.card,
        ai_message: params.ai_message,
      },
      { onConflict: 'user_id,date' },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DailyCard;
}

// ─── Fetch today's daily card ────────────────────────────────────────────────

export async function fetchTodayDailyCard(user_id: string): Promise<DailyCard | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_cards')
    .select('*')
    .eq('user_id', user_id)
    .eq('date', today)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as DailyCard) ?? null;
}

// ─── Delete a reading ─────────────────────────────────────────────────────────

export async function deleteReading(id: string, user_id: string): Promise<void> {
  const { error } = await supabase
    .from('readings')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id);

  if (error) throw new Error(error.message);
}
