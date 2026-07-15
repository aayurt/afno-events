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

const TAG_OPTIONS = [
  { label: 'Music', value: 'music' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Theatre', value: 'theatre' },
  { label: 'Arts', value: 'arts' },
  { label: 'Business', value: 'business' },
  { label: 'Technology', value: 'technology' },
  { label: 'Sports', value: 'sports' },
  { label: 'Food & Drink', value: 'food-drink' },
  { label: 'Exhibition', value: 'exhibition' },
  { label: 'Comedy', value: 'comedy' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Fitness', value: 'fitness' },
]

export default async function EventsPage({ searchParams: searchParamsPromise }: Args) {
  const { q, tag, page: pageStr } = await searchParamsPromise
  const currentPage = parseInt(pageStr || '1', 10)
  const limit = 12

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
    where.tags = { in: tag }
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

  return (
    <div className="container py-12 space-y-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground text-lg">Discover events happening near you</p>
      </div>

      <form action="/app/events" method="GET" className="space-y-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              name="q"
              placeholder="Search events..."
              defaultValue={q || ''}
              className="pl-12 h-14 rounded-2xl"
            />
          </div>
          <Button type="submit" size="lg" className="rounded-2xl px-8">
            Search
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {TAG_OPTIONS.map(({ label, value }) => {
            const isActive = tag === value
            const href = isActive ? '/app/events' : `/app/events?tag=${value}${q ? `&q=${q}` : ''}`
            return (
              <Link key={value} href={href}>
                <Button
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  className="rounded-full"
                >
                  {label}
                </Button>
              </Link>
            )
          })}
          {tag && (
            <Link href="/app/events">
              <Button type="button" variant="ghost" className="rounded-full text-muted-foreground">
                Clear
              </Button>
            </Link>
          )}
        </div>
      </form>

      {events.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-muted-foreground">No events found</p>
          <Link href="/app/events" className="text-primary hover:underline mt-2 block">
            View all events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event: any) => (
            <Link key={event.id} href={`/app/events/${event.slug || event.id}`}>
              <Card className="group overflow-hidden hover:shadow-xl transition-all border-border rounded-2xl h-full">
                <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                  {event.coverImage ? (
                    <img
                      src={typeof event.coverImage === 'object' ? event.coverImage.url : ''}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                      <Calendar size={48} className="opacity-20" />
                    </div>
                  )}
                  {event.pricing?.type === 'paid' && (
                    <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                      {event.pricing.priceRange || 'Paid'}
                    </div>
                  )}
                  {event.pricing?.type === 'free' && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Free
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar size={14} />
                    {event.startDatetime
                      ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'TBD'}
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {event.title}
                  </CardTitle>
                  {event.location?.location && (
                    <CardDescription className="flex items-center gap-1">
                      <MapPin size={14} />
                      {event.location.location}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {event.tags.slice(0, 3).map((t: string) => (
                        <span
                          key={t}
                          className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-4 pt-8">
          {page > 1 && (
            <Link href={`/app/events?page=${page - 1}${q ? `&q=${q}` : ''}${tag ? `&tag=${tag}` : ''}`}>
              <Button variant="outline">Previous</Button>
            </Link>
          )}
          <span className="flex items-center text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/app/events?page=${page + 1}${q ? `&q=${q}` : ''}${tag ? `&tag=${tag}` : ''}`}>
              <Button variant="outline">Next</Button>
            </Link>
          )}
        </div>
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
