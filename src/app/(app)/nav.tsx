'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, BellRing, Calendar, LayoutDashboard, Ticket, User, Users, type LucideIcon } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { authClient } from '@/lib/auth/client'
import { fireDueReminders } from '@/lib/reminders'
import { useScopedI18n } from '@/locales/client'
import { OnboardingModal } from './onboarding'

const onboardingKey = (userId: number) => `afno-onboarding-done-${userId}`

const getFooterLinks = (t: (key: any, params?: any) => any) => [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/contact', label: t('contact') },
]

function HeaderBell({
  href,
  title,
  icon: Icon,
  unread,
}: {
  href: string
  title: string
  icon: LucideIcon
  unread: number
}) {
  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className="relative w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0"
    >
      <Icon size={20} />
      {unread > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}

const getTabs = (t: (key: any, params?: any) => any) => [
  { href: '/app', label: t('dashboard'), icon: LayoutDashboard },
  { href: '/app/events', label: t('events'), icon: Calendar },
  { href: '/app/tickets', label: t('tickets'), icon: Ticket },
  { href: '/app/circles', label: t('circles'), icon: Users },
  { href: '/app/profile', label: t('profile'), icon: User },
]

export function AppNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const t = useScopedI18n('nav')

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app'
    return pathname.startsWith(href)
  }

  const pageTitleMap: Record<string, string> = {
    '/app': t('discover'),
    '/app/events': t('events'),
    '/app/tickets': t('tickets'),
    '/app/circles': t('circles'),
    '/app/profile': t('profile'),
  }
  const pageTitle = pageTitleMap[pathname] || 'AfnoEvents'
  const isAuthPage = pathname.startsWith('/app/auth')

  // Header bells (squad alerts + notifications) — unread counts refreshed on
  // navigation and polled every 60s while signed in.
  const [signedIn, setSignedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [alertsUnread, setAlertsUnread] = useState(0)
  const [notifsUnread, setNotifsUnread] = useState(0)
  const [userId, setUserId] = useState<number | null>(null)
  const [onboardingEligible, setOnboardingEligible] = useState(false)

  const fetchUnreadCount = useCallback(async (endpoint: string): Promise<number> => {
    // totalDocs from a single-doc response is the unread count.
    const res = await fetch(endpoint, { credentials: 'include' })
    if (!res.ok) return 0
    const data = await res.json()
    return data.totalDocs || 0
  }, [])

  const loadUnread = useCallback(async () => {
    try {
      const [alerts, notifs] = await Promise.all([
        fetchUnreadCount('/api/circle-alerts?where[read][equals]=false&limit=1&depth=0'),
        fetchUnreadCount('/api/notifications?where[read][equals]=false&limit=1&depth=0'),
      ])
      setAlertsUnread(alerts)
      setNotifsUnread(notifs)
    } catch {}
  }, [fetchUnreadCount])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null
    authClient
      .getSession()
      .then((result) => {
        if (cancelled) return
        const user = result.data?.user ?? null
        setSignedIn(!!user)
        setAuthChecked(true)
        if (user) {
          loadUnread()
          timer = setInterval(loadUnread, 60_000)
          const id = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10)
          const numericId = Number.isNaN(id) ? null : id
          setUserId(numericId)
          // First-run onboarding: show once per user/browser until they save
          // or skip. (The modal itself also skips when prefs already exist.)
          let done = true
          if (numericId != null) {
            try {
              done = localStorage.getItem(onboardingKey(numericId)) === '1'
            } catch {}
          }
          setOnboardingEligible(!done)
        } else {
          setUserId(null)
          setOnboardingEligible(false)
        }
      })
      .catch(() => {
        if (!cancelled) setAuthChecked(true)
      })
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [loadUnread])

  // Event reminders fire from the shell so they work on any page, signed in
  // or not (they persist in localStorage and need no account).
  useEffect(() => {
    fireDueReminders()
    const reminderTimer = setInterval(fireDueReminders, 60_000)
    return () => clearInterval(reminderTimer)
  }, [])

  // Refresh the badge when navigating (e.g. right after marking alerts read
  // on the alerts page).
  useEffect(() => {
    if (signedIn) loadUnread()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleOnboardingDone = useCallback(() => {
    setOnboardingEligible(false)
    if (userId != null) {
      try {
        localStorage.setItem(onboardingKey(userId), '1')
      } catch {}
    }
  }, [userId])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isAuthPage && (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-6xl flex items-center justify-between h-22 px-4">
            <Link href="/app" className="flex items-center shrink-0">
              <img src="/logo.png" alt="AfnoEvents" className="h-20 w-20" />
            </Link>
            <span className="font-semibold text-base absolute left-1/2 -translate-x-1/2">{pageTitle}</span>
            {authChecked && signedIn ? (
              <div className="flex items-center gap-1 shrink-0">
                <HeaderBell
                  href="/app/circles/alerts"
                  title={t('squadAlerts')}
                  icon={Bell}
                  unread={alertsUnread}
                />
                <HeaderBell
                  href="/app/notifications"
                  title={t('notificationsBell')}
                  icon={BellRing}
                  unread={notifsUnread}
                />
              </div>
            ) : (
              <div className="w-20" />
            )}
          </div>
        </header>
      )}

      <main className={cn('flex flex-col flex-1 min-h-[calc(100vh-5.5rem)]', isAuthPage ? '' : 'pt-16 pb-6')}>
        {children}
        {!isAuthPage && (
          <footer className="border-t border-border bg-background mt-12">
            <div className="mx-auto max-w-6xl px-4 py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="AfnoEvents" className="h-20 w-20" />
                  <span className="font-semibold text-sm">AfnoEvent</span>
                </div>
                <nav className="flex items-center gap-6 text-sm text-muted-foreground capitalize">
                  {getFooterLinks(t).map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="mt-4 text-center text-xs text-muted-foreground/60">
                &copy; {new Date().getFullYear()} AfnoEvent. All rights reserved.
              </div>
            </div>
          </footer>
        )}
        {!isAuthPage && <div className="h-16" aria-hidden="true" />}
      </main>

      {!isAuthPage && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-2xl flex items-center justify-around h-16 px-4">
            {getTabs(t).map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-medium transition-colors rounded-lg',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      {!isAuthPage && authChecked && signedIn && onboardingEligible && userId != null && (
        <OnboardingModal userId={userId} onDone={handleOnboardingDone} />
      )}
    </div>
  )
}
