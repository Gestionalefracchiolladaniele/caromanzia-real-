import { GoogleGenerativeAI } from '@google/generative-ai';

import { ALL_CARDS } from '@/features/reading/tarot-cards';
import type { DailyCard, TarotCard } from '@/types';
import { insertNotification } from './supabase-notifications';
import { supabase } from './supabase';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const DAILY_PERSONA = `Sei un interprete di tarocchi empatico e poetico. Italiano formale. Max 70 parole.
Scrivi un messaggio personale diretto all'utente sulla carta estratta. Connetti la carta al contesto emotivo.
Non spiegare il significato generale: parla di come questa carta illumina il momento presente dell'utente.`;

function buildDailyPrompt(cardName: string, lastEmotionalState?: string): string {
  const stato = lastEmotionalState
    ? `Lo stato emotivo recente dell'utente: ${lastEmotionalState}.`
    : 'Non sono disponibili informazioni sullo stato emotivo recente.';

  return `${DAILY_PERSONA}

Carta del giorno: ${cardName}.
${stato}

Scrivi un messaggio di 60-70 parole sulla carta di oggi.`;
}

async function generateDailyMessage(cardName: string, lastEmotionalState?: string): Promise<string> {
  if (!GEMINI_API_KEY) return `La tua carta di oggi è ${cardName}. Porta con te la sua energia durante la giornata.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(buildDailyPrompt(cardName, lastEmotionalState));
  return result.response.text().trim();
}

function pickRandomCard(): TarotCard {
  const idx = Math.floor(Math.random() * ALL_CARDS.length);
  const card = ALL_CARDS[idx];
  return { ...card, reversed: Math.random() < 0.3 };
}

async function getLastEmotionalState(userId: string): Promise<string | undefined> {
  const { data } = await supabase
    .from('user_preferences')
    .select('emotional_state')
    .eq('user_id', userId)
    .single();
  return data?.emotional_state ?? undefined;
}

async function fetchTodayDailyCard(userId: string): Promise<DailyCard | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    card: data.card as TarotCard,
  } as DailyCard;
}

async function createTodayDailyCard(userId: string): Promise<DailyCard> {
  const today = new Date().toISOString().split('T')[0];
  const card = pickRandomCard();
  const lastEmotionalState = await getLastEmotionalState(userId);
  const aiMessage = await generateDailyMessage(card.name_it, lastEmotionalState);

  const { data, error } = await supabase
    .from('daily_cards')
    .insert({
      user_id: userId,
      date: today,
      card,
      ai_message: aiMessage,
    })
    .select()
    .single();

  if (error) throw error;

  // Notifica in-app con il messaggio Gemini (prime 80 chars)
  const shortMsg = aiMessage.length > 80 ? aiMessage.slice(0, 77) + '…' : aiMessage;
  await insertNotification({
    user_id: userId,
    type: 'daily_card',
    card_id: card.number,
    note: shortMsg,
  }).catch(() => {});

  return {
    ...data,
    card,
  } as DailyCard;
}

export async function getTodayDailyCard(userId: string): Promise<DailyCard> {
  const existing = await fetchTodayDailyCard(userId);
  if (existing) return existing;
  return createTodayDailyCard(userId);
}
