// src/hooks/useTranslations.ts
import { useContext } from 'react';
import { LanguageContext } from '../App';
import { translations } from '../i18n/locales';
import type { Language } from '../types'; // Import Language type

export const useTranslations = () => {
  const { language } = useContext(LanguageContext);

  const t = (key: string, replacements?: { [key: string]: string | number }) => {
    // FIX: Explicitly cast translations to resolve TS7053
    let translation = ((translations as Record<Language, Record<string, string>>)[language as Language])?.[key] || key;
    
    if (replacements) {
        Object.keys(replacements).forEach(placeholder => {
            const regex = new RegExp(`{${placeholder}}`, 'g');
            translation = translation.replace(regex, String(replacements[placeholder]));
        });
    }
    return translation;
  };

  return t;
};