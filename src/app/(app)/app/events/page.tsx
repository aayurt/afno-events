import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { Calendar, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Args = {
  searchParams: Promise<{
    q?: string
    tag?: string
    page?: string
  }>
}

import { TAG_OPTIONS } from '@/config/tags'
import { getScopedI18n } from '@/locales/server'
import { getCardImageUrl } from '@/utilities/getCardImageUrl'
import { formatEventDate } from '@/utilities/formatEventDate'
import { cn } from '@/utilities/ui'
import { displayPriceRange } from '@/utilities/pricing'
import { FavoriteButton } from './[slug]/favorite-button'
import { EventSearchBar } from './search-bar'
import { getEventStatus } from '@/components/events/event-status'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { EventAlertFallback } from './event-alert-fallback'

function formatMonthDay(startDatetime: string | null) {
  if (!startDatetime) return ''
  const date = new Date(startDatetime)
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const day = date.getDate()
  return { month, day }
}

export default async function EventsPage({ searchParams: searchParamsPromise }: Args) {
  const t = await getScopedI18n('events')
  const et = await getScopedI18n('eventDetail')
  const { q, tag, page: pageStr } = await searchParamsPromise
  const currentPage = parseInt(pageStr || '1', 10)
  const limit = 12

  const FILTER_TAGS = [
    { label: t('allEvents'), value: '' },
    ...TAG_OPTIONS,
  ]

  const payload = await getPayload({ config: configPromise })

  const where: any = {
    enabled: { equals: true },
  }

  if (q) {
    where.or = [
      { title: { like: q } },
      { description: { like: q } },
    ]
  }

  if (tag) {
    where.tags = { in: [tag] }
  }

  const result = await payload.find({
    collection: 'events',
    where,
    limit,
    page: currentPage,
    depth: 1,
    sort: '-startDatetime',
  })

  const { docs: events, totalPages, page } = result
  const current = page ?? 1

  const nowMs = Date.now()
  const upcomingEvents = events.filter((e: any) => {
    const time = e.startDatetime ? new Date(e.startDatetime).getTime() : 0
    return time >= nowMs
  }).sort((a: any, b: any) => {
    const timeA = a.startDatetime ? new Date(a.startDatetime).getTime() : 0
    const timeB = b.startDatetime ? new Date(b.startDatetime).getTime() : 0
    return timeA - timeB
  })

  const pastEvents = events.filter((e: any) => {
    const time = e.startDatetime ? new Date(e.startDatetime).getTime() : 0
    return time < nowMs
  }).sort((a: any, b: any) => {
    const timeA = a.startDatetime ? new Date(a.startDatetime).getTime() : 0
    const timeB = b.startDatetime ? new Date(b.startDatetime).getTime() : 0
    return timeB - timeA
  })

  // Unified Feed: Upcoming events first, then recent past events
  const unifiedEvents = [...upcomingEvents, ...pastEvents]
  const featuredEvent = upcomingEvents.find((e: any) => e.featured === true) || unifiedEvents[0] || null

  const isFiltered = Boolean(q || tag)

  return (
    <div className="container py-12 space-y-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{t('discoverEvents')}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">{t('subtitle')}</p>
      </div>

      <form action="/app/events" method="GET" className="space-y-4">
        <EventSearchBar
          defaultValue={q || ''}
          placeholder={t('search')}
          buttonLabel={t('searchButton')}
        />

        <div className="flex gap-2 flex-wrap pt-1">
          {FILTER_TAGS.map(({ label, value }) => {
            const isActive = value === '' ? !tag : tag === value
            const href = value === '' ? '/app/events' : `/app/events?tag=${value}${q ? `&q=${q}` : ''}`
            return (
              <Link key={value || '__all'} href={href}>
                <Button
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'rounded-[4px] px-3 h-7 text-xs font-mono uppercase tracking-wider transition-all',
                    isActive
                      ? 'bg-alpine-600 hover:bg-alpine-700 text-white border-alpine-600 shadow-xs'
                      : 'border-alpine-500/30 bg-white/80 dark:bg-slate-900/80 text-foreground hover:bg-alpine-50/80 dark:hover:bg-slate-800'
                  )}
                >
                  {label}
                </Button>
              </Link>
            )
          })}
        </div>
      </form>

      <p className="my-8 text-primary/70 text-sm capitalize">
        Community Events Directory ({unifiedEvents.length} Total)
      </p>

      {events.length === 0 ? (
        <div className="py-6">
          <EventAlertFallback
            currentQuery={q}
            currentTag={tag}
            isFiltered={isFiltered}
          />
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {unifiedEvents.map((event: any) => {
            const isFeatured = event.id === featuredEvent?.id
            const { month = '', day = '' } = formatMonthDay(event.startDatetime) || {} as any
            const isFree = event.pricing?.type === 'free'
            const eventTime = event.startDatetime ? new Date(event.startDatetime).getTime() : 0
            const isPast = eventTime > 0 && eventTime < nowMs

            const priceText = isPast
              ? 'Concluded'
              : isFree
              ? t('free')
              : displayPriceRange(event.pricing?.ticketTypes, event.pricing?.priceRange) || t('paid')

            const stockClass = isPast
              ? 'text-slate-400 dark:text-slate-500 font-mono text-xs uppercase'
              : isFree
              ? 'text-muted-foreground'
              : 'text-alpine-600 text-base font-extrabold font-mono'

            const stockText = isPast ? 'Past Event' : isFree ? 'Free entry' : 'Available'

            return (
              <Link
                key={event.id}
                href={`/app/events/${event.slug || event.id}`}
                className={`group overflow-hidden ${isFeatured ? 'col-span-2 row-span-2 max-lg:col-span-2 h-auto' : ''}`}
              >
                <div className={`rounded-[10px] border ${isPast ? 'border-slate-300/40 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50' : 'border-alpine-500/35 bg-alpine-50/60 dark:bg-slate-900'} shadow-card hover:shadow-card-hover overflow-hidden flex flex-col transition-all duration-200 group-hover:-translate-y-0.5 ${isFeatured ? 'h-auto' : 'h-full'}`}>
                  <div className="relative aspect-[4/5] bg-muted overflow-hidden shrink-0">
                    <div
                      className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-80"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}
                    />
                    {getCardImageUrl(event.coverImage) ? (
                      <img
                        src={getCardImageUrl(event.coverImage)!}
                        alt={event.title}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isPast ? 'opacity-90 grayscale-[15%] group-hover:grayscale-0' : ''}`}
                      />
                    ) : (
                      <div
                        className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center"
                      >
                        <Calendar size={48} className="opacity-20" />
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex flex-col items-start gap-1.5">
                      <span
                        className="bg-white/90 dark:bg-slate-900/90 text-foreground border border-alpine-500/30 text-[11px] font-mono uppercase tracking-wider rounded-[4px] px-2 py-0.5 backdrop-blur-sm shadow-xs"
                      >
                        {event.tags?.[0] || t('allEvents')}
                      </span>
                      <EventStatusBadge
                        status={getEventStatus(event.startDatetime, event.endDatetime)}
                        labels={{ live: et('live'), upcoming: et('upcoming'), past: et('past') }}
                      />
                    </div>

                    <div className="absolute bottom-2 left-2 bg-white/95 dark:bg-slate-900/95 border border-alpine-500/25 rounded-[4px] px-2 py-1 text-xs font-semibold shadow-xs">
                      <span className={`${isPast ? 'text-slate-500' : 'text-alpine-600'} uppercase text-xs font-mono font-bold`}>{month}</span>
                      <span className="ml-1 font-bold text-foreground font-mono">{day}</span>
                    </div>

                    <div className="absolute top-2 right-2">
                      <FavoriteButton eventId={event.id} />
                    </div>
                  </div>

                  <div className="p-4 pb-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1.5">
                      <Calendar size={13} className={isPast ? 'text-slate-400' : 'text-alpine-600'} />
                      {event.startDatetime
                        ? formatEventDate(event.startDatetime, event.timezone)
                        : t('tbd')}
                    </div>
                    <h3 className={`font-semibold tracking-tight text-foreground line-clamp-2 ${isFeatured ? 'text-2xl' : 'text-base'} ${isPast ? 'text-slate-700 dark:text-slate-200' : ''}`}>
                      {event.title}
                    </h3>
                  </div>

                  <div className="px-4 pt-2 pb-4 flex flex-col flex-1 min-h-[6.5rem] gap-2">
                    {event.location?.location && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                        <MapPin size={13} className="shrink-0 mt-0.5 text-muted-foreground/80" />
                        <span>{event.location.location}</span>
                      </p>
                    )}

                    <div className="mt-auto pt-2.5 flex items-baseline justify-between border-t border-alpine-500/15">
                      <span className={stockClass}>
                        {priceText}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {stockText}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Drop Alerts & Organiser CTA Banner */}
        <div className="pt-6">
          <EventAlertFallback
            currentQuery={q}
            currentTag={tag}
            isFiltered={isFiltered}
          />
        </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-4 pt-8">
              {current > 1 && (
                <Link href={`/app/events?page=${current - 1}${q ? `&q=${q}` : ''}${tag ? `&tag=${tag}` : ''}`}>
                  <Button variant="outline">{t('previous')}</Button>
                </Link>
              )}
              <span className="flex items-center text-muted-foreground">
                {t('pageOf', { page: current, totalPages })}
              </span>
              {current < totalPages && (
                <Link href={`/app/events?page=${current + 1}${q ? `&q=${q}` : ''}${tag ? `&tag=${tag}` : ''}`}>
                  <Button variant="outline">{t('next')}</Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Events | Afno Events',
    description: 'Discover events happening near you',
  }
}