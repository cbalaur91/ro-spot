-- Photos for a place, and the bucket they live in.
--
-- The paths are an array column on `places` rather than a `place_photos` table:
-- v1 allows 1-5 photos with no per-photo metadata, so an array keeps a place and
-- its photos one row, one insert on submission, and one access rule — the
-- existing "approved places are publicly readable" policy already decides who
-- sees the photos, with no subquery back to the parent row.
--
-- Array order is display order. Paths are relative to the bucket:
--   <author_id>/<uuid>.jpg  for submissions — the first folder is the handle the
--                           submission slice will write its storage policy against
--   seed/<slug>-<n>.jpg     for places the owner seeds

alter table public.places
  add column photo_paths text[] not null default '{}';

-- The spec's ceiling is five. The floor is zero rather than one because the
-- submission form is what requires a photo: a place seeded before its photos are
-- uploaded has to be representable, and `pending` rows are invisible anyway.
alter table public.places
  add constraint places_photo_paths_max
  check (coalesce(array_length(photo_paths, 1), 0) <= 5);

-- A null element would reach the client as a path it can't build a URL from.
alter table public.places
  add constraint places_photo_paths_no_nulls
  check (array_position(photo_paths, null) is null);

-- Public read, because a place that is approved is public and its photos are
-- part of it. Reads of a public bucket go through the `/object/public/` route,
-- which does not consult `storage.objects` policies — and no write policy exists
-- yet, so RLS denies every upload until the submission slice adds one.
--
-- JPEG only: the client compresses to ~1600px / ~80% JPEG before uploading, so
-- anything else in here would be something that skipped that step.
--
-- `do update`, not `do nothing`: a bucket of this name that already exists but
-- is private would otherwise silently stay private, which is the one property
-- this migration is here to guarantee.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-photos', 'place-photos', true, 5242880, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
