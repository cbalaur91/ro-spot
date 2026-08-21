// `renderHook` is async in @testing-library/react-native 14, as `render` is.
import { renderHook, waitFor } from '@testing-library/react-native';

import { DEFAULT_ORIGIN } from '@/geo';

import { useOrigin } from '../useOrigin';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const location = jest.requireMock('expo-location') as {
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
};

const DETROIT_SUBURB = { lat: 42.4576, lng: -83.2409 };

function grant(coords = DETROIT_SUBURB) {
  location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  location.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: coords.lat, longitude: coords.lng },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useOrigin', () => {
  it('measures from the device once permission is granted', async () => {
    grant();

    const { result } = await renderHook(() => useOrigin());

    await waitFor(() => expect(result.current.isUserLocation).toBe(true));
    expect(result.current.origin).toEqual(DETROIT_SUBURB);
  });

  it('falls back to Metro Detroit when permission is denied', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });

    const { result } = await renderHook(() => useOrigin());

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.origin).toEqual(DEFAULT_ORIGIN);
    expect(result.current.isUserLocation).toBe(false);
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('falls back when the device has permission but cannot get a fix', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getCurrentPositionAsync.mockRejectedValue(new Error('no signal'));

    const { result } = await renderHook(() => useOrigin());

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.origin).toEqual(DEFAULT_ORIGIN);
    expect(result.current.isUserLocation).toBe(false);
  });

  it('is usable while the permission prompt is still up', async () => {
    // A prompt the user hasn't answered yet: the promise never settles.
    location.requestForegroundPermissionsAsync.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useOrigin());

    expect(result.current.origin).toEqual(DEFAULT_ORIGIN);
    expect(result.current.isResolved).toBe(false);
  });
});
