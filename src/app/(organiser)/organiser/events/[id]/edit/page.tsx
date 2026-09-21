'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EventForm, EventFormData } from '@/components/organiser/EventForm'

export default function EditEventPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eventData, setEventData] = useState<EventFormData | null>(null)
  const [isTenantVerified, setIsTenantVerified] = useState(true)

  useEffect(() => {
    fetch('/api/organiser/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tenants && Array.isArray(data.tenants)) {
          const verified = data.tenants.some((t: any) => t.verified || t.status === 'verified')
          setIsTenantVerified(Boolean(verified))
        }
      })
      .catch(() => {})
  }, [])

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
          enabled: data.enabled ?? true,
          isBookable: data.isBookable ?? true,
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
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-6">
        <div>
          <Skeleton className="h-4 w-32 rounded mb-3" />
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-8 w-56 rounded-lg" />
              <Skeleton className="h-3.5 w-40 rounded" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>

        {/* 1. Basics Skeleton */}
        <div className="rounded-2xl border border-border/80 p-6 space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>

        {/* 2. Poster Skeleton */}
        <div className="rounded-2xl border border-border/80 p-6 space-y-4">
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-48 w-36 rounded-2xl" />
        </div>

        {/* 3. Date / Time Skeleton */}
        <div className="rounded-2xl border border-border/80 p-6 space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>

        {/* Bottom Actions Skeleton */}
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-11 w-36 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
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
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/organiser/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Event</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Update event details, artwork, and tickets.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-initial h-9 rounded-xl">
            <Link href={`/organiser/events/${id}/attendees`}>
              <Users size={14} /> Attendees
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 flex-1 sm:flex-initial h-9 rounded-xl border border-border/60 sm:border-transparent">
            <Link href={`/app/events/${id}`} target="_blank">
              View Public <ExternalLink size={14} />
            </Link>
          </Button>
        </div>
      </div>

      <EventForm
        initial={eventData}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        isTenantVerified={isTenantVerified}
      />
    </div>
  )
}
