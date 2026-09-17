'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2,
  Calendar,
  ExternalLink,
  LogOut,
  MapPin,
  Plus,
  QrCode,
  ScanLine,
  ShieldAlert,
  Ticket,
  Users,
  X,
} from 'lucide-react'

type Me = {
  user: { id: number; email: string; name?: string; role: string }
  tenants: { id: number; name: string; slug: string }[]
}

type TicketTier = {
  name: string
  price: number
  description?: string | null
  stripePriceID?: string | null
}

type EventDoc = {
  id: number
  title: string
  slug?: string
  startDatetime?: string
  endDatetime?: string
  enabled?: boolean
  location?: { location?: string } | null
  coverImage?: unknown
  pricing?: {
    type?: 'free' | 'paid' | null
    priceRange?: string | null
    ticketTypes?: TicketTier[] | null
  } | null
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
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'draft'>('all')
  const [selectedEventForSheet, setSelectedEventForSheet] = useState<EventDoc | null>(null)

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

  const now = Date.now()
  const liveEvents = useMemo(() => {
    return events.filter((e) => {
      if (!e.startDatetime) return false
      const s = new Date(e.startDatetime).getTime()
      const end = e.endDatetime ? new Date(e.endDatetime).getTime() : s + 8 * 3600000
      return s <= now && end >= now && e.enabled !== false
    })
  }, [events, now])

  const upcomingEvents = useMemo(() => {
    return events.filter((e) => {
      if (!e.startDatetime) return false
      return new Date(e.startDatetime).getTime() > now && e.enabled !== false
    })
  }, [events, now])

  const draftEvents = useMemo(() => {
    return events.filter((e) => e.enabled === false)
  }, [events])

  const filteredEvents = useMemo(() => {
    if (activeTab === 'live') return liveEvents
    if (activeTab === 'upcoming') return upcomingEvents
    if (activeTab === 'draft') return draftEvents
    return events
  }, [activeTab, events, liveEvents, upcomingEvents, draftEvents])

  if (boot === 'loading') {
    return (
      <div className="mx-auto max-w-md px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (boot === 'signedOut') return null

  if (boot === 'forbidden') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-5">
        <ShieldAlert size={44} className="mx-auto text-destructive" />
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center pb-24 select-none">
      <div className="w-full max-w-md flex flex-col flex-1 border-x border-border/40 shadow-sm relative">

        {/* Sticky Mobile App Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-xs truncate">
                  {me?.tenants.map((t) => t.name).join(', ') || me?.user.name || 'Organiser'}
                </h1>
                {liveEvents.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Live event in progress" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate">
                {events.length} {events.length === 1 ? 'Show' : 'Shows'} Configured
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-2.5 text-xs text-muted-foreground gap-1.5 shrink-0">
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>

        {/* 3-Metric Glance Ribbon */}
        <div className="grid grid-cols-3 border-b border-border bg-card/50 divide-x divide-border font-mono text-center">
          <div className="px-3 py-3 text-left">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-sans">Active Shows</span>
            <span className="text-sm font-bold text-foreground">
              {events.filter((e) => e.enabled !== false).length}
            </span>
          </div>
          <div className="px-3 py-3">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-sans">Live Tonight</span>
            <span className="text-sm font-bold text-foreground">
              {liveEvents.length > 0 ? `${liveEvents.length} Show` : 'None'}
            </span>
          </div>
          <div className="px-3 py-3 text-right">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-sans">Drafts</span>
            <span className="text-sm font-bold text-muted-foreground">
              {draftEvents.length}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-1.5 overflow-x-auto bg-card/30">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              activeTab === 'live'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Live Tonight ({liveEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('draft')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              activeTab === 'draft'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Drafts ({draftEvents.length})
          </button>
        </div>

        {/* Event Stream (Cards) */}
        <main className="p-4 space-y-4 flex-1">
          {filteredEvents.length === 0 ? (
            <div className="border border-border rounded-2xl bg-card/40 p-8 text-center space-y-3">
              <Calendar size={28} className="mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No events found in this category.</p>
              <Button asChild size="sm" className="rounded-xl gap-1">
                <Link href="/organiser/events/new">
                  <Plus size={14} /> Create Event
                </Link>
              </Button>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const img = coverUrl(event.coverImage)
              const isLive = liveEvents.some((l) => l.id === event.id)
              const isDraft = event.enabled === false

              return (
                <div
                  key={event.id}
                  className={`border rounded-2xl bg-card p-4 space-y-3.5 shadow-sm transition-colors ${
                    isLive ? 'border-primary/60 ring-1 ring-primary/20' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Link
                      href={`/app/events/${event.id}`}
                      target="_blank"
                      className="w-14 h-18 rounded-xl bg-muted overflow-hidden border border-border shrink-0 flex items-center justify-center group"
                    >
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <Calendar size={20} className="text-muted-foreground/40" />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isLive && (
                          <span className="border border-emerald-500/50 bg-emerald-500/10 text-emerald-500 font-mono uppercase text-[9px] px-1.5 py-0.5 rounded font-bold">
                            Live Tonight
                          </span>
                        )}
                        {isDraft && (
                          <span className="border border-border bg-muted text-muted-foreground font-mono uppercase text-[9px] px-1.5 py-0.5 rounded font-bold">
                            Draft
                          </span>
                        )}
                        {event.pricing?.priceRange && (
                          <span className="text-[10px] font-mono font-semibold text-primary">
                            {event.pricing.priceRange}
                          </span>
                        )}
                      </div>

                      <h2 className="font-bold text-sm text-foreground mt-1 leading-snug truncate">
                        {event.title}
                      </h2>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {event.startDatetime && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Calendar size={11} />
                            {new Date(event.startDatetime).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                        {event.location?.location && (
                          <span className="flex items-center gap-1 truncate text-[11px]">
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate">{event.location.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thumb Action Row */}
                  <div className="space-y-2 pt-1">
                    <Button
                      asChild
                      className="w-full rounded-xl font-bold text-xs h-9 gap-2 shadow-sm"
                    >
                      <Link href="/app/admin/check-in">
                        <QrCode size={15} /> Open Door Scanner
                      </Link>
                    </Button>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEventForSheet(event)}
                        className="rounded-xl text-[11px] h-8 font-medium px-2"
                      >
                        <Ticket size={12} className="mr-1" /> Tiers
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-[11px] h-8 font-medium px-2"
                      >
                        <Link href={`/organiser/events/${event.id}/attendees`}>
                          <Users size={12} className="mr-1" /> Attendees
                        </Link>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-[11px] h-8 font-medium px-2"
                      >
                        <Link href={`/organiser/events/${event.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </main>

        {/* Floating Thumb Action Bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex items-center justify-between z-40">
          <Button
            asChild
            variant="outline"
            className="rounded-xl text-xs font-semibold gap-1.5 h-10 border-border bg-card"
          >
            <Link href="/app/admin/check-in">
              <ScanLine size={15} className="text-primary" /> Door Scanner
            </Link>
          </Button>

          <Button
            asChild
            className="rounded-xl font-bold text-xs gap-1.5 h-10 bg-primary text-primary-foreground shadow-md"
          >
            <Link href="/organiser/events/new">
              <Plus size={16} /> New Event
            </Link>
          </Button>
        </div>

        {/* Slide-Up Bottom Sheet: Ticket Tier Inspection */}
        {selectedEventForSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-card border-t border-border rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
              <div
                className="w-10 h-1 bg-muted rounded-full mx-auto cursor-pointer"
                onClick={() => setSelectedEventForSheet(null)}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                    Ticket Tiers & Pricing
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-0.5 truncate">
                    {selectedEventForSheet.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {selectedEventForSheet.location?.location || 'Venue TBA'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground shrink-0"
                  onClick={() => setSelectedEventForSheet(null)}
                >
                  <X size={16} />
                </Button>
              </div>

              {/* Tiers List */}
              <div className="space-y-2 pt-1">
                {selectedEventForSheet.pricing?.ticketTypes && selectedEventForSheet.pricing.ticketTypes.length > 0 ? (
                  <div className="border border-border rounded-xl bg-background divide-y divide-border">
                    {selectedEventForSheet.pricing.ticketTypes.map((tier, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 font-mono">
                        <div className="min-w-0 flex-1 font-sans">
                          <p className="font-bold text-xs text-foreground truncate">{tier.name}</p>
                          {tier.description && (
                            <p className="text-[10px] text-muted-foreground truncate">{tier.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs text-primary">
                            £{tier.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border border-border rounded-xl bg-background text-center text-xs text-muted-foreground">
                    Free Event / Single Admission
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild variant="outline" className="rounded-xl text-xs h-9">
                  <Link href={`/organiser/events/${selectedEventForSheet.id}/edit`}>
                    Edit Show
                  </Link>
                </Button>
                <Button asChild className="rounded-xl text-xs h-9">
                  <Link href={`/organiser/events/${selectedEventForSheet.id}/attendees`}>
                    Attendee Roster
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
