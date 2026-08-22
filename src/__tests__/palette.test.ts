import tailwindConfig from '../../tailwind.config.js';

import { colors } from '@/theme';

/**
 * The palette lives in two places on purpose — `src/theme.ts` for the plain
 * values navigator options need, `tailwind.config.js` for the classes screens
 * use — and the project requires the two stay in sync. Nothing but this test
 * enforces that, so it enforces it exactly: same set of names, same values.
 */
const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('the palette', () => {
  // Tailwind types every branch of the config as optional; if this one ever went
  // missing the first assertion below is where it would say so.
  const tailwindColors = tailwindConfig.theme?.extend?.colors as Record<string, string>;

  it('names the same colours in both homes', () => {
    expect(Object.keys(tailwindColors).sort()).toEqual(Object.keys(colors).map(kebab).sort());
  });

  it.each(Object.entries(colors))('gives %s the same value in both homes', (name, value) => {
    expect(tailwindColors[kebab(name)]).toBe(value);
  });
});
