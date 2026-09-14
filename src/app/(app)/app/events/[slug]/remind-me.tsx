'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { useScopedI18n } from '@/locales/client'
import { cn } from '@/utilities/ui'
import {
  getReminder,
  removeReminder,
  setReminder,
} from '@/lib/reminders'

const MINUTE_OPTIONS = [15, 30, 60, 120]

type Props = {
  eventId: number | string
  eventTitle: string
  startDatetime?: string | null
  eventPath: string
}

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

/**
 * "Remind me" dialog mirroring the mobile reminder sheet: 15/30/60/120-minute
 * options that schedule a browser notification via the Notification API. The
 * reminder persists in localStorage and is fired by the app shell's poll, so
 * it survives navigating away from the page (it cannot fire while the site is
 * closed — no service-worker/push backend exists yet).
 */
export function RemindMeButton({
  eventId,
  eventTitle,
  startDatetime,
  eventPath,
}: Props) {
  const t = useScopedI18n('eventDetail') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string

  const [open, setOpen] = useState(false)
  const [activeMinutes, setActiveMinutes] = useState<number | null>(null)
  const [permission, setPermission] = useState<PermissionState>('default')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(
      Notification.permission === 'granted'
        ? 'granted'
        : Notification.permission === 'denied'
          ? 'denied'
          : 'default',
    )
    setActiveMinutes(getReminder(eventId)?.minutes ?? null)
  }, [eventId])

  if (!startDatetime) return null

  const startMs = new Date(startDatetime).getTime()

  const requestPermission = async (): Promise<boolean> => {
    if (permission === 'granted') return true
    if (permission === 'unsupported') return false
    if (permission === 'denied') return false
    try {
      const result = await Notification.requestPermission()
      setPermission(
        result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'default',
      )
      return result === 'granted'
    } catch {
      return false
    }
  }

  const schedule = async (minutes: number) => {
    setError(null)
    const fireAt = startMs - minutes * 60_000
    if (fireAt <= Date.now()) {
      setError(t('reminderTooSoon'))
      return
    }
    setPending(true)
    const granted = await requestPermission()
    if (!granted) {
      setPending(false)
      const unsupported = typeof window !== 'undefined' && !('Notification' in window)
      setError(unsupported ? t('reminderUnsupported') : t('reminderPermissionDenied'))
      return
    }
    setReminder(eventId, {
      fireAt,
      minutes,
      title: eventTitle,
      body: t('reminderNow', { title: eventTitle }),
      path: eventPath,
    })
    setActiveMinutes(minutes)
    setPending(false)
    setOpen(false)
  }

  const remove = () => {
    removeReminder(eventId)
    setActiveMinutes(null)
    setError(null)
  }

  const active = activeMinutes != null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
        className={cn(
          'gap-2 rounded-xl',
          active && 'border-primary text-primary bg-primary/5',
        )}
      >
        {active ? <BellRing size={16} /> : <Bell size={16} />}
        {active ? t('reminderSet') : t('remindMe')}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogHeader onClose={() => setOpen(false)}>{t('setReminder')}</DialogHeader>
        <DialogContent>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BellRing size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('reminderDesc')}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(startMs).toLocaleString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {MINUTE_OPTIONS.map((minutes) => {
              const fireAt = startMs - minutes * 60_000
              const tooSoon = fireAt <= Date.now()
              const selected = activeMinutes === minutes
              return (
                <button
                  key={minutes}
                  type="button"
                  disabled={tooSoon || pending}
                  onClick={() => schedule(minutes)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-muted/60 text-foreground',
                    tooSoon && 'opacity-50 cursor-not-allowed',
                    pending && 'cursor-default',
                  )}
                >
                  <span>
                    {t(`reminder${minutes}` as string)}
                    {tooSoon && (
                      <span className="block text-xs text-muted-foreground font-normal">
                        {t('reminderTooSoon')}
                      </span>
                    )}
                  </span>
                  {selected ? (
                    <Check size={18} />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-current opacity-30" />
                  )}
                </button>
              )
            })}
          </div>

          {active && (
            <Button
              variant="outline"
              onClick={remove}
              className="w-full gap-2 text-red-600 hover:text-red-600 border-red-200 dark:border-red-900"
            >
              <X size={16} />
              {t('removeReminder')}
            </Button>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  )
}
