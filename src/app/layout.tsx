import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthSessionProvider from '@/components/AuthSessionProvider';
import PwaRegister from '@/components/PwaRegister';
import ReminderScheduler from '@/components/ReminderScheduler';
import Toaster from '@/components/Toaster';
import CloudSync from '@/components/CloudSync';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://vitalyzer.vercel.app'),
  applicationName: 'Vitalyzer',
  title: {
    default: "Vitalyzer — розумний шар над вашими даними здоров'я",
    template: '%s · Vitalyzer',
  },
  description: 'Аналіз сну, тренувань і харчування з персональними щоденними порадами.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vitalyzer',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1115',
  colorScheme: 'dark',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <AuthSessionProvider>
          {children}
          <CloudSync />
        </AuthSessionProvider>
        <PwaRegister />
        <ReminderScheduler />
        <Toaster />
      </body>
    </html>
  );
}
