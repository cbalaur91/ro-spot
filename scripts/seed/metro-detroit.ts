import type { SeedPlace } from './plan';

/**
 * The launch places for Metro Detroit, approved by the owner on 2026-09-21.
 *
 * Facts come from each place's own site, its parish directory (OCA, Metropolia)
 * or the press; coordinates from OpenStreetMap (Nominatim), except Sts. Peter &
 * Paul, which OSM has no match for and the US Census geocoder places on the
 * street. St. George, the first place on the map, is seeded by its migration and
 * is not repeated here.
 *
 * This file is the source of truth for these rows: a re-run writes it over
 * whatever the rows hold, so correct a seeded place here, not in the dashboard.
 */
export const METRO_DETROIT_PLACES: readonly SeedPlace[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    slug: 'bar-gabi',
    name: 'Bar Gabi',
    category: 'food_drink',
    description:
      'Modern Romanian bistro run by chef couple Gabriel and Gabriela Botezan, he from Bucharest and she from Transylvania. Sarmale, mititei and Transylvanian goulash alongside pastas and schnitzel.',
    address: '23839 John R Rd, Hazel Park, MI 48030',
    lat: 42.467853,
    lng: -83.1046,
    phone: '(248) 629-4160',
    website: 'https://www.bargabi.com',
    social_url: 'https://www.instagram.com/bargabi.hp/',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    slug: 'bucharest-grill-jefferson',
    name: 'Bucharest Grill',
    category: 'food_drink',
    description:
      'Detroit grill chain founded in 2006 by Romanian-born owner Bogdan Tarasov. Mostly shawarma and wraps, with Romanian sausage and mici on the menu. One of nine locations around Metro Detroit.',
    address: '2684 E Jefferson Ave, Detroit, MI 48207',
    lat: 42.338556,
    lng: -83.020659,
    phone: '313-965-3111',
    website: 'https://bucharestgrill.com',
    social_url: 'https://www.facebook.com/TheOfficialBucharestGrillpage/',
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    slug: 'holy-trinity-troy',
    name: 'Holy Trinity Romanian Orthodox Church',
    category: 'historic',
    description:
      'Romanian Orthodox parish of the Romanian Orthodox Metropolia of the Americas, serving the Romanian community of Troy and Oakland County.',
    address: '1850 E Square Lake Rd, Troy, MI 48085',
    lat: 42.606563,
    lng: -83.113081,
    phone: '248-879-2667',
    website: 'https://www.sfantatreime.com',
    social_url: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    slug: 'st-nicholas-troy',
    name: 'St. Nicholas Romanian Orthodox Church',
    category: 'historic',
    description:
      'Romanian Orthodox parish founded in 1955, part of the Romanian Orthodox Episcopate of America.',
    address: '5353 Livernois Rd, Troy, MI 48098',
    lat: 42.596081,
    lng: -83.149383,
    phone: '248-879-8804',
    website: null,
    social_url: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000105',
    slug: 'descent-of-the-holy-spirit-warren',
    name: 'Descent of the Holy Spirit Romanian Orthodox Church',
    category: 'historic',
    description:
      'One of the oldest Romanian Orthodox parishes in Michigan, founded in 1916. Part of the Romanian Orthodox Episcopate of America.',
    address: '31500 Ryan Rd, Warren, MI 48092',
    lat: 42.523839,
    lng: -83.06795,
    phone: '586-979-5193',
    website: null,
    social_url: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000106',
    slug: 'sts-peter-and-paul-dearborn-heights',
    name: 'Sts. Peter & Paul Romanian Orthodox Church',
    category: 'historic',
    description:
      'Romanian Orthodox parish of the Romanian Orthodox Episcopate of America, serving Romanian-born and American faithful in western Wayne County.',
    address: '750 N Beech Daly Rd, Dearborn Heights, MI 48127',
    lat: 42.316178,
    lng: -83.291423,
    phone: null,
    website: 'https://spproc.org',
    social_url: 'https://www.facebook.com/spproc',
  },
];
