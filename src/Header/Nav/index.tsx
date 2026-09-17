'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon, ExternalLink } from 'lucide-react'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
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
    <nav className="flex gap-3 items-center">
      {navItems.map(({ link }, i) => {
        return <CMSLink key={i} {...link} appearance="link" />
      })}
      <Link href="/search">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5 text-primary" />
      </Link>
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <ExternalLink size={14} />
        Web App
      </Link>
    </nav>
  )
}
