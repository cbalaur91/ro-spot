import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import ro from './locales/ro';

export const SUPPORTED_LANGUAGES = ['ro', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

const resources = {
  en: { translation: en },
  ro: { translation: ro },
};

/**
 * The device language if we speak it, English otherwise. The Profile tab will
 * layer a manual override on top of this later; nothing is persisted yet.
 */
export function resolveDeviceLanguage(): SupportedLanguage {
  const preferred = getLocales()
    .map((locale) => locale.languageCode)
    .find((code): code is SupportedLanguage =>
      SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)
    );

  return preferred ?? FALLBACK_LANGUAGE;
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: resolveDeviceLanguage(),
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
  });
}

export default i18n;
