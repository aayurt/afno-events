'use client'

import { useRouter } from 'next/navigation'
import { Dialog, DialogHeader, DialogContent } from '@/components/ui/dialog'
import { Check } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { useCallback } from 'react'

const LANGUAGES = [
  { code: 'en' as const, label: 'English (UK)', nativeLabel: 'English (UK)' },
  { code: 'ne' as const, label: 'Nepali', nativeLabel: 'नेपाली' },
]

function getCurrentLocale(): 'en' | 'ne' {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]*)/)
  const val = match?.[1]
  if (val === 'ne') return 'ne'
  return 'en'
}

export function LanguageSwitcher({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const currentLocale = getCurrentLocale()

  const switchLanguage = useCallback(
    (code: 'en' | 'ne') => {
      document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`
      onOpenChange(false)
      router.refresh()
    },
    [onOpenChange, router],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        Select Language / भाषा चयन गर्नुहोस्
      </DialogHeader>
      <DialogContent>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={cn(
              'w-full flex items-center justify-between p-4 rounded-xl border transition-colors text-left',
              currentLocale === lang.code
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:bg-muted',
            )}
          >
            <div>
              <p className="font-medium">{lang.label}</p>
              <p className="text-sm text-muted-foreground">{lang.nativeLabel}</p>
            </div>
            {currentLocale === lang.code && <Check size={20} className="shrink-0" />}
          </button>
        ))}
      </DialogContent>
    </Dialog>
  )
}
