import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { SUPPORTED_LOCALES } from './locales';

type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  let locale: SupportedLocale = 'en';

  if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
    locale = cookieLocale as SupportedLocale;
  } else {
    const acceptLanguage = (await headers()).get('accept-language') ?? '';
    const match = acceptLanguage
      .split(',')
      .map((p) => ({
        lang: p.split(';')[0].split('-')[0].trim(),
        q: parseFloat(p.split(';q=')[1] ?? '1'),
      }))
      .sort((a, b) => b.q - a.q)
      .find((e) => (SUPPORTED_LOCALES as readonly string[]).includes(e.lang));
    if (match) locale = match.lang as SupportedLocale;
  }

  return {
    locale,
    messages: (await import(`../../conf/messages/${locale}.json`)).default,
  };
});
