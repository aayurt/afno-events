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

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">{children}</main>

      {!pathname.startsWith('/app/auth') && (
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
