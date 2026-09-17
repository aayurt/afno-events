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
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center pb-24 sm:pb-12 select-none">
      <div className="w-full max-w-md sm:max-w-4xl lg:max-w-5xl px-4 sm:px-6 py-4 sm:py-8 flex flex-col flex-1 relative">

        {/* Responsive Top Header */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base truncate">
                  {me?.tenants.map((t) => t.name).join(', ') || me?.user.name || 'Organiser Portal'}
                </h1>
                {liveEvents.length > 0 && (
                  <span className="flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {events.length} {events.length === 1 ? 'Show' : 'Shows'} Configured
              </p>
            </div>
          </div>

          {/* Desktop header action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex rounded-xl gap-1.5 h-9">
              <Link href="/app/admin/check-in">
                <ScanLine size={15} className="text-primary" />
                <span>Door Scanner</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex rounded-xl font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-sm">
              <Link href="/organiser/events/new">
                <Plus size={16} />
                <span>New Event</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-9 px-2.5 text-xs text-muted-foreground gap-1.5">
              <LogOut size={15} />
              <span className="hidden md:inline">Sign out</span>
            </Button>
          </div>
        </header>

        {/* 3-Metric Glance Ribbon */}
        <div className="grid grid-cols-3 border border-border rounded-2xl bg-card/60 divide-x divide-border font-mono text-center mb-6 shadow-xs">
          <div className="px-3 sm:px-4 py-3 sm:py-3.5 text-left">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground block font-sans">Active Shows</span>
            <span className="text-base sm:text-lg font-bold text-foreground">
              {events.filter((e) => e.enabled !== false).length}
            </span>
          </div>
          <div className="px-3 sm:px-4 py-3 sm:py-3.5">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground block font-sans">Live Tonight</span>
            <span className="text-base sm:text-lg font-bold text-foreground">
              {liveEvents.length > 0 ? `${liveEvents.length} Show` : 'None'}
            </span>
          </div>
          <div className="px-3 sm:px-4 py-3 sm:py-3.5 text-right">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground block font-sans">Drafts</span>
            <span className="text-base sm:text-lg font-bold text-muted-foreground">
              {draftEvents.length}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            All ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              activeTab === 'live'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Live Tonight ({liveEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('draft')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              activeTab === 'draft'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Drafts ({draftEvents.length})
          </button>
        </div>

        {/* Event Stream (Responsive Grid: 1 col on mobile, 2 cols on tablet/desktop) */}
        <main className="flex-1">
          {filteredEvents.length === 0 ? (
            <div className="border border-border rounded-2xl bg-card/40 p-12 text-center space-y-3">
              <Calendar size={32} className="mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No events found in this category.</p>
              <Button asChild size="sm" className="rounded-xl gap-1.5 mt-2">
                <Link href="/organiser/events/new">
                  <Plus size={15} /> Create Event
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((event) => {
                const img = coverUrl(event.coverImage)
                const isLive = liveEvents.some((l) => l.id === event.id)
                const isDraft = event.enabled === false

                return (
                  <div
                    key={event.id}
                    className={`border rounded-2xl bg-card p-4 space-y-4 shadow-xs transition-all hover:border-border/80 flex flex-col justify-between ${
                      isLive ? 'border-primary/60 ring-1 ring-primary/20' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link
                        href={`/app/events/${event.id}`}
                        target="_blank"
                        className="w-16 h-20 rounded-xl bg-muted overflow-hidden border border-border shrink-0 flex items-center justify-center group"
                      >
                        {img ? (
                          <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <Calendar size={22} className="text-muted-foreground/40" />
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

                        <h2 className="font-bold text-sm sm:text-base text-foreground mt-1 leading-snug truncate">
                          {event.title}
                        </h2>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground mt-1.5">
                          {event.startDatetime && (
                            <span className="flex items-center gap-1 font-mono text-[11px] shrink-0">
                              <Calendar size={12} />
                              {new Date(event.startDatetime).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          {event.location?.location && (
                            <span className="flex items-center gap-1 truncate text-[11px]">
                              <MapPin size={12} className="shrink-0" />
                              <span className="truncate">{event.location.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="space-y-2 pt-1 border-t border-border/60">
                      <Button
                        asChild
                        className="w-full rounded-xl font-bold text-xs h-9 gap-2 shadow-xs"
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
                          className="rounded-xl text-[11px] h-8 font-medium px-2 hover:border-primary/40"
                        >
                          <Ticket size={12} className="mr-1" /> Tiers
                        </Button>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-[11px] h-8 font-medium px-2 hover:border-primary/40"
                        >
                          <Link href={`/organiser/events/${event.id}/attendees`}>
                            <Users size={12} className="mr-1" /> Attendees
                          </Link>
                        </Button>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-[11px] h-8 font-medium px-2 hover:border-primary/40"
                        >
                          <Link href={`/organiser/events/${event.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        {/* Floating Mobile Bottom Action Bar (Only visible on mobile screens) */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex items-center justify-between z-40">
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

        {/* Modal / Slide-Up Sheet: Ticket Tier Inspection */}
        {selectedEventForSheet && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <div className="w-full max-w-md sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
              <div
                className="sm:hidden w-10 h-1 bg-muted rounded-full mx-auto cursor-pointer"
                onClick={() => setSelectedEventForSheet(null)}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                    Ticket Tiers & Pricing
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
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
                      <div key={idx} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 font-mono">
                        <div className="min-w-0 flex-1 font-sans">
                          <p className="font-bold text-xs sm:text-sm text-foreground truncate">{tier.name}</p>
                          {tier.description && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tier.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs sm:text-sm text-primary">
                            £{tier.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border border-border rounded-xl bg-background text-center text-xs text-muted-foreground">
                    Free Event / Single Admission
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild variant="outline" className="rounded-xl text-xs h-9 sm:h-10">
                  <Link href={`/organiser/events/${selectedEventForSheet.id}/edit`}>
                    Edit Show
                  </Link>
                </Button>
                <Button asChild className="rounded-xl text-xs h-9 sm:h-10">
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
