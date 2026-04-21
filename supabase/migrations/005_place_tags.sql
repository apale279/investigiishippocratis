-- Hashtag dedicati (testo normalizzato senza #), per filtri e link
alter table public.places add column if not exists tags text[] not null default '{}';

comment on column public.places.tags is 'Elenco di hashtag (minuscolo, senza #) per filtri e ricerca';
