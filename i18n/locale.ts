"use server";

import { cookies } from "next/headers";
import {
  defaultLocale,
  LOCALE_COOKIE,
  locales,
  type Locale,
} from "@/i18n/config";

export async function getUserLocale(): Promise<Locale> {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  if (value && locales.includes(value as Locale)) {
    return value as Locale;
  }
  return defaultLocale;
}

export async function setUserLocale(locale: Locale): Promise<void> {
  // Validate against the allow-list before persisting. Even though the parameter
  // is typed Locale, the value crosses the server-action trust boundary.
  if (!locales.includes(locale)) return;
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
