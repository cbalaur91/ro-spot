import { PHOTO_BUCKET, type PlaceCategory } from './places';
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
 * Unique within one person's folder, which is all it has to be: the folder is
 * the user id, and the storage policy is written against that, not this.
 */
function photoPath(userId: string, index: number): string {
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${userId}/${unique}-${index}.jpg`;
}

/**
 * Uploads the photos, then writes the place as `pending`.
 *
 * `status` and `author_id` are stated here but decided by the insert policy,
 * which refuses any other value — see `__tests__/submissions.integration.test.ts`.
 * Nothing is read back: a pending row is invisible to its own author until
 * "your places" (#8) adds a policy for that.
 *
 * Photos go first because the row carries their paths. If the insert then
 * fails the uploads are orphaned in the submitter's folder; they are
 * unreferenced and unlisted, and account deletion (#10) clears the folder.
 */
export async function submitPlace(submission: PlaceSubmission): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) {
    throw new Error('Failed to submit place: nobody is signed in');
  }

  const photoPaths = await Promise.all(
    submission.photos.map(async (photo, index) => {
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
