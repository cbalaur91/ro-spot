import type { Database } from './database.types';
import { supabase } from './supabase';

export type PlaceCategory = Database['public']['Enums']['place_category'];
export type PlaceStatus = Database['public']['Enums']['place_status'];

export type Place = Database['public']['Tables']['places']['Row'];

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
