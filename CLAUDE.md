# CLAUDE.md — Cartomanzia AI App

App mobile tarocchi AI + vetrina cartomanti. Target: Italia.
**Stack:** Expo 54 / RN 0.81.5 / TypeScript strict / Expo Router 6 · Supabase + Google OAuth · Zustand + React Query + Zod · MMKV via `makeStorage()` (❌ no AsyncStorage) · Gemini Flash 2.5 streaming · Reanimated 4 + Gesture Handler · `@shopify/react-native-skia` (build nativo) · RevenueCat (stub, richiede `react-native-purchases`)

**Status:** FASE 11-16 complete. ⏳ PROSSIMO: RevenueCat nativo + share nativo + history insights.

---

## Tabs & Ruoli

**USER:** 🏠 Home | 🔮 Letture | 🃏 Carte | 📚 Storia | ⚙️ Impostazioni  
**CARTOMANTE:** 🏠 Home | 📊 Analytics | 🃏 Carte | ⚙️ Impostazioni

- **Home User:** Search + chips (Spec/Regione). Card cartomante: foto, nome, social (WA/IG/TG/TK).
- **Home Cartomante:** Profilo proprio + lista utenti. Bottone "Manda una carta".
- **Reading:** Questionnaire → 5 spread: Tre Carte · Celtic Cross · Sincronicità · Sogni · Situazioni. Covered cards (tap per rivelare) + AI streaming in background. Save+Share.
- **Cards:** Grid 78 carte 5-col (70×110px fissi), filtri arcana, modal ScrollView.
- **History:** Timeline verticale + filtri data/spread. Insights: deck preferito, trend mensile.
- **Analytics:** Line chart visite + bar chart social clicks + lista "Chi ti ha visitato" (avatar 40px con fallback initials in cerchio #5a2d9a/#D4AF37, nome, data formattata "Ieri 14:30"/"3 giorni fa", badge conteggio "3x") + filtri periodo. Hook `useVisitorList(cartomanteId, period, customStart, customEnd)` → query `profile_visits` join `users`, group by visitor_id, sort last_visit DESC, limit 20.
- **Impostazioni:** Preferenze (Lingua IT, Notifiche, Profilo pubblico) · Account (Abbonamento modal, Profilo modal) · Esci.

---

## Onboarding

```
Login Google → _layout.tsx controlla user.role_completed
  → false → /onboarding:
    Step 0: RolePicker (USER | CARTOMANTE) — non skippabile
    Step 1: AvatarStep (blob upload, extension detection da URI, bucket 'avatars/')
    Step 2: BioStep (bio + spec PRESET + regione testo libero + social — cartomante only)
    Step 3: SubscriptionStep (4 tier RevenueCat)
    → updateUser({ role_completed: true }) → WelcomeScreen (DivineMascot fade-in 800ms, pausa 2.5s, dissipazione 1200ms) → /(tabs)/impostazioni
  → true → /(tabs)/impostazioni
```
`handleFinish()` imposta step='welcome' per triggerare WelcomeScreen.

`_layout.tsx`: expo-splash-screen nasconde flash auth init. Redirect sempre a `/(tabs)/profile`.

---

## Database

**Tabelle:** `users` (id, email, name, avatar_url, bio, role, role_completed, subscription_status, is_public, notifications_enabled, birth_date DATE, birth_time TIME) · `user_preferences` · `cartomanti` (bio, specializzazioni, genere, eta, regione, social_links JSONB) · `readings` (cards JSONB, followups JSONB, summary, context JSONB) · `daily_cards` · `notifications` (type: ping|daily_card|profile_visit|social_click, actor_id) · `profile_visits` · `social_clicks` · `dream_symbols`

**RLS:** users (is_public=true OR own; own update) · cartomanti (public read, own update) · readings (own) · notifications (user_id=uid + actor_id=uid per sent pings) · profile_visits/social_clicks (owner reads own) · avatars storage (5MB, owner)

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
│   ├── _layout.tsx — root layout, auth gate
│   ├── index.tsx — auth screen Google login
│   ├── onboarding.tsx — 4-step + welcome
│   └── (tabs)/ — _layout (RoleProvider+TabBar) · home · impostazioni · analytics · cards · reading · history · settings(legacy)
├── components/ui/ — ElaborateFrame · TitleBox · SearchBar · Chips · GoldButton · TabBar · DivineMascot · ParticlesIcon
├── features/ — reading/ · onboarding/ · role-provider/ · notifications/ · ping/ · home/
├── lib/ — supabase · auth-store · gemini · supabase-readings · profile-tracking · daily-ritual · storage · i18n · revenuecat · audio-manager · google-tts
├── data/ — tarot-cards.json (EN) · tarot-cards-it.json (IT)
├── assets/ — tarot-cards/ (78 img CC0) · audio/background.mp3 (96kbps)
├── types/index.ts — User · LifeArea ('love'|'work'|'money'|'health'|'spiritual'|'study'|'relations') · ReadingContext
└── global.css — #140d2e · #D4AF37 · #5a2d9a
```

---

## Reading Flow

**Fasi:** `deck_selection → questionnaire → shuffling → revealing → interpreting → followup → saving`

**Questionnaire:**
- Tre Carte: urgency nascosta, label "Passato → Presente → Futuro"
- Sincronicità: domanda obbligatoria
- Sogni: freeContext obbligatorio ("Descrivi il tuo sogno"), urgency nascosta
- Situazioni: freeContext obbligatorio ("Descrivi la situazione"), urgency nascosta
- Celtic Cross: tutti i campi
- Life Area chips: ❤️ Amore · 💼 Lavoro · 💰 Finanze · 🏥 Salute · ✨ Spirituale · 🎓 Studio · 🤝 Relazioni

**Followup dinamico:** sincronia=1 · tre_carte=3 · celtic_cross=5 · situazioni=3 · default=3

**Sogni:** `selectDreamCards()` → Gemini sceglie 5 carte in background. `Promise.all()` + min 1.2s prima di revealing.

**Situazioni:** `selectSituationCards(situationText, emotionalState, lifeArea)` → Gemini sceglie 5 carte in background. Pattern identico a sogni.

**Saving:** `generateReadingSummary()` → Gemini 60 parole max. Schema: cards/followups/context come JSONB (non `jsonb[]`).

**Daily Card Deepening:** "Approfondisci" in DailyCardDetail → pre-popola `freeContext` con carta del giorno → naviga a `/(tabs)/reading`.

**Profile Tracking:** `trackProfileVisit(cartomanteId)` → insert `profile_visits`. `trackSocialClick(cartomanteId, platform)` → insert `social_clicks`. In `@/lib/profile-tracking` (non `daily-ritual`).

**Celtic Cross 4 fasi:** Tap rivela gruppo → AI streaming. Fase 1: carte 0+1, Fase 2: 2+3, Fase 3: 4+5, Fase 4: 6-9. `celticPhase` + `celticPhaseTexts[]` in store. `streamGeminiCelticPhase()` in gemini.ts.

**Shuffle 3-tap:** Tap1=Mescola (swirl+sway con Easing.bezier + Easing.out) · Tap2=Energia (ventaglio) · Tap3=Rivela (raccolta+revealing dopo 500ms). ❌ No auto-timeout. `revealStartedRef` evita doppio trigger. CardSwayTranslateY pre-computato in useRef per evitare allocazioni render.

**Revealing:** Carte coperte, utente tap per girare una alla volta. AI streaming in background simultaneamente. Hint: "TAP per rivelare · X/Y". Auto-transition a `interpreting` quando `revealedCount >= cards.length`. **DivineMascot SEMPRE visibile anche in interpreting con testo**. No bottone "APPROFONDISCI LA LETTURA" — accesso a followup da scripting. CardReveal: `flex: 1, justifyContent: 'center', alignItems: 'center'` per layout centrato.

**MMKV Persist:** Auto-save su phase change, key `'reading_in_progress'`. `PERSISTABLE_PHASES`: questionnaire, shuffling, revealing, interpreting, followup, saving, dream_input, celtic_phase*. Campi salvati: phase, deckType, emotionalState, lifeArea, urgency, cards, revealedCount, aiText, followups, freeContext, userQuestion, dreamText, celticPhase, celticPhaseTexts. Recovery banner in deck_selection. `restoreFromStorage()` auto-popola `revealedCount`: interpreting/followup/saving/celtic_phase* → `cards.length`; revealing → `cards.length`; altre → 0. `hasPersisted()` check disponibilità.

---

## Gemini

**Persona CARTOMANTE:** 30 anni arcani/numerologia/psicologia junghiana. Regole: IT formale diretto mai melodrammatico, connetti carte tra loro e al contesto, evidenzia tensioni tra carte contrastanti, prima persona singolare, max 180 parole, chiudi con azione concreta o domanda che tocchi il nucleo.

**Persona DREAM_ANALYST:** Psicologo junghiano sogni. Regole: IT formale empatico mai banale, simboli come messaggi inconscio (non previsioni letterali), connetti al contesto emotivo/vita, nomina archetipi (Ombra, Anima, Sé) se compaiono, max 180 parole, termina con domanda aperta riflessiva.

**Persona SITUATION_ANALYST:** Consulente relazionale. Regole: IT formale pragmatico mai moralista, analizza forze in gioco/tensioni/possibili risoluzioni, connetti carte ai ruoli/dinamiche della situazione, evidenzia risorse + ostacoli, max 180 parole, chiudi con azione concreta.

**Funzioni `src/lib/gemini.ts`:**
- **Model unificato:** Tutti gli streaming usano `gemini-2.5-flash` (incluso dream era 2.0-flash). ✅ Riduce latenza e variabilità.
- `streamGeminiReading(ctx, onChunk, onDone, signal, prior)` — streaming con prior readings per pattern detection. `buildPrompt()` include user_question + free_context + letture precedenti. Background: avviato subito su fase `revealing`, user tappa carte mentre testo fluisce. Try-catch robusti su `chunk.text()` + validazione `ctx.free_context` fallback esplicita.
- `selectDreamCards(dreamText, emotionalState, lifeArea): Promise<string[]>` — 5 id carte scelte da Gemini. `buildCardList()` fallback a `c.name` se `c.name_it` manca.
- `selectSituationCards(situationText, emotionalState, lifeArea): Promise<string[]>` — 5 id carte scelte da Gemini per dinamiche situazionali. Identico pattern dream.
- `generateReadingSummary(...)`: Promise<string>` — max 60 parole, terza persona, tema+carte+messaggio centrale
- `streamGeminiDreamInterpretation(ctx, onChunk, onDone, signal)` — interpretazione psicologica sogni. Try-catch chunk + logging migliorato.
- `streamGeminiSituationInterpretation(ctx, onChunk, onDone, signal)` — analisi forze/tensioni/risoluzioni situazione
- `streamGeminiFollowup(previousAnswer, followupQuestion, onChunk, onDone, signal)` — max 80 parole
- `streamGeminiCelticPhase(phase, cards, texts, ctx, onChunk, onDone, signal)` — Try-catch robusti su chunk parsing.

---

## UI Design

**Colori:** BG `#140d2e` · Card `rgba(36,21,80,0.97)` · Accento `#5a2d9a` · Oro `#D4AF37` · Dim `#a890c8`

**Layout pagine:** `View screen` + `ElaborateFrame` + `View inner (zIndex:5)` + `TitleBox (paddingTop:40)` + `TabBar` — ❌ no `SafeAreaView`

**Modal (stile NotificationCenter):** transparent + fade + overlay `rgba(10,6,25,0.92)` + container `maxWidth:480, maxHeight:'85%'`, bordo oro `#D4AF37`, `borderRadius:16`. Usato da UpgradeModal, ProfileModal, NotificationCenter.

**DivineMascot** (40 particelle oro/viola, 12 scintille):
- Onboarding: width 280, messaggi per step. Welcome: width 380, "Benvenuto, ${name}".
- Reading: width 280. **SEMPRE VISIBILE** in shuffling, revealing, interpreting (anche con testo AI). Nascosta in followup/saving. Layout: `mascotContainer` (flex, centered, padding) prima di CardReveal (non overlay assoluto). Flex wrapper `celticMascotWrap` per Celtic Cross. `zIndex:20, pointerEvents:'none'`.
- Dev: Reanimated fallback. Prod: Skia.

**Audio & TTS:**
- `audio-manager.ts`: `initAudio()`, `playBackground()` (0.35 vol, loop), `fadeOutBackground()`, `playTtsAudio(base64)`, `stopTts()`, flags `bgEnabled/ttsEnabled`. `playTtsAudio()` non ha guard `ttsEnabled` — controllo delegato a React state.
- `google-tts.ts`: `speakText(text, signal)` — chunking 800 char → Google TTS REST API diretta (client-side, no Edge Function in dev) → `playTtsAudio()`. Al deploy: spostare su Edge Function Supabase `tts`.
- **TTS chiamata diretta Google API** (dev): `https://texttospeech.googleapis.com/v1/text:synthesize?key=GOOGLE_TTS_API_KEY`
- **Voce:** `it-IT-Standard-A`, MP3, `speakingRate 1.0`, `pitch -2.0`, `volumeGainDb 2.0`, `effectsProfileId ['headphone-class-device']`
- **SSML:** `toSsml()` converte testo in SSML strutturato. Usa `<p>`, `<s>`, `<break strength>`, `<emphasis level="moderate">`, `<prosody rate>`. Alterna rate `1.05 ↔ 0.97` per ritmo naturale. Frasi corte `rate 0.87` + `break x-strong`. Domande `rate 0.90` + `break strong`. Parole mistiche con `<emphasis>`.
- **Bottoni TTS in chat (Toggle + Pause/Resume):** `FollowupPanel` riceve `ttsOn`, `isPlaying`, `onPlayTts`, `onPauseTts`. ✅ Unico bottone: tap avvia (Play → "Pausa"), tap di nuovo pausa (Pause → "Riprendi"). Non visibile se `ttsOn=false` o `aiText.length === 0`.
  - `audio-manager.ts`: aggiunti `pauseTts()` e `resumeTts()` per gestione play/pause corretto.
  - `reading.tsx`: `handlePlayTts()` avvia/riprende. `handlePauseTts()` sospende. State `isPlaying` traccia lo stato attuale. `handleToggleTts()` OFF → ferma tutto + reset `isPlaying`. Auto-lettura parte solo se `ttsOn=true` al finish Gemini. `handleReset()` abort+fade.

**Tarocchi IT:** `tarot-cards-it.json` (78 carte, meaning_up/meaning_rev/desc). `getItalianCard(card)` in cards.tsx match by `name_short`, fallback EN.

---

## Key Patterns

- Zustand: atomic selector `(s) => s.field` — ❌ no object selectors
- `useSubscription()` in auth-store: atomic selector SubscriptionStatus (default `'free'`)
- Animazioni: `useSharedValue` + worklets, `runOnJS` per side effects — ❌ no setState in worklet
- `TabId` include `'analytics'` — aggiunto a TabBar.tsx tipo + array TABS
- Analytics charts: SVG nativo (react-native-svg) — no Victory/Recharts
- FlatList numColumns: `key="grid-N"` sempre per evitare crash
- Cards grid: dimensioni fisse pixel — ❌ no `width:'100%'` + aspectRatio con numColumns
- PingModal: `containerW = Math.min(width-40, 480)`, `cellSize = Math.floor((containerW-12-5*6)/5)`
- `ALL_CARDS` (non `getAllCards`) da `tarot-cards.ts`
- `updateUser(partial)` in `auth-store.ts` per aggiornare profilo
- Specializzazioni cartomante PRESET: Amore · Carriera · Spirituale · Salute · Famiglia · Perdita · Crescita personale
- Regione: testo libero (no dropdown)
- Modal pre-populating: `useEffect` con deps `[visible, user?.id]` per evitare dati stale
- Birth date: UI GG/MM/AAAA, DB AAAA-MM-GG. Conversione: `split('/').reverse().join('-')` ↔ `split('-')` poi `[y,m,d]→d/m/y`
- **CelticCrossLayout & Celtic Cross Layout:**
  - Carte ridotte: cw = `availW * 0.10` (10% width, era 0.14) → dimensioni compatte per Celtic Cross.
  - Posizionamento colonna destra: `colX = 0.68` (era 0.71), gap uniforme `colGap = ch + 5`.
  - Altezza layout: `availH = Math.max(ch*4+40, height*0.60)` per corretto spacing verticale.
  - `CelticCardItem` calcola `visW/visH` condizionali (swap se rotated).
  - Carte 1 sovrapposta a 0 con `zIndex:10`, indicatore rovesciata su card (mini badge rosso).
- **Italian Descriptions in Celtic Cross:** Import `cardsIT` da `@/data/tarot-cards-it.json`. Funzione `getItalianCard(card)` match `card.id` (name_short field) contro Italian data, return `{ meaning_up, meaning_rev, desc }` con fallback EN. Modal mostra descrizione italiana.
- Auth screen: stile inline TitleBox (no import), bordo oro, Georgia letterSpacing 5
- Home query: `!inner` join su users per RLS is_public filter
- ProfileModal: `useEffect([visible, user?.id])` per sync dati apertura
- home.tsx: solo `UserProfileModal` overlay (rimosso CartomanteProfileModal bottom sheet)
- **User Info Bar in Reading:** `readingUserInfo`: `flex: 1, marginRight: 12`. `readingUserName`: `flexWrap`, `maxWidth`, `fontSize: 15` per nomi lunghi.

---

## Common Issues & Fixes

- **Infinite re-renders** → atomic Zustand selector
- **Animazioni lag** → `runOnJS` per setState in worklet
- **MMKV web** → `makeStorage()`
- **Image path** → `@/assets/` (non path relativo, Metro resolution)
- **Gemini cache miss** → system prompt identico byte-per-byte ogni call
- **WebView in Expo Go** → fallback Reanimated/SVG in dev, WebView/Skia solo build nativo
- **`useDerivedValue` in .map()** → estrarre sotto-componente
- **jsonb[] type mismatch** → usare `jsonb` con default `'[]'::jsonb` (JS array → JSON → Postgres cast)
- **Profile tracking** → import da `@/lib/profile-tracking` (non `daily-ritual`)
- **History columns** → derivare da `cards/followups/context JSONB` (rimosse: card_names CSV, card_reversals CSV, context_snapshot, followup_count)
- **Home infinite loading** → aggiungere `setLoading(false)` nel catch/error delle query cartomanti+users
- **Modal dati vuoti** → `useEffect` con dep `[visible]`
- **Sent pings cartomante** → RLS policy `actor_id = auth.uid()` su notifications
- **Social links vuoti** → setSocialLinks sempre (anche se `social_links = {}`)
- **TTS 401/403** → in dev: verificare `GOOGLE_TTS_API_KEY` hardcoded in `google-tts.ts` + TTS API abilitata in GCloud. In prod: verificare secret Supabase + `supabase functions deploy tts`
- **TTS non parte al Play** → `playTtsAudio()` non ha guard `ttsEnabled` — il controllo è solo in React `ttsOn`. Se non parte verificare che `ttsOn=true` e `aiText.length > 0` e `isPlaying=false`
- **TTS robotica** → non abusare di `<prosody>` annidati. Usare solo `<s>`, `<break strength>`, `<emphasis moderate>` come da Google best practices
- **SSML non accettato** → Google Standard-A supporta: `<break>`, `<emphasis>`, `<prosody rate>`, `<s>`, `<p>`. Non supporta: `<audio>`, `<par>`, `<seq>`
- **Riprendi lettura carte assenti** → `restoreFromStorage()` auto-popola `revealedCount` per fase
- **DivineMascot layout** → `mascotContainer` (flex, centered) non overlay assoluto. Non sparisce mai in revealing/interpreting. Non-Celtic: showMascot = `phase === 'revealing' || phase === 'interpreting'`. Celtic: showCelticMascot = `phase === 'revealing' || phase.startsWith('celtic_phase')`.
- **CardReveal visibility** → container: `flex: 1, justifyContent: 'center', alignItems: 'center'`. Pressable wrapper: `flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200`. CardRows: `alignItems: 'center'` (non flex-start).
- **Gemini streaming errors** → wrap `chunk.text()` in try-catch, continua stream. Wrap intero streaming in try-catch con fallback message. Validazione esplicita `ctx.free_context || ''`. ✅ Robusto vs malformed chunks + corrupted context.
- **Celtic Cross overflow** → `availH = Math.max(ch*4+40, height*0.60)`, gap fisso `ch+5`. Colonna destra: `colX = 0.68` con distribuzione Y uniforme.
- **Interrupt modal text** → "Interrompendo la lettura perderai tutti i progressi attuali. Vuoi proseguire?"
- **Shuffle animation lag** → CardSwayTranslateY pre-computed in useRef: `useRef(cardSwayAnims.map(anim => anim.interpolate({...})))`. Easing.bezier(0.25, 0.1, 0.25, 1) + Easing.out(Easing.quad) per naturalezza. ❌ no new Animated.Value in render.
- **GoldButton style array** → StyleSheet.flatten() per conditional styles: `StyleSheet.flatten([styles.proceedBtn, !canProceed && styles.proceedBtnDisabled])`

---

## Environment

```
EXPO_PUBLIC_SUPABASE_URL=https://mpdqjeasesupjregjjjf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<token>
EXPO_PUBLIC_GEMINI_API_KEY=<set tu>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / IOS / ANDROID=<set tu>
EXPO_PUBLIC_REVENUECAT_IOS_KEY / ANDROID_KEY=<set tu>
GOOGLE_TTS_API_KEY=<set in Supabase edge functions secrets>
```

---

## FASE 11-13: Implementazione Completa

**FASE 11:** Shuffle animation 60fps.
- Easing.bezier(0.25, 0.1, 0.25, 1) + Easing.out(Easing.quad) per curve naturali
- CardSwayTranslateY pre-computed in useRef per evitare allocazioni render
- ✅ Done.

**FASE 12:** Situazioni spread.
- DeckType='situazioni', selectSituationCards(), streamGeminiSituationInterpretation()
- Persona SITUATION_ANALYST (forze/tensioni/risoluzioni)
- Freecontext obbligatorio, urgency opzionale
- ✅ Done.

**FASE 13:** AI background + covered cards interattive + UI fixes.
- Tutti gli spread hanno carte coperte + tap per rivelare progressivamente
- AI streaming background su revealing phase
- **DivineMascot SEMPRE visibile** in revealing + interpreting (anche con testo)
- Layout fix: `mascotContainer` (flex, non overlay), CardReveal (flex: 1, centered)
- No "APPROFONDISCI LA LETTURA" button (spread non-celtic), solo Celtic Cross "INIZIA L'APPROFONDIMENTO"
- Interrupt modal: "Interrompendo la lettura perderai tutti i progressi attuali. Vuoi proseguire?"
- User avatar/name in tutte le letture
- ✅ Done.

**Layout & Rendering Fixes:**
- mascotContainer: flex, alignItems center, paddingVertical 12, pointerEvents none
- cardRevealPressable: flex 1, justifyContent/alignItems center, minHeight 200
- CardReveal container: flex 1, center alignment
- CardRow align: center (non flex-start)
- revealZone: justifyContent flex-start (vertical stack)

**Gemini Error Handling:**
- Try-catch su chunk.text(), continua stream se chunk non parsabile
- Try-catch generale su streaming con fallback message
- Console log per debugging
- ✅ Robusto vs stream corruption.

---

## FASE 14: TTS Voce Cartomante ✅ Done

**TTS client-side (dev):** Chiamata diretta Google TTS API da client. Al deploy spostare su Edge Function Supabase `tts` (già creata + deployata).

**Voce configurata:** `it-IT-Standard-A`, `speakingRate 1.0`, `pitch -2.0`, `volumeGainDb 2.0`, `effectsProfileId ['headphone-class-device']`

**SSML espressivo:** `toSsml()` in `google-tts.ts`:
- `<p>` wrapper generale (Google best practice)
- `<s>` per ogni frase con elementi SSML (Google best practice)
- `<break strength="strong/x-strong">` (strength-based, più naturale di time-based)
- `<emphasis level="moderate">` su parole mistiche: destino, anima, verità, segreto, luce, ombra, trasformazione, scelta, momento
- Rate alternato `1.05 ↔ 0.97` per ritmo conversazionale naturale
- Frasi brevi `< 45 char` → `rate 0.87` + `break x-strong` (rivelazione)
- Domande → `rate 0.90` + `break strong` (sospeso)

**Bottoni Play/Pausa in `FollowupPanel`:** ✅ Toggle unico bottone. `audio-manager.ts` expose `pauseTts()` + `resumeTts()`. Props: `ttsOn`, `isPlaying`, `onPlayTts`, `onPauseTts`.

**Edge Function `supabase/functions/tts/`:** deployata, con log per debug. Da usare in produzione al posto della chiamata client-side.

---

## FASE 15: Gemini Fixes + Covered Cards UI ✅ Done

**Gemini Error Fixes:**
- **Model unificato:** Tutti streaming → `gemini-2.5-flash` (dream era 2.0-flash, ora sync). Riduce latenza + variabilità risposta.
- **Robust Chunk Parsing:** `chunk.text()` wrapped in try-catch. Continua stream se malformed. Fallback message su errore intero streaming.
- **Context Validation:** `ctx.free_context` ha fallback esplicito a `''` (evita undefined in prompt). Logging migliorato per debug.
- **Card List Fallback:** `buildCardList()` → fallback a `c.name` se `c.name_it` manca (nunca mancano ma precauzione).

**Covered Cards UI (Tutti gli spread):**
- Carte iniziano coperte (dorso) con animazione flip smooth.
- AI aspetta fase `revealing` per start streaming (non pre-computa).
- Utente tap progressivamente → rivela una carta alla volta.
- Testo AI fluisce durante revealing (background non-blocking).
- Auto-transition a `interpreting` quando `revealedCount === cards.length`.
- Animate dorso → fronte: `backOpacity` interpolates `[0,0.5,1] → [1,0,0]`.

**TTS Toggle & Pause/Resume:**
- Unico bottone (no Play + Pause separati).
- Tap1: avvia lettura → "Pausa". Tap2: pausa → "Riprendi". Tap3: riprendi lettura.
- `pauseTts()` ferma audio. `resumeTts()` riprende da dove era.
- State `isPlaying` traccia UI bottone.

**Celtic Cross + Italian Descriptions:**
- Carte 10% width (compatte), corretto spacing colonna destra.
- Descrizioni italiane via `getItalianCard()` fallback EN.
- Stesso layout structure come altri spread (revealZone/chatZone/userBar).
- User info bar: `readingUserName` flex-wrap per nomi lunghi.

---

## FASE 16: Daily Card + Celtic Cross Layout ✅ Done

**Daily Card Notification (campanella in-app):**
- `getTodayDailyCard(userId)` chiamata all'avvio in `home.tsx` (solo utenti, non cartomanti)
- Auto-crea daily card se non esiste già oggi + inserisce notifica `daily_card` in DB
- `subscribeRealtime` la fa apparire automaticamente nel NotificationCenter via realtime subscription
- Utente clicca notifica → visualizza DailyCardDetail

**Celtic Cross Layout Ottimizzato:**
- `CelticCrossLayout`: wrapper `measureWrap` (flex:1) + onLayout misura larghezza/altezza reali
- Container carte: `StyleSheet.absoluteFillObject` occupa esattamente `measureWrap`
- Posizioni Y calcolate come percentuali dell'altezza misurata (cy = 55% per equilibrio visivo)
- Colonna destra centrata su cy: `colStartY = cy - colTotalH / 2`
- DivineMascot (altezza naturale) sopra le carte — messaggio per ogni fase celtic_phase1..4
- `phasesScroll` (flex:1) sotto le carte — bottone TAP + interpretazioni progressive
- Struttura uguale alle altre letture: revealZone + readingUserBar + audioBar + chatZone (solo followup)
- Durante fasi celtic (non followup): `revealZone` ha `flex: 1` per massimizzare spazio carte

---

## Prossimo (FASE 17+)

```bash
pnpm add react-native-share
# react-native-purchases (RevenueCat) — richiede prebuild nativo
```

- RevenueCat nativo — `react-native-purchases` + API keys + webhook Edge Function
- Share nativo — WhatsApp/Telegram
- History insights — line chart deck frequenza + bar chart spread mensile
- ReadingDetail deepening — "Nuova lettura basata su questa" con context pre-populated
- Push notification reale — Edge Function Supabase + Expo notifications (pre-build)
- ⏳ TTS pending — `supabase functions deploy tts` + test toggle Voce
