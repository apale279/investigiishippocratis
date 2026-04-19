-- Aggiunge lo stato "draft" (bozze moderatore, non visibili in mappa pubblica).
-- Supabase → SQL Editor → Run

alter table public.places drop constraint if exists places_status_check;

alter table public.places
  add constraint places_status_check
  check (status in ('pending', 'approved', 'draft'));

comment on column public.places.status is 'pending: proposta utente; draft: bozza moderatore; approved: visibile in mappa';
