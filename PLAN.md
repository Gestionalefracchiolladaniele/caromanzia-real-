# PLAN.md — Cartomanzia App Fase 4+

## REGOLE FISSE (NON MODIFICARE)
- Specializzazioni cartomante: **PRESET** (Amore · Carriera · Spirituale · Salute · Famiglia · Perdita · Crescita personale)
- Regione: **testo libero** (input + ricerca live, no dropdown fisso)
- State machine reading: **GIÀ IMPLEMENTATA** — non riscrivere
- Lingua: **Italiano only** (en.json rimane ma non usata)
- Ultimo accesso: **NON mostrare** mai a nessuno
- i18n files: **NON cancellare** (mantenere struttura)
- No dark/light mode toggle
- No "new cartomante near you" notification
- No ping bidirezionale (solo cartomante → user, non user → cartomante)
- Analytics cartomante: solo visite profilo + click social (no ping ricevuti, no rating, no spec richiesta)

---

## ✅ FASE 4A — Role Selection + Onboarding (COMPLETATA)

### ✅ Feature 1: Role Picker Modal — `features/onboarding/RolePicker.tsx`
### ✅ Feature 2: Onboarding Step 1 Avatar+Nome — `features/onboarding/steps/AvatarStep.tsx`
### ✅ Feature 3: Onboarding Step 2 Bio+Spec — `features/onboarding/steps/BioStep.tsx`
### ✅ Feature 4: Onboarding Step 3 Subscription — `features/onboarding/steps/SubscriptionStep.tsx` + `lib/revenuecat.ts`
### ✅ Feature 5: RoleProvider + Dynamic Tab Bar — `features/role-provider/RoleProvider.tsx` + `app/(tabs)/_layout.tsx`

---

## ✅ FASE 4B — Notifications System (COMPLETATA)

### ✅ Feature 1: DB Schema Notifiche
- Tabelle `notifications`, `profile_visits`, `social_clicks` — create con RLS in `supabase/schema.sql`

### ✅ Feature 2: Notification Store (Zustand)
- `features/notifications/notification-store.ts` — state + Zustand actions + atomic selectors

### ✅ Feature 3: NotificationCenter Component
- `features/notifications/NotificationCenter.tsx` — bottom sheet (@gorhom) + swipe delete

### ✅ Feature 4: NotificationBadge in Home Header
- `components/ui/NotificationBadge.tsx` — campanella + badge rosso count

### ✅ Feature 5: supabase-notifications.ts lib
- `lib/supabase-notifications.ts` — fetch + mark read + insert + realtime subscribe

---

## ✅ FASE 4C — Ping System (COMPLETATA)

### ✅ Feature 1: Ping Modal — Selezione Carta
- `features/ping/PingModal.tsx` — grid 78 carte (3 col) + preview + note TextInput max 120 char

### ✅ Feature 2: Ping Save + Notification
- Usa `insertNotification()` da supabase-notifications.ts con type='ping'
- Realtime → NotificationCenter aggiorna live

### ✅ Feature 3: Ping Rate Limiting
- `features/ping/ping-limits.ts` — cooldown progressivo (1w→2w→1m)
- Check all'apertura PingModal → disabled se blocked

### ✅ Feature 4: Card Thumbnail in Home Cartomante
- Home cartomante mostra thumbnail 22×34px carta inviata accanto al nome utente
- Legge da `useNotifications()` store (no query extra)

### ✅ Feature 5: Card Thumbnail in Home User
- Home user mostra thumbnail 22×34px carta ricevuta accanto al nome cartomante
- `useLastPingCard()` hook legge notifiche store

---

## ✅ FASE 4D — User Home + Daily Ritual (COMPLETATA)

### ✅ Feature 1: User Home Layout
- Header: titolo "CARTOMANTI" + `NotificationBadge` bottone
- SearchBar: ricerca per nome cartomante (live filter)
- Filter chips: Specializzazione (preset 7) + Regione (testo libero con search)
- FlatList cartomanti con card: avatar, nome, bio, specializzazioni chips, social buttons
- Real Supabase data via `useCartomanti()` hook con filtri `.contains()` + `.ilike()`
- `app/(tabs)/home.tsx`

### ✅ Feature 2: Daily Card con Gemini AI Message
- `lib/daily-ritual.ts` — `getTodayDailyCard(userId)` fetch/crea carta del giorno
- Pescaggio random da ALL_CARDS (30% rovesciata)
- Gemini genera messaggio 60-70 parole basato su carta + `last_emotional_state` da `user_preferences`
- Salva in `daily_cards(user_id, date, card, ai_message)`

### ✅ Feature 3: Daily Card In-App + Notification
- DailyCardBanner in cima FlatList (solo vista USER)
- Mostra card image (48×76px), name, ai_message
- Auto-crea notifica type='daily_card' al momento della creazione carta

### ✅ Feature 4: Cartomante Profile Modal
- `features/home/CartomanteProfileModal.tsx` — bottom sheet con avatar grande, nome, bio, specializzazioni, social
- Se ping ricevuto: banner "Ha inviato una carta" con thumbnail
- Social buttons: WA/IG/TG/TK con `Linking.openURL()` + `trackSocialClick()`
- Click su card cartomante → modal (non navigazione)

### ✅ Feature 5: Profile Visit Tracking
- `trackProfileVisit(cartomanteId, visitorId)` in daily-ritual.ts
- Throttle: max 1 visita/30min per user/cartomante (query su `profile_visits` con `.gte('created_at', thirtyMinsAgo)`)
- Auto-notifica al cartomante type='profile_visit'
- Privacy: nessun nome visitatore nella notifica

---

## FASE 4E — Cartomante Home + Analytics

### Feature 1: Cartomante Home Layout
- Mostra il proprio profilo in alto (avatar, nome, bio, specializzazioni, social)
- Sezione "Utenti" sotto: grid utenti registrati (da `users` table dove role='user')
- Card utente: avatar, nome, (NO ultimo accesso), thumbnail carta se ping inviato
- Bottone "Manda una carta" su ogni card utente
- Header: "HOME" + `NotificationBadge`

### Feature 2: Analytics Tab — Visite Profilo
- Contatore visite profilo totali (mese corrente)
- Breakdown: per giorno (line chart ultimi 30g, Reanimated o Victory Native Lite)
- "Visite uniche" vs "Visite totali"
- Filter: Questo mese | Ultimi 3 mesi | Tutto
- `app/(tabs)/(cartomante)/analytics.tsx`

### Feature 3: Analytics Tab — Social Click Stats
- Breakdown click per platform: WA / IG / TG / TK
- Bar chart orizzontale (semplice, no librerie pesanti)
- Percentuali + numeri assoluti
- Periodo filtrato come visite

### Feature 4: RevenueCat Integration
- `lib/revenuecat.ts`: init SDK, `getOfferings()`, `purchasePackage()`, `restorePurchases()`
- Sincronizza subscription con Supabase `users.subscription` dopo acquisto
- Gestione stato subscription in `auth-store.ts`: `useSubscription()`
- Paywall in `SubscriptionStep.tsx` (onboarding) e `app/(tabs)/(user)/profile.tsx` (upgrade)
- Gestione receipt validation lato Supabase (webhook RevenueCat → Edge Function)

### Feature 5: Cards Tab (User + Cartomante)
- Grid 78 carte (3 col, FlatList, immagine Rider-Waite + nome sotto)
- Filtri: Arcani Maggiori | Denari | Coppe | Spade | Bastoni
- Ordine: Per numero | Per nome
- Search: TextInput live filter per nome carta
- Click carta → modal dettagliato (riusa `CardReveal` logic): immagine grande, orientamento toggle Diritta/Rovesciata, keywords, significato upright + reversed, descrizione storica
- `app/(tabs)/(user)/cards.tsx` + `app/(tabs)/(cartomante)/cards.tsx`

---

## DB SCHEMA AGGIORNAMENTI (Supabase)

```sql
-- Aggiungere a users
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN role_completed BOOLEAN DEFAULT false;

-- Notifiche
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('ping','daily_card','profile_visit','social_click')),
  actor_id UUID,
  card_id INT,
  note TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visite profilo cartomante
CREATE TABLE profile_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartomante_id UUID REFERENCES users(id),
  visitor_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Click social
CREATE TABLE social_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartomante_id UUID REFERENCES users(id),
  platform TEXT CHECK (platform IN ('whatsapp','instagram','telegram','tiktok')),
  clicked_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily cards (aggiungere campo AI message)
ALTER TABLE daily_cards ADD COLUMN ai_message TEXT;
```

---

## FILE STRUCTURE AGGIORNATA

```
src/
├── app/
│   ├── index.tsx (auth + role picker)
│   ├── onboarding.tsx (4-step flow)
│   └── (tabs)/
│       ├── home.tsx ✅ — real Supabase data + DailyCardBanner + CartomanteProfileModal
│       ├── reading.tsx · history.tsx · profile.tsx · settings.tsx
│       └── (cartomante)/  analytics | readings | cards | profile
├── features/
│   ├── onboarding/  RolePicker · steps/ [Avatar, Bio, Subscription]
│   ├── notifications/  notification-store · NotificationCenter
│   ├── ping/  PingModal · ping-limits
│   ├── home/ ✅ — CartomanteProfileModal.tsx
│   └── role-provider/  RoleProvider · useRole
├── components/ui/
│   └── NotificationBadge.tsx
└── lib/
    ├── supabase-notifications.ts
    ├── daily-ritual.ts ✅ — getTodayDailyCard, trackProfileVisit, trackSocialClick
    └── revenuecat.ts
```

---

## ORDINE IMPLEMENTAZIONE
1. ✅ FASE 4A — Role + Onboarding
2. ✅ FASE 4B — Notifications System
3. ✅ FASE 4C — Ping System
4. ✅ FASE 4D — User Home + Daily Ritual
5. **PROSSIMA: FASE 4E** — Cartomante Home + Analytics + Cards Tab
