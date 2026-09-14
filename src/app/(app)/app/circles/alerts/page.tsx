'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useScopedI18n } from '@/locales/client'
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCheck,
  Loader2,
  LogIn,
  MapPin,
  Navigation,
  Landmark,
  Trash2,
} from 'lucide-react'

type AlertDoc = {
  id: number
  circle: any
  type: string
  title: string
  body?: string | null
  read: boolean
  createdAt?: string
}

const timeAgo = (iso: string, s: (key: string, params?: Record<string, string | number>) => string): string => {
  const t = new Date(iso)
  const diff = Date.now() - t.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return s('justNow')
  if (mins < 60) return s('mAgo', { minutes: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return s('hAgo', { hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return s('dAgo', { days })
  return `${t.getDate()}/${t.getMonth() + 1}/${t.getFullYear()}`
}

function alertStyle(type: string): { icon: typeof Bell; className: string } {
  switch (type) {
    case 'live_sharing':
      return { icon: Navigation, className: 'text-red-500 bg-red-500/10' }
    case 'nearby':
      return { icon: MapPin, className: 'text-green-600 bg-green-500/10' }
    case 'geofence':
      return { icon: Landmark, className: 'text-orange-500 bg-orange-500/10' }
    default:
      return { icon: Bell, className: 'text-muted-foreground bg-muted' }
  }
}

export default function CircleAlertsPage() {
  const t = useScopedI18n('alerts') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<AlertDoc[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/circle-alerts?sort=-createdAt&limit=100&depth=1', {
        credentials: 'include',
      })
      if (!res.ok) {
        setError(t('loadFailed', { status: res.status }))
        return
      }
      const data = await res.json()
      setAlerts(data.docs || [])
      setError(null)
    } catch {
      setError(t('loadFailedGeneric'))
    }
  }, [t])

  useEffect(() => {
    async function init() {
      const result = await authClient.getSession()
      setSession(result.data?.user ?? null)
      if (result.data?.user) await load()
      setLoading(false)
    }
    init()
  }, [load])

  const unreadCount = alerts.filter((a) => !a.read).length

  const markAllRead = async () => {
    if (unreadCount === 0 || busy) return
    setBusy(true)
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
    try {
      await fetch('/api/circle-alerts/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Refresh on failure so the UI doesn't stay optimistically wrong.
      await load()
    } finally {
      setBusy(false)
    }
  }

  const dismiss = async (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    try {
      await fetch(`/api/circle-alerts/${id}`, { method: 'DELETE', credentials: 'include' })
    } catch {
      await load()
    }
  }

  const openAlert = async (alert: AlertDoc) => {
    if (!alert.read) {
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, read: true } : a)))
      try {
        await fetch(`/api/circle-alerts/${alert.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
          credentials: 'include',
        })
      } catch {}
    }
    const circleId =
      alert.circle && typeof alert.circle === 'object' ? alert.circle.id : alert.circle
    router.push(`/app/circles/${circleId ?? ''}`)
  }

  if (loading) {
    return (
      <div className="container py-12 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <BellRing size={48} className="mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('signInTitle')}</h1>
            <p className="text-muted-foreground">{t('signInDesc')}</p>
          </div>
          <div className="pt-2" />
          <Link href="/app/auth/login?redirect=/app/circles/alerts">
            <Button size="lg" className="w-full gap-2">
              <LogIn size={16} /> {t('signIn')}
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/app/circles">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft size={16} /> {t('back')}
          </Button>
        </Link>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={markAllRead}
            disabled={busy}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            {t('markAllRead')}
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {!error && alerts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <BellRing size={28} className="text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{t('emptyTitle')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('emptyDesc')}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const { icon: Icon, className } = alertStyle(alert.type)
            const unread = !alert.read
            return (
              <Card
                key={alert.id}
                className={unread ? 'border-primary/30 bg-primary/[0.02]' : ''}
              >
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => openAlert(alert)}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left group"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${className}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              unread ? 'font-semibold' : 'font-medium text-muted-foreground'
                            }`}
                          >
                            {alert.title}
                          </p>
                          {unread && (
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                          )}
                        </div>
                        {alert.body && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {alert.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1.5">
                          {alert.createdAt ? timeAgo(alert.createdAt, t) : ''}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss(alert.id)}
                      title={t('dismissTitle')}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-red-600 hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
