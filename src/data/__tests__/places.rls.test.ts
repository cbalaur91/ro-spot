/**
 * Integration test for the RLS contract, run against the real `rospot` project
 * (no Docker in this dev environment, so there is no local stack to point at).
 *
 * It is deliberately not a unit test: the thing under test is a Postgres policy,
 * and mocking Supabase would only assert that we wrote the query we wrote. Drop
 * the "Approved places are publicly readable" policy — or widen it to all
 * statuses — and this test fails.
 *
 * `jest.config.js` drops this file from the run when the Supabase env is absent,
 * so a fresh clone doesn't fail on missing credentials.
 */
import { createClient } from '@supabase/supabase-js';

import { METRO_DETROIT_PLACES } from '../../../scripts/seed/metro-detroit';
import type { Database } from '../database.types';
import { SEEDED_APPROVED_PLACE, SEEDED_APPROVED_PLACE_ID } from '../fixtures';
import { fetchApprovedPlaces, fetchPlace, type Place } from '../places';
import { supabase } from '../supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const anon = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const serviceRole = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type SeedFields = Pick<Place, 'id' | 'name' | 'category' | 'address' | 'lat' | 'lng'>;

// Owned by this suite rather than by a migration — a row that exists only to be
// invisible has no business in permanent schema history.
const PENDING_FIXTURE_ID = '00000000-0000-4000-8000-0000000000ff';

beforeAll(async () => {
  const { error } = await serviceRole.from('places').upsert({
    id: PENDING_FIXTURE_ID,
    name: 'RLS suite fixture — pending place',
    category: 'food_drink',
    description: 'Created and removed by the RLS suite. Not a real place.',
    address: '1 Test St, Southfield, MI 48075',
    lat: 42.46,
    lng: -83.25,
    status: 'pending',
  });

  if (error) throw new Error(`Could not seed the pending fixture: ${error.message}`);
});

afterAll(async () => {
  // The app's client refreshes tokens on an interval; without this Jest hangs on
  // the open timer after the last assertion.
  supabase.auth.stopAutoRefresh();
  await serviceRole.from('places').delete().eq('id', PENDING_FIXTURE_ID);
});

describe('places RLS', () => {
  it('has the pending fixture in the database', async () => {
    // Precondition. Without this, "the pending place is invisible" would also
    // pass if the row simply did not exist.
    const { data, error } = await serviceRole
      .from('places')
      .select('id, status')
      .eq('id', PENDING_FIXTURE_ID);

    expect(error).toBeNull();
    expect(data).toEqual([{ id: PENDING_FIXTURE_ID, status: 'pending' }]);
  });

  it('hides the pending place from anonymous clients', async () => {
    // No status filter in the query: if any row comes back, the policy is what
    // failed, not the client.
    const { data, error } = await anon
      .from('places')
      .select('id')
      .eq('id', PENDING_FIXTURE_ID);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('exposes only approved places to an unfiltered anonymous read', async () => {
    const { data, error } = await anon.from('places').select('id, status');

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((place) => place.status === 'approved')).toBe(true);
    expect(data!.map((place) => place.id)).toContain(SEEDED_APPROVED_PLACE_ID);
  });

  it('denies anonymous inserts', async () => {
    // No insert policy exists yet, so RLS must reject the write outright rather
    // than letting an unmoderated row land as pending.
    const { error } = await anon.from('places').insert({
      name: 'RLS test — should never be written',
      category: 'services',
      description: 'Written by an automated test. If you see this row, RLS broke.',
      address: '1 Test St',
      lat: 42.4,
      lng: -83.2,
    });

    expect(error).not.toBeNull();
  });
});

describe('fetchApprovedPlaces', () => {
  it('returns the seeded approved place', async () => {
    const places = await fetchApprovedPlaces();

    expect(places.find((place) => place.id === SEEDED_APPROVED_PLACE_ID)).toMatchObject({
      name: SEEDED_APPROVED_PLACE.name,
      category: SEEDED_APPROVED_PLACE.category,
      address: SEEDED_APPROVED_PLACE.address,
    });
  });

  // Proves `bun scripts/seed-metro-detroit.ts` has run against this project and
  // that nothing has drifted from the list since.
  it('returns every Metro Detroit launch place', async () => {
    const places = await fetchApprovedPlaces();
    // Compared as whole lists, so a miss names the place rather than failing on
    // `undefined`.
    const pick = ({ id, name, category, address, lat, lng }: SeedFields) => ({
      id,
      name,
      category,
      address,
      lat,
      lng,
    });

    expect(places.map(pick)).toEqual(expect.arrayContaining(METRO_DETROIT_PLACES.map(pick)));
  });

  it('returns no pending places', async () => {
    const places = await fetchApprovedPlaces();

    expect(places.map((place) => place.id)).not.toContain(PENDING_FIXTURE_ID);
  });
});

describe('fetchPlace', () => {
  it('returns the seeded approved place, photo paths and all', async () => {
    const place = await fetchPlace(SEEDED_APPROVED_PLACE_ID);

    expect(place).toMatchObject({
      name: SEEDED_APPROVED_PLACE.name,
      photo_paths: SEEDED_APPROVED_PLACE.photo_paths,
    });
  });

  it('will not open a pending place by id', async () => {
    // The one that matters: a place is `pending` precisely because nobody has
    // approved it, and a direct link must not be a way around that.
    expect(await fetchPlace(PENDING_FIXTURE_ID)).toBeNull();
  });

  it('answers "no such place" for an id nothing was ever written under', async () => {
    expect(await fetchPlace('00000000-0000-4000-8000-00000000dead')).toBeNull();
  });

  it('answers "no such place" for an id that is not a UUID at all', async () => {
    // Postgres rejects this one rather than returning no rows, and a stale link
    // should still read as a missing place rather than an error screen.
    expect(await fetchPlace('not-a-uuid')).toBeNull();
  });
});
