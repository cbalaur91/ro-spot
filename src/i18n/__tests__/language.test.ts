import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from 'expo-localization';

import i18n, { LANGUAGE_KEY, resolveDeviceLanguage, restoreLanguage, setLanguage } from '@/i18n';

/** A device locale as expo-localization reports one — only the code matters here. */
function locale(languageCode: string): Locale {
  return { languageCode } as Locale;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  await i18n.changeLanguage('en');
});

describe('the device language', () => {
  it.each([
    [['ro'], 'ro'],
    [['en'], 'en'],
    // The first language the device prefers *that we speak*, not simply the first.
    [['fr', 'ro', 'en'], 'ro'],
    [['de', 'en', 'ro'], 'en'],
    // Nothing we speak, or nothing at all: English.
    [['fr'], 'en'],
    [[], 'en'],
  ])('is %j → %s', (codes, expected) => {
    expect(resolveDeviceLanguage(codes.map(locale))).toBe(expected);
  });

  it('skips a locale with no language code', () => {
    expect(resolveDeviceLanguage([{ languageCode: null } as Locale, locale('ro')])).toBe('ro');
  });
});

describe('choosing a language', () => {
  it('switches the app and keeps the choice on the device', async () => {
    await setLanguage('ro');

    expect(i18n.language).toBe('ro');
    expect(await AsyncStorage.getItem(LANGUAGE_KEY)).toBe('ro');
  });

  it('still switches when the device will not keep the choice', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));

    await expect(setLanguage('ro')).resolves.toBeUndefined();
    expect(i18n.language).toBe('ro');
  });
});

describe('restoring the choice at launch', () => {
  it('survives a restart: the choice wins over the device language', async () => {
    await setLanguage('ro');
    // The next launch starts from the device language again.
    await i18n.changeLanguage('en');

    await restoreLanguage();

    expect(i18n.language).toBe('ro');
  });

  it('leaves the device language alone when nothing was chosen', async () => {
    await restoreLanguage();

    expect(i18n.language).toBe('en');
  });

  it('ignores a stored value that is not a language we speak', async () => {
    await AsyncStorage.setItem(LANGUAGE_KEY, 'fr');

    await restoreLanguage();

    expect(i18n.language).toBe('en');
  });

  it('never keeps the app from starting when the device cannot read the choice', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('corrupt'));

    await expect(restoreLanguage()).resolves.toBeUndefined();
    expect(i18n.language).toBe('en');
  });
});
