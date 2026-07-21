'use client';

import {ChevronDown, Globe2} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import {routing, type AppLocale} from '@/i18n/routing';

const LABELS: Record<AppLocale, string> = {
  uk: 'UA',
  en: 'EN',
  pl: 'PL',
  de: 'DE'
};

function removeLocalePrefix(pathname: string) {
  const segments = pathname.split('/');
  if (routing.locales.includes(segments[1] as AppLocale)) {
    const path = `/${segments.slice(2).join('/')}`;
    return path === '/' ? '/' : path.replace(/\/$/, '');
  }
  return pathname;
}

export default function LanguageSwitcher({compact = false, segmented = false}: {compact?: boolean; segmented?: boolean}) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations('Common');

  function changeLocale(nextLocale: AppLocale) {
    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const basePath = removeLocalePrefix(pathname || '/');
    const localizedPath = `/${nextLocale}${basePath === '/' ? '' : basePath}`;
    window.location.assign(`${localizedPath}${window.location.search}${window.location.hash}`);
  }

  if (segmented) {
    return (
      <div className="grid w-full grid-cols-4 gap-1 rounded-lg border border-border bg-bg-elevated/80 p-1" role="group" aria-label={t('language')}>
        {routing.locales.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={locale === item}
            onClick={() => changeLocale(item)}
            className={`h-7 min-w-0 rounded-md text-[10px] font-bold transition-colors ${
              locale === item
                ? 'bg-accent/15 text-accent shadow-sm shadow-black/20'
                : 'text-text-muted hover:bg-bg-card hover:text-text'
            }`}
          >
            {LABELS[item]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className="relative inline-flex items-center" title={t('language')}>
      <Globe2 size={14} className="pointer-events-none absolute left-2 text-text-muted" />
      <select
        aria-label={t('language')}
        value={locale}
        onChange={(event) => changeLocale(event.target.value as AppLocale)}
        className={`h-9 appearance-none rounded-lg border border-border bg-bg-elevated pl-7 pr-7 text-xs font-semibold text-text outline-none transition-colors hover:border-accent focus:border-accent ${compact ? 'w-[68px]' : 'w-[84px]'}`}
      >
        {routing.locales.map((item) => <option key={item} value={item}>{LABELS[item]}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 text-text-muted" />
    </label>
  );
}
