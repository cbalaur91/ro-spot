import { supabase } from './supabase';

/**
 * Tells the moderator something is wrong with a place, as whoever is signed in.
 *
 * `note` is what the reporter wrote, or null for a one-tap report; blank is
 * sent as null, because a note of spaces is no note and the table refuses it.
 *
 * The insert policy is the rule — a report is written as the reporter, about a
 * place they can see — and there is no select privilege on the table, so
 * nothing is read back. See `__tests__/reports.integration.test.ts`.
 */
export async function reportPlace(placeId: string, note: string | null): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const reporterId = auth.session?.user.id;
  if (!reporterId) {
    throw new Error('Failed to report place: nobody is signed in');
  }

  const trimmed = note?.trim();
  const { error } = await supabase.from('reports').insert({
    place_id: placeId,
    reporter_id: reporterId,
    note: trimmed ? trimmed : null,
  });

  if (error) {
    throw new Error(`Failed to report place: ${error.message}`);
  }
}
