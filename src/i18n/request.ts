import {cookies, headers} from 'next/headers';
import {getRequestConfig} from 'next-intl/server';
import {isAppLocale, routing} from './routing';

export default getRequestConfig(async () => {
  const headerLocale = headers().get('x-vitalyzer-locale');
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value;
  const locale = isAppLocale(headerLocale)
    ? headerLocale
    : isAppLocale(cookieLocale)
      ? cookieLocale
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
