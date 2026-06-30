export const locales = ["en", "ru", "uk", "nb", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
  nb: "Norsk",
  es: "Español",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";
