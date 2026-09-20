import { checkDraft, EMPTY_DRAFT, fitWithin, PHOTO_EDGE, type PlaceDraft } from '../submission';

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
