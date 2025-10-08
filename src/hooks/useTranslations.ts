// src/hooks/useTranslations.ts
import { useContext } from 'react';
import { LanguageContext } from '../App';
import { translations } from '../i18n/locales';

export const useTranslations = () => {
  const { language } = useContext(LanguageContext);

  const t = (key: string, replacements?: { [key: string]: string | number }) => {
    let translation = translations[language]?.[key] || key;
    
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