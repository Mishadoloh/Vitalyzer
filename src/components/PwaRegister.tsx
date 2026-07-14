'use client';

import { useEffect } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global {
  interface Window {
    __vitalyzerInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__vitalyzerInstallPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event('vitalyzer:pwa-ready'));
    };

    const onAppInstalled = () => {
      window.__vitalyzerInstallPrompt = undefined;
      window.dispatchEvent(new Event('vitalyzer:pwa-installed'));
    };

    const registerServiceWorker = () => {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // PWA support is an enhancement; the app should keep working without it.
      });
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    window.addEventListener('load', registerServiceWorker);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  return null;
}
