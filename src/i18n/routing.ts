import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['uk', 'en', 'pl', 'de'],
  defaultLocale: 'uk',
  localePrefix: 'always'
});

export type AppLocale = (typeof routing.locales)[number];

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && routing.locales.includes(value as AppLocale));
}
