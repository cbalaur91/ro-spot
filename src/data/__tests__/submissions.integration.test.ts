/**
 * The submission contract, against the real `rospot` project: what a signed-in
 * person may write, what they may not, and that what they write stays out of
 * public view until the moderator says otherwise. The policies are the thing
 * under test, so a mock would only assert that we called the method we called.
 *
 * `jest.config.js` drops this file when the Supabase env is absent.
 */
import { createClient } from '@supabase/supabase-js';

import { signUp } from '../auth';
import type { Database } from '../database.types';
import { fetchApprovedPlaces, fetchPlace, PHOTO_BUCKET, placePhotoUrl } from '../places';
import { submitPlace, type PlaceSubmission } from '../submissions';
import { supabase } from '../supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A throwaway account per run, as in the auth suite: two runs must not race.
const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const email = `rospot-submit-suite-${stamp}@example.com`;
const password = 'parola-de-proba-123';
const NAME = `Submission suite ${stamp}`;

/** The smallest thing the bucket will take for a JPEG: it checks the declared type. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer;

const submission: PlaceSubmission = {
  name: NAME,
  category: 'food_drink',
  description: 'Written by the submission suite; deleted when it finishes.',
  address: '1 Test St, Detroit, MI 48226',
  lat: 42.3314,
  lng: -83.0458,
  phone: null,
  website: 'example.com',
  socialUrl: null,
  photos: [JPEG, JPEG],
};

let userId: string;

async function submittedRow() {
  const { data } = await admin.from('places').select('*').eq('name', NAME).maybeSingle();
  return data;
}

beforeAll(async () => {
  await signUp(email, password);
  const { data } = await supabase.auth.getUser();
  userId = data.user!.id;
});

afterAll(async () => {
  supabase.auth.stopAutoRefresh();
  await supabase.auth.signOut();

  // Objects first: deleting the user cascades to their rows, and the rows are
  // the only record of which objects were theirs.
  const { data: objects } = await admin.storage.from(PHOTO_BUCKET).list(userId);
  if (objects?.length) {
    await admin.storage
      .from(PHOTO_BUCKET)
      .remove(objects.map((object) => `${userId}/${object.name}`));
  }
  await admin.from('places').delete().like('name', 'Submission suite %');
  await admin.auth.admin.deleteUser(userId);
});

describe('submitting a place', () => {
  it('lands as pending, under the submitter, with its photos in their folder', async () => {
    await submitPlace(submission);

    const row = await submittedRow();
    expect(row).toMatchObject({
      status: 'pending',
      author_id: userId,
      address: submission.address,
      lat: submission.lat,
      lng: submission.lng,
      website: 'example.com',
    });
    expect(row!.photo_paths).toHaveLength(2);
    expect(row!.photo_paths.every((path) => path.startsWith(`${userId}/`))).toBe(true);

    const response = await fetch(placePhotoUrl(row!.photo_paths[0]), { method: 'HEAD' });
    expect(response.status).toBe(200);
  });

  it('is invisible to the public while it waits', async () => {
    const row = await submittedRow();

    const places = await fetchApprovedPlaces();
    expect(places.map((place) => place.id)).not.toContain(row!.id);
    await expect(fetchPlace(row!.id)).resolves.toBeNull();
  });

  it('appears in public browse once the moderator approves it', async () => {
    const row = await submittedRow();
    await admin.from('places').update({ status: 'approved' }).eq('id', row!.id);

    // Through the two reads the Map, the List and the detail screen are built on,
    // and once more with no session at all.
    const places = await fetchApprovedPlaces();
    expect(places.map((place) => place.id)).toContain(row!.id);
    await expect(fetchPlace(row!.id)).resolves.toMatchObject({ name: NAME });

    const { data } = await anon.from('places').select('id').eq('id', row!.id);
    expect(data).toEqual([{ id: row!.id }]);
  });
});

describe('what the policies refuse', () => {
  const row = {
    name: `Submission suite refused ${stamp}`,
    category: 'services' as const,
    description: 'Should never be written.',
    address: '1 Test St, Detroit, MI 48226',
    lat: 42.3314,
    lng: -83.0458,
  };

  it.each(['approved', 'rejected'] as const)('a submission that arrives %s', async (status) => {
    const { error } = await supabase.from('places').insert({
      ...row,
      author_id: userId,
      status,
      photo_paths: [`${userId}/x.jpg`],
    });
    expect(error).not.toBeNull();
  });

  it('a submission in someone else’s name', async () => {
    const { error } = await supabase.from('places').insert({
      ...row,
      author_id: '00000000-0000-4000-8000-00000000dead',
      photo_paths: [`${userId}/x.jpg`],
    });
    expect(error).not.toBeNull();
  });

  it('a submission with no photo, or with somebody else’s', async () => {
    const none = await supabase.from('places').insert({ ...row, author_id: userId });
    expect(none.error).not.toBeNull();

    const borrowed = await supabase
      .from('places')
      .insert({ ...row, author_id: userId, photo_paths: ['seed/st-george-1.jpg'] });
    expect(borrowed.error).not.toBeNull();

    // Inside their folder by prefix, outside it by the time a URL is resolved.
    const climbed = await supabase.from('places').insert({
      ...row,
      author_id: userId,
      photo_paths: [`${userId}/../seed/st-george-1.jpg`],
    });
    expect(climbed.error).not.toBeNull();
  });

  it('an anonymous submission', async () => {
    const { error } = await anon
      .from('places')
      .insert({ ...row, photo_paths: [`${userId}/x.jpg`] });
    expect(error).not.toBeNull();
  });

  it('an upload outside the submitter’s own folder', async () => {
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(`seed/submission-suite-${stamp}.jpg`, JPEG, { contentType: 'image/jpeg' });
    expect(error).not.toBeNull();
  });

  it('leaves nothing behind', async () => {
    const { data } = await admin.from('places').select('id').eq('name', row.name);
    expect(data).toEqual([]);
  });
});
