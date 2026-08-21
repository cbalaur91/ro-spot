-- Walking-skeleton fixtures (issue #2). Two rows with fixed ids so the RLS
-- integration test can assert on them by id:
--   * one approved place, which is what the List tab renders
--   * one pending place, which anonymous clients must never see
--
-- The launch seed (issue "Seed Metro Detroit places") replaces the approved row
-- with the owner's real list; its coordinates here are approximate.

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

insert into public.places (id, name, category, description, address, lat, lng, status)
values (
  '00000000-0000-4000-8000-000000000002',
  'RLS fixture — pending place (do not approve)',
  'food_drink',
  'Test fixture proving anonymous clients cannot read pending places. Not a real place.',
  '1 Test St, Southfield, MI 48075',
  42.4600,
  -83.2500,
  'pending'
)
on conflict (id) do nothing;
