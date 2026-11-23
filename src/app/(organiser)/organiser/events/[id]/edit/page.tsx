'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EventForm, EventFormData } from '@/components/organiser/EventForm'
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'

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
          tenant: data.tenant ?? null,
          limitOneOrderPerAccount: data.limitOneOrderPerAccount ?? false,
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
      <>
        <OrganiserHeader title="Edit Event" />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-[2px]" />
            <Skeleton className="h-8 w-64 rounded-[4px]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 xl:col-span-7 space-y-6">
              <div className="rounded-[6px] border border-alpine-500/20 p-5 space-y-4 bg-white dark:bg-slate-900">
                <Skeleton className="h-5 w-36 rounded-[2px]" />
                <Skeleton className="h-9 w-full rounded-[4px]" />
                <Skeleton className="h-20 w-full rounded-[4px]" />
              </div>
              <div className="rounded-[6px] border border-alpine-500/20 p-5 space-y-4 bg-white dark:bg-slate-900">
                <Skeleton className="h-5 w-36 rounded-[2px]" />
                <Skeleton className="h-36 w-28 rounded-[4px]" />
              </div>
            </div>
            <div className="lg:col-span-5 xl:col-span-5">
              <div className="rounded-[6px] border border-alpine-500/20 p-5 space-y-4 bg-white dark:bg-slate-900">
                <Skeleton className="h-4 w-40 rounded-[2px]" />
                <Skeleton className="aspect-[16/10] w-full rounded-[4px]" />
                <Skeleton className="h-6 w-3/4 rounded-[2px]" />
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error || !eventData) {
    return (
      <>
        <OrganiserHeader title="Edit Event" />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
          <p className="text-destructive font-mono font-semibold text-sm">{error || 'Event not found'}</p>
          <Button asChild variant="outline" className="rounded-[4px] font-mono text-xs border-alpine-500/30">
            <Link href="/organiser/dashboard">Return to dashboard</Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <OrganiserHeader title="Edit Event" />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/organiser/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
            >
              <ArrowLeft size={13} className="text-alpine-500" /> Back to Dashboard
            </Link>
            <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Edit Event
            </h1>
            <p className="text-xs sm:text-sm font-mono text-muted-foreground mt-0.5">
              Update event details, artwork, map location, and tickets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 font-mono text-xs h-8 rounded-[4px] border-alpine-500/35 hover:bg-alpine-50 dark:hover:bg-slate-800"
            >
              <Link href={`/organiser/events/${id}/attendees`}>
                <Users size={13} className="text-alpine-500" /> Attendees & Guestlist
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1.5 font-mono text-xs h-8 rounded-[4px] border border-alpine-500/25 hover:bg-alpine-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <Link href={`/app/events/${id}`} target="_blank">
                View Public <ExternalLink size={13} />
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
    </>
  )
}
