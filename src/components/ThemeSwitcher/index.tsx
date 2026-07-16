'use client'

import { Dialog, DialogHeader, DialogContent } from '@/components/ui/dialog'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { useTheme } from '@/providers/Theme'
import { themeLocalStorageKey } from '@/providers/Theme/ThemeSelector/types'
import { useEffect, useState } from 'react'

const THEMES = [
  { value: 'auto' as const, label: 'themeSystem', icon: Monitor },
  { value: 'light' as const, label: 'themeLight', icon: Sun },
  { value: 'dark' as const, label: 'themeDark', icon: Moon },
]

export function ThemeSwitcher({
  open,
  onOpenChange,
  t,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  t: (key: string) => string
}) {
  const { setTheme } = useTheme()
  const [current, setCurrent] = useState('auto')

  useEffect(() => {
    const stored = window.localStorage.getItem(themeLocalStorageKey)
    setCurrent(stored ?? 'auto')
  }, [])

  const switchTheme = (value: string) => {
    if (value === 'auto') {
      setTheme(null)
    } else {
      setTheme(value as 'light' | 'dark')
    }
    setCurrent(value)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        {t('theme')}
      </DialogHeader>
      <DialogContent>
        {THEMES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => switchTheme(value)}
            className={cn(
              'w-full flex items-center justify-between p-4 rounded-xl border transition-colors text-left',
              current === value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:bg-muted',
            )}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} />
              <p className="font-medium">{t(label)}</p>
            </div>
            {current === value && <Check size={20} className="shrink-0" />}
          </button>
        ))}
      </DialogContent>
    </Dialog>
  )
}
