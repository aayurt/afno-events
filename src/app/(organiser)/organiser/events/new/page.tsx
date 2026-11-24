'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EventForm } from '@/components/organiser/EventForm'
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'

export default function NewEventPage() {
  const router = useRouter()
  const [isTenantVerified, setIsTenantVerified] = useState(true)

  useEffect(() => {
    fetch('/api/organiser/me', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) {
          router.replace('/organiser/login')
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (!data) return
        if (data?.tenants && Array.isArray(data.tenants)) {
          const verified = data.tenants.some((t: any) => t.verified || t.status === 'verified')
          setIsTenantVerified(Boolean(verified))
        }
      })
      .catch(() => {
        router.replace('/organiser/login')
      })
  }, [router])

  const handleCreate = async (formData: any) => {
    const res = await fetch('/api/organiser/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      credentials: 'include',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create event' }))
      throw new Error(err.error || 'Failed to create event')
    }

    router.push('/organiser/dashboard')
  }

  return (
    <>
      <OrganiserHeader title="New Event" />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div>
          <Link
            href="/organiser/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft size={13} className="text-alpine-500" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Create New Event
              </h1>
              <p className="text-xs sm:text-sm font-mono text-muted-foreground mt-0.5">
                Configure event profile, schedule, venue map, and live ticket tiers.
              </p>
            </div>
          </div>
        </div>

        <EventForm onSubmit={handleCreate} submitLabel="Create Event" isTenantVerified={isTenantVerified} />
      </div>
    </>
  )
}
