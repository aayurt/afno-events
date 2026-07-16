export const locales = ['en', 'ne'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localesPathMap = {
  en: async () => {
    const gen = await import('../../locales/translations/gen/en.json')
    let custom: Record<string, any> = {}
    try {
      custom = await import('../../locales/translations/custom/en.json')
    } catch {}
    return { default: { ...gen.default, ...custom.default } }
  },
  ne: async () => {
    const gen = await import('../../locales/translations/gen/ne.json')
    let custom: Record<string, any> = {}
    try {
      custom = await import('../../locales/translations/custom/ne.json')
    } catch {}
    return { default: { ...gen.default, ...custom.default } }
  },
} as const
