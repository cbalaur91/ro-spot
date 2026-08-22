/**
 * Turning the three optional contact fields on a place into something
 * `Linking.openURL` will accept.
 *
 * All three are typed by a submitter, so this is the seam where "what a person
 * writes in a form" becomes "a URL we are willing to open". Both functions
 * return `null` for input they can't make sense of, which is also how the detail
 * screen decides a link isn't there.
 */

/**
 * Seven digits: a US local number without its area code, and so the shortest
 * thing here that could be dialed at all.
 */
const MIN_DIALABLE_DIGITS = 7;

/**
 * A dialable `tel:` URL, or `null` if there is no number in the string.
 *
 * No country code is invented — the dataset is entirely US, where a bare
 * ten-digit number dials fine, and guessing `+1` onto a number a submitter wrote
 * with an international prefix in words would dial the wrong place.
 */
export function telUrl(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, '');
  // Shorter than a local US number, so whatever this is, it isn't one — "open 7
  // days" should not become a tappable `tel:7`.
  if (digits.length < MIN_DIALABLE_DIGITS) return null;

  return `tel:${phone.trimStart().startsWith('+') ? '+' : ''}${digits}`;
}

const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:/i;
/** `http(s)://` followed by something that could be a host. */
const WEB_URL = /^https?:\/\/[^\s/?#]+/i;
/** A bare domain: at least one dot, a plausible suffix, and no whitespace. */
const BARE_DOMAIN = /^[^\s/?#]+\.[^\s/?#]{2,}/;

/**
 * An absolute `http(s)` URL, or `null` if the string isn't one and can't be
 * read as a bare domain.
 *
 * People write `example.com`, so a scheme-less string that looks like a domain
 * gets `https://` — and one that doesn't is refused rather than prefixed. Both
 * halves matter: a website field is a text box, so `coming soon` arrives in it,
 * and `https://coming soon` is a link that can only fail.
 *
 * A string naming some *other* scheme is refused too: `javascript:` or `file:`
 * from a form is not an address we should hand to the OS.
 */
export function webUrl(raw: string): string | null {
  const trimmed = raw.trim();

  if (ABSOLUTE_URL.test(trimmed)) {
    return WEB_URL.test(trimmed) ? trimmed : null;
  }

  return BARE_DOMAIN.test(trimmed) ? `https://${trimmed}` : null;
}
