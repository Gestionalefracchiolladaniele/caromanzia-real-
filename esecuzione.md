# Esecuzione — Fase 7 (Chiromanzia + UI + DB)


---

## 2. CROCE CELTICA — Layout SVG Corretto
**File:** `src/features/reading/components/CelticCrossLayout.tsx` (nuovo)  
**Logica:**
- Calcola 10 posizioni su croce geometrica (SVG, responsive via useWindowDimensions)
- Mappa posizioni → significati italiani: Situazione, Ostacolo, Fondamenta, Passato, Avvenire, Prossimo, Atteggiamento, Influenze, Speranze, Risultato
- Tap su carta → mostra label + keywords

**Reveal sequenziale:** CardReveal già anima sequenziale, riusa logica (index = order)

**Integrazione:** In `reading.tsx`, quando `deckType === 'celtic_cross'` → renderizza `<CelticCrossLayout cards={cards} revealedCount={revealedCount} />` invece di grid lineare

---

## 3. SHUFFLE INTERATTIVO (Bridge manuale)
**File:** Modifica `reading.tsx` fase shuffling  
**Logica:**
- Mostra `Pressable` durante shuffling: "Tocca per un ponte"
- Ogni tap → anima carta flip + incrementa counter
- Dopo 5 tap (oppure 3s timeout) → auto-proceed a reveal
- Feedback visuale: particle animation su tap

**State:** Aggiungi `shuffleTapCount` a `reading-store.ts`

---

## 4. AVATAR + NAME SOTTO CARTE
**File:** Modifica `reading.tsx` nella sezione renderizzazione carte  
**Logica:**
- Dopo CardReveal, aggiungi View con:
  - Avatar (Image da `user?.avatar_url`)
  - Nome (Text da `user?.name`)
  - Sottotesto "Lettura personale"

**Style:** Match design (oro #D4AF37, dim #a890c8, Georgia font)

---

## 5. DATA DI NASCITA — Schema + Onboarding + Settings
**DB Migration (new file):** `supabase/migrations/004_add_birth_date.sql`
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_time TIME; -- opzionale (astro precisa)
```

**Onboarding:** Modifica `src/features/onboarding/steps/BioStep.tsx`
- Aggiungi `DatePickerInput` (react-native-community/datetimepicker) prima di bio
- Salva in `birth_date` via `updateUser()`

**Settings/ProfileModal:** Modifica `src/app/(tabs)/profile.tsx`
- Aggiungi fieldGroup "Data di Nascita" (read-only in settings, editabile in ProfileModal)
- Salva via `updateUser({ birth_date })`

**Types:** Update `src/types/index.ts` User type → aggiungi `birth_date?: string`

---

## 6. RINOMINA `profile.tsx` → `impostazioni.tsx`
**Step:**
1. Rinomina file: `src/app/(tabs)/profile.tsx` → `src/app/(tabs)/impostazioni.tsx`
2. Grep per import in codebase (near-zero, Expo Router risolve auto)
3. Niente cambio logica, niente debito tecnico

---


---

## Priorità Implementazione (Order)
1. **Avatar + Name (30 min)** — semplice, subito visibile
2. **Data nascita schema (1h)** — fondazione per astrologia
3. **Croce Celtica SVG (3h)** — completa Fase 6
5. **Shuffle interattivo (1.5h)** — UX polish
6. **Rinomina file (10 min)** — cosmetic

**Total:** 
---

## Testing Android
```bash
pnpm expo start
# Premi 'a' quando richiesto (non devi niente)
# Scansiona QR code da Expo Go (Play Store)
```

**NB:** Worklets error su dev è normale (Expo Go bypassa). Build nativo (EAS) richiede `npx expo prebuild --clean` se necessario.
