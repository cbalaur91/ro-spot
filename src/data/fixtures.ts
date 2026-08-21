/**
 * Ids of the walking-skeleton rows seeded by
 * `supabase/migrations/20260821000100_seed_walking_skeleton.sql`.
 *
 * Shared between the seed migration and the tests that assert on it, so a
 * renamed fixture breaks the build rather than silently passing.
 */
export const SEEDED_APPROVED_PLACE_ID = '00000000-0000-4000-8000-000000000001';
export const SEEDED_PENDING_PLACE_ID = '00000000-0000-4000-8000-000000000002';
