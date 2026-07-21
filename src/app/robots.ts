import type {MetadataRoute} from 'next';

const siteUrl = 'https://vitalyzer.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/uk', '/en', '/pl', '/de', '/billing', '/privacy', '/terms'],
      disallow: ['/app', '/api/', '/signin']
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
