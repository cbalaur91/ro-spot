// Account deletion (#10): the signed-in caller's account and everything it owns.
//
// An Edge Function rather than an RPC because deleting an auth user is an Admin
// API call, and because the photos live in Storage, which SQL may not delete
// from. It runs with the service role, so the one rule that matters is enforced
// here: the account deleted is the one the session token belongs to. There is no
// argument to name another.
//
// Deno, not the app's toolchain — `tsconfig.json` and ESLint leave this folder
// alone. Deploy with `supabase functions deploy delete-account --use-api`.

import { createClient } from 'npm:@supabase/supabase-js@2';

// `supabase/migrations/20260821000200_add_place_photos.sql`; the app's copy is
// `PHOTO_BUCKET` in `src/data/places.ts`.
const PHOTO_BUCKET = 'place-photos';

// For the web preview, which calls from a browser. The native app sends no
// preflight and ignores these.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * Every file under `prefix`, however deep. Uploads are flat today, but the
 * storage policy only pins the first folder, so a nested one is possible — and
 * `list` shows a folder as an entry with no id, which `remove` can't take.
 */
async function filesUnder(prefix: string): Promise<string[]> {
  const bucket = admin.storage.from(PHOTO_BUCKET);
  const paths: string[] = [];

  for (let offset = 0; ; offset += 1000) {
    const { data: entries, error } = await bucket.list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`list photos: ${error.message}`);

    for (const entry of entries ?? []) {
      const path = `${prefix}/${entry.name}`;
      paths.push(...(entry.id === null ? await filesUnder(path) : [path]));
    }
    if (!entries || entries.length < 1000) return paths;
  }
}

/**
 * Every photo in the account's folder, uploaded or orphaned alike: a failed
 * submission and a photo an edit dropped both leave files no row points at, and
 * this is the only thing that ever clears them.
 */
async function removePhotos(userId: string): Promise<void> {
  const paths = await filesUnder(userId);

  // `remove` takes a batch; 1000 keeps one request well inside its limits.
  for (let start = 0; start < paths.length; start += 1000) {
    const { error } = await admin.storage
      .from(PHOTO_BUCKET)
      .remove(paths.slice(start, start + 1000));
    if (error) throw new Error(`remove photos: ${error.message}`);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  // The token is checked here, against the auth server, rather than by the
  // gateway (`verify_jwt = false` in `config.toml`): the gateway's check only
  // knows the legacy JWT secret, and `getUser` also refuses a token whose user
  // is already gone.
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'not_signed_in' });

  const { data, error: userError } = await admin.auth.getUser(token);
  // A well-formed session whose user no longer exists is the answer to a retry
  // after a deletion whose response never reached the phone. Saying so, rather
  // than 401, lets the app finish signing out instead of offering "try again"
  // to an account that is already gone.
  if (userError?.code === 'user_not_found') return reply(410, { error: 'already_deleted' });
  if (userError || !data.user) return reply(401, { error: 'not_signed_in' });

  const userId = data.user.id;

  try {
    // Places first, so nothing public outlives a failure further down: an
    // approved place whose photos were already gone would show broken images
    // to everybody. Then the photos, while the folder is still the account's.
    // The user last — a failure before it leaves an account that can try
    // again, not files that belong to nobody.
    const { error: placesError } = await admin.from('places').delete().eq('author_id', userId);
    if (placesError) throw new Error(`delete places: ${placesError.message}`);

    await removePhotos(userId);

    // Reports go with the user (`on delete cascade`), as would any place that
    // slipped in between the two steps.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`delete user: ${deleteError.message}`);
  } catch (error) {
    console.error(`delete-account ${userId}:`, error);
    return reply(500, { error: 'deletion_failed' });
  }

  return reply(200, { deleted: userId });
});
