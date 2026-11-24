'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import {
  Calendar,
  Ticket,
  TrendingUp,
  Plus,
  Search,
  ScanLine,
  User,
  LogOut,
  Moon,
  Sun,
  X,
  ExternalLink,
  Layers,
  MapPin,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { authClient } from '@/lib/auth/client'
import { useTheme } from '@/providers/Theme'
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'

/* ---------------------------------------------------------
 * 8848 UI Base Components
 * --------------------------------------------------------- */

function Card({
  children,
  className = '',
  elevation = 'trail',
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  elevation?: 'basecamp' | 'trail' | 'ridge' | 'summit' | 'expedition'
  hover?: boolean
}) {
  const elevationClasses = {
    basecamp: 'shadow-basecamp',
    trail: 'shadow-trail',
    ridge: 'shadow-ridge',
    summit: 'shadow-summit',
    expedition: 'shadow-expedition',
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 transition-all duration-200 ${
        elevationClasses[elevation]
      } ${hover ? 'hover:shadow-ridge hover:-translate-y-0.5 hover:border-alpine-500 dark:hover:border-alpine-400' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'alpine'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  asChild?: boolean
}) {
  const base =
    'inline-flex items-center justify-center font-sans font-medium rounded-[4px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-alpine-500 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-alpine-600 hover:bg-alpine-700 text-white shadow-trail border border-transparent',
    secondary: 'bg-alpine-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-alpine-100 dark:hover:bg-slate-700 border border-alpine-500/25 dark:border-alpine-400/25',
    outline: 'border border-alpine-500/40 dark:border-alpine-400/40 bg-white dark:bg-slate-800 hover:bg-alpine-500/10 hover:border-alpine-500 text-slate-800 dark:text-slate-200',
    ghost: 'bg-transparent hover:bg-alpine-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
    destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-trail border border-transparent',
    alpine: 'bg-alpine-600 hover:bg-alpine-700 text-white shadow-trail border border-transparent',
  }
  const sizes = {
    sm: 'h-8 px-2.5 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-xs gap-2',
    lg: 'h-10 px-4 text-sm gap-2',
    icon: 'h-9 w-9 p-0',
  }
  const Comp = asChild ? 'span' : 'button'
  return (
    <Comp className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...(asChild ? {} : props)}>
      {children}
    </Comp>
  )
}

function Badge({
  children,
  variant = 'default',
  className = '',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline' | 'mono'
}) {
  const variants = {
    default: 'bg-alpine-50/90 dark:bg-slate-800/90 text-alpine-900 dark:text-slate-200 border-alpine-500/30 dark:border-alpine-400/30 backdrop-blur-md',
    primary: 'bg-alpine-500/10 text-alpine-600 dark:text-alpine-400 border-alpine-500/40 dark:border-alpine-400/40 backdrop-blur-md shadow-xs',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 dark:border-emerald-400/40 backdrop-blur-md shadow-xs',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 dark:border-amber-400/40 backdrop-blur-md shadow-xs',
    error: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40 dark:border-rose-400/40 backdrop-blur-md shadow-xs',
    outline: 'border-alpine-500/40 dark:border-alpine-400/40 text-slate-900 dark:text-slate-100 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md',
    mono: 'bg-slate-900/90 text-white font-mono text-[10px] tracking-wider uppercase border-alpine-400/40 backdrop-blur-md shadow-xs',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[3px] px-2 py-0.5 text-xs font-medium border ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`flex h-9 w-full rounded-[4px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-alpine-500 focus:border-alpine-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

function Select({ children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`flex h-9 w-full rounded-[4px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-alpine-500 focus:border-alpine-500 transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`animate-pulse bg-muted/70 rounded-[4px] ${className}`} {...props} />
}

/* ---------------------------------------------------------
 * Safe Field Parsers & Helpers
 * --------------------------------------------------------- */

function formatDateSafe(val: unknown, formatPattern = 'MMM d, yyyy'): string {
  if (!val) return ''
  const d = new Date(val as string | number | Date)
  if (isNaN(d.getTime())) return ''
  try {
    return format(d, formatPattern)
  } catch {
    return ''
  }
}

function getCoverImageUrl(coverImage: any): string | null {
  if (!coverImage) return null
  if (typeof coverImage === 'string') return coverImage
  if (typeof coverImage === 'object' && coverImage.url) return coverImage.url
  return null
}

function getVenueText(event: any): string {
  if (!event) return 'Venue TBA'
  if (event.location?.location) return event.location.location
  if (event.location?.mapLocation) return event.location.mapLocation
  if (typeof event.venue === 'string') return event.venue
  if (typeof event.venue === 'object' && event.venue?.name) return event.venue.name
  return 'Venue TBA'
}

function getStatusBadge(event: any) {
  const isApproved = event.enabled && event.approvalStatus === 'approved'
  const isPending = event.approvalStatus === 'pending_review'

  if (isApproved) {
    return <Badge variant="success">Published</Badge>
  }
  if (isPending) {
    return <Badge variant="warning">In Review</Badge>
  }
  return <Badge variant="default">Draft</Badge>
}

/* ---------------------------------------------------------
 * Event Card Component
 * --------------------------------------------------------- */

function EventCard({
  event,
  onInspectTiers,
}: {
  event: any
  onInspectTiers: (event: any) => void
}) {
  const rawStart = event.startDatetime || event.startDate || event.start_date
  const rawEnd = event.endDatetime || event.endDate || event.end_date

  const startDateText = formatDateSafe(rawStart, 'EEE, MMM d, yyyy')
  const startTimeText = formatDateSafe(rawStart, 'h:mm a')

  const isPast = rawEnd
    ? new Date(rawEnd).getTime() < Date.now()
    : rawStart
      ? new Date(rawStart).getTime() < Date.now()
      : false

  const coverUrl = getCoverImageUrl(event.coverImage)
  const venue = getVenueText(event)
  const ticketTiers = event.pricing?.ticketTypes || []
  const priceDisplay =
    event.pricing?.priceRange || (event.pricing?.type === 'free' ? 'Free Admission' : 'TBA')

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[6px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-alpine-500/35 dark:border-alpine-400/35 shadow-trail transition-all duration-200 hover:shadow-ridge hover:border-alpine-500 dark:hover:border-alpine-400">
      {/* Cover Media */}
      <div className="relative aspect-[16/9] w-full bg-muted/40 overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={event.title || 'Event cover'}
            fill
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-muted/30 to-muted/80 text-muted-foreground/60">
            <Calendar className="w-8 h-8 stroke-[1.5] mb-1" />
            <span className="text-[10px] font-mono uppercase tracking-wider">No Cover Image</span>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto">{getStatusBadge(event)}</div>
          {isPast && (
            <Badge variant="mono" className="bg-black/80 text-white backdrop-blur-md border-white/20 pointer-events-auto">
              Concluded
            </Badge>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-alpine-600 dark:text-alpine-400 font-medium">
              {priceDisplay}
            </span>
            {event.slug && event.enabled && (
              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title="View Public Page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <h3 className="font-sans font-semibold text-sm leading-snug line-clamp-2 text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          <div className="space-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400">
            {startDateText && (
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="truncate">
                  {startDateText} {startTimeText && `• ${startTimeText}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="truncate">{venue}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-alpine-500/25 dark:border-alpine-400/25 flex items-center justify-between gap-2">
          {ticketTiers.length > 0 ? (
            <button
              onClick={() => onInspectTiers(event)}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <Layers className="w-3 h-3 text-alpine-500" />
              <span>{ticketTiers.length} Tier{ticketTiers.length > 1 ? 's' : ''}</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground/70">Single Admission</span>
          )}

          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[11px]">
              <Link href={`/organiser/events/${event.id}/attendees`}>Attendees</Link>
            </Button>
            <Button asChild variant="primary" size="sm" className="h-7 px-2.5 text-[11px]">
              <Link href={`/organiser/events/${event.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

/* ---------------------------------------------------------
 * Metric Card
 * --------------------------------------------------------- */

function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  isLoading,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon: React.ComponentType<{ className?: string }>
  isLoading: boolean
}) {
  return (
    <Card className="p-4" elevation="trail">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-20 mt-1" />
          ) : (
            <p className="font-sans text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-50">
              {value}
            </p>
          )}
        </div>
        <div className="p-2 rounded-[4px] bg-alpine-50 dark:bg-slate-800 text-alpine-700 dark:text-slate-300">
          <Icon className="w-4 h-4 stroke-[1.75]" />
        </div>
      </div>
      {sublabel && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{sublabel}</p>
      )}
    </Card>
  )
}

/* ---------------------------------------------------------
 * Ticket Tiers Modal Sheet
 * --------------------------------------------------------- */

function TicketTiersModal({
  event,
  onClose,
}: {
  event: any | null
  onClose: () => void
}) {
  if (!event) return null
  const tiers = event.pricing?.ticketTypes || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-alpine-500/40 dark:border-alpine-400/40 rounded-[6px] p-6 shadow-expedition space-y-4 max-h-[85vh] overflow-y-auto z-10">
        <div className="flex items-start justify-between gap-3 border-b border-alpine-500/25 dark:border-alpine-400/25 pb-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-alpine-600 dark:text-alpine-400">
              Pricing & Allocation
            </span>
            <h3 className="font-sans font-bold text-base text-slate-900 dark:text-slate-100 mt-0.5 truncate">
              {event.title}
            </h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {tiers.length > 0 ? (
            tiers.map((tier: any, i: number) => (
              <div
                key={i}
                className="p-3 rounded-[4px] border border-alpine-500/35 dark:border-alpine-400/35 bg-alpine-50/70 dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-sans font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                    {tier.name}
                  </p>
                  {tier.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {tier.description}
                    </p>
                  )}
                  {tier.totalStock && (
                    <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Cap: {tier.totalStock} tickets
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-xs text-alpine-600 dark:text-alpine-400">
                    {tier.price === 0 ? 'FREE' : `₨${tier.price.toLocaleString()}`}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-alpine-500/30 rounded-valley">
              No custom tiers configured.
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-alpine-500/25 dark:border-alpine-400/25">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href={`/organiser/events/${event.id}/edit`}>Edit Tiers</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------
 * Main Organiser Dashboard Page
 * --------------------------------------------------------- */

export default function OrganiserDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || '-createdAt')

  const [selectedEventForTiers, setSelectedEventForTiers] = useState<any | null>(null)

  // Load Organiser Profile / Tenant Data
  const loadMe = useCallback(async () => {
    try {
      const res = await fetch('/api/organiser/me')
      if (res.status === 401) {
        router.push('/organiser/login')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setMe(data)
      }
    } catch (err) {
      console.error('Failed to load organiser info:', err)
    }
  }, [router])

  // Load Metrics
  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/organiser/metrics')
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      }
    } catch (err) {
      console.error('Failed to load metrics:', err)
    }
  }, [])

  // Load Events
  const loadEvents = useCallback(
    async (pageNum = 1, append = false) => {
      if (append) setIsLoadingMore(true)
      else setIsLoading(true)

      try {
        const params = new URLSearchParams()
        params.set('page', pageNum.toString())
        params.set('limit', '12')
        if (search) params.set('search', search)
        if (statusFilter !== 'all') params.set('status', statusFilter)
        params.set('sort', sortBy)

        const res = await fetch(`/api/organiser/events?${params.toString()}`)
        if (res.status === 401) {
          router.push('/organiser/login')
          return
        }
        if (!res.ok) throw new Error('Failed to fetch events')

        const data = await res.json()
        const fetchedEvents = data.events || data.docs || []

        if (append) {
          setEvents((prev) => [...prev, ...fetchedEvents])
        } else {
          setEvents(fetchedEvents)
        }

        setHasMore(Boolean(data.hasMore))
        setPage(pageNum)
      } catch (err) {
        console.error('Error fetching events:', err)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [search, statusFilter, sortBy, router],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadMe()
    loadMetrics()
  }, [loadMe, loadMetrics])

  useEffect(() => {
    loadEvents(1, false)
  }, [loadEvents])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadEvents(1, false)
  }

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } catch {
      // fallback
    }
    router.push('/organiser/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const activeTenant = me?.tenants?.[0]
  const isVerified = Boolean(activeTenant?.verified || activeTenant?.status === 'verified')

  return (
    <div className="min-h-screen bg-alpine-50/25 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col selection:bg-foreground selection:text-background transition-colors duration-150">
      <OrganiserHeader />

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Verification Alert Banner (if pending) */}
        {activeTenant && !isVerified && (
          <div className="p-3.5 rounded-ridge border border-amber-500/30 bg-amber-500/5 text-xs text-foreground flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Organiser verification in review.</strong> Published events will be verified by administration before appearing on public feeds.
              </span>
            </div>
            <Link
              href="/organiser/profile/edit"
              className="font-mono text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline shrink-0"
            >
              Review Profile →
            </Link>
          </div>
        )}

        {/* Workspace Title & Description */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Overview & Events
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time ticket distributions, attendee check-in counters, and event management.
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Events"
            value={metrics?.totalEvents ?? 0}
            sublabel={`${metrics?.publishedEvents ?? 0} active on feed`}
            icon={Calendar}
            isLoading={isLoading && !metrics}
          />
          <MetricCard
            label="Published"
            value={metrics?.publishedEvents ?? 0}
            sublabel="Approved for public"
            icon={ShieldCheck}
            isLoading={isLoading && !metrics}
          />
          <MetricCard
            label="Tickets Sold"
            value={metrics?.totalTicketsSold ?? 0}
            sublabel="Across all orders"
            icon={Ticket}
            isLoading={isLoading && !metrics}
          />
          <MetricCard
            label="Total Revenue"
            value={metrics?.totalRevenue !== undefined ? `₨${metrics.totalRevenue.toLocaleString()}` : '₨0'}
            sublabel="Confirmed settlements"
            icon={TrendingUp}
            isLoading={isLoading && !metrics}
          />
        </section>

        {/* Event List Section */}
        <section className="space-y-4 pt-2">
          {/* Controls Bar: Search, Status, Sort */}
          <div className="p-3 rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-basecamp">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search event title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8"
              />
            </form>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="w-36">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Drafts</option>
                  <option value="scheduled">In Review</option>
                </Select>
              </div>

              <div className="w-44">
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-8"
                >
                  <option value="-createdAt">Newest First</option>
                  <option value="createdAt">Oldest First</option>
                  <option value="-startDatetime">Event Date (Latest)</option>
                  <option value="startDatetime">Event Date (Soonest)</option>
                  <option value="title">Alphabetical (A–Z)</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Events Grid / Cards */}
          {isLoading && events.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-ridge border border-border/50 bg-card overflow-hidden">
                  <Skeleton className="aspect-[16/9] w-full" />
                  <div className="p-4 space-y-2.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border/80 rounded-ridge bg-card/50 space-y-3">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground/60 stroke-[1.5]" />
              <h3 className="font-sans font-semibold text-sm text-foreground">No events found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search
                  ? `No matching events found for "${search}". Try adjusting your filters.`
                  : 'Start by creating your first event to manage tickets and scan attendees.'}
              </p>
              <div className="pt-2">
                <Button asChild variant="primary" size="sm">
                  <Link href="/organiser/events/new">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Event
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onInspectTiers={setSelectedEventForTiers}
                />
              ))}
            </div>
          )}

          {/* Pagination: Load More */}
          {hasMore && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                size="md"
                onClick={() => loadEvents(page + 1, true)}
                disabled={isLoadingMore}
                className="min-w-[160px] font-mono text-xs"
              >
                {isLoadingMore ? 'LOADING...' : 'LOAD MORE EVENTS'}
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Ticket Tiers Modal Sheet */}
      <TicketTiersModal
        event={selectedEventForTiers}
        onClose={() => setSelectedEventForTiers(null)}
      />
    </div>
  )
}
