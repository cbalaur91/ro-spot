import { planSeed, type SeedPlace } from '../plan';

const place = (overrides: Partial<SeedPlace> = {}): SeedPlace => ({
  id: '00000000-0000-4000-8000-000000000101',
  slug: 'bar-gabi',
  name: 'Bar Gabi',
  category: 'food_drink',
  description: 'Romanian bistro.',
  address: '23839 John R Rd, Hazel Park, MI 48030',
  lat: 42.467853,
  lng: -83.1046,
  phone: '(248) 629-4160',
  website: 'https://www.bargabi.com',
  social_url: null,
  ...overrides,
});

describe('planSeed', () => {
  it('turns each place into an approved row with no author', () => {
    const { rows } = planSeed([place()], {});

    expect(rows).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000101',
        name: 'Bar Gabi',
        category: 'food_drink',
        description: 'Romanian bistro.',
        address: '23839 John R Rd, Hazel Park, MI 48030',
        lat: 42.467853,
        lng: -83.1046,
        phone: '(248) 629-4160',
        website: 'https://www.bargabi.com',
        social_url: null,
        status: 'approved',
        author_id: null,
        photo_paths: [],
      },
    ]);
  });

  it('files photos under the place slug, in filename order', () => {
    const { rows, uploads } = planSeed([place()], {
      'bar-gabi': ['2-dining-room.jpg', '1-front.jpg'],
    });

    expect(rows[0].photo_paths).toEqual([
      'seed/bar-gabi/1-front.jpg',
      'seed/bar-gabi/2-dining-room.jpg',
    ]);
    expect(uploads).toEqual([
      { slug: 'bar-gabi', file: '1-front.jpg', path: 'seed/bar-gabi/1-front.jpg' },
      { slug: 'bar-gabi', file: '2-dining-room.jpg', path: 'seed/bar-gabi/2-dining-room.jpg' },
    ]);
  });

  it('refuses a photo folder no place claims — a misspelt slug', () => {
    expect(() => planSeed([place()], { 'someone-else': ['a.jpg'] })).toThrow(
      /someone-else/
    );
  });

  it('refuses more than five photos', () => {
    const six = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg'];

    expect(() => planSeed([place()], { 'bar-gabi': six })).toThrow(/at most 5/);
  });

  it('refuses a file the bucket would not take', () => {
    expect(() => planSeed([place()], { 'bar-gabi': ['front.png'] })).toThrow(/front\.png/);
    expect(() => planSeed([place()], { 'bar-gabi': ['front door.jpg'] })).toThrow(
      /front door\.jpg/
    );
  });

  it('refuses two places with the same id or slug', () => {
    expect(() => planSeed([place(), place({ slug: 'other' })], {})).toThrow(/id/);
    expect(() =>
      planSeed([place(), place({ id: '00000000-0000-4000-8000-000000000102' })], {})
    ).toThrow(/slug/);
  });
});
