'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EventForm } from '@/components/organiser/EventForm'

export default function NewEventPage() {
  const router = useRouter()

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
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div>
        <Link href="/organiser/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create New Event</h1>
        <p className="text-sm text-muted-foreground">Add details, poster artwork, and ticket pricing.</p>
      </div>

      <EventForm onSubmit={handleCreate} submitLabel="Create Event" />
    </div>
  )
}
