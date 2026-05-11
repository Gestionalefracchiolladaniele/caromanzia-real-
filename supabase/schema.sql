-- ============================================================
-- CARTOMANZIA AI — Schema Supabase completo
-- Esegui tutto in una volta nel SQL Editor di Supabase
-- ============================================================
-- ATTENZIONE: fa DROP di tutto e ricrea da zero.
-- Prima di eseguire: elimina il bucket 'avatars' da
-- Supabase Dashboard → Storage → avatars → Delete bucket
-- ============================================================


-- ============================================================
-- STEP 0: DROP TUTTO
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.get_reading_insights(uuid) cascade;

drop view if exists public.reading_insights cascade;
drop view if exists public.monthly_reading_trend cascade;
drop view if exists public.history_timeline cascade;

drop table if exists public.daily_cards cascade;
drop table if exists public.readings cascade;
drop table if exists public.cartomanti cascade;
drop table if exists public.user_preferences cascade;
drop table if exists public.notifications cascade;
drop table if exists public.profile_visits cascade;
drop table if exists public.social_clicks cascade;
drop table if exists public.users cascade;

-- tabelle vecchio schema (se presenti)
drop table if exists public.connections cascade;
drop table if exists public.event_participants cascade;
drop table if exists public.events cascade;
drop table if exists public.people cascade;
drop table if exists public.dream_symbols cascade;

drop type if exists public.user_role cascade;
drop type if exists public.subscription_status cascade;
drop type if exists public.emotional_state cascade;
drop type if exists public.life_area cascade;
drop type if exists public.urgency cascade;
drop type if exists public.deck_type cascade;
drop type if exists public.notification_type cascade;
drop type if exists public.event_participant_status cascade;
drop type if exists public.connection_status cascade;
drop type if exists public.event_type cascade;
drop type if exists public.practice_type cascade;
drop type if exists public.practice_level cascade;


-- ============================================================
-- STEP 1: ENUM
-- ============================================================

create type public.user_role         as enum ('user', 'cartomante', 'admin');
create type public.subscription_status as enum ('free', 'premium', 'pro', 'vip');
create type public.emotional_state   as enum ('sad', 'neutral', 'good', 'great');
create type public.life_area         as enum ('love', 'work', 'money', 'health', 'spiritual');
create type public.urgency           as enum ('past', 'present', 'future', 'advice');
create type public.deck_type         as enum ('tre_carte', 'celtic_cross', 'sincronia', 'sogni');


-- ============================================================
-- STEP 2: TABELLE
-- ============================================================

-- USERS: specchia auth.users, arricchita con dati profilo
create table public.users (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text        not null,
  name                text        not null default '',
  avatar_url          text,
  bio                 text,
  role                public.user_role not null default 'user',
  role_completed      boolean     not null default false,
  subscription_status public.subscription_status not null default 'free',
  premium_expires_at  timestamptz,
  created_at          timestamptz not null default now(),
  interesse_specifico text,
  regione             text
);

-- USER_PREFERENCES: stato emotivo + area + urgency dell'ultimo questionnaire
create table public.user_preferences (
  user_id         uuid        primary key references public.users(id) on delete cascade,
  emotional_state public.emotional_state,
  life_area       public.life_area,
  urgency         public.urgency,
  reading_mode    text,
  updated_at      timestamptz not null default now()
);

-- CARTOMANTI: profilo esteso per utenti con role='cartomante'
create table public.cartomanti (
  id               uuid        primary key references public.users(id) on delete cascade,
  bio              text,
  specializzazioni text[]      not null default '{}',
  genere           text,
  eta              int         check (eta > 0 and eta < 120),
  regione          text,
  social_links     jsonb       not null default '{}',
  verified_at      timestamptz,
  created_at       timestamptz not null default now()
);

-- READINGS: letture tarocchi complete
--   cards     → jsonb (array di TarotCard objects)
--   followups → jsonb (array di {question, answer})
--   context   → jsonb (ReadingContext: emotional_state, life_area, urgency, deck_type, free_context, user_question)
--   summary   → testo breve generato da Gemini (max ~60 parole) per la timeline history
create table public.readings (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users(id) on delete cascade,
  deck_type         public.deck_type not null,
  cards             jsonb       not null default '[]'::jsonb,
  question          text        not null default '',
  ai_interpretation text        not null default '',
  summary           text        not null default '',
  followups         jsonb       not null default '[]'::jsonb,
  context           jsonb       not null default '{}'::jsonb,
  dream_text        text,
  extracted_symbols jsonb,
  preview_image_url text,
  is_daily          boolean     not null default false,
  created_at        timestamptz not null default now()
);

-- DAILY_CARDS: carta del giorno (1 per user per data)
create table public.daily_cards (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  date       date        not null,
  card       jsonb       not null,
  ai_message text        not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- NOTIFICATIONS: ping · daily_card · profile_visit · social_click
--   actor_id → chi ha generato la notifica (visitatore, chi pinga, ecc.)
--   card_id  → numero carta tarocchi (per daily_card)
--   note     → testo breve opzionale
create table public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  type       text        not null check (type in ('ping', 'daily_card', 'profile_visit', 'social_click')),
  actor_id   uuid        references public.users(id) on delete set null,
  card_id    int,
  note       text,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

-- PROFILE_VISITS: log visite profilo cartomante
--   throttle applicato lato app (max 1 visita ogni 30 min per coppia visitor/cartomante)
create table public.profile_visits (
  id            uuid        primary key default gen_random_uuid(),
  cartomante_id uuid        not null references public.users(id) on delete cascade,
  visitor_id    uuid        not null references public.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- SOCIAL_CLICKS: log click sui link social del cartomante
create table public.social_clicks (
  id            uuid        primary key default gen_random_uuid(),
  cartomante_id uuid        not null references public.users(id) on delete cascade,
  platform      text        not null check (platform in ('whatsapp', 'instagram', 'telegram', 'tiktok')),
  clicked_by    uuid        references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- DREAM_SYMBOLS: dizionario simboli onirici (letto da Supabase, non hardcoded)
create table public.dream_symbols (
  id       uuid  primary key default gen_random_uuid(),
  symbol   text  not null unique,
  meaning  text  not null,
  category text
);


-- ============================================================
-- STEP 3: TRIGGER — auto-crea riga users al signup Google
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- STEP 4: ROW LEVEL SECURITY
-- ============================================================

alter table public.users             enable row level security;
alter table public.user_preferences  enable row level security;
alter table public.cartomanti        enable row level security;
alter table public.readings          enable row level security;
alter table public.daily_cards       enable row level security;
alter table public.notifications     enable row level security;
alter table public.profile_visits    enable row level security;
alter table public.social_clicks     enable row level security;
alter table public.dream_symbols     enable row level security;

-- ── USERS ────────────────────────────────────────────────────
-- tutti gli utenti autenticati possono leggere i profili (necessario per mostrare avatar/nome)
create policy "users: read all authenticated"
  on public.users for select to authenticated
  using (true);

-- insert solo se l'id corrisponde (trigger handle_new_user usa security definer)
create policy "users: insert own"
  on public.users for insert to authenticated
  with check (auth.uid() = id);

-- aggiornamento solo del proprio profilo
create policy "users: update own"
  on public.users for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── USER_PREFERENCES ─────────────────────────────────────────
create policy "user_preferences: read own"
  on public.user_preferences for select to authenticated
  using (auth.uid() = user_id);

create policy "user_preferences: insert own"
  on public.user_preferences for insert to authenticated
  with check (auth.uid() = user_id);

create policy "user_preferences: update own"
  on public.user_preferences for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── CARTOMANTI ───────────────────────────────────────────────
-- profili cartomanti pubblici (visibili a tutti gli utenti autenticati)
create policy "cartomanti: read all authenticated"
  on public.cartomanti for select to authenticated
  using (true);

create policy "cartomanti: insert own"
  on public.cartomanti for insert to authenticated
  with check (auth.uid() = id);

create policy "cartomanti: update own"
  on public.cartomanti for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── READINGS ─────────────────────────────────────────────────
create policy "readings: read own"
  on public.readings for select to authenticated
  using (auth.uid() = user_id);

create policy "readings: insert own"
  on public.readings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "readings: update own"
  on public.readings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "readings: delete own"
  on public.readings for delete to authenticated
  using (auth.uid() = user_id);

-- ── DAILY_CARDS ──────────────────────────────────────────────
create policy "daily_cards: read own"
  on public.daily_cards for select to authenticated
  using (auth.uid() = user_id);

create policy "daily_cards: insert own"
  on public.daily_cards for insert to authenticated
  with check (auth.uid() = user_id);

create policy "daily_cards: update own"
  on public.daily_cards for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── NOTIFICATIONS ────────────────────────────────────────────
-- legge solo le proprie notifiche (user_id)
-- il cartomante NON legge come mittente (actor_id) — le notifiche inviate sono per il destinatario
create policy "notifications: read own"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

-- qualsiasi utente autenticato può inserire notifiche (ping, profile_visit, social_click, daily_card)
create policy "notifications: insert authenticated"
  on public.notifications for insert to authenticated
  with check (true);

-- solo il destinatario può aggiornarle (es. segnare come lette)
create policy "notifications: update own"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id);

-- solo il destinatario può eliminarle
create policy "notifications: delete own"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

-- ── PROFILE_VISITS ───────────────────────────────────────────
-- il cartomante legge le proprie visite (per analytics)
create policy "profile_visits: cartomante read own"
  on public.profile_visits for select to authenticated
  using (auth.uid() = cartomante_id);

-- un visitatore può inserire solo visite dove è lui il visitor
create policy "profile_visits: insert own"
  on public.profile_visits for insert to authenticated
  with check (auth.uid() = visitor_id);

-- ── SOCIAL_CLICKS ────────────────────────────────────────────
-- il cartomante legge i propri click (per analytics)
create policy "social_clicks: cartomante read own"
  on public.social_clicks for select to authenticated
  using (auth.uid() = cartomante_id);

-- qualsiasi utente autenticato può inserire un click
create policy "social_clicks: insert authenticated"
  on public.social_clicks for insert to authenticated
  with check (true);

-- ── DREAM_SYMBOLS ────────────────────────────────────────────
-- tutti possono leggere il dizionario
create policy "dream_symbols: read all authenticated"
  on public.dream_symbols for select to authenticated
  using (true);


-- ============================================================
-- STEP 5: STORAGE — bucket avatars
-- ============================================================
-- NOTA: se il bucket esiste già, questo step fallisce.
-- Eliminalo prima da Dashboard → Storage → avatars → Delete bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- lettura pubblica (avatar visibili a tutti)
create policy "avatars: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- upload solo nella propria cartella (userId/filename.ext)
create policy "avatars: upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- sovrascrittura solo propria cartella
create policy "avatars: update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- cancellazione solo propria cartella
create policy "avatars: delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- STEP 6: VIEWS (security_invoker = true → rispetta RLS)
-- ============================================================

-- Insights aggregati per utente (usati da history.tsx)
create or replace view public.reading_insights
with (security_invoker = true)
as
select
  r.user_id,
  count(*)::int                                                 as total_readings,
  mode() within group (order by r.deck_type)                   as favorite_deck,
  count(*) filter (where r.deck_type = 'tre_carte')::int       as count_tre_carte,
  count(*) filter (where r.deck_type = 'celtic_cross')::int    as count_celtic_cross,
  count(*) filter (where r.deck_type = 'sincronia')::int       as count_sincronia,
  count(*) filter (where r.deck_type = 'sogni')::int           as count_sogni,
  mode() within group (order by r.context->>'life_area')       as top_life_area,
  mode() within group (order by r.context->>'emotional_state') as top_emotional_state,
  mode() within group (order by to_char(r.created_at, 'YYYY-MM')) as most_active_month,
  min(r.created_at)                                            as first_reading_at,
  max(r.created_at)                                            as last_reading_at
from public.readings r
group by r.user_id;

-- Trend mensile letture (ultimi 12 mesi)
create or replace view public.monthly_reading_trend
with (security_invoker = true)
as
select
  r.user_id,
  to_char(r.created_at, 'YYYY-MM')                             as month,
  count(*)::int                                                 as total,
  count(*) filter (where r.deck_type = 'tre_carte')::int       as tre_carte,
  count(*) filter (where r.deck_type = 'celtic_cross')::int    as celtic_cross,
  count(*) filter (where r.deck_type = 'sincronia')::int       as sincronia,
  count(*) filter (where r.deck_type = 'sogni')::int           as sogni
from public.readings r
where r.created_at >= now() - interval '12 months'
group by r.user_id, to_char(r.created_at, 'YYYY-MM');


-- ============================================================
-- STEP 7: INDICI
-- ============================================================

-- readings: query per user + data (history timeline)
create index idx_readings_user_created
  on public.readings (user_id, created_at desc);

-- readings: filtro per deck_type in history
create index idx_readings_deck_type
  on public.readings (user_id, deck_type);

-- daily_cards: fetch carta del giorno
create index idx_daily_cards_user_date
  on public.daily_cards (user_id, date desc);

-- cartomanti: filtro per regione (search in home)
create index idx_cartomanti_regione
  on public.cartomanti (regione);

-- cartomanti: filtro per specializzazioni (search in home)
create index idx_cartomanti_specializzazioni
  on public.cartomanti using gin (specializzazioni);

-- notifications: fetch notifiche per user
create index idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

-- notifications: count unread badge
create index idx_notifications_unread
  on public.notifications (user_id, read) where read = false;

-- notifications: fetch ping inviati da un cartomante (ping-limits.ts)
create index idx_notifications_actor_type
  on public.notifications (actor_id, type, user_id);

-- profile_visits: analytics cartomante
create index idx_profile_visits_cartomante
  on public.profile_visits (cartomante_id, created_at desc);

-- profile_visits: throttle check (30 min per coppia visitor/cartomante)
create index idx_profile_visits_throttle
  on public.profile_visits (cartomante_id, visitor_id, created_at desc);

-- social_clicks: analytics cartomante
create index idx_social_clicks_cartomante
  on public.social_clicks (cartomante_id, created_at desc);

-- social_clicks: filtro per platform
create index idx_social_clicks_platform
  on public.social_clicks (cartomante_id, platform);

-- dream_symbols: lookup per symbol
create index idx_dream_symbols_symbol
  on public.dream_symbols (symbol);
