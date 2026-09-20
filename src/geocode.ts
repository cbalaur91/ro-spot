import * as Location from 'expo-location';

import type { Coords } from '@/geo';

/**
 * Where the platform's own geocoder puts an address, or `null` if it can't say.
 *
 * On-device on purpose: no key, no service of ours, and nothing about the
 * submitter's typing leaves the phone for a third party we'd have to disclose.
 * The price is that it can miss — an address it doesn't know, a device with no
 * geocoder, the web preview, where there isn't one at all — and every miss is
 * the same answer. The pin step is what makes a miss survivable: the person
 * drags the pin to the place whether or not we found it for them.
 *
 * Android's geocoder refuses without foreground location permission, though it
 * locates nobody. So the permission is asked for again here — someone who
 * waved it away while browsing has a reason to grant it now — and a second
 * refusal is one more miss.
 */
export async function geocodeAddress(address: string): Promise<Coords | null> {
  try {
    await Location.requestForegroundPermissionsAsync();
    const [first] = await Location.geocodeAsync(address);
    return first ? { lat: first.latitude, lng: first.longitude } : null;
  } catch {
    return null;
  }
}
