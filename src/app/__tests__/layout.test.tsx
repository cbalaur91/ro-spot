import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';

import i18n, { LANGUAGE_KEY } from '@/i18n';

import RootLayout from '../_layout';

// NativeWind's stylesheet is for the bundler; Jest would read it as a script.
jest.mock('../../../global.css', () => ({}));

// The real provider draws nothing until the native side reports insets.
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default
);

// The stack stands in for every screen: one line of copy in whatever language
// the app is speaking, and a note of that language each time it is drawn.
jest.mock('expo-router', () => ({
  Stack: function MockStack() {
    const { useTranslation } = jest.requireActual<typeof import('react-i18next')>('react-i18next');
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    const { t, i18n: instance } = useTranslation();
    mockDrawnIn.push(instance.language);
    return <Text>{t('tabs.profile')}</Text>;
  },
  SplashScreen: { preventAutoHideAsync: jest.fn(() => Promise.resolve()), hide: jest.fn() },
}));

jest.mock('@/data/auth', () => ({
  currentUser: jest.fn(() => new Promise(() => {})),
  onAuthChange: jest.fn(() => jest.fn()),
}));

// `mock`-prefixed so Jest lets the factory close over it.
const mockDrawnIn: string[] = [];

const { SplashScreen } = jest.requireMock('expo-router') as {
  SplashScreen: { preventAutoHideAsync: jest.Mock; hide: jest.Mock };
};

beforeEach(async () => {
  mockDrawnIn.length = 0;
  await AsyncStorage.clear();
  await i18n.changeLanguage('en');
});

describe('launch', () => {
  it('holds the splash screen from the moment the app loads', () => {
    expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled();
  });

  it('draws the first screen in the language chosen last time, never the device one first', async () => {
    // Chosen on the Profile tab in an earlier run; the device itself is English.
    await AsyncStorage.setItem(LANGUAGE_KEY, 'ro');

    await render(<RootLayout />);

    expect(await screen.findByText('Profil')).toBeOnTheScreen();
    // Not one frame in English behind the splash screen.
    expect(mockDrawnIn).not.toContain('en');
    expect(SplashScreen.hide).toHaveBeenCalled();
  });

  it('draws in the device language when nothing was chosen', async () => {
    await render(<RootLayout />);

    expect(await screen.findByText('Profile')).toBeOnTheScreen();
  });
});
