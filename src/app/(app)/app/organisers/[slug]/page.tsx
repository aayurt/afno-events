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
  const { slug } = await paramsPromise
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
    <div className="container py-10 space-y-10">
      <Link href="/app/events">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft size={16} /> {et('viewAll')}
        </Button>
      </Link>

      {/* Organiser header */}
      <Card className="overflow-hidden rounded-2xl">
        <div className="relative h-32 sm:h-40 bg-gradient-to-br from-secondary/25 to-primary/10" />
        <CardContent className="p-6 sm:p-8 -mt-14 sm:-mt-16 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <OrganiserAvatar
              name={tenant.name}
              imageUrl={orgImage}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-4 ring-background"
              textClassName="text-4xl sm:text-5xl"
            />
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{tenant.name}</h1>
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {t('eventsCount', { count: totalDocs ?? 0 })}
                </span>
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Mail size={14} /> {contactEmail}
                  </a>
                )}
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone.replace(/[^+\d]/g, '')}`}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Phone size={14} /> {contactPhone}
                  </a>
                )}
              </div>
              {tenant.description && (
                <p className="text-muted-foreground max-w-2xl whitespace-pre-line leading-relaxed">
                  {tenant.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events by this organiser */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">
            {t('organiserEventsTitle', { name: tenant.name })}
          </h2>
          <p className="text-sm text-muted-foreground">{t('organiserEventsSubtitle')}</p>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16 text-muted-foreground space-y-4">
              <Calendar size={32} className="mx-auto opacity-30" />
              <p>{t('noOrganiserEvents')}</p>
              <Link href="/app/events">
                <Button variant="outline" size="sm">
                  {t('viewAll')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event: any) => (
              <Link key={event.id} href={`/app/events/${event.slug || event.id}`}>
                <Card className="group overflow-hidden hover:shadow-xl transition-all border-border rounded-2xl h-full flex flex-col">
                  <div className="aspect-[16/9] bg-muted relative overflow-hidden shrink-0">
                    {getCardImageUrl(event.coverImage) ? (
                      <img
                        src={getCardImageUrl(event.coverImage)!}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                        <Calendar size={48} className="opacity-20" />
                      </div>
                    )}
                    {event.pricing?.type === 'paid' && (
                      <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                        {event.pricing.priceRange || t('paid')}
                      </div>
                    )}
                    {event.pricing?.type === 'free' && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {t('free')}
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <EventStatusBadge
                        status={getEventStatus(event.startDatetime, event.endDatetime)}
                        labels={{ live: et('live'), upcoming: et('upcoming'), past: et('past') }}
                      />
                    </div>
                  </div>
                  <CardHeader className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar size={14} />
                      {event.startDatetime
                        ? formatEventDate(event.startDatetime, event.timezone)
                        : t('tbd')}
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {event.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {event.description || t('noDescription')}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 mt-auto">
                    {event.location?.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin size={14} />
                        {event.location.location}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-4 pt-4">
            {current > 1 && (
              <Link href={`/app/organisers/${tenant.slug}?page=${current - 1}`}>
                <Button variant="outline">{t('previous')}</Button>
              </Link>
            )}
            <span className="flex items-center text-muted-foreground">
              {t('pageOf', { page: current, totalPages })}
            </span>
            {current < totalPages && (
              <Link href={`/app/organisers/${tenant.slug}?page=${current + 1}`}>
                <Button variant="outline">{t('next')}</Button>
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await paramsPromise
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
