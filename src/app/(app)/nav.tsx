'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, LayoutDashboard, User } from 'lucide-react'
import { cn } from '@/utilities/ui'

const tabs = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/events', label: 'Events', icon: Calendar },
  { href: '/app/profile', label: 'Profile', icon: User },
]

export function AppNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app'
    return pathname.startsWith(href)
  }

  const pageTitleMap: Record<string, string> = {
    '/app': 'Discover',
    '/app/events': 'Events',
    '/app/profile': 'Profile',
  }
  const pageTitle = pageTitleMap[pathname] || 'AfnoEvents'
  const isAuthPage = pathname.startsWith('/app/auth')

  return (
    <div className="min-h-screen bg-background">
      {!isAuthPage && (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-6xl flex items-center justify-between h-14 px-4">
            <Link href="/app" className="flex items-center gap-2.5 shrink-0">
              <img src="/logo.png" alt="AfnoEvents" className="h-7 w-7" />
            </Link>
            <span className="font-semibold text-base absolute left-1/2 -translate-x-1/2">{pageTitle}</span>
            <div className="w-7" />
          </div>
        </header>
      )}

      <main className={cn(isAuthPage ? '' : 'pt-14 pb-20')}>{children}</main>

      {!isAuthPage && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-2xl flex items-center justify-around h-16 px-4">
            {tabs.map(({ href, label, icon: Icon }) => {
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
