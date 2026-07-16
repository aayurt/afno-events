import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getScopedI18n } from '@/locales/server'
import { GalleryClient } from './gallery-client'

type Args = {
  params: Promise<{ slug: string }>
}

export default async function EventGalleryPage({ params: paramsPromise }: Args) {
  const t = await getScopedI18n('gallery')
  const { slug } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const isNumeric = /^\d+$/.test(slug)
  const result = await payload.find({
    collection: 'events',
    where: (isNumeric
      ? { id: { equals: parseInt(slug, 10) } }
      : { slug: { equals: slug } }) as any,
    limit: 1,
    depth: 1,
  })

  const event = result.docs[0] as any
  if (!event || !event.galleryEnabled) notFound()

  const photosResult = await payload.find({
    collection: 'event-photos',
    where: {
      and: [
        { event: { equals: event.id } },
        { status: { equals: 'approved' } },
      ],
    },
    limit: 100,
    depth: 1,
    sort: '-createdAt',
  })
  const photos = photosResult.docs as any[]

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Link
          href={`/app/events/${event.slug || event.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
          {t('backToEvent')}
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{event.title} {t('title')}</h1>
            <p className="text-muted-foreground mt-1">
              {photos.length > 0 ? `${photos.length} photos` : t('noPhotos')}
            </p>
          </div>
        </div>

        <GalleryClient
          event={event}
          photos={photos}
        />
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
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

  const event = result.docs[0] as any
  if (!event) return { title: 'Gallery Not Found' }

  return {
    title: `${event.title} Gallery | Afno Events`,
    description: `View photos from ${event.title}`,
  }
}
