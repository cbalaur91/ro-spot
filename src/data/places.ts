import type { Database } from './database.types';
import { supabase } from './supabase';

export type Place = Database['public']['Tables']['places']['Row'];
export type PlaceCategory = Database['public']['Enums']['place_category'];

/**
 * Every place the public is allowed to see.
 *
 * The `status` filter is a courtesy to the query planner, not the security
 * boundary — RLS already restricts anonymous reads to approved rows. See
 * `__tests__/places.rls.test.ts`.
 */
export async function fetchApprovedPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('status', 'approved')
    .order('name');

  if (error) {
    throw new Error(`Failed to load places: ${error.message}`);
  }

  return data ?? [];
}

/** Postgres' "invalid input syntax for type uuid". */
const INVALID_TEXT_REPRESENTATION = '22P02';

/**
 * One place by id, or `null` if there isn't one the public may see.
 *
 * The `status` filter is not redundant with RLS here, it is the same answer
 * arrived at twice: a deep link to a place that is pending or rejected has to
 * read as "no such place" even if the policy were ever widened.
 */
export async function fetchPlace(id: string): Promise<Place | null> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    // An id that isn't a UUID can only come from a hand-typed or stale link, and
    // "that place isn't here" is a truer answer than an error screen.
    if (error.code === INVALID_TEXT_REPRESENTATION) return null;
    throw new Error(`Failed to load place: ${error.message}`);
  }

  return data;
}

/** The storage bucket the entries in `photo_paths` are relative to. */
export const PHOTO_BUCKET = 'place-photos';

/**
 * A displayable URL for one entry of `photo_paths`.
 *
 * The rows store bucket-relative paths, not URLs, so the bucket can change
 * hands — or start serving signed URLs — without a migration. Building the URL
 * is string work with no round trip, so this stays synchronous.
 */
export function placePhotoUrl(path: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
