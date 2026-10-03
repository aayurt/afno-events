'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme } from '@/providers/Theme'
import { themeLocalStorageKey } from '@/providers/Theme/ThemeSelector/types'
import { useScopedI18n } from '@/locales/client'

type ThemePref = 'auto' | 'light' | 'dark'

const themeOrder: ThemePref[] = ['auto', 'light', 'dark']

const themeIcons = { auto: Monitor, light: Sun, dark: Moon } satisfies Record<ThemePref, LucideIcon>

function OrganiserThemeButton({ label }: { label: string }) {
  const { setTheme } = useTheme()
  const [pref, setPref] = useState<ThemePref>('auto')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(themeLocalStorageKey)
      setPref(stored === 'light' || stored === 'dark' ? stored : 'auto')
    } catch {}
  }, [])

  const cycle = () => {
    const next = themeOrder[(themeOrder.indexOf(pref) + 1) % themeOrder.length]
    if (next === 'auto') setTheme(null)
    else setTheme(next)
    setPref(next)
  }

  const Icon = themeIcons[pref]

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0"
    >
      <Icon size={18} />
    </button>
  )
}

/**
 * Shared slim header for all organiser portal pages: logo (→ dashboard),
 * optional centered title, theme selector + dashboard shortcut.
 */
export function OrganiserHeader({ title }: { title?: string }) {
  const t = useScopedI18n('profile')

  return (
    <header className="sticky top-0 z-40 self-stretch border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/organiser/dashboard" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.png" alt="AfnoEvents" className="h-10 w-10 rounded-xl object-cover" />
          <span className="font-bold text-sm hidden min-[400px]:inline">Organiser</span>
        </Link>
        {title && (
          <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold truncate max-w-[40%]">
            {title}
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <OrganiserThemeButton label={t('theme')} />
          <Link
            href="/organiser/dashboard"
            title="Dashboard"
            aria-label="Dashboard"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0"
          >
            <LayoutDashboard size={18} />
          </Link>
        </div>
      </div>
    </header>
  )
}
