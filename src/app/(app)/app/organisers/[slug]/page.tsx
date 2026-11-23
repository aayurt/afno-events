import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Mail, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getScopedI18n } from '@/locales/server'
import { getCardImageUrl } from '@/utilities/getCardImageUrl'
import { OrganiserAvatar } from '@/components/ui/organiser-avatar'
import { formatEventDate } from '@/utilities/formatEventDate'
import { getEventStatus } from '@/components/events/event-status'
import { EventStatusBadge } from '@/components/events/event-status-badge'

type Args = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function OrganiserPage({ params: paramsPromise, searchParams }: Args) {
  const t = await getScopedI18n('events')
  const et = await getScopedI18n('eventDetail')
  const { slug: rawSlug } = await paramsPromise
  // Route params can arrive still-encoded (%20 for spaces) — legacy tenant
  // slugs contain raw names, so decode before the DB lookup.
  let slug = rawSlug
  try {
    slug = decodeURIComponent(rawSlug)
  } catch {
    slug = rawSlug
  }
  const { page: pageStr } = await searchParams
  const currentPage = parseInt(pageStr || '1', 10) || 1
  const limit = 12

  const payload = await getPayload({ config: configPromise })

  const tenantResult = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const tenant = tenantResult.docs[0] as any
  if (!tenant) notFound()

  const result = await payload.find({
    collection: 'events',
    where: {
      tenant: { equals: tenant.id },
      enabled: { equals: true },
    },
    limit,
    page: currentPage,
    depth: 1,
    sort: '-startDatetime',
  })

  const { docs: events, totalPages, page, totalDocs } = result
  const current = page ?? 1

  const orgImage = getCardImageUrl(tenant.organisationImage)
  const contactEmail = tenant.contactInfo?.email || null
  const contactPhone = tenant.contactInfo?.phone || null

  return (
    <div className="container max-w-5xl py-8 sm:py-12 space-y-10 font-sans">
      <Link
        href="/app/events"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={13} /> {et('viewAll')}
      </Link>

      {/* Clean Minimal Organiser Hero */}
      <div className="border border-border/80 bg-card/40 backdrop-blur-sm rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <OrganiserAvatar
            name={tenant.name}
            imageUrl={orgImage}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-border/80 shrink-0"
            textClassName="text-3xl sm:text-4xl font-mono"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border/70 bg-muted/40 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Organiser Profile
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                {tenant.name}
              </h1>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {t('eventsCount', { count: totalDocs ?? 0 })}
              </span>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-1.5 hover:text-foreground underline underline-offset-4 transition-colors"
                >
                  <Mail size={13} /> {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a
                  href={`tel:${contactPhone.replace(/[^+\d]/g, '')}`}
                  className="flex items-center gap-1.5 hover:text-foreground underline underline-offset-4 transition-colors"
                >
                  <Phone size={13} /> {contactPhone}
                </a>
              )}
            </div>

            {tenant.description && (
              <p className="text-sm text-muted-foreground max-w-2xl whitespace-pre-line leading-relaxed pt-1">
                {tenant.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Events by this organiser */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              {t('organiserEventsTitle', { name: tenant.name })}
            </h2>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
              {t('organiserEventsSubtitle')}
            </p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            [{totalDocs ?? 0}]
          </span>
        </div>

        {events.length === 0 ? (
          <div className="border border-dashed border-border/80 rounded-xl bg-card/20 p-12 text-center space-y-3">
            <Calendar size={28} className="mx-auto text-muted-foreground/40" />
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{t('noOrganiserEvents')}</p>
            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg font-mono text-xs uppercase tracking-wider">
              <Link href="/app/events">
                {t('viewAll')}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event: any) => (
              <Link key={event.id} href={`/app/events/${event.slug || event.id}`} className="group">
                <div className="border border-border/80 bg-card/40 backdrop-blur-sm rounded-xl overflow-hidden hover:border-foreground/30 transition-all h-full flex flex-col shadow-none">
                  <div className="aspect-[16/9] bg-muted relative overflow-hidden shrink-0 border-b border-border/60">
                    {getCardImageUrl(event.coverImage) ? (
                      <img
                        src={getCardImageUrl(event.coverImage)!}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted/60 flex items-center justify-center">
                        <Calendar size={36} className="opacity-20" />
                      </div>
                    )}
                    {event.pricing?.type === 'paid' && (
                      <div className="absolute top-3 right-3 font-mono text-[11px] font-medium px-2 py-0.5 rounded border border-border/60 bg-background/85 backdrop-blur-sm text-foreground">
                        {event.pricing.priceRange || t('paid')}
                      </div>
                    )}
                    {event.pricing?.type === 'free' && (
                      <div className="absolute top-3 right-3 font-mono text-[11px] font-medium px-2 py-0.5 rounded border border-emerald-500/30 bg-background/85 backdrop-blur-sm text-emerald-500">
                        {t('free')}
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <EventStatusBadge
                        status={getEventStatus(event.startDatetime, event.endDatetime)}
                        labels={{ live: et('live'), upcoming: et('upcoming'), past: et('past') }}
                      />
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Calendar size={12} />
                        {event.startDatetime
                          ? formatEventDate(event.startDatetime, event.timezone)
                          : t('tbd')}
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {event.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {event.description || t('noDescription')}
                      </p>
                    </div>

                    {event.location?.location && (
                      <p className="text-xs font-mono text-muted-foreground flex items-center gap-1 pt-2 border-t border-border/50 truncate">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{event.location.location}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-4 font-mono text-xs">
            {current > 1 && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg font-mono text-xs uppercase">
                <Link href={`/app/organisers/${tenant.slug}?page=${current - 1}`}>
                  {t('previous')}
                </Link>
              </Button>
            )}
            <span className="text-muted-foreground uppercase tracking-wider">
              {t('pageOf', { page: current, totalPages })}
            </span>
            {current < totalPages && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg font-mono text-xs uppercase">
                <Link href={`/app/organisers/${tenant.slug}?page=${current + 1}`}>
                  {t('next')}
                </Link>
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug: rawSlug } = await paramsPromise
  let slug = rawSlug
  try {
    slug = decodeURIComponent(rawSlug)
  } catch {
    slug = rawSlug
  }
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  const tenant = result.docs[0] as any
  return {
    title: tenant ? `${tenant.name} | Afno Events` : 'Organiser | Afno Events',
    description: tenant?.description || undefined,
  }
}
