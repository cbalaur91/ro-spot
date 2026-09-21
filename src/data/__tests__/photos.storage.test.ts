/**
 * Integration test for the photo bucket, run against the real `rospot` project
 * for the same reason the RLS suite is: the thing under test is a bucket's
 * configuration, and a mock would only assert that we called the method we
 * called.
 *
 * `jest.config.js` drops this file from the run when the Supabase env is absent.
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../database.types';
import { SEED_PHOTO_PATHS } from '../fixtures';
import { PHOTO_BUCKET, placePhotoUrl } from '../places';
import { supabase } from '../supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const anon = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

afterAll(() => {
  // The app's client refreshes tokens on an interval; without this Jest hangs on
  // the open timer after the last assertion.
  supabase.auth.stopAutoRefresh();
});

describe(`${PHOTO_BUCKET} bucket`, () => {
  it('serves a seeded photo to a caller carrying no credentials at all', async () => {
    // Deliberately a bare `fetch` rather than a Supabase client: this is exactly
    // what `expo-image` does with the URL the detail screen hands it, headers
    // and all — which here is none.
    const response = await fetch(placePhotoUrl(SEED_PHOTO_PATHS[0]));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
  });

  it('has an object behind every seed photo path', async () => {
    // A seed path with no object behind it is a broken image wherever it is
    // pointed at, and nothing else in the stack would catch it.
    const statuses = await Promise.all(
      SEED_PHOTO_PATHS.map(async (path) => {
        const response = await fetch(placePhotoUrl(path), { method: 'HEAD' });
        return response.status;
      })
    );

    expect(statuses).toEqual(SEED_PHOTO_PATHS.map(() => 200));
  });

  it('denies anonymous uploads', async () => {
    // Public read is not public write. No storage write policy exists until the
    // submission slice adds one, so RLS must reject this outright.
    const { error } = await anon.storage
      .from(PHOTO_BUCKET)
      .upload('storage-suite/should-never-be-written.jpg', new Uint8Array([0xff, 0xd8]), {
        contentType: 'image/jpeg',
      });

    expect(error).not.toBeNull();
  });
});
