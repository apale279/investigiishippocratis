-- Esegui questo script nel Supabase Dashboard → SQL Editor → New query → Run
-- Crea la tabella e le policy di sicurezza (RLS) per lettura pubblica dei luoghi approvati
-- e inserimento pubblico solo in stato "pending".

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  description text,
  lat double precision not null,
  lng double precision not null,
  category text not null,
  status text not null default 'pending',
  submitted_by text,
  limited_hours boolean not null default false,
  hours_note text,
  extra_info text,
  created_at timestamptz not null default now(),
  constraint places_status_check check (status in ('pending', 'approved', 'draft'))
);

comment on table public.places is 'Luoghi della storia della medicina (POI)';

alter table public.places enable row level security;

drop policy if exists "Lettura luoghi approvati" on public.places;
drop policy if exists "Inserimento proposte pending" on public.places;

-- Chiunque può leggere solo i luoghi approvati (mappa pubblica)
create policy "Lettura luoghi approvati"
  on public.places
  for select
  to anon, authenticated
  using (status = 'approved');

-- Chiunque può proporre un luogo, ma solo con stato pending
create policy "Inserimento proposte pending"
  on public.places
  for insert
  to anon, authenticated
  with check (status = 'pending');

-- Aggiornamenti e cancellazioni: solo tramite chiave service_role (route API /moderazione)
