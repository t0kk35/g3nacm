'use server'

import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['en', 'fr', 'es'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export async function setLocale(locale: SupportedLocale) {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) return;
  (await cookies()).set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });
}
