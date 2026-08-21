/**
 * Integration test for the RLS contract, run against the real `rospot` project
 * (no Docker in this dev environment, so there is no local stack to point at).
 *
 * It is deliberately not a unit test: the thing under test is a Postgres policy,
 * and mocking Supabase would only assert that we wrote the query we wrote. Drop
 * the "Approved places are publicly readable" policy — or widen it to all
 * statuses — and this test fails.
 *
 * Requires EXPO_PUBLIC_SUPABASE_* and SUPABASE_SERVICE_ROLE_KEY in .env.
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../database.types';
import { SEEDED_APPROVED_PLACE_ID, SEEDED_PENDING_PLACE_ID } from '../fixtures';
import { fetchApprovedPlaces } from '../places';
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

afterAll(() => {
  // The app's client refreshes tokens on an interval; without this Jest hangs on
  // the open timer after the last assertion.
  supabase.auth.stopAutoRefresh();
});

describe('places RLS', () => {
  it('has both fixture rows in the database', async () => {
    // Precondition. Without this, "the pending place is invisible" would also
    // pass if the row simply did not exist.
    const { data, error } = await serviceRole
      .from('places')
      .select('id, status')
      .in('id', [SEEDED_APPROVED_PLACE_ID, SEEDED_PENDING_PLACE_ID]);

    expect(error).toBeNull();
    expect(data).toEqual(
      expect.arrayContaining([
        { id: SEEDED_APPROVED_PLACE_ID, status: 'approved' },
        { id: SEEDED_PENDING_PLACE_ID, status: 'pending' },
      ])
    );
  });

  it('hides the pending place from anonymous clients', async () => {
    // No status filter in the query: if any row comes back, the policy is what
    // failed, not the client.
    const { data, error } = await anon
      .from('places')
      .select('id')
      .eq('id', SEEDED_PENDING_PLACE_ID);

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

    const seeded = places.find((place) => place.id === SEEDED_APPROVED_PLACE_ID);
    expect(seeded).toBeDefined();
    expect(seeded).toMatchObject({
      name: 'St. George Romanian Orthodox Cathedral',
      category: 'historic',
      address: '18405 W Nine Mile Rd, Southfield, MI 48075',
    });
  });

  it('returns no pending places', async () => {
    const places = await fetchApprovedPlaces();

    expect(places.map((place) => place.id)).not.toContain(SEEDED_PENDING_PLACE_ID);
  });
});
