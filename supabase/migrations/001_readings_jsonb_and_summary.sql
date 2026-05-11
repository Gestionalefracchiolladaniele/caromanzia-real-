-- ============================================================
-- Migrazione: readings.cards/followups da jsonb[] → jsonb
-- + aggiunta colonna summary
-- ============================================================
-- Esegui nel SQL Editor di Supabase. Idempotente.
-- ============================================================

-- 1. Aggiungi summary se manca
alter table public.readings
  add column if not exists summary text not null default '';

-- 2. Converti cards: jsonb[] → jsonb (preservando i dati esistenti)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'readings'
      and column_name  = 'cards'
      and data_type    = 'ARRAY'
  ) then
    alter table public.readings
      alter column cards drop default,
      alter column cards type jsonb using to_jsonb(cards),
      alter column cards set default '[]'::jsonb,
      alter column cards set not null;
  end if;
end$$;

-- 3. Converti followups: jsonb[] → jsonb
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'readings'
      and column_name  = 'followups'
      and data_type    = 'ARRAY'
  ) then
    alter table public.readings
      alter column followups drop default,
      alter column followups type jsonb using to_jsonb(followups),
      alter column followups set default '[]'::jsonb,
      alter column followups set not null;
  end if;
end$$;
