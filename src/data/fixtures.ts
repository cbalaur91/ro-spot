/**
 * Id of the place seeded by
 * `supabase/migrations/20260821000100_seed_walking_skeleton.sql`.
 *
 * Shared between the seed migration and the tests that assert on it, so a
 * renamed fixture breaks the build rather than silently passing.
 */
export const SEEDED_APPROVED_PLACE_ID = '00000000-0000-4000-8000-000000000001';

export const SEEDED_APPROVED_PLACE = {
  id: SEEDED_APPROVED_PLACE_ID,
  name: 'St. George Romanian Orthodox Cathedral',
  category: 'historic',
  description: 'Romanian Orthodox cathedral serving the Metro Detroit Romanian community.',
  address: '18405 W Nine Mile Rd, Southfield, MI 48075',
  lat: 42.4576,
  lng: -83.2409,
  status: 'approved',
  author_id: null,
  phone: null,
  website: null,
  social_url: null,
} as const;
