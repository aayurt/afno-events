import { locales, type Locale, defaultLocale, localesPathMap } from './config'

async function detectLocale(): Promise<Locale> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const raw = cookieStore.get('NEXT_LOCALE')?.value
    if (raw === 'en' || raw === 'ne') return raw
  } catch {}
  return defaultLocale
}

type ScopedT = (key: string, params?: Record<string, string | number>) => string

async function loadScope(scope: string): Promise<Record<string, any>> {
  const locale = await detectLocale()
  const module = await localesPathMap[locale]()
  return (module.default as any)[scope] || {}
}

export async function getScopedI18n(scope: string): Promise<ScopedT> {
  const data = await loadScope(scope)
  return (key: string, params?: Record<string, string | number>) => {
    let value = data[key]
    if (value === undefined || value === null) return key
    value = String(value)
    if (params) {
      value = value.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
    }
    return value
  }
}

type I18n = (key: string, params?: Record<string, string | number>) => string

export async function getI18n(): Promise<I18n> {
  const locale = await detectLocale()
  const module = await localesPathMap[locale]()
  const all = module.default as Record<string, any>
  return (key: string, params?: Record<string, string | number>) => {
    const parts = key.split('.')
    let value: any = all
    for (const part of parts) {
      if (value == null || typeof value !== 'object') return key
      value = value[part]
    }
    if (value === undefined || value === null) return key
    value = String(value)
    if (params) {
      value = value.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
    }
    return value
  }
}

export async function getCurrentLocale(): Promise<Locale> {
  return detectLocale()
}

export function getStaticParams(): Locale[] {
  return [...locales]
}
