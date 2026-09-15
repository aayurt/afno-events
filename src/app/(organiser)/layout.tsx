import type { Metadata } from 'next'
import React from 'react'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Organiser Portal | Afno Events',
  description: 'Manage your events, tickets and door scanning with Afno Events.',
}

export default function OrganiserRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">{children}</div>
  )
}
