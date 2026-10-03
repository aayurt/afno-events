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
  AlarmClock,
  Bell,
  BellRing,
  CalendarDays,
  CheckCheck,
  ImageIcon,
  Info,
  Loader2,
  LogIn,
  Settings,
} from 'lucide-react'
import { cn } from '@/utilities/ui'

type NotifDoc = {
  id: number
  title: string
  message: string
  type: string
  read: boolean
  link?: string | null
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

const FALLBACK_META = { icon: Info, className: 'text-sky-600 bg-sky-500/10' }

const TYPE_META: Record<string, { icon: typeof Info; className: string }> = {
  info: FALLBACK_META,
  event: { icon: CalendarDays, className: 'text-primary bg-primary/10' },
  reminder: { icon: AlarmClock, className: 'text-amber-600 bg-amber-500/10' },
  system: { icon: Settings, className: 'text-muted-foreground bg-muted' },
  gallery: { icon: ImageIcon, className: 'text-violet-600 bg-violet-500/10' },
}

export default function NotificationsPage() {
  const t = useScopedI18n('notifications') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notifs, setNotifs] = useState<NotifDoc[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?sort=-createdAt&limit=100', {
        credentials: 'include',
      })
      if (!res.ok) {
        setError(t('loadFailed', { status: res.status }))
        return
      }
      const data = await res.json()
      setNotifs(data.docs || [])
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

  const unreadCount = notifs.filter((n) => !n.read).length

  const markAllRead = async () => {
    if (unreadCount === 0 || busy) return
    setBusy(true)
    setError(null)
    const previous = notifs
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `Request failed (${res.status})`)
      }
    } catch (err: any) {
      // Roll back the optimistic update and tell the user — previously this
      // failed silently and unread items just reappeared.
      setNotifs(previous)
      await load()
      setError(`${t('markAllReadFailed')}${err?.message ? `: ${err.message}` : ''}`)
    } finally {
      setBusy(false)
    }
  }

  const openNotification = async (n: NotifDoc) => {
    if (!n.read) {
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      try {
        await fetch(`/api/notifications/${n.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
          credentials: 'include',
        })
      } catch {}
    }
    if (n.link && n.link.startsWith('/')) {
      // Stored links use public routes (e.g. /events/{slug}); jump to the
      // equivalent in-app page so the app shell (and nav) is preserved.
      const target = n.link.startsWith('/events/') ? `/app${n.link}` : n.link
      router.push(target)
    }
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
          <Link href="/app/auth/login?redirect=/app/notifications">
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
        <Link href="/app">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft size={16} /> {t('back')}
          </Button>
        </Link>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead} disabled={busy}>
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

      {!error && notifs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Bell size={28} className="text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{t('emptyTitle')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('emptyDesc')}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => {
            const meta = TYPE_META[n.type] ?? FALLBACK_META
            const Icon = meta.icon
            const unread = !n.read
            return (
              <Card key={n.id} className={unread ? 'border-primary/30 bg-primary/[0.02]' : ''}>
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className="w-full flex items-start gap-3 p-4 text-left group"
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        meta.className,
                      )}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm truncate',
                            unread ? 'font-semibold' : 'font-medium text-muted-foreground',
                          )}
                        >
                          {n.title}
                        </p>
                        {unread && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                      {n.message && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">
                          {n.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1.5">
                        {n.createdAt ? timeAgo(n.createdAt, t) : ''}
                      </p>
                    </div>
                  </button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
