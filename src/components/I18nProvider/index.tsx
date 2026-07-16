'use client'

import { I18nProviderClient } from '@/locales/client'
import type { Locale } from '@/locales/config'

export function I18nProvider({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return <I18nProviderClient locale={locale} fallbackLocale="en">{children}</I18nProviderClient>
}
