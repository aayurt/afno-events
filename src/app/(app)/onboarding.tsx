'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Check, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { useScopedI18n } from '@/locales/client'
import { cn } from '@/utilities/ui'
import { TAG_OPTIONS } from '@/config/tags'

const ALL_SLUGS = TAG_OPTIONS.map((o) => o.value)

type Props = {
  userId: number
  /** Called after the user saves/skips, or when no onboarding is needed. */
  onDone: () => void
}

/**
 * First-run "Pick your interests" onboarding. Preselects every category
 * (mobile's default) and lets the user trim the list; saving POSTs the full
 * selection to `/api/users/subscribed-categories`. Skipping performs no save.
 * Users who already have saved category preferences (from Profile or mobile)
 * skip the flow silently.
 */
export function OnboardingModal({ userId, onDone }: Props) {
  const t = useScopedI18n('onboarding') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
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
        if (saved.length > 0) {
          onDone() // preferences already exist — nothing to onboard
          return
        }
        setSelected(new Set(ALL_SLUGS))
      } catch {
        // Never block the app on this — if we can't read preferences, skip.
        if (!cancelled) onDone()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, onDone])

  const save = useCallback(async () => {
    if (!selected || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/users/subscribed-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: Array.from(selected) }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`bad status ${res.status}`)
      onDone()
    } catch {
      setError(t('error'))
      setSaving(false)
    }
  }, [selected, saving, onDone, t])

  const toggle = useCallback(
    (slug: string) => {
      if (!selected) return
      const next = new Set(selected)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      setSelected(next)
    },
    [selected],
  )

  return (
    <Dialog open onOpenChange={() => onDone()}>
      <DialogHeader>{t('title')}</DialogHeader>
      <DialogContent>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('subtitle')}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <BellRing size={12} />
              {t('subtitleHint')}
            </p>
          </div>
        </div>

        {!selected ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" /> {t('loading')}
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
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={onDone}
            disabled={saving || !selected}
          >
            {t('skip')}
          </Button>
          <Button type="button" className="flex-1 gap-2" onClick={save} disabled={saving || !selected}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
