'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Check, CheckCircle2, ChevronRight, Clock, Loader2, Timer, Users, EyeOff } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { useScopedI18n } from '@/locales/client'

export type ShareMember = {
  id: string
  name: string
}

type ScopedT = (key: string, params?: Record<string, string | number>) => string

const useDetailT = (): ScopedT =>
  useScopedI18n('circleDetail') as ScopedT

export const TIME_LIMIT_OPTIONS: { key: string; ms: number | null }[] = [
  { key: 'tlUntilStop', ms: null },
  { key: 'tl1h', ms: 60 * 60 * 1000 },
  { key: 'tl2h', ms: 2 * 60 * 60 * 1000 },
  { key: 'tl4h', ms: 4 * 60 * 60 * 1000 },
  { key: 'tl8h', ms: 8 * 60 * 60 * 1000 },
]

export const timeLimitKey = (ms: number | null): string =>
  TIME_LIMIT_OPTIONS.find((o) => o.ms === ms)?.key ??
  (ms != null && ms % (60 * 60 * 1000) === 0
    ? ms / (60 * 60 * 1000) === 1
      ? 'hourOne'
      : 'hourMany'
    : 'minuteMany')

/** Localized label for a share time limit (e.g. "1 hour" / "2 hours"). */
export const timeLimitText = (t: ScopedT, ms: number | null): string =>
  TIME_LIMIT_OPTIONS.some((o) => o.ms === ms)
    ? t(timeLimitKey(ms))
    : ms != null && ms % (60 * 60 * 1000) === 0
      ? t(ms / (60 * 60 * 1000) === 1 ? 'hourOne' : 'hourMany', {
          count: ms / (60 * 60 * 1000),
        })
      : t('minuteMany', { count: Math.round((ms ?? 0) / 60000) })

export const clockLabel = (date: Date): string =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/**
 * "Visible to" picker — mirrors the mobile visibility sheet. An empty
 * selection means every circle member can see you.
 */
export function ShareVisibilityDialog({
  open,
  onClose,
  members,
  initial,
  onApply,
}: {
  open: boolean
  onClose: () => void
  members: ShareMember[]
  initial: string[]
  onApply: (selected: string[]) => void
}) {
  const t = useDetailT()
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    if (open) setSelected(initial)
  }, [open, initial])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader onClose={onClose}>{t('visibilityTitle')}</DialogHeader>
      <DialogContent>
        <p className="text-sm text-muted-foreground -mt-2">{t('visibilityDesc')}</p>

        {/* All members */}
        <button
          type="button"
          onClick={() => setSelected([])}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
            selected.length === 0
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-muted/50',
          )}
        >
          <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
            <Users size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t('allMembers')}</p>
            <p className="text-xs text-muted-foreground">{t('allMembersDesc')}</p>
          </div>
          <Check
            size={18}
            className={cn(
              'shrink-0',
              selected.length === 0 ? 'text-primary' : 'text-transparent',
            )}
          />
        </button>

        {members.length > 0 && (
          <>
            <p className="text-sm font-semibold pt-1">{t('selectedMembers')}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((m) => {
                const checked = selected.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors',
                      checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0 text-xs font-semibold">
                      {m.name.trim().charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium truncate flex-1">{m.name}</span>
                    <Check
                      size={16}
                      className={cn('shrink-0', checked ? 'text-primary' : 'text-transparent')}
                    />
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {selected.length === 0
              ? t('visibleToAll')
              : t(selected.length === 1 ? 'dialogVisOne' : 'dialogVisMany', {
                  count: selected.length,
                })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={() => { onApply(selected); onClose() }}>
              {t('done')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * "Share for" time-limit picker — mirrors the mobile time-limit sheet.
 * `null` = share until you stop it.
 */
export function ShareTimeLimitDialog({
  open,
  onClose,
  initialMs,
  endsAt,
  onApply,
}: {
  open: boolean
  onClose: () => void
  initialMs: number | null
  endsAt: Date | null
  onApply: (ms: number | null) => void
}) {
  const t = useDetailT()
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader onClose={onClose}>{t('timeLimitTitle')}</DialogHeader>
      <DialogContent>
        <p className="text-sm text-muted-foreground -mt-2">{t('timeLimitDesc')}</p>
        <div className="space-y-2">
          {TIME_LIMIT_OPTIONS.map((opt) => {
            const selected = (opt.ms ?? null) === initialMs
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => { onApply(opt.ms); onClose() }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                  selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <Timer size={16} />
                </div>
                <span className="text-sm font-medium flex-1">{t(opt.key)}</span>
                {selected ? (
                  <Check size={18} className="text-primary shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-muted-foreground/40 shrink-0" />
                )}
              </button>
            )
          })}
        </div>
        <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock size={13} className="shrink-0" />
          {initialMs != null && endsAt ? (
            <span>{t('timeLimitSelected', { label: timeLimitText(t, initialMs), time: clockLabel(endsAt) })}</span>
          ) : (
            <span>{t('timeLimitUntil')}</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Privacy self-check — mirrors the mobile preview sheet. Fetches
 * `/circles/:id/location-preview` and shows every member with whether they
 * can currently see the sharer (per the sharer's visibleTo setting).
 */
export function WhoCanSeeYouDialog({
  open,
  onClose,
  circleId,
  myId,
}: {
  open: boolean
  onClose: () => void
  circleId: string
  myId?: string | null
}) {
  const t = useDetailT()
  const [members, setMembers] = useState<
    { id: number | string; name: string | null; canSeeMe: boolean }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/circles/${circleId}/location-preview`, {
        credentials: 'include',
      })
      if (!res.ok) {
        setError(t('previewLoadFailed', { status: res.status }))
        return
      }
      const data = await res.json()
      const all: { id: number | string; name: string | null; canSeeMe: boolean }[] =
        data.members || []
      setMembers(all.filter((m) => String(m.id) !== String(myId ?? '')))
    } catch {
      setError(t('previewLoadFailedGeneric'))
    } finally {
      setLoading(false)
      setLoadedFor(circleId)
    }
  }

  useEffect(() => {
    if (open && loadedFor !== circleId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, circleId])

  const canSeeCount = members.filter((m) => m.canSeeMe).length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader onClose={onClose}>{t('previewTitle')}</DialogHeader>
      <DialogContent>
        <p className="text-sm text-muted-foreground -mt-2">{t('previewDesc')}</p>

        {loading && members.length === 0 ? (
          <div className="py-8 flex justify-center">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-6 flex flex-col items-center gap-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              {t('retry')}
            </Button>
          </div>
        ) : members.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">{t('noMembers')}</div>
        ) : (
          <>
            <div className="max-h-80 overflow-y-auto -mx-6 px-6 divide-y divide-border">
              {members.map((m) => {
                const name = m.name && m.name.trim() ? m.name : t('userN', { id: m.id })
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                        m.canSeeMe
                          ? 'bg-secondary/10 text-secondary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium truncate flex-1 min-w-0">{name}</span>
                    {m.canSeeMe ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 size={12} /> {t('canSeeYou')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        <EyeOff size={12} /> {t('hidden')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              {canSeeCount === 0
                ? t('previewNone')
                : canSeeCount === 1
                  ? t('previewOne')
                  : t('previewMany', { count: canSeeCount })}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
