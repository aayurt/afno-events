'use client'

import React, { useState, useEffect } from 'react'
import type { Header as HeaderType } from '@/payload-types'
import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SearchIcon, ExternalLink, Menu, X, Building2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close on route transition
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const navItems = (data?.navItems || []).map((item) => {
    // Route Organisation/Organiser links to /organiser
    if (
      item.link?.url === '/admin' ||
      item.link?.label?.toLowerCase().includes('organis')
    ) {
      return {
        ...item,
        link: {
          ...item.link,
          url: '/organiser',
        },
      }
    }
    return item
  })

  return (
    <div className="flex items-center">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex gap-4 lg:gap-6 items-center">
        {navItems.map(({ link }, i) => {
          return (
            <CMSLink
              key={i}
              {...link}
              appearance="link"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            />
          )
        })}
        <Link
          href="/search"
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Search"
          aria-label="Search"
        >
          <SearchIcon className="w-5 h-5 text-primary" />
        </Link>
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
        >
          <ExternalLink size={14} />
          Web App
        </Link>
      </nav>

      {/* Mobile Controls */}
      <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
        <Link
          href="/search"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Search"
        >
          <SearchIcon className="w-5 h-5 text-primary" />
        </Link>

        <Link
          href="/app"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <ExternalLink size={12} />
          <span>App</span>
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-muted/70 text-foreground shrink-0"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Mobile Overlay Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-[60px] sm:top-[76px] bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Card Dropdown */}
          <div className="absolute top-full left-0 right-0 p-4 bg-card/95 backdrop-blur-md border-b border-border shadow-2xl z-50 md:hidden flex flex-col space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col divide-y divide-border/60">
              {navItems.map(({ link }, i) => {
                const href =
                  link.type === 'reference' && typeof link.reference?.value === 'object' && (link.reference.value as any)?.slug
                    ? `${link.reference?.relationTo !== 'pages' ? `/${link.reference?.relationTo}` : ''}/${(link.reference.value as any).slug}`
                    : link.url || '/'

                const isOrganiser = href === '/organiser' || link?.label?.toLowerCase().includes('organis')

                return (
                  <Link
                    key={i}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between py-3.5 px-3 rounded-xl transition-colors ${
                      isOrganiser
                        ? 'bg-primary/10 text-primary font-bold my-1'
                        : 'text-foreground hover:bg-muted/50 font-medium text-sm'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {isOrganiser && <Building2 size={18} className="text-primary" />}
                      <span>{link.label}</span>
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground/60" />
                  </Link>
                )
              })}
            </div>

            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm"
              >
                <ExternalLink size={15} />
                Explore Web App
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
