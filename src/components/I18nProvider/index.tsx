'use client'

import { I18nProviderClient } from '@/locales/client'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nProviderClient>{children}</I18nProviderClient>
}
