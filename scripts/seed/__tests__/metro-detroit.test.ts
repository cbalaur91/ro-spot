import { SEEDED_APPROVED_PLACE_ID } from '@/data/fixtures';
import { telUrl, webUrl } from '@/links';

import { METRO_DETROIT_PLACES } from '../metro-detroit';
import { planSeed } from '../plan';

describe('the Metro Detroit seed', () => {
  it('plans without error', () => {
    expect(() => planSeed(METRO_DETROIT_PLACES, {})).not.toThrow();
  });

  it('leaves the migration-seeded cathedral to its migration', () => {
    expect(METRO_DETROIT_PLACES.map((p) => p.id)).not.toContain(SEEDED_APPROVED_PLACE_ID);
  });

  it.each(METRO_DETROIT_PLACES.map((p) => [p.name, p] as const))(
    '%s sits in Metro Detroit',
    (_, place) => {
      // Generous box around the metro area: catches a swapped or sign-flipped pair.
      expect(place.lat).toBeGreaterThan(42.0);
      expect(place.lat).toBeLessThan(42.9);
      expect(place.lng).toBeGreaterThan(-83.8);
      expect(place.lng).toBeLessThan(-82.7);
    }
  );

  it.each(METRO_DETROIT_PLACES.map((p) => [p.name, p] as const))(
    '%s has contact links the detail screen will open',
    (_, place) => {
      if (place.phone) expect(telUrl(place.phone)).not.toBeNull();
      if (place.website) expect(webUrl(place.website)).not.toBeNull();
      if (place.social_url) expect(webUrl(place.social_url)).not.toBeNull();
    }
  );
});
