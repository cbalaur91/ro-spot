-- "Your places" (#8): an author sees their own submissions whatever became of
-- them, may edit them, and an edit sends the place back to the queue. Plus the
-- duplicate hint the moderator reads before approving one.
--
-- Everything here is enforced in the database rather than in the client: the
-- app is one build behind its users, and pre-moderation is the whole product.

-- An author reads their own places at any status. Policies are permissive, so
-- this is OR'd with "approved places are publicly readable" — a signed-in
-- person sees the public rows plus their own.
create policy "Authors read their own places"
  on public.places
  for select
  to authenticated
  using (author_id = (select auth.uid()));

-- What an author may write.
--
-- Column privileges rather than a `with check` on `status`: a rule that says
-- "you may not name this column" is checked before any row is fetched, it
-- cannot be satisfied by writing the value a row already has, and it covers
-- `author_id`, `created_at` and `id` in the same breath.
revoke update on public.places from anon, authenticated;

grant update (name, category, description, address, lat, lng, phone, website, social_url, photo_paths)
  on public.places
  to authenticated;

-- The row rules are the submission's, restated: your own place, at least one
-- photo, every photo a file directly inside your own folder. An edit can add
-- photos, so the second half has to be checked again rather than inherited.
create policy "Authors edit their own places"
  on public.places
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and coalesce(array_length(photo_paths, 1), 0) >= 1
    and not exists (
      select 1
      from unnest(photo_paths) as photo_path
      where photo_path !~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]+\.jpg$')
    )
  );

-- An edit re-enters review.
--
-- In a trigger rather than in the update statement: the client never sends
-- `status` (it holds no privilege on the column), so this is the only place the
-- rule can live, and it holds for any future caller that arrives as a client.
create or replace function public.return_place_to_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Only for edits that arrive through PostgREST as a client role. The
  -- moderator works in the dashboard as `postgres`, and approving a place is an
  -- update like any other — re-pending it here would make approval impossible.
  if current_user in ('anon', 'authenticated') then
    new.status := 'pending';
  end if;

  return new;
end;
$$;

create trigger places_edit_returns_to_review
  before update on public.places
  for each row
  execute function public.return_place_to_review();

-- The duplicate hint.
--
-- Two submissions of one place are the failure mode of a community map: the
-- second submitter has no way to see the first while it is pending, so nothing
-- in the app can stop them. The moderator can, given the hint.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Metres between two points on a sphere. No PostGIS for this: v1 asks one
-- distance question at one radius, and the earth is round enough at 150 m.
create or replace function public.places_distance_m(
  lat_a double precision, lng_a double precision,
  lat_b double precision, lng_b double precision
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371000 * asin(sqrt(
    sin(radians(lat_b - lat_a) / 2) ^ 2
    + cos(radians(lat_a)) * cos(radians(lat_b)) * sin(radians(lng_b - lng_a) / 2) ^ 2
  ));
$$;

-- How alike two names are, ignoring case, accents and punctuation: trigram
-- similarity over unaccented lower case, so "Casa Română" and "casa romana" are
-- one name. The two-argument `unaccent` because a one-argument call looks its
-- dictionary up through `search_path`, which is empty in here.
create or replace function public.places_name_similarity(name_a text, name_b text)
returns real
language sql
stable
set search_path = ''
as $$
  select extensions.similarity(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, name_a)),
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, name_b))
  );
$$;

-- 150 m is the spec's radius. 0.45 was measured against pairs of the shape this
-- app gets — the same place said shorter, said in full, or spelled without its
-- diacritics scored 0.53 and up; two different Romanian churches on one street,
-- which share most of their words, scored 0.33 and under. See
-- `src/data/__tests__/your-places.integration.test.ts`, which is that table.
create or replace function public.places_look_alike(
  name_a text, lat_a double precision, lng_a double precision,
  name_b text, lat_b double precision, lng_b double precision
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.places_distance_m(lat_a, lng_a, lat_b, lng_b) <= 150
    and public.places_name_similarity(name_a, name_b) >= 0.45;
$$;

-- Nothing in the app calls these; they exist for the trigger below and for the
-- suite that proves the threshold. A client that could call them could ask
-- whether a name it invented exists at an address — which is a way to read the
-- pending rows the policies hide.
revoke execute on function public.places_distance_m(double precision, double precision, double precision, double precision)
  from public, anon, authenticated;
revoke execute on function public.places_name_similarity(text, text)
  from public, anon, authenticated;
revoke execute on function public.places_look_alike(text, double precision, double precision, text, double precision, double precision)
  from public, anon, authenticated;

-- Moderator-facing only, which is why it is a table of its own rather than a
-- column on `places`: `select *` is how every screen reads a place, and a hint
-- about somebody else's pending submission is not the submitter's business.
-- RLS is on and no policy exists, so no client role can read a row of it; the
-- dashboard can.
create table public.place_duplicate_flags (
  place_id uuid not null references public.places (id) on delete cascade,
  similar_place_id uuid not null references public.places (id) on delete cascade,
  distance_m double precision not null,
  name_similarity real not null,
  created_at timestamptz not null default now(),
  primary key (place_id, similar_place_id)
);

comment on table public.place_duplicate_flags is
  'Submissions that landed within 150 m of a similarly named place. Moderator-facing: RLS is enabled and no policy exists, so no client can read it.';

alter table public.place_duplicate_flags enable row level security;

revoke all on table public.place_duplicate_flags from anon, authenticated;

-- One flag per place it might be a copy of, written when the place arrives.
--
-- `security definer` because the submitter cannot see what they might be
-- duplicating: another pending submission is invisible to them, and that is
-- exactly the case worth flagging.
create or replace function public.flag_duplicate_place()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.place_duplicate_flags (place_id, similar_place_id, distance_m, name_similarity)
  select
    new.id,
    other.id,
    public.places_distance_m(new.lat, new.lng, other.lat, other.lng),
    public.places_name_similarity(new.name, other.name)
  from public.places as other
  where other.id <> new.id
    and public.places_look_alike(new.name, new.lat, new.lng, other.name, other.lat, other.lng)
  on conflict do nothing;

  return null;
end;
$$;

revoke execute on function public.flag_duplicate_place() from public, anon, authenticated;

-- After insert, not before: the flag rows carry a foreign key to the place, so
-- the place has to exist. Insert only — an edit is looked at by the moderator
-- again anyway, and a flag written then would be about a name the first
-- submitter never saw.
create trigger places_insert_flags_duplicates
  after insert on public.places
  for each row
  execute function public.flag_duplicate_place();
