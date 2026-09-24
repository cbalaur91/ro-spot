// Before i18next: Hermes has no `Intl.PluralRules`, and without it i18next
// quietly counts every language the English way — "2 de locuri" for Romanian's
// "2 locuri". The polyfill only installs itself where the engine lacks one.
import 'intl-pluralrules';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales, type Locale } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import ro from './locales/ro';

const SUPPORTED_LANGUAGES = ['ro', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

/**
 * Each language in its own words, as the Profile toggle draws it. Names, not
 * copy: "Română" stays "Română" in the English app, so nobody has to read a
 * language they don't know to find the one they do.
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  ro: 'Română',
};

/** Where the Profile tab's choice is kept on the device. */
export const LANGUAGE_KEY = 'rospot.language';

function isSupported(code: string | null | undefined): code is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage);
}

const resources = {
  en: { translation: en },
  ro: { translation: ro },
};

/**
 * The first of the device's languages that we speak, English otherwise. This is
 * the language until somebody picks one on the Profile tab; after that the
 * pick wins (`restoreLanguage`).
 */
export function resolveDeviceLanguage(locales: readonly Locale[]): SupportedLanguage {
  return locales.map((locale) => locale.languageCode).find(isSupported) ?? FALLBACK_LANGUAGE;
}

if (!i18next.isInitialized) {
  // `i18next.use()` is the instance method, not the standalone `use` export the
  // rule assumes.
  // eslint-disable-next-line import/no-named-as-default-member
  void i18next.use(initReactI18next).init({
    resources,
    lng: resolveDeviceLanguage(getLocales()),
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
  });
}

/**
 * Switch the app to `language` and keep the choice for the next launch. A
 * device that won't store it still gets the switch — the choice is a
 * preference, and losing it at the next launch is better than refusing it now.
 */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  // eslint-disable-next-line import/no-named-as-default-member -- the instance's method, as in `init` above
  await i18next.changeLanguage(language);
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Nothing to tell anybody: the app already speaks the language they chose.
  }
}

/**
 * Put back the language chosen on the Profile tab, if one was. Called once at
 * launch, before the first screen is drawn. Never throws: a choice that can't
 * be read leaves the device language, which is where everyone starts anyway.
 */
export async function restoreLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    // eslint-disable-next-line import/no-named-as-default-member -- as in `setLanguage`
    if (isSupported(stored)) await i18next.changeLanguage(stored);
  } catch {
    // Unreadable storage: stay with the device language.
  }
}

export default i18next;
