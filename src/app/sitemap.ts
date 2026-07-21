import type {MetadataRoute} from 'next';

const siteUrl = 'https://vitalyzer.vercel.app';
const locales = ['uk', 'en', 'pl', 'de'] as const;
const publicPages = ['', '/billing', '/privacy', '/terms'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return locales.flatMap((locale) =>
    publicPages.map((path) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified,
      changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '' ? 1 : path === '/billing' ? 0.7 : 0.3,
      alternates: {
        languages: Object.fromEntries(
          locales.map((alternateLocale) => [alternateLocale, `${siteUrl}/${alternateLocale}${path}`])
        )
      }
    }))
  );
}
