import type { Metadata } from 'next'
import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { I18nProvider } from '@/components/I18nProvider'
import type { Locale } from '@/locales/config'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Organiser Portal | Afno Events',
  description: 'Manage your events, tickets and door scanning with Afno Events.',
}

export default async function OrganiserRootLayout({ children }: { children: React.ReactNode }) {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value
  const locale: Locale = raw === 'en' || raw === 'ne' ? raw : 'en'

  return (
    <html className={cn(GeistSans.variable, GeistMono.variable)} lang={locale} suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <I18nProvider locale={locale}>
            <div className="min-h-screen flex flex-col">{children}</div>
          </I18nProvider>
        </Providers>
      </body>
    </html>
  )
}
