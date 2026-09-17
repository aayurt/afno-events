import type { Metadata } from 'next'
import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Organiser Portal | Afno Events',
  description: 'Manage your events, tickets and door scanning with Afno Events.',
}

export default function OrganiserRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={cn(GeistSans.variable, GeistMono.variable)} lang="en" suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <div className="min-h-screen flex flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  )
}
