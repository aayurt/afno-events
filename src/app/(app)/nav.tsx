'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, LayoutDashboard, User } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { useScopedI18n } from '@/locales/client'

const getFooterLinks = (t: (key: string) => string) => [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/contact', label: t('contact') },
]

const getTabs = (t: (key: string) => string) => [
  { href: '/app', label: t('dashboard'), icon: LayoutDashboard },
  { href: '/app/events', label: t('events'), icon: Calendar },
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
    '/app/profile': t('profile'),
  }
  const pageTitle = pageTitleMap[pathname] || 'AfnoEvents'
  const isAuthPage = pathname.startsWith('/app/auth')

  return (
    <div className="min-h-screen bg-background">
      {!isAuthPage && (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-6xl flex items-center justify-between h-22 px-4">
            <Link href="/app" className="flex items-center shrink-0">
              <img src="/logo.png" alt="AfnoEvents" className="h-20 w-20" />
            </Link>
            <span className="font-semibold text-base absolute left-1/2 -translate-x-1/2">{pageTitle}</span>
            <div className="w-20" />
          </div>
        </header>
      )}

      <main className={cn(isAuthPage ? '' : 'pt-16 pb-24')}>
        {children}
        {!isAuthPage && (
          <footer className="border-t border-border bg-background mt-16">
            <div className="mx-auto max-w-6xl px-4 py-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="AfnoEvents" className="h-20 w-20" />
                  <span className="font-semibold text-sm">AfnoEvent</span>
                </div>
                <nav className="flex items-center gap-6 text-sm text-muted-foreground">
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
              <div className="mt-6 text-center text-xs text-muted-foreground/60">
                &copy; {new Date().getFullYear()} AfnoEvent. All rights reserved.
              </div>
            </div>
          </footer>
        )}
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
    </div>
  )
}
