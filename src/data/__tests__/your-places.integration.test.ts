/**
 * What an author may see and change about their own places, against the real
 * `rospot` project — and what the duplicate hint tells the moderator.
 *
 * The rules under test are database rules: a select policy, a column grant, an
 * update policy and two triggers. A mock would only assert that we called the
 * method we called, so this suite drives the app's own data module and reads
 * the result back with the service role.
 *
 * `jest.config.js` drops this file when the Supabase env is absent.
 */
import { createClient } from '@supabase/supabase-js';

import { signUp } from '../auth';
import type { Database } from '../database.types';
import { SEEDED_APPROVED_PLACE, SEEDED_APPROVED_PLACE_ID } from '../fixtures';
import { fetchApprovedPlaces, fetchPlace, PHOTO_BUCKET, type Place } from '../places';
import { fetchMyPlaces, submitPlace, updatePlace, type PlaceSubmission } from '../submissions';
import { supabase } from '../supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A second signed-in person, on their own client: the shared one holds the author. */
const stranger = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A throwaway pair of accounts per run, as the other suites do: two runs of this
// file must not be able to see each other's rows.
const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const author = { email: `rospot-mine-author-${stamp}@example.com`, password: 'parola-de-proba-123' };
const other = { email: `rospot-mine-other-${stamp}@example.com`, password: 'parola-de-proba-123' };

const PREFIX = `Your places suite ${stamp}`;

/**
 * The marker the duplicate block's places carry instead of that prefix. Names
 * are what the duplicate rule reads, and rows sharing twenty characters of
 * suite name look alike to it however different the places are.
 */
const MARK = `zz${stamp.slice(-4)}`;

/** The smallest thing the bucket will take for a JPEG: it checks the declared type. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer;

/** Far enough from the seeded cathedral that nothing here flags against it. */
const DOWNTOWN = { lat: 42.3314, lng: -83.0458 };

function submission(overrides: Partial<PlaceSubmission> = {}): PlaceSubmission {
  return {
    name: PREFIX,
    category: 'food_drink',
    description: 'Written by the your-places suite; deleted when it finishes.',
    address: '1 Test St, Detroit, MI 48226',
    ...DOWNTOWN,
    phone: null,
    website: null,
    socialUrl: null,
    photos: [JPEG],
    ...overrides,
  };
}

/** One of the suite's own rows, read with the service role. */
async function rowNamed(name: string): Promise<Place> {
  const { data } = await admin.from('places').select('*').eq('name', name).maybeSingle();
  return data!;
}

let authorId: string;
let otherId: string;

beforeAll(async () => {
  await signUp(author.email, author.password);
  const { data } = await supabase.auth.getUser();
  authorId = data.user!.id;

  const created = await stranger.auth.signUp(other);
  otherId = created.data.user!.id;
}, 60000);

afterAll(async () => {
  supabase.auth.stopAutoRefresh();
  await supabase.auth.signOut();
  await stranger.auth.signOut();

  // Objects first: deleting a user cascades to their rows, and the rows are the
  // only record of which objects were theirs.
  for (const id of [authorId, otherId]) {
    const { data: objects } = await admin.storage.from(PHOTO_BUCKET).list(id);
    if (objects?.length) {
      await admin.storage.from(PHOTO_BUCKET).remove(objects.map((object) => `${id}/${object.name}`));
    }
    await admin.auth.admin.deleteUser(id);
  }
  await admin.from('places').delete().like('name', 'Your places suite %');
  await admin.from('places').delete().like('name', `%${MARK}%`);
}, 60000);

describe('your places', () => {
  it('shows the author their own submission while the public cannot see it', async () => {
    await submitPlace(submission());

    const mine = await fetchMyPlaces();
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ name: PREFIX, status: 'pending', author_id: authorId });

    // The same rows, asked for by somebody else who is also signed in.
    const { data } = await stranger.from('places').select('id').eq('id', mine[0].id);
    expect(data).toEqual([]);
  });

  it('is only the author’s own places, not every approved one', async () => {
    const mine = await fetchMyPlaces();

    expect(mine.map((place) => place.id)).not.toContain(SEEDED_APPROVED_PLACE_ID);
  });

  it('newest first', async () => {
    await submitPlace(submission({ name: `${PREFIX} second` }));

    const mine = await fetchMyPlaces();
    expect(mine.map((place) => place.name)).toEqual([`${PREFIX} second`, PREFIX]);
  });
});

describe('an author’s edit', () => {
  /** The place from the first block, as the moderator left it: approved and public. */
  async function approvedPlace(): Promise<Place> {
    const row = await rowNamed(PREFIX);
    await admin.from('places').update({ status: 'approved' }).eq('id', row.id);
    return rowNamed(PREFIX);
  }

  it('is not undone by the moderator’s own approval', async () => {
    // The same trigger that re-pends an author's edit must not fire for the
    // dashboard: approving a place is an update like any other.
    expect((await approvedPlace()).status).toBe('approved');
  });

  it('saves the change, returns the place to review, and takes it out of browse', async () => {
    const before = await approvedPlace();
    expect((await fetchApprovedPlaces()).map((place) => place.id)).toContain(before.id);

    await updatePlace(before.id, {
      name: PREFIX,
      category: 'services',
      description: 'Edited by the your-places suite.',
      address: '2 Test St, Detroit, MI 48226',
      lat: DOWNTOWN.lat,
      lng: DOWNTOWN.lng,
      phone: '313 555 0100',
      website: null,
      socialUrl: null,
      // The photo it already had, kept, plus one that still has to go up.
      photos: [before.photo_paths[0], JPEG],
    });

    const after = await rowNamed(PREFIX);
    expect(after).toMatchObject({
      status: 'pending',
      category: 'services',
      address: '2 Test St, Detroit, MI 48226',
      phone: '313 555 0100',
    });
    expect(after.photo_paths).toHaveLength(2);
    expect(after.photo_paths[0]).toBe(before.photo_paths[0]);
    expect(after.photo_paths[1]).toMatch(new RegExp(`^${authorId}/`));

    expect((await fetchApprovedPlaces()).map((place) => place.id)).not.toContain(after.id);
    await expect(fetchPlace(after.id)).resolves.toBeNull();
    // Still the author's own, so they can see what they did to it.
    expect((await fetchMyPlaces()).map((place) => place.id)).toContain(after.id);
  });

  it('cannot approve itself', async () => {
    const row = await rowNamed(PREFIX);

    const { error } = await supabase.from('places').update({ status: 'approved' }).eq('id', row.id);

    expect(error).not.toBeNull();
    expect((await rowNamed(PREFIX)).status).toBe('pending');
  });

  it('cannot hand the place to somebody else', async () => {
    const row = await rowNamed(PREFIX);

    const { error } = await supabase.from('places').update({ author_id: otherId }).eq('id', row.id);

    expect(error).not.toBeNull();
    expect((await rowNamed(PREFIX)).author_id).toBe(authorId);
  });

  it('reaches nobody else’s place — not another author’s, not the owner’s seed', async () => {
    const { data: mine } = await supabase
      .from('places')
      .update({ name: `${PREFIX} stolen` })
      .eq('id', SEEDED_APPROVED_PLACE_ID)
      .select('id');
    expect(mine).toEqual([]);

    // The data module turns those nought rows into a refusal rather than a save
    // that silently did nothing.
    await expect(
      updatePlace(SEEDED_APPROVED_PLACE_ID, {
        ...submission(),
        photos: [],
      })
    ).rejects.toThrow('not yours to edit');

    const seed = await admin
      .from('places')
      .select('name, status')
      .eq('id', SEEDED_APPROVED_PLACE_ID)
      .single();
    expect(seed.data).toEqual({ name: SEEDED_APPROVED_PLACE.name, status: 'approved' });
  });
});

describe('the duplicate hint', () => {
  /** Roughly 45 m north-east of the seeded cathedral. */
  const NEXT_DOOR = { lat: SEEDED_APPROVED_PLACE.lat + 0.0003, lng: SEEDED_APPROVED_PLACE.lng + 0.0003 };

  async function flagsFor(placeId: string) {
    const { data } = await admin
      .from('place_duplicate_flags')
      .select('*')
      .eq('place_id', placeId);
    return data ?? [];
  }

  it('flags a submission that lands next to a similarly named place', async () => {
    // The seeded cathedral, submitted again by somebody who typed it afresh.
    const name = `St George Romanian Orthodox Cathedral ${MARK}`;
    await submitPlace(submission({ name, ...NEXT_DOOR }));

    const flags = await flagsFor((await rowNamed(name)).id);
    expect(flags).toHaveLength(1);
    expect(flags[0].similar_place_id).toBe(SEEDED_APPROVED_PLACE_ID);
    expect(flags[0].distance_m).toBeLessThan(150);
    expect(flags[0].name_similarity).toBeGreaterThanOrEqual(0.45);
  });

  it('leaves a different place at the same address alone', async () => {
    const name = `Casa Dracula ${MARK}`;
    await submitPlace(submission({ name, ...NEXT_DOOR }));

    expect(await flagsFor((await rowNamed(name)).id)).toEqual([]);
  });

  it('leaves the same name across town alone', async () => {
    const name = `St George Romanian Orthodox Cathedral ${MARK} downtown`;
    await submitPlace(submission({ name }));

    expect(await flagsFor((await rowNamed(name)).id)).toEqual([]);
  });

  it('is moderator-facing: no client can read it', async () => {
    const { error } = await supabase.from('place_duplicate_flags').select('*');

    expect(error).not.toBeNull();
  });
});

describe('places_look_alike', () => {
  const here = SEEDED_APPROVED_PLACE;

  async function lookAlike(
    nameA: string,
    nameB: string,
    b: { lat: number; lng: number } = here
  ): Promise<boolean> {
    const { data, error } = await admin.rpc('places_look_alike', {
      name_a: nameA,
      lat_a: here.lat,
      lng_a: here.lng,
      name_b: nameB,
      lat_b: b.lat,
      lng_b: b.lng,
    });
    if (error) throw new Error(error.message);
    return data!;
  }

  // Pairs of the shape this app actually gets: the same place said shorter, said
  // in full, spelled without diacritics, or with the apostrophe left out.
  it.each([
    ['St. George Romanian Orthodox Cathedral', 'St George Cathedral'],
    ['St. George Romanian Orthodox Cathedral', 'Saint George Romanian Orthodox Church'],
    ['Europa Market', 'Europa Deli & Market'],
    ['Dracula’s Bakery', 'Draculas Bakery'],
    ['Casa Română', 'casa romana'],
  ])('the same place twice: %s / %s', async (a, b) => {
    await expect(lookAlike(a, b)).resolves.toBe(true);
  });

  // Neighbours, not duplicates — including two Romanian churches, which share
  // most of their words without being the same building.
  it.each([
    ['Europa Market', 'Romanian Bakery'],
    ['St. George Cathedral', 'St. Mary Church'],
    ['Casa Romana Restaurant', 'Casa Dracula'],
    ['St. George Romanian Orthodox Cathedral', 'Holy Trinity Romanian Orthodox Church'],
    ['Romanian American Club', 'Romanian Bakery'],
  ])('two places at one address: %s / %s', async (a, b) => {
    await expect(lookAlike(a, b)).resolves.toBe(false);
  });

  it('measures the distance, not the postcode', async () => {
    const name = 'Casa Romana';
    // ~110 m north, then ~330 m north: the radius is 150.
    await expect(lookAlike(name, name, { ...here, lat: here.lat + 0.001 })).resolves.toBe(true);
    await expect(lookAlike(name, name, { ...here, lat: here.lat + 0.003 })).resolves.toBe(false);
  });

  it('is not something a client may call', async () => {
    const { error } = await supabase.rpc('places_look_alike', {
      name_a: 'a',
      lat_a: here.lat,
      lng_a: here.lng,
      name_b: 'a',
      lat_b: here.lat,
      lng_b: here.lng,
    });

    expect(error).not.toBeNull();
  });
});
