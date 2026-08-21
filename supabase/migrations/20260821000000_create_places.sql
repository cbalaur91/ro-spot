-- Places: the core entity of RoSpot. A place is public only once the moderator
-- approves it, so pre-moderation is enforced here (RLS), not in the client.

create type public.place_category as enum ('historic', 'food_drink', 'services');
create type public.place_status as enum ('pending', 'approved', 'rejected');

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  category public.place_category not null,
  description text not null check (char_length(trim(description)) between 1 and 2000),
  address text not null check (char_length(trim(address)) between 1 and 300),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  status public.place_status not null default 'pending',
  -- Null for owner-seeded places, which have no submitting user.
  author_id uuid references auth.users (id) on delete cascade,
  phone text,
  website text,
  social_url text,
  created_at timestamptz not null default now()
);

-- Every public read filters on status; the map/list also filter by category.
create index places_approved_category_idx
  on public.places (category)
  where status = 'approved';

alter table public.places enable row level security;

-- The only policy for now: anyone, signed in or not, may read approved places.
-- Insert/update policies arrive with the submission slice; until then RLS denies
-- all writes to anon and authenticated clients by default.
create policy "Approved places are publicly readable"
  on public.places
  for select
  to anon, authenticated
  using (status = 'approved');
