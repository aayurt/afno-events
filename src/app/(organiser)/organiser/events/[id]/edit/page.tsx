'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventForm, EventFormData } from '@/components/organiser/EventForm'

export default function EditEventPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eventData, setEventData] = useState<EventFormData | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch(`/api/organiser/events/${id}`, { credentials: 'include' })
        if (!active) return
        if (res.status === 401) {
          router.replace('/organiser/login')
          return
        }
        if (!res.ok) throw new Error('Failed to load event')
        const data = await res.json()
        if (!active) return

        const cover = typeof data.coverImage === 'object' ? data.coverImage : null
        setEventData({
          id: data.id,
          title: data.title,
          description: data.description || '',
          coverImage: cover?.id || data.coverImage || null,
          coverImageUrl: cover?.sizes?.thumbnail?.url || cover?.url || null,
          startDatetime: data.startDatetime,
          endDatetime: data.endDatetime,
          location: data.location,
          tags: data.tags || [],
          pricing: data.pricing,
          publish: data.enabled ?? true,
        })
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to load event')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id, router])

  const handleUpdate = async (formData: any) => {
    const res = await fetch(`/api/organiser/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      credentials: 'include',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update event' }))
      throw new Error(err.error || 'Failed to update event')
    }

    router.push('/organiser/dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  if (error || !eventData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <p className="text-destructive font-semibold">{error || 'Event not found'}</p>
        <Button asChild variant="outline">
          <Link href="/organiser/dashboard">Return to dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/organiser/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Edit Event</h1>
          <p className="text-sm text-muted-foreground">Update event details, artwork, and tickets.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/organiser/events/${id}/attendees`}>
              <Users size={14} /> Attendees
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href={`/app/events/${id}`} target="_blank">
              View Public <ExternalLink size={14} />
            </Link>
          </Button>
        </div>
      </div>

      <EventForm initial={eventData} onSubmit={handleUpdate} submitLabel="Save Changes" />
    </div>
  )
}
