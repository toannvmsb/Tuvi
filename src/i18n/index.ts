import vi from './vi';
import en from './en';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'vi' | 'en';
export type TranslationKeys = keyof typeof vi;

const translations = { vi, en };

interface I18nStore {
  language: Language;
  t: (key: TranslationKeys) => string;
  setLanguage: (lang: Language) => void;
}

// Simple i18n without heavy libraries
let currentLang: Language = 'vi';

export function t(key: TranslationKeys): string {
  return (translations[currentLang] as any)[key] ?? (translations.vi as any)[key] ?? key;
}

export function setLanguage(lang: Language): void {
  currentLang = lang;
  AsyncStorage.setItem('language', lang).catch(() => {});
}

export async function loadLanguage(): Promise<Language> {
  try {
    const saved = await AsyncStorage.getItem('language');
    if (saved === 'vi' || saved === 'en') {
      currentLang = saved;
      return saved;
    }
  } catch {}
  return 'vi';
}

export function getCurrentLanguage(): Language {
  return currentLang;
}
