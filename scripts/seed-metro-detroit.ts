/**
 * Seeds the Metro Detroit launch places (issue #11) as approved, with any photos
 * in `assets/seed-photos/<slug>/` uploaded to `seed/<slug>/` in `place-photos`.
 *
 * Run from the repo root (Bun reads `.env` from the working directory), once per
 * environment and again whenever the list or a photo folder changes:
 *
 *   bun scripts/seed-metro-detroit.ts
 *
 * Safe to re-run — rows are keyed on fixed ids, photos uploaded with `x-upsert`:
 * - A new place is inserted approved. An existing one gets its fields and photo
 *   paths rewritten from the list, but never its status, so a place the
 *   moderator has since hidden stays hidden.
 * - The list and the folders are the truth: an empty folder empties the
 *   gallery, and a photo removed or renamed leaves its old object behind in the
 *   bucket. To replace a photo, give it a new name — the same name keeps the same
 *   public URL, which image caches will go on serving.
 * - A place taken off the list is not touched; hide or delete it in the dashboard.
 * - Photos go up before rows, so no row points at an object that isn't there.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY: approved rows and the `seed/` folder are both
 * closed to clients.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { METRO_DETROIT_PLACES } from './seed/metro-detroit';
import { planSeed } from './seed/plan';

const PHOTOS_DIR = join(import.meta.dirname, '..', 'assets', 'seed-photos');

const url = required(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL');
const key = required(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
const auth = { apikey: key, Authorization: `Bearer ${key}` };

// Only folders, and only files inside them: the loose JPEGs beside the folders
// are the cathedral's old placeholders, which `upload-seed-photos.sh` owns.
const photosBySlug = Object.fromEntries(
  readdirSync(PHOTOS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((dir) => [
      dir.name,
      readdirSync(join(PHOTOS_DIR, dir.name), { withFileTypes: true })
        .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
        .map((entry) => entry.name),
    ])
);

const { rows, uploads } = planSeed(METRO_DETROIT_PLACES, photosBySlug);

for (const upload of uploads) {
  await send('POST', `/storage/v1/object/place-photos/${upload.path}`, {
    headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
    body: readFileSync(join(PHOTOS_DIR, upload.slug, upload.file)),
  });
  console.log(`photo  ${upload.path}`);
}

// Two writes rather than one upsert, so that status is only ever set on insert.
await send('POST', '/rest/v1/places', {
  headers: {
    'Content-Type': 'application/json',
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  },
  body: JSON.stringify(rows),
});
for (const { id, status: _status, author_id: _author, ...fields } of rows) {
  await send('PATCH', `/rest/v1/places?id=eq.${id}`, {
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(fields),
  });
  console.log(`place  ${fields.name} (${fields.photo_paths.length} photos)`);
}

async function send(
  method: 'POST' | 'PATCH',
  path: string,
  init: { headers: Record<string, string>; body: BodyInit }
) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { ...auth, ...init.headers },
    body: init.body,
  });
  if (!response.ok) {
    throw new Error(`${path} failed with HTTP ${response.status}: ${await response.text()}`);
  }
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not set — run from the repo root so Bun loads .env`);
  return value;
}
