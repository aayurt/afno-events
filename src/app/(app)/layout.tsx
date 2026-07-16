import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'
import '../globals.css'
import { AppNav } from './nav'
import { I18nProvider } from '@/components/I18nProvider'
import type { Locale } from '@/locales/config'

export default async function AppRootLayout({ children }: { children: React.ReactNode }) {
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
      <body>
        <Providers>
          <I18nProvider locale={locale}>
            <AppNav>{children}</AppNav>
          </I18nProvider>
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
