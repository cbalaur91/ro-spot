/**
 * Reading an address the way a person would when they already know the place.
 */

/** A US postcode at the end of a line: five digits, optionally plus four. */
const TRAILING_ZIP = /\s+\d{5}(-\d{4})?$/;

/**
 * The part of an address that says *where*, for a card that already says what.
 *
 * A US address is a street line, a town and a state, so three comma-separated
 * parts or more means the first of them is the street and can go. Two parts are
 * a town and a state already, and dropping one would leave the author looking
 * at "MI". The postcode goes either way: it is for an envelope.
 *
 * The address is what the submitter typed, so this is a reading of it and not a
 * parse — anything it doesn't recognise it hands back whole, which is never
 * wrong, only longer.
 */
export function locality(address: string): string {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const said = parts.length >= 3 ? parts.slice(1) : parts;

  return said.join(', ').replace(TRAILING_ZIP, '');
}
