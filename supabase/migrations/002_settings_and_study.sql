-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Settings utente + life areas (study, relations)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Aggiungi colonne impostazioni alla tabella users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_public            BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN users.is_public             IS 'Se FALSE il profilo non appare nella directory (home)';
COMMENT ON COLUMN users.notifications_enabled IS 'Se FALSE l''utente non riceve notifiche push';

-- 2. Indice per filtrare rapidamente i profili pubblici
CREATE INDEX IF NOT EXISTS idx_users_is_public ON users (is_public);

-- 3. RLS su users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Pulizia policy precedenti
  DROP POLICY IF EXISTS "users_select_public" ON users;
  DROP POLICY IF EXISTS "users_select_own"    ON users;
  DROP POLICY IF EXISTS "users_update_own"    ON users;
  DROP POLICY IF EXISTS "users_insert_own"    ON users;

  -- SELECT: solo profili pubblici oppure il proprio
  CREATE POLICY "users_select_public" ON users
    FOR SELECT
    USING (is_public = TRUE OR auth.uid() = id);

  -- INSERT: il trigger handle_new_user gira come service_role, ma per sicurezza
  -- permettiamo anche insert dove l'id corrisponde all'utente autenticato
  CREATE POLICY "users_insert_own" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

  -- UPDATE: solo il proprio profilo
  CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy creation error: %', SQLERRM;
END;
$$;

-- 4. Aggiorna CHECK constraint life_area su readings (aggiunge study e relations)
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'readings'
      AND constraint_name LIKE '%life_area%'
      AND constraint_type = 'CHECK'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    ALTER TABLE readings DROP CONSTRAINT IF EXISTS readings_life_area_check;
    ALTER TABLE readings
      ADD CONSTRAINT readings_life_area_check
      CHECK (
        (context->>'life_area') IN ('love', 'work', 'money', 'health', 'spiritual', 'study', 'relations')
      );
    RAISE NOTICE 'Aggiornato CHECK constraint life_area su readings';
  ELSE
    RAISE NOTICE 'Nessun CHECK constraint life_area su readings — nessuna modifica necessaria';
  END IF;
END;
$$;

-- 5. Rimuovi CHECK constraint life_area su user_preferences se esiste
DO $$
BEGIN
  ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_life_area_check;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'user_preferences life_area constraint: %', SQLERRM;
END;
$$;
