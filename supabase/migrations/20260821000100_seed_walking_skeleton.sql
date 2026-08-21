-- The first real place on the map, with a fixed id so the walking-skeleton tests
-- can assert on it. The launch seed (issue "Seed Metro Detroit places") replaces
-- this with the owner's full list; the coordinates here are approximate.
--
-- Only real content lives in migrations. The RLS suite creates and deletes its
-- own pending row, so no test fixture ends up in permanent schema history.

insert into public.places (id, name, category, description, address, lat, lng, status)
values (
  '00000000-0000-4000-8000-000000000001',
  'St. George Romanian Orthodox Cathedral',
  'historic',
  'Romanian Orthodox cathedral serving the Metro Detroit Romanian community.',
  '18405 W Nine Mile Rd, Southfield, MI 48075',
  42.4576,
  -83.2409,
  'approved'
)
on conflict (id) do nothing;
