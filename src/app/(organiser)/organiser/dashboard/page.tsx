'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2,
  Calendar,
  CalendarPlus,
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  ScanLine,
  ShieldAlert,
  Users,
} from 'lucide-react'

type Me = {
  user: { id: number; email: string; name?: string; role: string }
  tenants: { id: number; name: string; slug: string }[]
}

type EventDoc = {
  id: number
  title: string
  slug?: string
  startDatetime?: string
  enabled?: boolean
  location?: { location?: string } | null
  coverImage?: unknown
}

function coverUrl(coverImage: unknown): string | null {
  if (!coverImage || typeof coverImage !== 'object') return null
  const c = coverImage as { url?: string; sizes?: Record<string, { url?: string }> }
  return c.sizes?.card?.url || c.sizes?.thumbnail?.url || c.url || null
}

export default function OrganiserDashboard() {
  const router = useRouter()
  const [boot, setBoot] = useState<'loading' | 'signedOut' | 'forbidden' | 'ready'>('loading')
  const [me, setMe] = useState<Me | null>(null)
  const [events, setEvents] = useState<EventDoc[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/organiser/me', { credentials: 'include' })
      if (cancelled) return
      if (res.status === 401) {
        router.replace('/organiser/login')
        return
      }
      if (res.status === 403) {
        setBoot('forbidden')
        return
      }
      const data = (await res.json()) as Me
      if (cancelled) return
      setMe(data)

      // All events across the organiser's tenants via the dedicated endpoint.
      const evRes = await fetch('/api/organiser/events?limit=50&depth=1&sort=-startDatetime', {
        credentials: 'include',
      })
      const evData = await evRes.json().catch(() => ({ docs: [] }))
      if (cancelled) return
      setEvents((evData.docs || []) as EventDoc[])
      setBoot('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  async function handleSignOut() {
    await authClient.signOut()
    window.location.href = '/organiser/login'
  }

  if (boot === 'loading') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (boot === 'signedOut') {
    return null
  }

  if (boot === 'forbidden') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-5">
        <ShieldAlert size={44} className="mx-auto text-red-500" />
        <h1 className="text-2xl font-bold">Organiser access required</h1>
        <p className="text-muted-foreground text-sm">
          This portal is for event organisers. Your account doesn't have organiser permissions.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut size={16} /> Sign out
          </Button>
          <Button asChild variant="ghost">
            <Link href="/app">Go to fan app</Link>
          </Button>
        </div>
      </div>
    )
  }

  const now = Date.now()
  const upcoming = events.filter((e) => !e.startDatetime || new Date(e.startDatetime).getTime() >= now)
  const past = events.filter((e) => e.startDatetime && new Date(e.startDatetime).getTime() < now)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Organiser Portal</p>
            <h1 className="text-lg font-bold leading-tight">
              {me?.tenants.map((t) => t.name).join(', ') || me?.user.name || me?.user.email}
            </h1>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-muted-foreground">
          <LogOut size={15} /> Sign out
        </Button>
      </header>

      {/* Quick actions */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl hover:border-primary/50 transition-colors">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarPlus size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">New Event</p>
              <p className="text-xs text-muted-foreground">Contact us to publish — coming soon</p>
            </div>
          </CardContent>
        </Card>

        <Link href="/app/admin/check-in" className="block">
          <Card className="rounded-2xl h-full hover:border-primary/50 transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ScanLine size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Door Scanner</p>
                <p className="text-xs text-muted-foreground">Check in attendees by QR</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/app/tickets" className="block">
          <Card className="rounded-2xl h-full hover:border-primary/50 transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Ticket Holders</p>
                <p className="text-xs text-muted-foreground">See sold tickets</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Upcoming events */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming events ({upcoming.length})</h2>
        </div>
        {upcoming.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center text-muted-foreground">
              No upcoming events yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* Past events */}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Past events ({past.length})</h2>
          <div className="space-y-3 opacity-75">
            {past.slice(0, 5).map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EventRow({ event }: { event: EventDoc }) {
  const img = coverUrl(event.coverImage)
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 hover:border-primary/50 transition-colors">
      <Link
        href={`/app/events/${event.slug || event.id}`}
        className="flex-1"
      >
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="w-full h-full object-cover" />
          ) : (
            <Calendar size={20} className="text-muted-foreground/40" />
          )}
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{event.title}</p>
          {event.enabled === false && (
            <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              Draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          {event.startDatetime && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(event.startDatetime).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
          {event.location?.location && (
            <span className="flex items-center gap-1 truncate max-w-[16rem]">
              <MapPin size={12} />
              <span className="truncate">{event.location.location}</span>
            </span>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={() => window.location.href = `/organiser/events/${event.id}/attendees`}
      >
        <Users size={14} />
      </Button>
      <ExternalLink size={15} className="text-muted-foreground/50 shrink-0" />
    </div>
  )
}
