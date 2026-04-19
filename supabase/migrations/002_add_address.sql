-- Esegui su progetti già creati (dopo la prima esecuzione di schema.sql senza `address`).
-- Supabase → SQL Editor → incolla → Run

alter table public.places add column if not exists address text;

comment on column public.places.address is 'Indirizzo testuale salvato dal form (geocoding)';
