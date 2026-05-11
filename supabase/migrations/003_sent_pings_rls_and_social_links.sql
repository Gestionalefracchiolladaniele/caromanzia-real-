-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Fix RLS notifications per cartomante + bio su cartomanti
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Aggiungi policy RLS: il cartomante può leggere le notifiche inviate DA lui (actor_id)
--    Necessario per fetchSentPings() in home.tsx (mostra carta inviata sul profilo utente)
DO $$
BEGIN
  DROP POLICY IF EXISTS "notifications: read sent by actor" ON public.notifications;

  CREATE POLICY "notifications: read sent by actor"
    ON public.notifications FOR SELECT TO authenticated
    USING (auth.uid() = actor_id);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'notifications actor policy error: %', SQLERRM;
END;
$$;

-- 2. Aggiungi colonna bio alla tabella cartomanti se non esiste già
--    (lo schema la prevede ma verifichiamo per sicurezza)
ALTER TABLE public.cartomanti
  ADD COLUMN IF NOT EXISTS bio text;

-- 3. Assicura che social_links abbia default corretto
ALTER TABLE public.cartomanti
  ALTER COLUMN social_links SET DEFAULT '{}'::jsonb;

-- 4. Indice per ricerche future su social_links (opzionale ma utile)
CREATE INDEX IF NOT EXISTS idx_cartomanti_social_links
  ON public.cartomanti USING gin (social_links);
