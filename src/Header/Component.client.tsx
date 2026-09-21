'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  /* Storing the value in a useState to avoid hydration errors */
  const [theme, setTheme] = useState<string | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTheme])

  return (
    <header className="container relative z-40" {...(theme ? { 'data-theme': theme } : {})}>
      <div className="py-2 sm:py-3 flex items-center justify-between">
        <Link href="/" className="shrink-0 flex items-center">
          <Logo
            className="h-12 sm:h-16 md:h-20 w-auto max-w-[6.5rem] sm:max-w-[8.5rem] md:max-w-[9.375rem] object-contain"
            loading="eager"
            priority="high"
          />
        </Link>
        <HeaderNav data={data} />
      </div>
    </header>
  )
}
