import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import ro from './locales/ro';

const SUPPORTED_LANGUAGES = ['ro', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

const resources = {
  en: { translation: en },
  ro: { translation: ro },
};

/**
 * The device language if we speak it, English otherwise. The Profile tab will
 * layer a manual override on top of this later; nothing is persisted yet.
 */
function resolveDeviceLanguage(): SupportedLanguage {
  const preferred = getLocales()
    .map((locale) => locale.languageCode)
    .find((code): code is SupportedLanguage =>
      SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)
    );

  return preferred ?? FALLBACK_LANGUAGE;
}

if (!i18next.isInitialized) {
  // `i18next.use()` is the instance method, not the standalone `use` export the
  // rule assumes.
  // eslint-disable-next-line import/no-named-as-default-member
  void i18next.use(initReactI18next).init({
    resources,
    lng: resolveDeviceLanguage(),
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
  });
}

export default i18next;
