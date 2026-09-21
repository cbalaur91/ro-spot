import type { Database } from '@/data/database.types';

type PlaceInsert = Database['public']['Tables']['places']['Insert'];

/**
 * A place the owner seeds. `slug` names its photo folder,
 * `assets/seed-photos/<slug>/`, and the bucket folder they go to, `seed/<slug>/`
 * — a folder per place rather than the flat `seed/<slug>-<n>.jpg` the photos
 * migration sketched, so a photo keeps its name (and its URL) when another is
 * added. `id` is fixed so a re-run updates the row instead of adding a second one.
 *
 * The contact fields are required-but-nullable, not optional: the rows go to
 * PostgREST as one bulk insert, which needs every object to carry the same keys.
 */
export type SeedPlace = Pick<
  PlaceInsert,
  'name' | 'category' | 'description' | 'address' | 'lat' | 'lng'
> & {
  id: string;
  slug: string;
  phone: string | null;
  website: string | null;
  social_url: string | null;
};

export type SeedRow = Omit<SeedPlace, 'slug'> & {
  status: 'approved';
  author_id: null;
  photo_paths: string[];
};

export type SeedUpload = { slug: string; file: string; path: string };

// The places table caps a place at five photos; the bucket takes JPEG only, and a
// submitted photo's filename is held to the same characters.
const MAX_PHOTOS = 5;
const PHOTO_FILE = /^[A-Za-z0-9_-]+\.jpg$/;

/**
 * What the seed writes: one approved, authorless row per place, and the photo
 * uploads its `photo_paths` point at. Pure — the caller lists the folders and
 * does the I/O — and it throws before anything is written if the input is wrong.
 */
export function planSeed(
  places: readonly SeedPlace[],
  photosBySlug: Readonly<Record<string, readonly string[]>>
): { rows: SeedRow[]; uploads: SeedUpload[] } {
  assertUnique(places.map((p) => p.id), 'id');
  assertUnique(places.map((p) => p.slug), 'slug');

  const slugs = new Set(places.map((p) => p.slug));
  for (const slug of Object.keys(photosBySlug)) {
    if (!slugs.has(slug)) {
      throw new Error(`assets/seed-photos/${slug}/ belongs to no seeded place`);
    }
  }

  const uploads: SeedUpload[] = [];
  const rows = places.map(({ slug, ...place }): SeedRow => {
    const files = [...(photosBySlug[slug] ?? [])].sort();
    if (files.length > MAX_PHOTOS) {
      throw new Error(`${slug}: at most ${MAX_PHOTOS} photos, found ${files.length}`);
    }
    for (const file of files) {
      if (!PHOTO_FILE.test(file)) {
        throw new Error(`${slug}/${file}: photos must be .jpg named with A-Z, 0-9, - or _`);
      }
    }

    const placeUploads = files.map((file) => ({ slug, file, path: `seed/${slug}/${file}` }));
    uploads.push(...placeUploads);

    return {
      ...place,
      status: 'approved',
      author_id: null,
      photo_paths: placeUploads.map((u) => u.path),
    };
  });

  return { rows, uploads };
}

function assertUnique(values: string[], field: string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Two seeded places share the ${field} ${value}`);
    seen.add(value);
  }
}
