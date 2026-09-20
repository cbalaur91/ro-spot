import * as Location from 'expo-location';

import { geocodeAddress } from '../geocode';

jest.mock('expo-location', () => ({
  geocodeAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));

const geocodeAsync = Location.geocodeAsync as jest.Mock;
const requestPermission = Location.requestForegroundPermissionsAsync as jest.Mock;

beforeEach(() => requestPermission.mockResolvedValue({ granted: true }));

describe('geocodeAddress', () => {
  it('is the first place the device’s geocoder offers', async () => {
    geocodeAsync.mockResolvedValue([
      { latitude: 42.4576, longitude: -83.2409 },
      { latitude: 1, longitude: 1 },
    ]);

    await expect(geocodeAddress('18405 W Nine Mile Rd')).resolves.toEqual({
      lat: 42.4576,
      lng: -83.2409,
    });
  });

  it('is null for an address the geocoder doesn’t know', async () => {
    geocodeAsync.mockResolvedValue([]);

    await expect(geocodeAddress('nowhere')).resolves.toBeNull();
  });

  it('asks for location first, because Android’s geocoder won’t answer without it', async () => {
    const order: string[] = [];
    requestPermission.mockImplementation(async () => order.push('permission'));
    geocodeAsync.mockImplementation(async () => (order.push('geocode'), []));

    await geocodeAddress('anywhere');

    expect(order).toEqual(['permission', 'geocode']);
  });

  it('is null where there is no geocoder at all', async () => {
    geocodeAsync.mockRejectedValue(new Error('not available on web'));

    await expect(geocodeAddress('anywhere')).resolves.toBeNull();
  });
});
