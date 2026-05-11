-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: Aggiunge data di nascita alla tabella users
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS birth_date date;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS birth_time time;
