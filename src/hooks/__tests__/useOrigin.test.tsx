// `renderHook` is async in @testing-library/react-native 14, as `render` is.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';

import { DEFAULT_ORIGIN } from '@/geo';

import { FIX_TIMEOUT_MS, LocationProvider, useOrigin } from '../useOrigin';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  enableNetworkProviderAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const location = jest.requireMock('expo-location') as {
  requestForegroundPermissionsAsync: jest.Mock;
  getForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
  hasServicesEnabledAsync: jest.Mock;
  enableNetworkProviderAsync: jest.Mock;
};

const DETROIT_SUBURB = { lat: 42.4576, lng: -83.2409 };
const GRANTED = { granted: true, canAskAgain: true };
const DENIED = { granted: false, canAskAgain: true };
// Android after repeated denials, iOS after the first: the OS won't show the prompt.
const BLOCKED = { granted: false, canAskAgain: false };

function fixAt(coords = DETROIT_SUBURB) {
  location.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: coords.lat, longitude: coords.lng },
  });
}

function grant(coords = DETROIT_SUBURB) {
  location.requestForegroundPermissionsAsync.mockResolvedValue(GRANTED);
  fixAt(coords);
}

let appStateListener: ((state: AppStateStatus) => void) | undefined;

function wrapper({ children }: { children: React.ReactNode }) {
  return <LocationProvider>{children}</LocationProvider>;
}

const render = () => renderHook(() => useOrigin(), { wrapper });

/** The app coming back to the foreground — from Settings, or from anywhere. */
async function returnToApp() {
  await act(async () => appStateListener?.('active'));
}

beforeEach(() => {
  jest.clearAllMocks();
  appStateListener = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  location.hasServicesEnabledAsync.mockResolvedValue(true);
});

describe('useOrigin', () => {
  it('measures from the device once permission is granted', async () => {
    grant();

    const { result } = await render();

    await waitFor(() => expect(result.current.isUserLocation).toBe(true));
    expect(result.current.origin).toEqual(DETROIT_SUBURB);
  });

  it('falls back to Metro Detroit when permission is denied', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue(DENIED);

    const { result } = await render();

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.origin).toEqual(DEFAULT_ORIGIN);
    expect(result.current.isUserLocation).toBe(false);
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('falls back when the device has permission but cannot get a fix', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue(GRANTED);
    location.getCurrentPositionAsync.mockRejectedValue(new Error('no signal'));

    const { result } = await render();

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.origin).toEqual(DEFAULT_ORIGIN);
    expect(result.current.isUserLocation).toBe(false);
  });

  it('is usable while the permission prompt is still up', async () => {
    // A prompt the user hasn't answered yet: the promise never settles.
    location.requestForegroundPermissionsAsync.mockReturnValue(new Promise(() => {}));

    const { result } = await render();

    expect(result.current.origin).toEqual(DEFAULT_ORIGIN);
    expect(result.current.isResolved).toBe(false);
  });

  it('asks the device once for the whole app, however many screens read it', async () => {
    grant();

    const { result } = await renderHook(() => [useOrigin(), useOrigin()], { wrapper });

    await waitFor(() => expect(result.current[1].isUserLocation).toBe(true));
    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('refuses to run outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useOrigin())).rejects.toThrow(/LocationProvider/);
  });

  describe('enabling location after the first answer', () => {
    it('asks again after a denial the OS will still prompt for, and measures from the fix', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue(DENIED);
      const { result } = await render();
      await waitFor(() => expect(result.current.isResolved).toBe(true));
      expect(result.current.access).toBe('ask');

      grant();
      await act(async () => result.current.enableLocation());

      await waitFor(() => expect(result.current.isUserLocation).toBe(true));
      expect(result.current.origin).toEqual(DETROIT_SUBURB);
      expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
      expect(Linking.openSettings).not.toHaveBeenCalled();
    });

    it('is asking again, not resolved, until the second answer arrives', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue(DENIED);
      const { result } = await render();
      await waitFor(() => expect(result.current.isResolved).toBe(true));

      location.requestForegroundPermissionsAsync.mockReturnValue(new Promise(() => {}));
      await act(async () => result.current.enableLocation());

      expect(result.current.isResolved).toBe(false);
      expect(result.current.origin).toEqual(DEFAULT_ORIGIN);
    });

    it('stays on the fallback when the second answer is no', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue(DENIED);
      const { result } = await render();
      await waitFor(() => expect(result.current.isResolved).toBe(true));

      await act(async () => result.current.enableLocation());

      await waitFor(() => expect(result.current.isResolved).toBe(true));
      expect(result.current.isUserLocation).toBe(false);
    });

    it('sends the user to Settings once the OS will no longer prompt', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue(BLOCKED);
      const { result } = await render();
      await waitFor(() => expect(result.current.isResolved).toBe(true));
      expect(result.current.access).toBe('settings');

      await act(async () => result.current.enableLocation());

      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
      expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('learns that the OS stopped prompting from a second denial', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue(DENIED);
      const { result } = await render();
      await waitFor(() => expect(result.current.isResolved).toBe(true));

      location.requestForegroundPermissionsAsync.mockResolvedValue(BLOCKED);
      await act(async () => result.current.enableLocation());

      await waitFor(() => expect(result.current.access).toBe('settings'));
    });

    it('retries a failed fix', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue(GRANTED);
      location.getCurrentPositionAsync.mockRejectedValue(new Error('no signal'));
      const { result } = await render();
      await waitFor(() => expect(result.current.isResolved).toBe(true));
      expect(result.current.access).toBe('ask');

      fixAt();
      await act(async () => result.current.enableLocation());

      await waitFor(() => expect(result.current.isUserLocation).toBe(true));
    });

    it('still asks when pressed while the check on return is under way', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue(DENIED);
      const { result } = await render();
      await waitFor(() => expect(result.current.isResolved).toBe(true));

      let answerCheck: (value: typeof DENIED) => void = () => {};
      location.getForegroundPermissionsAsync.mockReturnValue(
        new Promise((resolve) => (answerCheck = resolve))
      );
      await returnToApp();
      grant();
      await act(async () => result.current.enableLocation());
      await act(async () => answerCheck(DENIED));

      await waitFor(() => expect(result.current.isUserLocation).toBe(true));
      expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
    });

    it('gives up on a fix that never comes, and can be asked again', async () => {
      jest.useFakeTimers();
      try {
        location.requestForegroundPermissionsAsync.mockResolvedValue(GRANTED);
        location.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
        const { result } = await render();
        expect(result.current.isResolved).toBe(false);

        await act(async () => jest.advanceTimersByTime(FIX_TIMEOUT_MS));

        expect(result.current.isResolved).toBe(true);
        expect(result.current.isUserLocation).toBe(false);

        fixAt();
        await act(async () => result.current.enableLocation());
        expect(result.current.isUserLocation).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    it('on Android, offers to turn location services on before retrying a fix', async () => {
      const os = Platform.OS;
      Platform.OS = 'android';
      try {
        location.requestForegroundPermissionsAsync.mockResolvedValue(GRANTED);
        location.getCurrentPositionAsync.mockRejectedValue(new Error('location off'));
        const { result } = await render();
        await waitFor(() => expect(result.current.isResolved).toBe(true));

        location.hasServicesEnabledAsync.mockResolvedValue(false);
        location.enableNetworkProviderAsync.mockResolvedValue(undefined);
        fixAt();
        await act(async () => result.current.enableLocation());

        await waitFor(() => expect(result.current.isUserLocation).toBe(true));
        expect(location.enableNetworkProviderAsync).toHaveBeenCalledTimes(1);
      } finally {
        Platform.OS = os;
      }
    });
  });

  describe('coming back to the app', () => {
    it('measures from the device when location was turned on in Settings', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue(BLOCKED);
      const { result } = await render();
      await waitFor(() => expect(result.current.isResolved).toBe(true));

      location.getForegroundPermissionsAsync.mockResolvedValue(GRANTED);
      fixAt();
      await returnToApp();

      await waitFor(() => expect(result.current.isUserLocation).toBe(true));
      expect(result.current.origin).toEqual(DETROIT_SUBURB);
      // Checked, never asked: the user didn't press anything on the way back.
      expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('keeps the fallback, resolved, when location is still off', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue(BLOCKED);
      const { result } = await render();
      await waitFor(() => expect(result.current.isResolved).toBe(true));

      location.getForegroundPermissionsAsync.mockResolvedValue(BLOCKED);
      await returnToApp();

      expect(result.current.isResolved).toBe(true);
      expect(result.current.isUserLocation).toBe(false);
      expect(result.current.access).toBe('settings');
      expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it('does not re-check once it has a fix', async () => {
      grant();
      const { result } = await render();
      await waitFor(() => expect(result.current.isUserLocation).toBe(true));

      await returnToApp();

      expect(location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    });
  });
});
