import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { Calendar, MapPin, User, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TicketPurchase } from './ticket-purchase'
import { ShareButtons } from './share-buttons'

type Args = {
  params: Promise<{ slug: string }>
}

export default async function EventDetailPage({ params: paramsPromise }: Args) {
  const { slug } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const isNumeric = /^\d+$/.test(slug)

  const result = await payload.find({
    collection: 'events',
    where: (isNumeric
      ? { id: { equals: parseInt(slug, 10) } }
      : { slug: { equals: slug } }) as any,
    limit: 1,
    depth: 2,
  })

  const event = result.docs[0]
  if (!event) notFound()

  const e = event as any

  const now = new Date()
  const start = e.startDatetime ? new Date(e.startDatetime) : null
  const end = e.endDatetime ? new Date(e.endDatetime) : null
  const eventStatus = start && start > now ? 'upcoming' : end && end < now ? 'past' : start && start <= now && (!end || end >= now) ? 'live' : null

  const suggestedResult = await payload.find({
    collection: 'events',
    where: {
      enabled: { equals: true },
      id: { not_equals: e.id },
    } as any,
    limit: 3,
    depth: 1,
    sort: '-startDatetime',
  })
  const suggestedEvents = suggestedResult.docs as any[]

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[50vh] md:h-[60vh] bg-muted overflow-hidden">
        {e.coverImage ? (
          <img
            src={typeof e.coverImage === 'object' ? e.coverImage.url : ''}
            alt={e.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Calendar size={80} className="opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        {eventStatus && (
          <div className="absolute top-6 left-6 z-10">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm ${
              eventStatus === 'live'
                ? 'bg-red-500 text-white animate-pulse'
                : eventStatus === 'upcoming'
                ? 'bg-blue-500/80 text-white'
                : 'bg-muted/80 text-muted-foreground'
            }`}>
              {eventStatus === 'live' ? 'LIVE EVENT' : eventStatus === 'upcoming' ? 'UPCOMING' : 'PAST'}
            </span>
          </div>
        )}
      </div>

      <div className="container -mt-32 relative z-10">
        <div className="lg:hidden flex items-center gap-4 p-4 mb-6 bg-background/80 backdrop-blur-sm rounded-2xl border border-border sticky top-14 z-30 -mx-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar size={12} />
              {start
                ? new Date(start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                : 'TBD'}
              {e.location?.location && (
                <>
                  <span>•</span>
                  <MapPin size={12} />
                  <span className="truncate">{e.location.location}</span>
                </>
              )}
            </div>
            <p className="font-bold text-primary">
              {e.pricing?.priceRange || (e.pricing?.type === 'free' ? 'Free' : 'N/A')}
            </p>
          </div>
          <Button size="sm" className="rounded-xl shrink-0" onClick={() => document.getElementById('ticket-card')?.scrollIntoView({ behavior: 'smooth' })}>
            Get Tickets
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            {e.tags && e.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {e.tags.map((t: string) => (
                  <Link key={t} href={`/app/events?tag=${t}`}>
                    <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors cursor-pointer">
                      {t}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{e.title}</h1>
              {e.description && (
                <p className="text-muted-foreground text-lg mt-6 leading-relaxed whitespace-pre-line">
                  {e.description}
                </p>
              )}
            </div>

            <div className="border-t border-border pt-8">
              <h2 className="text-xl font-semibold mb-4">Date & Time</h2>
              {e.startDatetime ? (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="text-primary" size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {new Date(e.startDatetime).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(e.startDatetime).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {e.endDatetime && (
                        <> — {new Date(e.endDatetime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">To be announced</p>
              )}
            </div>

            {e.location?.location && (
              <div className="border-t border-border pt-8">
                <h2 className="text-xl font-semibold mb-4">Venue</h2>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="text-primary" size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{e.location.location}</p>
                    {e.location.mapLocation && (
                      <p className="text-muted-foreground">{e.location.mapLocation}</p>
                    )}
                    {e.location.latitude != null && e.location.longitude != null && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${e.location.latitude},${e.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-sm font-medium hover:underline mt-2 inline-block"
                      >
                        View on Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {e.location?.latitude != null && e.location?.longitude != null && (
              <div className="border-t border-border pt-8">
                <h2 className="text-xl font-semibold mb-4">Map</h2>
                <div className="aspect-[2/1] rounded-xl overflow-hidden bg-muted relative">
                  <iframe
                    src={`https://maps.google.com/maps?q=${e.location.latitude},${e.location.longitude}&z=15&output=embed`}
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${e.location.latitude},${e.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 z-10"
                    aria-label="Open in Google Maps"
                  />
                </div>
              </div>
            )}

            {e.tenant && (
              <div className="border-t border-border pt-8">
                <h2 className="text-xl font-semibold mb-4">Organiser</h2>
                <div className="flex items-center gap-4">
                  {e.tenant.organisationImage ? (
                    <img
                      src={typeof e.tenant.organisationImage === 'object' ? e.tenant.organisationImage.url : ''}
                      alt={e.tenant.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <User size={24} className="text-muted-foreground" />
                    </div>
                  )}
                  <p className="font-semibold text-lg">{e.tenant.name}</p>
                </div>
              </div>
            )}

            {e.gallery && e.gallery.length > 0 && (
              <div className="border-t border-border pt-8">
                <h2 className="text-xl font-semibold mb-4">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {e.gallery.map((item: any, i: number) => (
                    <div key={item.id || i} className="aspect-square rounded-xl overflow-hidden bg-muted">
                      {item.image && (
                        <img
                          src={typeof item.image === 'object' ? item.image.url : ''}
                          alt=""
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-8">
              <h2 className="text-xl font-semibold mb-4">Share with friends</h2>
              <ShareButtons />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24" id="ticket-card">
              <Card className="rounded-2xl">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-3xl font-bold text-primary">
                      {e.pricing?.priceRange || (e.pricing?.type === 'free' ? 'Free' : 'N/A')}
                    </p>
                  </div>

                  <TicketPurchase event={e} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {suggestedEvents.length > 0 && (
        <section className="border-t border-border mt-16 pt-12">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Suggested Events</h2>
              <Link href="/app/events">
                <Button variant="ghost" size="sm" className="gap-1 text-primary">
                  View All <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suggestedEvents.map((ev: any) => (
                <Link key={ev.id} href={`/app/events/${ev.slug || ev.id}`}>
                  <Card className="group overflow-hidden hover:shadow-xl transition-all border-border rounded-2xl h-full flex flex-col">
                    <div className="aspect-[16/9] bg-muted relative overflow-hidden shrink-0">
                      {ev.coverImage ? (
                        <img
                          src={typeof ev.coverImage === 'object' ? ev.coverImage.url : ''}
                          alt={ev.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                          <Calendar size={40} className="opacity-20" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {ev.startDatetime
                            ? new Date(ev.startDatetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'TBD'}
                        </p>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">{ev.title}</h3>
                      </div>
                      {ev.location?.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <MapPin size={12} /> {ev.location.location}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const isNumeric = /^\d+$/.test(slug)

  const result = await payload.find({
    collection: 'events',
    where: (isNumeric
      ? { id: { equals: parseInt(slug, 10) } }
      : { slug: { equals: slug } }) as any,
    limit: 1,
  })

  const event = result.docs[0]
  if (!event) return { title: 'Event Not Found' }

  return {
    title: `${event.title} | Afno Events`,
    description: event.description || '',
  }
}
