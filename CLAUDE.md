# CLAUDE.md — Cartomanzia AI App

App mobile tarocchi AI + vetrina cartomanti. Target: Italia.
**Stack:** Expo 54 / RN 0.81.5 / TypeScript strict / Expo Router 6 · Supabase + Google OAuth · Zustand + React Query + Zod · MMKV via `makeStorage()` (❌ no AsyncStorage) · Gemini Flash 2.5 streaming · Reanimated 4 + Gesture Handler · `@shopify/react-native-skia` (build nativo) · RevenueCat (stub, richiede `react-native-purchases`)

**Status:** FASE 8 completa — Shuffle 3-tap animato · Celtic Cross 4 fasi AI progressive · Avatar bar redesign · Chat zone fix. ⏳ PROSSIMO: RevenueCat nativo + share nativo + history insights chart.

---

## Tabs per Ruolo

**USER:** 🏠 Home | 🔮 Letture | 🃏 Carte | 📚 Storia | ⚙️ Impostazioni  
**CARTOMANTE:** 🏠 Home | 📊 Analytics | 🔮 Letture | 🃏 Carte | ⚙️ Impostazioni

- **Home (User):** Search + chips (Spec/Regione). Card cartomante: foto, nome, social (WA/IG/TG/TK).
- **Home (Cartomante):** Profilo proprio + lista utenti. Bottone "Manda una carta" per ogni utente.
- **Reading:** Questionnaire → 4 spread: Tre Carte · Celtic Cross · Sincronicità · Sogni. Save+Share.
- **Cards:** Grid 78 carte 5-col (70×110px fissi), filtri arcana, modal dettagliato ScrollView.
- **History:** Timeline verticale + filtri data/spread. Insights: deck preferito, trend mensile.
- **Analytics (Cartomante):** Line chart visite + bar chart social clicks + filtri periodo.
- **Impostazioni (ex Profilo):** 3 sezioni — **Preferenze** (Lingua IT, Notifiche, Profilo pubblico) · **Account** (Abbonamento → modal, Profilo → modal) · Esci.

---

## Onboarding Flow

```
Login Google → _layout.tsx controlla user.role_completed
  → false → /onboarding
    Step 0: RolePicker (USER | CARTOMANTE) — non skippabile
    Step 1: AvatarStep (blob upload, extension detection da URI, bucket 'avatars/')
    Step 2: BioStep (bio + specializzazioni PRESET + regione testo libero + social — cartomante only)
    Step 3: SubscriptionStep (4 tier RevenueCat)
    → updateUser({ role_completed: true }) → /(tabs)/profile
  → true → /(tabs)/profile
```

`_layout.tsx`: expo-splash-screen nasconde flash durante auth init. Redirect sempre a `/(tabs)/profile`.

---

## Database

**Tabelle:** `users` (id, email, name, avatar_url, bio, role, role_completed, subscription_status, **is_public**, **notifications_enabled**, **birth_date DATE**, **birth_time TIME**) · `user_preferences` · `cartomanti` (bio, specializzazioni, genere, eta, regione, social_links JSONB {whatsapp, instagram, telegram, tiktok}) · `readings` (cards JSONB, followups JSONB, summary, context JSONB) · `daily_cards` (card JSONB, ai_message) · `notifications` (type: ping|daily_card|profile_visit|social_click, actor_id) · `profile_visits` (visitor_id → cartomante_id) · `social_clicks` (cartomante_id, platform) · `dream_symbols` (symbol, meaning, category)

**RLS:** `users` (select: `is_public=true OR own`; own update), `user_preferences` (own), `cartomanti` (public read, own update), `readings` (own read/write), `daily_cards` (own read), `notifications` (`user_id = auth.uid()` + **`actor_id = auth.uid()` per read sent pings**), `profile_visits` (owner reads own), `social_clicks` (owner reads own), `dream_symbols` (public read). Storage `avatars` (5MB image only, owner upload/read). Schema completo in `supabase/schema.sql` + migrations.

**Migrations:** `001` jsonb fix · `002` settings+study · `003` sent pings RLS + social_links · `004` birth_date+birth_time

---

## Pricing

| Tier | Costo | Features |
|------|-------|----------|
| Free | €0 | 1 Veloce/sett + 1 Daily/g, max 10 |
| Premium | €4.99/mo | Illimitate, cronologia, share |
| Pro | €9.99/mo | + Celtic Cross 20x/mese, insights |
| VIP | €19.99/mo | Tutto illimitato, priority AI |

Costi AI: ~€0.002/lettura. Cartomanti badge: €4.99/mo (post-MVP).

---

## File Structure

```
src/
├── app/
│   ├── _layout.tsx — root layout, expo-splash-screen, auth gate, redirect /(tabs)/profile
│   ├── index.tsx — auth screen Google login
│   ├── onboarding.tsx — 4-step flow, progress bar (niente titolo), redirect /(tabs)/profile
│   └── (tabs)/
│       ├── _layout.tsx — RoleProvider + DynamicTabBar USER|CARTOMANTE
│       ├── home.tsx — role-aware (user directory | cartomante profilo+lista), trackProfileVisit su accesso
│       ├── impostazioni.tsx — ⚙️ IMPOSTAZIONI: Sezione Preferenze (lingua/notifiche/profilo pubblico) + Account (abbonamento/profilo modali stile NotificationCenter) + Esci
│       ├── analytics.tsx — line chart visite + bar chart social, filtri periodo (CARTOMANTE only)
│       ├── cards.tsx — grid 5-col 70×110px, ElaborateFrame layout, modal ScrollView, TabBar
│       ├── reading.tsx — state machine completa, TabBar hidden in shuffling/revealing/interpreting/followup
│       ├── history.tsx — timeline + filtri + ReadingDetail modal
│       └── settings.tsx — (legacy, non active in TabBar)
├── components/ui/ — ElaborateFrame · TitleBox · SearchBar · Chips · GoldButton · TabBar
│                    CollapsibleFilterBar · NotificationBadge · DivineMascot · ParticlesIcon
├── features/
│   ├── reading/ — reading-store.ts · tarot-cards.ts · dream-processor.ts · components/
│   ├── onboarding/ — RolePicker, steps/ (AvatarStep blob upload)
│   ├── role-provider/ — RoleProvider.tsx
│   ├── notifications/ — notification-store.ts · NotificationCenter.tsx · supabase-notifications.ts
│   ├── ping/ — ping-limits.ts · PingModal.tsx (grid 5-col dinamica useWindowDimensions)
│   └── home/ — CartomanteProfileModal.tsx (non usato in home, solo referenza)
├── lib/ — supabase.ts · auth-store.ts · gemini.ts · supabase-readings.ts
│          supabase-notifications.ts · profile-tracking.ts · daily-ritual.ts · storage.ts · i18n.ts · revenuecat.ts
├── data/ — tarot-cards.json (78 arcani) · dream-symbols → Supabase
├── assets/tarot-cards/ (78 img CC0, yunruse) · splash.png
├── types/index.ts — User (+ is_public, notifications_enabled); LifeArea enum ('love' | 'work' | 'money' | 'health' | 'spiritual' | 'study' | 'relations'); ReadingContext con deck_type/free_context/user_question
└── global.css — nero #140d2e · oro #D4AF37 · porpora #5a2d9a
```

---

## Reading Flow

**Fasi:** `deck_selection → questionnaire → shuffling → revealing → interpreting → followup → saving`

**State machine:** `reading-store.ts` Zustand — `setDeck()` → `setQuestionnaire()` → `drawCards()` → fasi automatiche

**Questionnaire per spread:**
- **Tre Carte:** urgency nascosta, label "Lettura: Passato → Presente → Futuro"
- **Sincronicità:** domanda obbligatoria (no "(opzionale)")
- **Sogni:** `freeContext` obbligatorio (label "Descrivi il tuo sogno"), urgency nascosta
- **Celtic Cross:** tutti i campi
- **Life Area chips:** ❤️ Amore · 💼 Lavoro · 💰 Finanze · 🏥 Salute · ✨ Spirituale · 🎓 Studio · 🤝 Relazioni

**Followup dinamico:** sincronia=1 · tre_carte=3 · celtic_cross=5 · default=3

**Sogni:** `selectDreamCards(dreamText, emotionalState, lifeArea)` → Gemini sceglie 5 id carte coerenti in background durante shuffling. `Promise.all()` aspetta Gemini + minimo 1.2s prima di `revealing`.

**Saving:** Fase `saving` genera summary AI real-time via `generateReadingSummary()` (Gemini prompt italiano 60 parole max). Summary salvato in `readings.summary`. Schema: `cards JSONB` (array TarotCard con `reversed` bool), `followups JSONB` (array {question, answer}), `context JSONB` (snapshot ReadingContext). ✅ Risolto: `jsonb` (no `jsonb[]`) — JS array → JSON → Postgres jsonb cast.

**Daily Card Deepening:** bottone "Approfondisci" in `DailyCardDetail` → pre-popola `freeContext` con carta del giorno → naviga a `/(tabs)/reading`.

**Profile Tracking:** Separato da `daily-ritual.ts` in `profile-tracking.ts`. `trackProfileVisit(cartomanteId)` → insert `profile_visits`. `trackSocialClick(cartomanteId, platform)` → insert `social_clicks`. Importati corretti in `home.tsx` + `CartomanteProfileModal.tsx`.

---

## Gemini Prompts

```typescript
// CARTOMANTE_PERSONA (tarocchi)
`Sei una cartomante con trent'anni di pratica negli arcani, della numerologia e della psicologia simbolica junghiana.
Regole: italiano formale diretto mai melodrammatico, connetti ogni carta alle altre e al contesto specifico,
evidenzia tensioni tra carte contrastanti, prima persona singolare, max 180 parole,
chiudi con azione concreta o domanda che tocchi il nucleo.`

// DREAM_ANALYST_PERSONA (sogni)
`Sei uno psicologo junghiano specializzato in analisi dei sogni.
Regole: italiano formale empatico mai banale, simboli come messaggi dell'inconscio non previsioni letterali,
connetti simboli al contesto emotivo/vita, nomina archetipi (Ombra, Anima, Sé) se compaiono,
max 180 parole, termina con domanda aperta riflessiva.`

// streamGeminiReading(ctx, onChunk, onDone, signal, prior) — streaming interpretazione con prior readings
// buildPrompt() include: user_question + free_context + letture precedenti (pattern detection)
// selectDreamCards(dreamText, emotionalState, lifeArea): Promise<string[]> — 5 id carte Gemini-selected
// generateReadingSummary({ cardNames, userQuestion, dreamText, aiInterpretation, followups }): Promise<string>
//   → Gemini prompt: "Riassumi in max 60 parole, terza persona, tema+carte+messaggio centrale"
// streamGeminiDreamInterpretation(ctx, onChunk, onDone, signal) — streaming psicologico sogni
// streamGeminiFollowup(previousAnswer, followupQuestion, onChunk, onDone, signal) — max 80 parole
```

---

## UI Design

**Colori:** BG `#140d2e` · Card `rgba(36,21,80,0.97)` · Accento `#5a2d9a` · Oro `#D4AF37` · Dim `#a890c8` · Chip `rgba(52,26,106,0.85)`

**ElaborateFrame:** `useWindowDimensions()` — ovale `rx=width*0.45, ry=height*0.44`

**Layout pagine:** `View screen` + `ElaborateFrame` + `View inner (zIndex:5)` + `TitleBox (paddingTop:40)` + `TabBar` — ❌ no `SafeAreaView` standalone

**Modal stile NotificationCenter:** `transparent Modal` + `animationType="fade"` + overlay BG scuro `rgba(10,6,25,0.92)` + container centrato (`maxWidth: 480`, `maxHeight: '85%'`), bordo oro `#D4AF37` `borderRadius: 16`. Usato da:
- **UpgradeModal** (Abbonamento) — scroll piani RevenueCat, bottone Abbonati/Ripristina
- **ProfileModal** (Profilo) — modifica nome/bio/specializzazioni/interesse/regione
- **NotificationCenter** — PingDetail, DailyCardDetail, ActorProfileModal

**DivineMascot** (`src/components/ui/DivineMascot.tsx`): 40 particelle oro/viola, 12 scintille. Props: `message: string`, `width?: number` (default 320).
- `onboarding.tsx`: step avatar→subscription. Messaggi: "Il tuo volto" / "La tua essenza" / "Il tuo piano". Width 280.
- `reading.tsx`: shuffling→closing via `READING_MASCOT_MESSAGES[phase]` da reading-store.ts. Width 300.
- Dev: Reanimated fallback. Prod: `@shopify/react-native-skia`.

---

## Key Patterns

- Zustand: `useAuthStore((s) => s.field)` — ❌ no object selectors
- Animazioni: `useSharedValue` + worklets — ❌ no setState dentro worklet
- `useSubscription()` in `auth-store.ts` — atomic selector SubscriptionStatus (default `'free'`)
- `TabId` include `'analytics'` — aggiunto a TabBar.tsx tipo + array TABS
- Analytics charts: SVG nativo (react-native-svg) — no Victory/Recharts
- FlatList con `numColumns`: aggiungere sempre `key="grid-N"` per evitare crash "Changing numColumns on the fly"
- Cards grid: dimensioni fisse pixel — ❌ no `width: '100%'` + `aspectRatio` con numColumns
- PingModal: `containerW = Math.min(width - 40, 480)`, `cellSize = Math.floor((containerW - 12 - 5*6) / 5)`
- home.tsx: solo `UserProfileModal` overlay (rimosso CartomanteProfileModal bottom sheet)
- Specializzazioni cartomante: PRESET (Amore · Carriera · Spirituale · Salute · Famiglia · Perdita · Crescita personale)
- Regione: testo libero (no dropdown)
- `ALL_CARDS` (non `getAllCards`) — array esportato da `tarot-cards.ts`
- `updateUser(partial)` in `auth-store.ts` per aggiornare profilo
- **Modal pre-populating:** ProfileModal sincronizza `useEffect` con `visible` prop per caricare dati da `useAuthStore` ogni volta che il modal si apre (no data stale)
- **RLS policies:** users table ha policy `users_select_public` per filtrare profili privati + `users_insert_own` per signup trigger + `users_update_own` per self-updates
- **Home query filtering:** cartomanti query usa `!inner` join su users per rispettare RLS (is_public filter gestito a livello di policy)
- **Auth screen title:** Usa struttura inline identica a `TitleBox` (no import del componente — auth screen è standalone SVG). Bordo oro, angolini, sfondo `#3d1a6e`, Georgia letterSpacing 5
- **Birth date format:** UI usa GG/MM/AAAA (auto-formattato). DB usa AAAA-MM-GG. Conversione: `split('/').reverse().join('-')` → DB; `split('-')` poi `[y,m,d]` e `d/m/y` → UI
- **CelticCrossLayout:** posizione 1 (Ostacolo) sovrapposta a posizione 0 (Situazione) con `zIndex: 10` + `rotated: true` (carta ruotata 90°). Colonna destra 4 carte dal basso verso l'alto (indici 6-9)
- **Shuffle interattivo 3-tap:** Tap 1=Mescola (swirl deck + sway cards), Tap 2=Senti energia (spread ventaglio), Tap 3=Rivela (raccolta + procede a revealing dopo 500ms). ❌ No auto-timeout. `bridgeScaleAnim` + `cardSwayAnims[]` + `deckRotateAnim` + `deckSpreadAnim` in reading.tsx. 3 dot indicatori. `revealStartedRef` evita doppio trigger.

---

## Common Issues & Fixes

- **Infinite re-renders** → object selector Zustand — usare atomic selector `(s) => s.field`
- **Animazioni lag** → setState dentro worklet — usare `runOnJS` per side effects
- **MMKV web** → usare `makeStorage()` (no AsyncStorage in Expo 54)
- **Image path** → usare `@/assets/` (non path relativo, Metro resolution)
- **Gemini cache miss** → system prompt identico byte-per-byte ogni call
- **WebView in Expo Go** → usare fallback Reanimated/SVG in dev, WebView/Skia solo in build nativo
- **`useDerivedValue`/`useAnimatedStyle` in `.map()`** → viola regole hooks → estrarre in sotto-componente
- **Infinite save state** — ⚠️ FIXED: Postgres `jsonb[]` type mismatch. JS array serializes come `[...]` (JSON), not `{...}` (Postgres array syntax). Change schema da `jsonb[]` → `jsonb` con default `'[]'::jsonb`
- **Profile visit/social click not tracking** — ⚠️ FIXED: Import path `@/lib/daily-ritual` → `@/lib/profile-tracking` in `home.tsx` + `CartomanteProfileModal.tsx`
- **History rendering non-existent columns** — ⚠️ FIXED: Schema columns rimossi (card_names CSV, card_reversals CSV, context_snapshot, followup_count). Derivare da `cards JSONB`, `followups JSONB`, `context JSONB`
- **Home infinite loading** — ⚠️ FIXED: Query errors non gestiti (no `setLoading(false)` on error). Aggiunto `const { data, error } = await q; if (error || !data) { setLoading(false); return; }`
- **Modal dati vuoti** — ⚠️ FIXED: useEffect senza dipendenza `visible` prop. ProfileModal non riallineava `name/bio/regione` da `useAuthStore` quando il modal si riaprira. Aggiunto `useEffect` con deps `[visible, user?.id]`
- **Sent pings non visibili al cartomante** — ⚠️ FIXED: RLS policy permetteva solo `user_id = auth.uid()` nelle notifications. Aggiunta policy `"notifications: read sent by actor"` per permettere al cartomante di leggere ping dove `actor_id = auth.uid()`. fetchSentPings() ora ritorna sempre i dati.
- **Social links non pre-popolati** — ⚠️ FIXED: useEffect con check `if (data?.social_links)` poteva non entrare se `social_links = {}` (oggetto vuoto truthy ma con 0 chiavi). Rimosso check condizionale, setSocialLinks sempre chiamato. Bio da `cartomanti` ora sincronizzata e ha priorità su `users.bio`.

---

## Environment

```
EXPO_PUBLIC_SUPABASE_URL=https://mpdqjeasesupjregjjjf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<token>
EXPO_PUBLIC_GEMINI_API_KEY=<set tu>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / IOS / ANDROID=<set tu>
EXPO_PUBLIC_REVENUECAT_IOS_KEY=<set tu>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<set tu>
```

---

## Implementation Status — FASE 6

### ✅ COMPLETATO (FASE 6)
- **Settings UI rivisitata:** Tab `profile.tsx` rinominato `IMPOST.` in TabBar. Nuova struttura:
  - Sezione **Preferenze:** Lingua (IT read-only), Notifiche (switch), Profilo pubblico (switch)
  - Sezione **Account:** Abbonamento (UpgradeModal), Profilo (ProfileModal), Esci
  - Tutti i modal usano stile NotificationCenter (transparent, overlay scuro, bordered container)
- **Modal unificati:** UpgradeModal + ProfileModal rifattorizzati con stile NotificationCenter (`maxHeight: '85%'`, `borderRadius: 16`, bordo oro)
- **ProfileModal pre-populating:** `useEffect` sincronizza `visible` prop + carica dati da `useAuthStore` ogni apertura (no data stale)
- **Life Areas estese:** Aggiunto `'relations'` (🤝) a LifeArea enum + chip nel questionnaire + label Gemini
- **Database migrations (002):** 
  - Colonne `is_public` + `notifications_enabled` su `users` table
  - RLS policies: `users_select_public` (filter profili privati), `users_insert_own`, `users_update_own`
  - CHECK constraint su `readings.context->>'life_area'` include `'study'` + `'relations'`
  - Index `idx_users_is_public` per directory filtering
- **Home query fix:** Gestione errori esplicita su cartomanti + users queries (no infinite loading)
- **TabBar aggiornato:** Label `'PROFILO'` → `'IMPOST.'` per USER e CARTOMANTE
- **Social links cartomante:** 
  - ProfileModal aggiunto sezione **Social** (solo cartomante) — 4 input per WhatsApp, Instagram, Telegram, TikTok
  - Pre-populating: query `cartomanti.select('bio, specializzazioni, social_links')` → sincronizza bio da `cartomanti` (prioritaria su `users.bio`) + popola sempre `social_links` (non skippa se `{}`)
  - Salvataggio: upsert su `cartomanti` incluso `social_links` JSONB + bio aggiornata. Link vuoti omessi dal DB (clean object).
- **RLS sent pings (Migration 003):**
  - Policy `"notifications: read sent by actor"` — il cartomante legge notifiche dove `actor_id = auth.uid()` (necessario per `fetchSentPings()` + mostra carta inviata su home user card)
  - Colonna `bio` su `cartomanti` esplicitamente confermata (if not exists)
  - Index GIN su `social_links` per ricerche future

### ✅ COMPLETATO (FASE 5)
- Schema SQL completo: `supabase/schema.sql` (DROP + STEP 1-7)
- AI Summary generation: `generateReadingSummary()` in `gemini.ts`
- Reading.tsx: fase `saving` genera summary async
- Profile tracking: separato in `profile-tracking.ts`

### ✅ COMPLETATO (FASE 7)
- **Auth screen DIVINAI:** Titolo con stile identico a `TitleBox` — bordo oro `#D4AF37`, angolini decorativi, sfondo `#3d1a6e`, font Georgia letterSpacing 5, diamond divider + sottotitolo "IL TUO ORACOLO PERSONALE"
- **Rinomina `profile.tsx` → `impostazioni.tsx`:** File rinominato, `TabBar.tsx` aggiornato con `id: 'impostazioni'`, `_layout.tsx` + `onboarding.tsx` aggiornati con `/(tabs)/impostazioni`, `active="impostazioni"` in impostazioni.tsx
- **Avatar bar reading:** Avatar 48px (da 34px), nome fontSize 16, centrato (`justifyContent: center`). Mostra `user.name` da authStore (fallback 'Lettore'). Layout chat zone `flex: 4` + `minHeight: 160` per garantire visibilità.
- **Data di nascita (Migration 004):** `supabase/migrations/004_add_birth_date.sql` — colonne `birth_date DATE` + `birth_time TIME` su `users`. User type aggiornato. Campo GG/MM/AAAA auto-formattato in `BioStep.tsx` + `ProfileModal` (impostazioni.tsx), conversione GG/MM/AAAA ↔ AAAA-MM-GG per DB
- **CelticCrossLayout 4 fasi:** Tutte 10 carte visibili come dorsi. Tap rivela gruppo → AI streaming per quella fase. Fase 1: 0+1 (centro), Fase 2: 2+3 (radici), Fase 3: 4+5 (asse tempo), Fase 4: 6-9 (colonna destra). Domanda opzionale dopo ogni fase. Fine: `onProceedToFollowup` → merge testi → followup con 5 chip. `celticPhase`+`celticPhaseTexts[]` nello store. `streamGeminiCelticPhase()` in gemini.ts.
- **Shuffle interattivo 3-tap:** Tap 1=Mescola (swirl+sway), Tap 2=Energia (spread ventaglio), Tap 3=Rivela (raccolta, procede dopo 500ms). ❌ No auto-timeout. 3 dot indicatori. Animazioni: `bridgeScaleAnim`+`cardSwayAnims[]`+`deckRotateAnim`+`deckSpreadAnim`. Valido per tutte le letture.

### ⏳ PROSSIMI (FASE 8)
```bash
pnpm add react-native-share          # share nativo
# react-native-purchases (RevenueCat) — richiede prebuild nativo
```

- RevenueCat nativo — `react-native-purchases` + API keys + webhook Edge Function
- Share nativo — `react-native-share` per WhatsApp/Telegram
- History insights — line chart deck frequenza + bar chart spread mensile, filtri periodo
- ReadingDetail deepening — "Nuova lettura basata su questa" con context pre-populated
