# IMPLEMENTAZIONE — Cartomanzia AI App

## Stack Confermato
- Expo SDK 54 / RN 0.81.5, TypeScript strict, Expo Router 6
- Supabase (PostgreSQL + Auth + Storage), Google OAuth
- Nativewind/Uniwind (TailwindCSS)
- Zustand v5 + React Query + TanStack Form + Zod
- MMKV (iOS/Android) + localStorage (web) via `makeStorage()`
- **Google Gemini Flash 2.5** (AI letture — sostituisce Claude Haiku)
- Reanimated 4 + Gesture Handler (animazioni 2.5D + skeleton)

## Da Eliminare (vecchia app) ✅ Fatto
- [x] `src/translations/ar.json`
- [x] `src/translations/it.json` (riscritto)
- [x] `src/translations/en.json` (riscritto)
- [x] `src/types/index.ts` (riscritto)

## Aggiornato ✅
- [x] `src/app/_layout.tsx` — root layout (auth guard semplificato, no onboarding)
- [x] `src/lib/auth-store.ts` — aggiunto useUserRole, useIsCartomante
- [x] `src/lib/supabase.ts` — ok
- [x] `src/lib/storage.ts` — MMKV id `cartomanzia` ✅
- [x] `src/lib/i18n.ts` — ok
- [x] `src/translations/it.json` + `en.json` — Cartomanzia contents
- [x] `src/types/index.ts` — completo con User (role), Cartomante, Reading, TarotCard, ecc.
- [x] `src/global.css` — design tokens nero/oro/porpora
- [x] `package.json` — rinominato a "cartomanzia", aggiunto `@google/generative-ai`
- [x] `env.ts` — bundle ID/scheme/name → cartomanzia, variabili opzionali
- [x] `app.config.ts` — EAS_PROJECT_ID vuoto, background nero
- [x] `.env` — Supabase OK, Gemini/Google OAuth placeholder

---

## FASE 1 — Frontend (UI/UX) ✅ COMPLETATO

### 1.1 Design System ✅
- **Design tokens** in `global.css`: colori (`#D4AF37` oro, `#1A1A2E` nero, `#6B4BA0` porpora)
- **Font:** Georgia serif per titoli, Inter sans per body
- **Componenti base** in `src/components/ui/` ✅:
  - `OrnamentalBorder.tsx` — SVG cornice dorata
  - `MysticCard.tsx` — card container dark
  - `GoldButton.tsx` — pulsante oro/outline
  - `GoldInput.tsx` — input dorato con focus state
  - `CircleIcon.tsx` — icona circolare

### 1.2 Auth Screen ✅
**File:** `src/app/index.tsx`
- Sfondo `#1A1A2E` con starfield animato (40 stelle randomiche)
- Logo SVG stella/teschio (cerchio concentrico + stella dorata, occhi porpora)
- Titolo "CARTOMANZIA" serif + subtitle + divider
- Google Sign In button con ikon Google (FlatList dei 4 colori Google)
- Animazioni: FadeIn (logo), FadeInDown (titolo, divider, button) con delay
- Error handling: Alert se accesso fallisce

### 1.3 Tab Bar ✅
**File:** `src/app/(tabs)/_layout.tsx`
- Sfondo `#16213E`, icone SVG custom dorate
- 5 tab: Home | Reading | History | Profile | Settings
- Active: `#D4AF37`, Inactive: `#4B5563`

### 1.4 Home — Cartomanti Directory ✅
**File:** `src/app/(tabs)/home.tsx`
- Header "CARTOMANTI" con OrnamentalBorder dorata
- SearchBar: TextInput dorata + clear button
- Filter chips (2 scrollView): Specializzazioni (7) + Regioni (6), active stato oro
- CartomanteCard in MysticCard (5 mock):
  - Avatar placeholder (initials + bordo oro, `#2D1B69` bg)
  - Nome + verified badge (check + border)
  - Età + regione mini labels
  - Bio truncato 2 righe (`#9CA3AF`)
  - Specializzazioni chips (porpora `#9B6ED0`)
  - Social buttons: WA (green), IG (pink), TG (blue), TK (gold), con Linking.openURL
- FlatList + count risultati + empty state

### 1.5-1.8 Stubs (Coming Soon) ✅
**File:** `src/app/(tabs)/{reading,history,profile,settings}.tsx`
- Placeholder text "Coming soon"

---

## FASE 2 — Reading Tab (Next)

### 2.1 Questionnaire
**File:** `src/app/(tabs)/reading.tsx` (sezione 1)
- 4 domande: emotional_state, life_area, urgency, reading_mode
- Chip buttons, stile oro

### 2.2 Deck Selection
**File:** `src/app/(tabs)/reading.tsx` (sezione 2)
- 3 deck cards (Tre Carte Free, Celtic Cross Premium, Sincronicità Free)
- "BEGIN" button per ogni deck

### 2.3 Skeleton + Card Reveal
**File:** `src/features/reading/components/SkeletonCartomante.tsx`
- SVG scheletro: nero/oro, occhi viola glow
- Reanimated 4: breathing, shuffle, speaking, thinking animations
- Card flip (rotateY) + stagger reveal

---

## FASE 3 — Backend + AI Integration

### 3.1 Database Supabase
- Eseguire schema SQL (users, user_preferences, cartomanti, readings, daily_cards)
- RLS policies
- Seed cartomanti reali

### 3.2 Google OAuth Reale
- Redirect post-login check role (user → home, cartomante → profile)
- Session persistence MMKV

### 3.3 Gemini Flash 2.5 Integration
- `src/lib/gemini.ts` — client + streaming
- System persona + user context
- Interpretazione carte real-time

### 3.4 Reading Flow State Machine
- questionnaire → deck_selection → shuffling → revealing_cards → ai_interpreting → followup → saving

### 3.5 History + Insights
- React Query fetch readings
- Preview image generation
- Share nativo

### 3.6 Subscription & Daily Ritual
- Free limits enforcement
- Push notifications
- Premium unlock

---

## Struttura File Finale

```
src/
├── app/
│   ├── _layout.tsx                  ✅
│   ├── index.tsx                    ✅ (auth screen)
│   └── (tabs)/
│       ├── _layout.tsx              ✅ (tab bar)
│       ├── home.tsx                 ✅ (cartomanti directory)
│       ├── reading.tsx              ⏳ (stub, prossimo)
│       ├── history.tsx              ⏳ (stub)
│       ├── profile.tsx              ⏳ (stub)
│       └── settings.tsx             ⏳ (stub)
├── components/
│   └── ui/
│       ├── OrnamentalBorder.tsx      ✅
│       ├── MysticCard.tsx            ✅
│       ├── GoldButton.tsx            ✅
│       ├── GoldInput.tsx             ✅
│       └── CircleIcon.tsx            ✅
├── features/
│   ├── reading/
│   │   ├── components/               ⏳ (WIP)
│   │   │   ├── SkeletonCartomante.tsx
│   │   │   ├── CardDeck.tsx
│   │   │   ├── CardReveal.tsx
│   │   │   ├── PreReadingQuestionnaire.tsx
│   │   │   ├── DeckSelector.tsx
│   │   │   └── QuestionSuggestions.tsx
│   │   ├── hooks/                   ⏳ (WIP)
│   │   │   ├── useReadingSession.ts
│   │   │   ├── useCardAnimation.ts
│   │   │   └── useAIInterpretation.ts
│   │   ├── cards-data.ts
│   │   ├── prompts.ts
│   │   └── types.ts
│   ├── cartomanti/                  ✅ (inline in home.tsx)
│   └── history/                     ⏳ (WIP)
│       ├── ReadingGallery.tsx
│       └── InsightsDashboard.tsx
├── lib/
│   ├── supabase.ts                  ✅
│   ├── auth-store.ts                ✅
│   ├── gemini.ts                    ⏳ (WIP Fase 3)
│   ├── storage.ts                   ✅
│   └── i18n.ts                      ✅
├── types/
│   └── index.ts                     ✅
├── translations/
│   ├── it.json                      ✅
│   └── en.json                      ✅
└── global.css                       ✅
```

---

## Note Tecniche Importanti
- **Zustand atomic:** `useAuthStore((s) => s.field)` — MAI object selectors
- **Gemini cache:** system prompt identico ogni call
- **Animazioni:** `useSharedValue` + worklets, mai setState dentro animazioni
- **Storage:** `makeStorage()` — mai AsyncStorage direttamente
- **Import:** assoluti con `@/`
