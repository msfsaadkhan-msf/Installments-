import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// import * as Localization from 'expo-localization'; // Temporarily disabled due to corrupted build artifacts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { Platform } from 'react-native';

import en from './translations/en.json';
import ur from './translations/ur.json';
import ar from './translations/ar.json';

const resources = {
  en: { translation: en },
  ur: { translation: ur },
  ar: { translation: ar },
};

export const LANGUAGE_KEY = '@ims_language';

export const setLanguage = async (lng: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  await i18n.changeLanguage(lng);

  const isRTL = lng === 'ar' || lng === 'ur';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    // Restart logic is usually handled in the UI with a reload trigger
  }
};

// Initialize i18n with resources immediately (synchronous)
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    }
  });

// Async initialization to load saved settings
export const initI18n = async () => {
  try {
    let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    if (!savedLanguage) {
      // Safe detection - fallback to en during environment instability
      savedLanguage = 'en';
    }

    if (savedLanguage !== 'en') {
      await i18n.changeLanguage(savedLanguage);
    }

    const isRTL = savedLanguage === 'ar' || savedLanguage === 'ur';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }
  } catch (error) {
    console.warn('i18n init error:', error);
  }
};

export default i18n;
