'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Moon,
  Sun,
  ScanLine,
  User,
  LogOut,
  Plus,
} from 'lucide-react'
import { authClient } from '@/lib/auth/client'
import { useTheme } from '@/providers/Theme'

export function OrganiserHeader({
  title,
}: {
  title?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [tenant, setTenant] = useState<{ name: string; verified: boolean } | null>(null)

  useEffect(() => {
    setMounted(true)
    fetch('/api/organiser/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tenants?.[0]) {
          const t = data.tenants[0]
          setTenant({
            name: t.name,
            verified: Boolean(t.verified || t.status === 'verified'),
          })
        }
      })
      .catch(() => {})
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } catch {}
    router.push('/organiser/login')
  }

  const isDashboard = pathname === '/organiser/dashboard'
  const isScanner = pathname?.includes('/scanner')
  const isProfile = pathname?.includes('/profile')
  const isNewEvent = pathname?.includes('/events/new')

  return (
    <header className="sticky top-0 z-40 w-full border-b border-alpine-500/25 dark:border-alpine-400/25 bg-white dark:bg-slate-950 backdrop-blur-md transition-colors duration-150">
      <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/organiser/dashboard"
            className="flex items-center gap-2 group focus:outline-none"
          >
            <span className="font-mono text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-slate-50 group-hover:text-alpine-600 dark:group-hover:text-alpine-400 transition-colors">
              Afno Events
            </span>
            <span className="font-mono text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded-[3px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-alpine-500/35 dark:border-alpine-400/35">
              WORKSPACE
            </span>
          </Link>

          {title && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-alpine-500/25 dark:border-alpine-400/25">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                / {title}
              </span>
            </div>
          )}

          {tenant?.name && (
            <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-alpine-500/25 dark:border-alpine-400/25">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                {tenant.name}
              </span>
              {tenant.verified ? (
                <span className="inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[10px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  VERIFIED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[10px] font-mono font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  PENDING
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick Navigation & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isDashboard && (
            <Link
              href="/organiser/dashboard"
              title="Dashboard"
              className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-[4px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-800 hover:bg-alpine-500/10 text-slate-800 dark:text-slate-200 font-mono text-[11px] transition-colors whitespace-nowrap"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-alpine-500" />
              <span className="hidden sm:inline">DASHBOARD</span>
            </Link>
          )}

          <Link
            href="/scanner"
            title="Door QR Scanner"
            className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-[4px] border font-mono text-[11px] transition-colors whitespace-nowrap hidden md:inline-flex ${
              isScanner
                ? 'border-alpine-500 bg-alpine-500/15 text-alpine-600 dark:text-alpine-400'
                : 'border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-800 hover:bg-alpine-500/10 text-slate-800 dark:text-slate-200'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5 text-alpine-500" />
            <span>SCANNER</span>
          </Link>

          <Link
            href="/organiser/profile/edit"
            title="Organiser Profile"
            className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-[4px] border font-mono text-[11px] transition-colors whitespace-nowrap hidden sm:inline-flex ${
              isProfile
                ? 'border-alpine-500 bg-alpine-500/15 text-alpine-600 dark:text-alpine-400'
                : 'border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-800 hover:bg-alpine-500/10 text-slate-800 dark:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>PROFILE</span>
          </Link>

          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition-colors"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
          >
            {mounted ? (
              theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
            ) : (
              <span className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0 transition-colors"
            onClick={handleSignOut}
            aria-label="Sign Out"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {!isNewEvent && (
            <Link
              href="/organiser/events/new"
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white font-mono text-[11px] shadow-trail transition-colors ml-1 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>NEW EVENT</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
