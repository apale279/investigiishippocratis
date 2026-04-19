-- Orari limitati + note orari + altre informazioni pratiche
-- Supabase → SQL Editor → Run

alter table public.places add column if not exists limited_hours boolean not null default false;
alter table public.places add column if not exists hours_note text;
alter table public.places add column if not exists extra_info text;

comment on column public.places.limited_hours is 'Se true, il luogo ha orari di accesso limitati';
comment on column public.places.hours_note is 'Testo libero sugli orari (visibile se limited_hours)';
comment on column public.places.extra_info is 'Info pratiche: biglietti, come arrivare in loco, ecc.';
