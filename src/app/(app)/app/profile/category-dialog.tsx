'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { useScopedI18n } from '@/locales/client'
import { cn } from '@/utilities/ui'
import { TAG_OPTIONS } from '@/config/tags'

type Props = {
  open: boolean
  onClose: () => void
  userId: number
}

const ALL_SLUGS = TAG_OPTIONS.map((o) => o.value)

/**
 * Category notification preferences, mirroring the mobile picker: a grid of
 * toggleable category chips that immediately POSTs the full selection to
 * `/api/users/subscribed-categories`. Matches mobile's default of "all
 * categories" when nothing has been saved yet.
 */
export function CategoryNotificationsDialog({ open, onClose, userId }: Props) {
  const t = useScopedI18n('profile') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setSelected(null)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/users/${userId}?depth=0`, { credentials: 'include' })
        if (!res.ok) throw new Error(`bad status ${res.status}`)
        const doc = await res.json()
        const saved = Array.isArray(doc.subscribedCategories)
          ? doc.subscribedCategories.filter(
              (c: unknown): c is string => typeof c === 'string' && c.length > 0,
            )
          : []
        if (cancelled) return
        // Mobile treats an unset preference as "all categories" — mirror that
        // so first-time web users see the same default as the app.
        setSelected(new Set(saved.length > 0 ? saved : ALL_SLUGS))
      } catch {
        if (!cancelled) {
          setError(t('categoryLoadError'))
          setSelected(new Set(ALL_SLUGS))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, userId, t])

  const toggle = useCallback(
    async (slug: string) => {
      if (!selected || saving) return
      const next = new Set(selected)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)

      setSelected(next)
      setSaving(true)
      setError(null)
      try {
        const res = await fetch('/api/users/subscribed-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categories: Array.from(next) }),
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`bad status ${res.status}`)
      } catch {
        setError(t('categorySaveError'))
        setSelected(selected) // revert on failure so the UI matches the server
      } finally {
        setSaving(false)
      }
    },
    [selected, saving, t],
  )

  const selectedCount = selected?.size ?? 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader onClose={onClose}>{t('categoryNotifications')}</DialogHeader>
      <DialogContent>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BellRing size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('categoryNotifDesc')}</p>
            <p className="text-sm text-muted-foreground">
              {selected
                ? selectedCount === ALL_SLUGS.length
                  ? t('categoryAll')
                  : t('categoriesSelected', { count: selectedCount })
                : ''}
            </p>
          </div>
        </div>

        {!selected ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((cat) => {
              const isSelected = selected.has(cat.value)
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggle(cat.value)}
                  disabled={saving}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors border',
                    isSelected
                      ? 'bg-secondary text-secondary-foreground border-transparent hover:opacity-90'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/70',
                    saving && 'cursor-default opacity-70',
                  )}
                >
                  {isSelected && <Check size={14} />}
                  {cat.label}
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="button" className="flex-1" onClick={onClose}>
            {t('done')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
