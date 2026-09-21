/**
 * Account deletion (#10), against the real `rospot` project and its deployed
 * `delete-account` Edge Function: a throwaway account that has submitted a
 * place, reported one and left an orphaned photo behind deletes itself, and
 * afterwards it cannot sign in and nothing it owned is left.
 *
 * `jest.config.js` drops this file when the Supabase env is absent.
 */
import { createClient } from '@supabase/supabase-js';

import { currentUser, deleteAccount, signIn, signUp } from '../auth';
import type { Database } from '../database.types';
import { SEEDED_APPROVED_PLACE_ID } from '../fixtures';
import { PHOTO_BUCKET } from '../places';
import { reportPlace } from '../reports';
import { submitPlace } from '../submissions';
import { supabase } from '../supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
/** Somebody else, on their own client, who must come through untouched. */
const bystander = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const leaver = { email: `rospot-delete-suite-${stamp}@example.com`, password: 'parola-de-proba-123' };
const other = { email: `rospot-delete-other-${stamp}@example.com`, password: 'parola-de-proba-123' };

/** The smallest thing the bucket will take for a JPEG: it checks the declared type. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer;

let leaverId: string;
let otherId: string;
/** The bystander's own pending place — the proof the function kept to its caller. */
let otherPlaceId: string;

async function photosOf(id: string) {
  const { data } = await admin.storage.from(PHOTO_BUCKET).list(id);
  return data ?? [];
}

/** The function's own endpoint, asked directly, as a client with no app behind it would. */
function callFunction(token: string | null) {
  return fetch(`${url}/functions/v1/delete-account`, {
    method: 'POST',
    headers: { apikey: anonKey, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

beforeAll(async () => {
  await signUp(leaver.email, leaver.password);
  const { data } = await supabase.auth.getUser();
  leaverId = data.user!.id;

  // Everything an account can own: a place with its photos, a report, and a
  // photo no row points at (what a failed submission leaves behind).
  await submitPlace({
    name: `Delete suite ${stamp}`,
    category: 'services',
    description: 'Written by the account-deletion suite; deleted with its author.',
    address: '1 Test St, Detroit, MI 48226',
    lat: 42.3314,
    lng: -83.0458,
    phone: null,
    website: null,
    socialUrl: null,
    photos: [JPEG, JPEG],
  });
  await reportPlace(SEEDED_APPROVED_PLACE_ID, `Delete suite ${stamp}`);
  // In a subfolder: the storage policy pins only the first folder, so a nested
  // file is possible, and `list` shows its folder as an entry with no id.
  const orphan = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(`${leaverId}/nested/orphan.jpg`, JPEG, { contentType: 'image/jpeg' });
  expect(orphan.error).toBeNull();

  const created = await bystander.auth.signUp(other);
  otherId = created.data.user!.id;
  const upload = await bystander.storage
    .from(PHOTO_BUCKET)
    .upload(`${otherId}/kept.jpg`, JPEG, { contentType: 'image/jpeg' });
  expect(upload.error).toBeNull();
  // Named and placed unlike the leaver's, so the duplicate check has nothing
  // to flag between them.
  const { data: kept, error: keptError } = await bystander
    .from('places')
    .insert({
      name: `Bystander bakery ${stamp}`,
      category: 'services',
      description: 'The bystander’s place; must survive the other account’s deletion.',
      address: '2 Test St, Warren, MI 48091',
      lat: 42.4775,
      lng: -83.0277,
      photo_paths: [`${otherId}/kept.jpg`],
      author_id: otherId,
      status: 'pending',
    })
    .select('id')
    .single();
  expect(keptError).toBeNull();
  otherPlaceId = kept!.id;
}, 60000);

afterAll(async () => {
  supabase.auth.stopAutoRefresh();
  await supabase.auth.signOut({ scope: 'local' });
  await bystander.auth.signOut();

  // Whatever the suite left, whichever way it ended: objects first, since the
  // user's rows cascade and the folder is the only other record of the files.
  for (const id of [leaverId, otherId]) {
    const files = await photosOf(id);
    if (files.length) {
      await admin.storage.from(PHOTO_BUCKET).remove(files.map((file) => `${id}/${file.name}`));
    }
    await admin.auth.admin.deleteUser(id);
  }
  await admin.storage.from(PHOTO_BUCKET).remove([`${leaverId}/nested/orphan.jpg`]);
}, 60000);

describe('the function refuses', () => {
  it('a caller with no session', async () => {
    expect((await callFunction(null)).status).toBe(401);
  });

  it('a token that is not a session', async () => {
    expect((await callFunction('not-a-jwt')).status).toBe(401);
  });
});

describe('deleting an account', () => {
  it('had something to delete', async () => {
    // Guards the assertions below against passing on an empty account.
    const { data: places } = await admin.from('places').select('id').eq('author_id', leaverId);
    const { data: reports } = await admin.from('reports').select('id').eq('reporter_id', leaverId);
    expect(places).toHaveLength(1);
    expect(reports).toHaveLength(1);
    // Two submitted photos and the nested folder the orphan sits in.
    expect(await photosOf(leaverId)).toHaveLength(3);
  });

  it('deletes it and signs this device out', async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session!.access_token;

    await deleteAccount();

    await expect(currentUser()).resolves.toBeNull();
    // The session token outlives the account on paper — it has not expired —
    // and the function answers it with "already deleted", which is what lets
    // a retry whose first answer was lost finish signing out.
    expect((await callFunction(token)).status).toBe(410);
  });

  it('leaves an account that cannot sign in', async () => {
    await expect(signIn(leaver.email, leaver.password)).rejects.toMatchObject({
      reason: 'invalidCredentials',
    });
    const { data } = await admin.auth.admin.getUserById(leaverId);
    expect(data.user).toBeNull();
  });

  it('takes its places, reports and photos with it', async () => {
    const { data: places } = await admin.from('places').select('id').eq('author_id', leaverId);
    const { data: reports } = await admin.from('reports').select('id').eq('reporter_id', leaverId);

    expect(places).toEqual([]);
    expect(reports).toEqual([]);
    // The orphan too: nothing but this ever clears a file no row points at.
    expect(await photosOf(leaverId)).toEqual([]);
    expect(await photosOf(`${leaverId}/nested`)).toEqual([]);
  });

  it('touches nobody else', async () => {
    const { data } = await admin.from('places').select('id').eq('id', otherPlaceId);
    expect(data).toHaveLength(1);
    expect(await photosOf(otherId)).toHaveLength(1);
    expect((await admin.auth.admin.getUserById(otherId)).data.user).not.toBeNull();
  });
});
