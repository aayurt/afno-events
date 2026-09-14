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
import { FavoriteButton } from './[slug]/favorite-button'

function formatMonthDay(startDatetime: string | null) {
  if (!startDatetime) return ''
  const date = new Date(startDatetime)
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const day = date.getDate()
  return { month, day }
}

export default async function EventsPage({ searchParams: searchParamsPromise }: Args) {
  const t = await getScopedI18n('events')
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

  const featuredEvent = events.find((e: any) => e.featured === true) || events[0] || null

  return (
    <div className="container py-12 space-y-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{t('discoverEvents')}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">{t('subtitle')}</p>
      </div>

      <form action="/app/events" method="GET" className="space-y-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              name="q"
              placeholder={t('search')}
              defaultValue={q || ''}
              className="pl-12 h-14 rounded-2xl"
            />
          </div>
          <Button type="submit" size="lg" className="rounded-2xl px-8">
            {t('searchButton')}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTER_TAGS.map(({ label, value }) => {
            const isActive = value === '' ? !tag : tag === value
            const href = value === '' ? '/app/events' : `/app/events?tag=${value}${q ? `&q=${q}` : ''}`
            return (
              <Link key={value || '__all'} href={href}>
                <Button
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  className="rounded-full px-3 py-1 text-sm"
                >
                  {label}
                </Button>
              </Link>
            )
          })}
        </div>
      </form>

      <p className="my-8 text-primary/70 text-sm capitalize">
        This week in Kathmandu Valley
      </p>

      {events.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-muted-foreground">{t('noEventsFound')}</p>
          <Link href="/app/events" className="text-primary hover:underline mt-2 block">
            {t('viewAll')}
          </Link>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {events.map((event: any) => {
            const isFeatured = event.id === featuredEvent?.id
            const { month = '', day = '' } = formatMonthDay(event.startDatetime) || {} as any
            const isFree = event.pricing?.type === 'free'
            const priceText = isFree ? t('free') : event.pricing?.priceRange || t('paid')
            const stockClass = isFree ? 'text-muted-foreground' : 'text-primary text-[11px] font-bold'
            const stockText = isFree ? 'Free entry' : 'Available'

            return (
              <Link
                key={event.id}
                href={`/app/events/${event.slug || event.id}`}
                className={`group overflow-hidden ${isFeatured ? 'col-span-2 row-span-2 max-lg:col-span-2' : ''}`}
              >
                <Card className="rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1">
                  <div className="relative aspect-[4/5] bg-muted overflow-hidden shrink-0">
                    <div
                      className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-80"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}
                    />
                    {getCardImageUrl(event.coverImage) ? (
                      <img
                        src={getCardImageUrl(event.coverImage)!}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div
                        className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center"
                      >
                        <Calendar size={48} className="opacity-20" />
                      </div>
                    )}

                    <div className="absolute top-2 left-2">
                      <span
                        className="bg-background/85 text-foreground border border-border text-xs font-semibold rounded-full px-2.5 py-1 backdrop-blur-sm"
                      >
                        {event.tags?.[0] || t('allEvents')}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-2 bg-white rounded-xl px-2.5 py-1.5 text-xs font-semibold">
                      <span className="text-primary uppercase text-xs">{month}</span>
                      <span className="ml-1 font-bold">{day}</span>
                    </div>

                    <div className="absolute top-2 right-2">
                      <FavoriteButton eventId={event.id} />
                    </div>
                  </div>

                    <CardHeader className="p-4 pb-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar size={14} />
                        {event.startDatetime
                          ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : t('tbd')}
                      </div>
                      <CardTitle className={`font-bold tracking-tight line-clamp-2 ${isFeatured ? 'text-2xl' : 'text-base'}`}>
                        {event.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="px-4 pt-3 pb-4 flex flex-col flex-1 min-h-[7.5rem] gap-2">
                      {event.location?.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={12} />
                          {event.location.location}
                        </p>
                      )}

                      <div className="mt-auto pt-2.5 flex items-baseline justify-between">
                        <span className={stockClass}>
                          {priceText}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {stockText}
                        </span>
                      </div>
                    </CardContent>
                </Card>
              </Link>
            )
          })}
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