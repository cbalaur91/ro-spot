import { PHOTO_BUCKET, type Place, type PlaceCategory } from './places';
import { supabase } from './supabase';

/**
 * A place as the Add form hands it over: already validated, already pinned, its
 * photos already compressed. The photos are bytes rather than URIs so this
 * module never has to know how a device reads a file — and so the integration
 * suite can drive it from Node.
 */
export type PlaceSubmission = {
  name: string;
  category: PlaceCategory;
  description: string;
  /** The address as typed; the pin below is where it actually is. */
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  socialUrl: string | null;
  /** JPEGs, in display order. One to five — the insert policy checks it too. */
  photos: ArrayBuffer[];
};

/**
 * A place as the edit form hands it back. The same fields, and photos that are
 * a mix of the two things a photo can be by then: a path already in the bucket,
 * kept, or bytes that still have to go up. Order is display order either way.
 */
export type PlaceEdit = Omit<PlaceSubmission, 'photos'> & {
  photos: (string | ArrayBuffer)[];
};

/**
 * Unique within one person's folder, which is all it has to be: the folder is
 * the user id, and the storage policy is written against that, not this.
 */
function photoPath(userId: string, index: number): string {
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${userId}/${unique}-${index}.jpg`;
}

/** Whoever is signed in, or nobody. */
async function currentUserId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getSession();
  return auth.session?.user.id ?? null;
}

/** The same, for the writes that cannot mean anything without an author. */
async function signedInUserId(doing: string): Promise<string> {
  const userId = await currentUserId();
  if (!userId) {
    throw new Error(`Failed to ${doing}: nobody is signed in`);
  }
  return userId;
}

/**
 * The paths a row should carry, uploading whatever isn't up there yet.
 *
 * A string is a photo already in the bucket — an edit that kept it — and is
 * passed through: re-uploading bytes the app would have to download first is
 * work for nobody. Bytes are new and land in the submitter's own folder, which
 * is the only place the storage policy lets them.
 */
async function uploadedPaths(userId: string, photos: (string | ArrayBuffer)[]): Promise<string[]> {
  return Promise.all(
    photos.map(async (photo, index) => {
      if (typeof photo === 'string') return photo;

      const path = photoPath(userId, index);
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, photo, { contentType: 'image/jpeg' });

      if (error) {
        throw new Error(`Failed to upload photo: ${error.message}`);
      }
      return path;
    })
  );
}

/**
 * Uploads the photos, then writes the place as `pending`.
 *
 * `status` and `author_id` are stated here but decided by the insert policy,
 * which refuses any other value — see `__tests__/submissions.integration.test.ts`.
 * Nothing is read back: the row the author then sees comes from `fetchMyPlaces`.
 *
 * Photos go first because the row carries their paths. If the insert then
 * fails the uploads are orphaned in the submitter's folder; they are
 * unreferenced and unlisted, and account deletion (#10) clears the folder.
 */
export async function submitPlace(submission: PlaceSubmission): Promise<void> {
  const userId = await signedInUserId('submit place');
  const photoPaths = await uploadedPaths(userId, submission.photos);

  const { error } = await supabase.from('places').insert({
    name: submission.name,
    category: submission.category,
    description: submission.description,
    address: submission.address,
    lat: submission.lat,
    lng: submission.lng,
    phone: submission.phone,
    website: submission.website,
    social_url: submission.socialUrl,
    photo_paths: photoPaths,
    author_id: userId,
    status: 'pending',
  });

  if (error) {
    throw new Error(`Failed to submit place: ${error.message}`);
  }
}

/**
 * Every place the signed-in person has submitted, whatever became of it —
 * newest first, because the one you just sent is the one you came to look for.
 *
 * The `author_id` filter is not the security boundary (the select policy is),
 * it is what keeps the query from also returning every approved place in the
 * country: policies are permissive, so "mine" and "public" are OR'd.
 *
 * Nobody signed in is nobody's places rather than a failure — the Profile tab
 * reads this alongside a session that can end while the query is in flight.
 */
export async function fetchMyPlaces(): Promise<Place[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load your places: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Saves an author's edit of their own place, which sends it back for review.
 *
 * `status` is not written here and could not be: `authenticated` holds no
 * update privilege on that column, and a trigger sets it to `pending` for
 * every edit that arrives from a client. So the rule survives this module
 * being wrong — see `__tests__/your-places.integration.test.ts`.
 *
 * A place that isn't the author's own updates no rows and reports no error,
 * which is RLS working; it reads back the id to tell that apart from a save.
 *
 * Photos that were removed stay in the bucket. There is no delete policy on
 * purpose (#7: a photo behind an approved place can't be swapped after the
 * moderator saw it), so they are unreferenced until account deletion (#10).
 */
export async function updatePlace(id: string, edit: PlaceEdit): Promise<void> {
  const userId = await signedInUserId('save place');

  // Asked before the photos go up, not after: the uploads cannot be taken back
  // (there is no delete policy), so a save that was never going to land must not
  // leave files behind. The policy is still what decides — this only spares the
  // bucket the litter of an edit aimed at somebody else's place.
  const { data: owner } = await supabase.from('places').select('author_id').eq('id', id).maybeSingle();
  if (owner?.author_id !== userId) {
    throw new Error('Failed to save place: it is not yours to edit');
  }

  const photoPaths = await uploadedPaths(userId, edit.photos);

  const { data, error } = await supabase
    .from('places')
    .update({
      name: edit.name,
      category: edit.category,
      description: edit.description,
      address: edit.address,
      lat: edit.lat,
      lng: edit.lng,
      phone: edit.phone,
      website: edit.website,
      social_url: edit.socialUrl,
      photo_paths: photoPaths,
    })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(`Failed to save place: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error('Failed to save place: it is not yours to edit');
  }
}
