/**
 * The Add form's rules, with nothing in them that needs a device: what a draft
 * has to have before it may be sent, and how big a photo is allowed to stay.
 */
import type { PlaceCategory } from '@/data/places';
import { telUrl, webUrl } from '@/links';

/** A photo the form is holding: chosen, compressed, not yet uploaded. */
export type DraftPhoto = { uri: string };

/** The form as the person is typing it — every text field a string, nothing trimmed. */
export type PlaceDraft = {
  name: string;
  category: PlaceCategory | null;
  address: string;
  description: string;
  phone: string;
  website: string;
  socialUrl: string;
  photos: DraftPhoto[];
};

export const EMPTY_DRAFT: PlaceDraft = {
  name: '',
  category: null,
  address: '',
  description: '',
  phone: '',
  website: '',
  socialUrl: '',
  photos: [],
};

/**
 * The `places` table's own ceilings. The inputs carry them as `maxLength`, so
 * "too long" is a thing the form prevents rather than a thing it complains about.
 */
export const LIMITS = { name: 120, address: 300, description: 2000, photos: 5 } as const;

/** The draft's text, ready for the table: trimmed, and `null` where nothing was written. */
export type DraftFields = {
  name: string;
  category: PlaceCategory;
  address: string;
  description: string;
  phone: string | null;
  website: string | null;
  socialUrl: string | null;
};

/** One per thing the form says something different about; each is an `add.problems.*` key. */
export type DraftProblem =
  | 'nameRequired'
  | 'categoryRequired'
  | 'addressRequired'
  | 'descriptionRequired'
  | 'phoneUnusable'
  | 'websiteUnusable'
  | 'socialUnusable'
  | 'photosRequired'
  | 'photosTooMany';

export type DraftProblems = Partial<Record<keyof PlaceDraft, DraftProblem>>;

export type DraftCheck =
  | { ok: true; fields: DraftFields }
  | { ok: false; problems: DraftProblems };

/**
 * Everything wrong with a draft at once, or its fields ready to send.
 *
 * The optional contact fields are held to the detail screen's standard —
 * `telUrl` / `webUrl` — because that screen hides a link it can't open, and a
 * submitter should hear about it now rather than wonder later where it went.
 * They are stored as written, not as the URL: the detail screen shows what the
 * person typed and opens what `links.ts` makes of it.
 */
export function checkDraft(draft: PlaceDraft): DraftCheck {
  const name = draft.name.trim();
  const address = draft.address.trim();
  const description = draft.description.trim();
  const phone = draft.phone.trim();
  const website = draft.website.trim();
  const socialUrl = draft.socialUrl.trim();

  const problems: DraftProblems = {};

  if (!name) problems.name = 'nameRequired';
  if (!draft.category) problems.category = 'categoryRequired';
  if (!address) problems.address = 'addressRequired';
  if (!description) problems.description = 'descriptionRequired';
  if (phone && !telUrl(phone)) problems.phone = 'phoneUnusable';
  if (website && !webUrl(website)) problems.website = 'websiteUnusable';
  if (socialUrl && !webUrl(socialUrl)) problems.socialUrl = 'socialUnusable';
  if (draft.photos.length === 0) problems.photos = 'photosRequired';
  if (draft.photos.length > LIMITS.photos) problems.photos = 'photosTooMany';

  if (!draft.category || Object.keys(problems).length > 0) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    fields: {
      name,
      category: draft.category,
      address,
      description,
      phone: phone || null,
      website: website || null,
      socialUrl: socialUrl || null,
    },
  };
}

/** The spec's "roughly 1600px longest edge". */
export const PHOTO_EDGE = 1600;

/**
 * The size a photo should be shrunk to, or `null` if it already fits — a photo
 * is never scaled up.
 */
export function fitWithin(
  width: number,
  height: number
): { width: number; height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= PHOTO_EDGE) return null;

  const scale = PHOTO_EDGE / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
