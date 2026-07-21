import type { Metadata, Viewport } from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getMessages, getTranslations} from 'next-intl/server';
import './globals.css';
import AuthSessionProvider from '@/components/AuthSessionProvider';
import PwaRegister from '@/components/PwaRegister';
import ReminderScheduler from '@/components/ReminderScheduler';
import Toaster from '@/components/Toaster';
import CloudSync from '@/components/CloudSync';
import RuntimeTranslator from '@/components/RuntimeTranslator';
import generatedTranslations from '@/i18n/generated-translations.json';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  const baseUrl = (process.env.NEXTAUTH_URL || 'https://vitalyzer.vercel.app').replace(/\/$/, '');
  return {
    metadataBase: new URL(baseUrl),
    applicationName: 'Metrivyn',
    title: {default: t('title'), template: '%s · Metrivyn'},
    description: t('description'),
    keywords: [
      'трекер здоров’я',
      'сон',
      'харчування',
      'тренування',
      'вага',
      'health tracker',
      'wellness dashboard'
    ],
    authors: [{name: 'Metrivyn'}],
    creator: 'Metrivyn',
    publisher: 'Metrivyn',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1
      }
    },
    alternates: {
      canonical: baseUrl,
      languages: {
        uk: `${baseUrl}/uk`,
        en: `${baseUrl}/en`,
        pl: `${baseUrl}/pl`,
        de: `${baseUrl}/de`
      }
    },
    openGraph: {
      type: 'website',
      url: baseUrl,
      siteName: 'Metrivyn',
      title: t('title'),
      description: t('description'),
      locale: 'uk_UA',
      images: [{url: '/metrivyn-lifestyle-hero.png', width: 1536, height: 1024, alt: 'Metrivyn'}]
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/metrivyn-lifestyle-hero.png']
    },
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? {google: process.env.GOOGLE_SITE_VERIFICATION}
      : undefined,
    manifest: '/manifest.webmanifest',
    appleWebApp: {capable: true, statusBarStyle: 'black-translucent', title: 'Metrivyn'},
    formatDetection: {telephone: false},
    icons: {
      icon: [{url: '/icon.svg', type: 'image/svg+xml'}],
      apple: [{url: '/icon.svg', type: 'image/svg+xml'}]
    }
  };
}

export const viewport: Viewport = {
  themeColor: '#0f1115',
  colorScheme: 'dark',
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dictionary = generatedTranslations[locale as keyof typeof generatedTranslations] ?? {};
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <RuntimeTranslator locale={locale} dictionary={dictionary} />
          <AuthSessionProvider>
            {children}
            <CloudSync />
          </AuthSessionProvider>
          <PwaRegister />
          <ReminderScheduler />
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
