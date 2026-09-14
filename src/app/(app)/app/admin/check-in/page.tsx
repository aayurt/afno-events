'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Loader2,
  LogIn,
  MapPin,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  User,
} from 'lucide-react'
import { useScopedI18n } from '@/locales/client'
import { cn } from '@/utilities/ui'

type EventInfo = {
  id?: number | string
  title?: string | null
  startDatetime?: string | null
  location?: { location?: string | null } | null
}

type TicketDoc = {
  id: number
  code: string
  status: string
  attendeeName?: string | null
  attendeeEmail?: string | null
  checkedInAt?: string | null
  event?: EventInfo | null
}

type Status =
  | 'idle'
  | 'validating'
  | 'valid'
  | 'checkingIn'
  | 'checkedIn'
  | 'already'
  | 'invalid'
  | 'error'

type Boot = 'loading' | 'signedOut' | 'forbidden' | 'ready'

export default function CheckInPage() {
  const t = useScopedI18n('checkIn') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string
  const tt = useScopedI18n('tickets') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string

  const [boot, setBoot] = useState<Boot>('loading')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [ticket, setTicket] = useState<TicketDoc | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await authClient.getSession()
      if (cancelled) return
      const user = result.data?.user
      if (!user) {
        setBoot('signedOut')
        return
      }
      try {
        // Role is a Payload-side field, so read the full user doc.
        const res = await fetch(`/api/users/${user.id}?depth=0`, { credentials: 'include' })
        const doc = await res.json()
        const role = doc?.role
        if (!cancelled) setBoot(role === 'admin' || role === 'super-admin' ? 'ready' : 'forbidden')
      } catch {
        if (!cancelled) setBoot('forbidden')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const lookUp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = code.trim()
    if (!trimmed || status === 'validating' || status === 'checkingIn') return

    setStatus('validating')
    setTicket(null)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/tickets/lookup/${encodeURIComponent(trimmed)}`, {
        credentials: 'include',
      })
      if (res.status === 403) {
        setBoot('forbidden')
        setStatus('idle')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 404) {
          setStatus('invalid')
          setErrorMsg(t('notFound'))
        } else if (res.status === 429) {
          setStatus('error')
          setErrorMsg(t('rateLimited'))
        } else {
          setStatus('invalid')
          setErrorMsg(data?.error || t('invalid'))
        }
        return
      }
      const doc = data as TicketDoc
      if (doc.status === 'unused') {
        setTicket(doc)
        setStatus('valid')
      } else if (doc.status === 'checked-in') {
        setTicket(doc)
        setStatus('already')
      } else {
        setTicket(doc)
        setStatus('invalid')
        setErrorMsg(t('ticketIs', { status: doc.status }))
      }
    } catch {
      setStatus('error')
      setErrorMsg(t('networkError'))
    }
  }

  const confirmCheckIn = async () => {
    if (!ticket || status !== 'valid') return
    setStatus('checkingIn')
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/check-in`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 403) {
        setBoot('forbidden')
        setStatus('valid')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 400 && typeof data?.error === 'string' && data.error.includes('already')) {
          setStatus('already')
          setTicket({ ...ticket, status: 'checked-in' })
        } else if (res.status === 429) {
          setStatus('error')
          setErrorMsg(t('rateLimited'))
        } else {
          setStatus('error')
          setErrorMsg(data?.error || t('checkInFailed'))
        }
        return
      }
      setTicket({ ...ticket, status: 'checked-in', checkedInAt: data.checkedInAt || new Date().toISOString() })
      setStatus('checkedIn')
    } catch {
      setStatus('error')
      setErrorMsg(t('networkError'))
    }
  }

  const reset = () => {
    setStatus('idle')
    setTicket(null)
    setErrorMsg(null)
    setCode('')
  }

  if (boot === 'loading') {
    return (
      <div className="container max-w-2xl py-12 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (boot === 'signedOut') {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <ScanLine size={48} className="mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{tt('signInRequired')}</h1>
            <p className="text-muted-foreground">{t('signInToCheckIn')}</p>
          </div>
          <Link href="/app/auth/login?redirect=/app/admin/check-in">
            <Button size="lg" className="w-full gap-2">
              <LogIn size={16} /> {tt('signIn')}
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (boot === 'forbidden') {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <ShieldAlert size={48} className="mx-auto text-red-500" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('adminOnly')}</h1>
            <p className="text-muted-foreground">{t('adminOnlyDesc')}</p>
          </div>
          <Link href="/app">
            <Button variant="outline" size="lg" className="w-full">
              {t('backToApp')}
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const busy = status === 'validating' || status === 'checkingIn'
  const event = ticket?.event && typeof ticket.event === 'object' ? ticket.event : null

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <form onSubmit={lookUp} className="space-y-3">
            <Label htmlFor="ticket-code">{t('codeLabel')}</Label>
            <div className="flex gap-2">
              <Input
                id="ticket-code"
                value={code}
                onChange={(e) => {
                  const value = e.target.value
                  setCode(value)
                  // Editing the code invalidates any previous result — clear it
                  // without wiping the typed text (busy states keep showing).
                  if (!busy && status !== 'idle') {
                    setStatus('idle')
                    setTicket(null)
                    setErrorMsg(null)
                  }
                }}
                placeholder={t('codePlaceholder')}
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                disabled={busy}
              />
              <Button type="submit" disabled={busy || !code.trim()} className="gap-2 shrink-0">
                {status === 'validating' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ScanLine size={16} />
                )}
                {status === 'validating' ? t('validating') : t('lookupButton')}
              </Button>
            </div>
          </form>

          {status !== 'idle' && (
            <div
              className={cn(
                'rounded-xl border p-4 space-y-3',
                (status === 'valid' || status === 'checkedIn') && 'border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/30',
                status === 'already' && 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
                (status === 'invalid' || status === 'error') && 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
              )}
            >
              <div className="flex items-center gap-2.5">
                {status === 'validating' || status === 'checkingIn' ? (
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                ) : status === 'valid' ? (
                  <CheckCircle2 size={20} className="text-green-600" />
                ) : status === 'checkedIn' ? (
                  <CheckCircle2 size={20} className="text-green-600" />
                ) : status === 'already' ? (
                  <AlertTriangle size={20} className="text-amber-600" />
                ) : (
                  <AlertTriangle size={20} className="text-red-600" />
                )}
                <p
                  className={cn(
                    'font-semibold',
                    (status === 'valid' || status === 'checkedIn') && 'text-green-700 dark:text-green-400',
                    status === 'already' && 'text-amber-700 dark:text-amber-400',
                    (status === 'invalid' || status === 'error') && 'text-red-700 dark:text-red-400',
                    (status === 'validating' || status === 'checkingIn') && 'text-muted-foreground',
                  )}
                >
                  {status === 'valid' && t('valid')}
                  {status === 'checkedIn' && t('checkedIn')}
                  {status === 'already' && t('alreadyCheckedIn')}
                  {status === 'invalid' && t('invalid')}
                  {status === 'error' && t('error')}
                  {status === 'validating' && t('validating')}
                  {status === 'checkingIn' && t('checkingIn')}
                </p>
              </div>

              {(status === 'validating' || status === 'checkingIn') && (
                <p className="text-sm text-muted-foreground">
                  {status === 'validating' ? t('validatingDesc') : t('checkingInDesc')}
                </p>
              )}

              {status === 'checkedIn' && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={22} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    {t('checkedInDesc')}
                  </p>
                </div>
              )}

              {ticket && event && (status === 'valid' || status === 'already' || status === 'invalid' || status === 'error' || status === 'checkedIn') && (
                <div className="rounded-lg bg-background/70 border border-border/60 p-4 space-y-2.5 text-sm">
                  <div>
                    <p className="font-semibold leading-snug">{event.title || t('unknownEvent')}</p>
                    {event.startDatetime && (
                      <p className="text-muted-foreground text-xs flex items-center gap-1 mt-1">
                        <Calendar size={12} />
                        {new Date(event.startDatetime).toLocaleString(undefined, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    {event.location?.location && (
                      <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                        <MapPin size={12} />
                        <span className="truncate">{event.location.location}</span>
                      </p>
                    )}
                  </div>
                  <div className="h-px bg-border" />
                  {ticket.attendeeName && (
                    <p className="flex justify-between gap-4">
                      <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                        <User size={12} /> {t('attendee')}
                      </span>
                      <span className="font-medium truncate">{ticket.attendeeName}</span>
                    </p>
                  )}
                  <p className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{t('email')}</span>
                    <span className="font-medium truncate">{ticket.attendeeEmail || '—'}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{t('code')}</span>
                    <span className="font-mono text-xs truncate">{ticket.code}</span>
                  </p>
                  {ticket.checkedInAt && (
                    <p className="flex justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">{t('checkedInAt')}</span>
                      <span className="font-medium">
                        {new Date(ticket.checkedInAt).toLocaleString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {errorMsg && (
                <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
              )}

              {status === 'valid' && (
                <Button
                  onClick={confirmCheckIn}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 size={16} />
                  {t('confirmCheckIn')}
                </Button>
              )}
              {(status === 'already' || status === 'invalid' || status === 'error' || status === 'checkedIn') && (
                <Button variant="outline" onClick={reset} className="w-full gap-2">
                  <RotateCcw size={16} />
                  {t('checkAnother')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
