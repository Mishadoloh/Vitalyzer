import type { Metadata } from 'next';
import './globals.css';
import AuthSessionProvider from '@/components/AuthSessionProvider';
import Toaster from '@/components/Toaster';

export const metadata: Metadata = {
  title: "Vitalyzer — розумний шар над вашими даними здоров'я",
  description: 'Аналіз сну, тренувань і харчування з персональними щоденними порадами.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
