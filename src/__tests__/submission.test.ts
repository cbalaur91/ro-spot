import type { Place } from '@/data/places';

import {
  checkDraft,
  contactCount,
  draftFromPlace,
  EMPTY_DRAFT,
  fitWithin,
  PHOTO_EDGE,
  type PlaceDraft,
} from '../submission';

const photo = (n: number) => ({ uri: `file:///photo-${n}.jpg` });

const complete: PlaceDraft = {
  ...EMPTY_DRAFT,
  name: '  Casa Românească ',
  category: 'food_drink',
  address: ' 1 Main St, Detroit, MI ',
  description: ' Sarmale like at home. ',
  photos: [photo(1)],
};

describe('checkDraft', () => {
  it('passes a complete draft through trimmed, with untouched optionals as null', () => {
    expect(checkDraft(complete)).toEqual({
      ok: true,
      fields: {
        name: 'Casa Românească',
        category: 'food_drink',
        address: '1 Main St, Detroit, MI',
        description: 'Sarmale like at home.',
        phone: null,
        website: null,
        socialUrl: null,
      },
    });
  });

  it('names every required field an empty draft is missing', () => {
    expect(checkDraft(EMPTY_DRAFT)).toEqual({
      ok: false,
      problems: {
        name: 'nameRequired',
        category: 'categoryRequired',
        address: 'addressRequired',
        description: 'descriptionRequired',
        photos: 'photosRequired',
      },
    });
  });

  it('counts whitespace as empty, as the table’s own checks do', () => {
    const result = checkDraft({ ...complete, name: '   ' });

    expect(result).toEqual({ ok: false, problems: { name: 'nameRequired' } });
  });

  it('refuses more photos than the table will hold', () => {
    const result = checkDraft({ ...complete, photos: [1, 2, 3, 4, 5, 6].map(photo) });

    expect(result).toEqual({ ok: false, problems: { photos: 'photosTooMany' } });
  });

  it('accepts five', () => {
    expect(checkDraft({ ...complete, photos: [1, 2, 3, 4, 5].map(photo) }).ok).toBe(true);
  });

  it('keeps contact details as written when the detail screen could open them', () => {
    const result = checkDraft({
      ...complete,
      phone: ' (313) 555-0100 ',
      website: 'casa.example.com',
      socialUrl: 'https://facebook.com/casa',
    });

    expect(result).toMatchObject({
      ok: true,
      fields: {
        phone: '(313) 555-0100',
        website: 'casa.example.com',
        socialUrl: 'https://facebook.com/casa',
      },
    });
  });

  it('refuses contact details the detail screen would have to hide', () => {
    const result = checkDraft({
      ...complete,
      phone: 'open 7 days',
      website: 'coming soon',
      socialUrl: 'javascript:alert(1)',
    });

    expect(result).toEqual({
      ok: false,
      problems: {
        phone: 'phoneUnusable',
        website: 'websiteUnusable',
        socialUrl: 'socialUnusable',
      },
    });
  });
});

describe('contactCount', () => {
  it('is nothing for a draft with no contact details', () => {
    expect(contactCount(EMPTY_DRAFT)).toBe(0);
  });

  it('counts what was written, not whitespace', () => {
    expect(contactCount({ ...EMPTY_DRAFT, phone: '   ', website: 'casa.ro' })).toBe(1);
  });

  // The toggle says what the section holds; whether it's usable is Continue's
  // business, and a count that dropped a typo would hide it behind a collapse.
  it('counts a field whether or not it would pass the check', () => {
    expect(contactCount({ ...EMPTY_DRAFT, phone: 'open 7 days', website: 'x', socialUrl: 'y' })).toBe(3);
  });
});

describe('fitWithin', () => {
  it('scales a landscape photo down to the longest edge', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: PHOTO_EDGE, height: 1200 });
  });

  it('scales a portrait photo by its height', () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: PHOTO_EDGE });
  });

  it('never scales a photo up', () => {
    expect(fitWithin(800, 600)).toBeNull();
    expect(fitWithin(PHOTO_EDGE, 900)).toBeNull();
  });
});

describe('draftFromPlace', () => {
  const place: Place = {
    id: '00000000-0000-4000-8000-000000000009',
    name: 'Casa Românească',
    category: 'food_drink',
    description: 'Sarmale like at home.',
    address: '1 Main St, Detroit, MI 48226',
    lat: 42.3314,
    lng: -83.0458,
    status: 'approved',
    author_id: 'u1',
    phone: '313 555 0100',
    website: null,
    social_url: null,
    photo_paths: ['u1/one.jpg', 'u1/two.jpg'],
    created_at: '2026-09-01T00:00:00Z',
  };

  it('fills the form with the place as it stands', () => {
    expect(draftFromPlace(place, (path) => `https://cdn/${path}`)).toEqual({
      name: 'Casa Românească',
      category: 'food_drink',
      address: '1 Main St, Detroit, MI 48226',
      description: 'Sarmale like at home.',
      phone: '313 555 0100',
      // A field nobody filled in is an empty input, not the word "null".
      website: '',
      socialUrl: '',
      photos: [
        { uri: 'https://cdn/u1/one.jpg', path: 'u1/one.jpg' },
        { uri: 'https://cdn/u1/two.jpg', path: 'u1/two.jpg' },
      ],
    });
  });

  it('remembers which photos are already in the bucket', () => {
    // The path is what tells a kept photo from a chosen one: one is re-sent as
    // a path, the other has bytes to upload.
    const draft = draftFromPlace(place, (path) => `https://cdn/${path}`);

    expect(draft.photos.every((photo) => photo.path)).toBe(true);
  });
});
