import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TicketPurchase } from './ticket-purchase'
import { ShareButtons } from './share-buttons'
import { FavoriteButton } from './favorite-button'
import { ShowcaseGallery } from './showcase-gallery'
import { PhotoThumbs } from './photo-thumbs'
import { EventCoverImage } from './event-cover'
import { OrganiserAvatar } from '@/components/ui/organiser-avatar'
import { getEventStatus } from '@/components/events/event-status'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { AddToCalendarButton, CountdownChip } from './event-niceties'
import { RemindMeButton } from './remind-me'
import { getScopedI18n } from '@/locales/server'
import { getCardImageUrl } from '@/utilities/getCardImageUrl'
import { formatEventDateLong, formatEventTime } from '@/utilities/formatEventDate'

type Args = {
  params: Promise<{ slug: string }>
}

export default async function EventDetailPage({ params: paramsPromise }: Args) {
  const t = await getScopedI18n('eventDetail')
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

  // Same-organiser rail ("More from this organiser"), mirroring mobile — shown
  // only when the event belongs to a tenant and that tenant has other events.
  const tenant = e.tenant && typeof e.tenant === 'object' ? e.tenant : null
  const tenantId = tenant?.id ?? e.tenant ?? null
  const tenantSlug: string | null = tenant?.slug || null
  let relatedEvents: any[] = []
  if (tenantId != null) {
    const relatedResult = await payload.find({
      collection: 'events',
      where: {
        and: [
          { enabled: { equals: true } },
          { tenant: { equals: tenantId } },
          { id: { not_equals: e.id } },
        ],
      } as any,
      limit: 8,
      depth: 1,
      sort: '-startDatetime',
    })
    relatedEvents = relatedResult.docs as any[]
  }

  // Approved attendee photos (EventPhotos) — shown inline, full gallery below.
  let approvedPhotos: any[] = []
  if (e.galleryEnabled) {
    const photosResult = await payload.find({
      collection: 'event-photos',
      where: {
        and: [
          { event: { equals: e.id } },
          { status: { equals: 'approved' } },
        ],
      },
      limit: 12,
      depth: 1,
      sort: '-createdAt',
    })
    approvedPhotos = photosResult.docs as any[]
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[420px] md:h-[560px] lg:h-[640px] bg-muted overflow-hidden">
        {getCardImageUrl(e.coverImage) ? (
          <>
            {/* Ambient backdrop: the artwork itself, blurred and overscaled, so the band is never empty
                on wide screens without cropping the poster. */}
            <img
              src={getCardImageUrl(e.coverImage)!}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl saturate-150 opacity-80"
            />
            <div className="absolute inset-0 bg-background/30" />

            {/* Phones: poster fills the band (its own aspect is close to a phone screen). */}
            <EventCoverImage
              src={getCardImageUrl(e.coverImage)!}
              alt={e.title}
              className="absolute inset-0 w-full h-full md:hidden block"
              imgClassName="w-full h-full object-cover"
            />

            {/* Tablet and up: show the whole poster, sized to the band, floating over the ambient wash. */}
            <div className="hidden md:flex absolute inset-x-0 top-4 bottom-36 items-center justify-center px-4">
              <EventCoverImage
                src={getCardImageUrl(e.coverImage)!}
                alt={e.title}
                className="h-full block"
                imgClassName="h-full w-auto max-w-[94%] object-contain rounded-2xl shadow-2xl ring-1 ring-border/40"
              />
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Calendar size={80} className="opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent md:from-background/90 md:via-background/5" />
        {eventStatus && (
          <div className="absolute top-6 left-6 z-10">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm ${
              eventStatus === 'live'
                ? 'bg-red-500 text-white animate-pulse'
                : eventStatus === 'upcoming'
                ? 'bg-blue-500/80 text-white'
                : 'bg-muted/80 text-muted-foreground'
            }`}>
              {eventStatus === 'live' ? t('live') : eventStatus === 'upcoming' ? t('upcoming') : t('past')}
            </span>
          </div>
        )}
        <div className="absolute top-6 right-6 z-10">
          <FavoriteButton eventId={e.id} />
        </div>
      </div>

      <div className="container -mt-32 relative z-10">
        {/* Mobile sticky buy bar */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{e.title}</p>
            <p className="font-bold text-primary">
              {e.pricing?.priceRange || (e.pricing?.type === 'free' ? t('free') : t('na'))}
            </p>
          </div>
          <a href="#ticket-card">
            <Button size="lg" className="rounded-full px-6 shrink-0">
              {t('getTickets')}
            </Button>
          </a>
        </div>
        <div className="h-20 lg:hidden" aria-hidden="true" />

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
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground text-balance leading-[1.08] drop-shadow-sm">
                {e.title}
              </h1>
              {e.description && (
                <div className="mt-6 rounded-2xl bg-card/60 border border-border/80 p-5 sm:p-6 backdrop-blur-sm">
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                    {e.description}
                  </p>
                </div>
              )}
              {e.startDatetime && (
                <div className="mt-6">
                  <CountdownChip
                    startDatetime={e.startDatetime}
                    endDatetime={e.endDatetime}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('dateTime')}</div>
                <div className="mt-2">
                  <div className="font-extrabold text-base sm:text-lg leading-tight text-foreground">
                    {start
                      ? new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : t('tbd')}
                  </div>
                  {start && (
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {formatEventTime(e.startDatetime, e.timezone, { withAbbr: true })}
                    </div>
                  )}
                </div>
              </div>

              {e.location?.location && (
                <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('venue')}</div>
                  <div className="mt-2">
                    <div className="font-extrabold text-base sm:text-lg leading-tight text-foreground truncate" title={e.location.location}>
                      {e.location.location.split(',')[0]}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {e.location.location.split(',')[1] || 'UK'}
                    </div>
                  </div>
                </div>
              )}

              {tenant && (
                <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('organiser')}</div>
                  <div className="mt-2">
                    <div className="font-extrabold text-base sm:text-lg leading-tight text-foreground truncate" title={tenant.name}>
                      {tenant.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Verified Promoter</div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('price')}</div>
                <div className="mt-2">
                  <div className="font-black text-lg sm:text-xl leading-tight text-primary font-mono">
                    {e.pricing?.priceRange || (e.pricing?.type === 'free' ? t('free') : t('na'))}
                  </div>
                  <div className="text-xs text-emerald-500 font-medium mt-0.5">
                    {e.isBookable !== false ? 'Booking Open' : 'Announcement'}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-8">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="text-xl font-bold tracking-tight">{t('dateTime')}</h2>
                <div className="flex items-center gap-2">
                  <RemindMeButton
                    eventId={e.id}
                    eventTitle={e.title}
                    startDatetime={e.startDatetime}
                    eventPath={`/app/events/${e.slug || e.id}`}
                  />
                  <AddToCalendarButton
                    title={e.title}
                    description={e.description}
                    location={e.location?.location}
                    startDatetime={e.startDatetime}
                    endDatetime={e.endDatetime}
                  />
                </div>
              </div>
              {e.startDatetime ? (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="text-primary" size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {formatEventDateLong(e.startDatetime, e.timezone)}
                    </p>
                    <p className="text-muted-foreground">
                      {formatEventTime(e.startDatetime, e.timezone, { withAbbr: true })}
                      {e.endDatetime && (
                        <> — {formatEventTime(e.endDatetime, e.timezone, { withAbbr: true })}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">{t('tbd')}</p>
              )}
            </div>

            {e.location?.location && (
              <div className="border-t border-border pt-8">
                <h2 className="text-xl font-bold tracking-tight mb-4">{t('venue')}</h2>
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
                        {t('viewOnGoogleMaps')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {e.location?.latitude != null && e.location?.longitude != null && (
              <div className="border-t border-border pt-8">
                <h2 className="text-xl font-bold tracking-tight mb-4">{t('map')}</h2>
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
                <h2 className="text-xl font-bold tracking-tight mb-4">{t('organiser')}</h2>
                {e.tenant.slug ? (
                  <Link href={`/app/organisers/${e.tenant.slug}`} className="group block">
                    <div className="flex items-center gap-4">
                      <OrganiserAvatar
                        name={e.tenant.name}
                        imageUrl={getCardImageUrl(e.tenant.organisationImage)}
                        className="w-16 h-16 rounded-xl"
                        textClassName="text-2xl"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {e.tenant.name}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 group-hover:text-primary/70 transition-colors">
                          {t('viewOrganiserEvents')} <ArrowRight size={14} />
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-4">
                    <p className="font-semibold text-lg">{e.tenant.name}</p>
                  </div>
                )}
              </div>
            )}

            {e.showcaseImages && e.showcaseImages.length > 0 && (
              <div className="border-t border-border pt-8">
                <h2 className="text-xl font-bold tracking-tight mb-4">{t('gallery')}</h2>
                <ShowcaseGallery
                  images={e.showcaseImages
                    .map((item: any) => getCardImageUrl(item.image))
                    .filter((src: any): src is string => !!src)}
                />
                {e.galleryEnabled && (
                  <div className="mt-4">
                    <Link href={`/app/events/${e.slug || e.id}/gallery`}>
                      <Button variant="outline" className="rounded-xl">
                        View Event Gallery
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {approvedPhotos.length > 0 && (
              <div className="border-t border-border pt-8">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <h2 className="text-xl font-bold tracking-tight">{t('eventPhotos')}</h2>
                  <Link
                    href={`/app/events/${e.slug || e.id}/gallery`}
                    className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                  >
                    {t('viewFullGallery')} <ArrowRight size={14} />
                  </Link>
                </div>
                <PhotoThumbs
                  images={approvedPhotos
                    .map((photo: any) => {
                      const img = typeof photo.image === 'object' ? photo.image : null
                      return img?.sizes?.thumbnail?.url || img?.url
                    })
                    .filter((src: any): src is string => !!src)}
                />
              </div>
            )}

            <div className="border-t border-border pt-8">
              <h2 className="text-xl font-bold tracking-tight mb-4">{t('shareWithFriends')}</h2>
              <ShareButtons />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24" id="ticket-card">
              <Card className="rounded-2xl">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('price')}</p>
                    <p className="text-3xl font-bold text-primary">
              {e.pricing?.priceRange || (e.pricing?.type === 'free' ? t('free') : t('na'))}
                    </p>
                  </div>

                  <TicketPurchase event={e} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {relatedEvents.length > 0 && (
        <section className="border-t border-border mt-16 pt-12">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-extrabold tracking-tight">{t('moreFromOrganiser')}</h2>
              {tenantSlug && (
                <Link href={`/app/organisers/${tenantSlug}`}>
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    {t('viewAll')} <ArrowRight size={16} />
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex gap-5 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
              {relatedEvents.map((ev: any) => {
                const rStart = ev.startDatetime ? new Date(ev.startDatetime) : null
                const rMonth = rStart ? rStart.toLocaleString('en-US', { month: 'short' }).toUpperCase() : ''
                const rDay = rStart ? rStart.getDate() : ''
                return (
                <Link
                  key={ev.id}
                  href={`/app/events/${ev.slug || ev.id}`}
                  className="w-60 shrink-0 snap-start group"
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all border-border rounded-2xl h-full flex flex-col">
                    <div className="aspect-[16/10] bg-muted relative overflow-hidden shrink-0">
                      {getCardImageUrl(ev.coverImage) ? (
                        <img
                          src={getCardImageUrl(ev.coverImage)!}
                          alt={ev.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                          <Calendar size={40} className="opacity-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute top-2 left-2">
                        <EventStatusBadge
                          status={getEventStatus(ev.startDatetime, ev.endDatetime)}
                          labels={{ live: t('live'), upcoming: t('upcoming'), past: t('past') }}
                        />
                      </div>
                      {rStart && (
                        <div className="absolute bottom-2 left-2 bg-white rounded-lg px-2 py-1 text-center leading-tight">
                          <div className="text-[9px] font-extrabold uppercase tracking-wide text-primary">{rMonth}</div>
                          <div className="text-sm font-extrabold text-foreground">{rDay}</div>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col justify-between">
                      <h3 className="font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                        {ev.title}
                      </h3>
                      {ev.location?.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2 truncate">
                          <MapPin size={12} /> {ev.location.location}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
                )
              })}
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
