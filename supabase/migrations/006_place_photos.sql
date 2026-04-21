-- URL delle foto ospitate su Cloudinary (max 3 per POI, opzionale)
alter table public.places add column if not exists photo_urls text[] not null default '{}';

comment on column public.places.photo_urls is 'Fino a 3 URL HTTPS (es. res.cloudinary.com/...) restituiti da Cloudinary';

alter table public.places drop constraint if exists places_photo_urls_max_three;
alter table public.places
  add constraint places_photo_urls_max_three
  check (cardinality(photo_urls) <= 3);
