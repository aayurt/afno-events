import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/access/admin'
import { authenticated } from '@/access/authenticated'
import fs from 'fs'
import os from 'os'
import path from 'path'

export const EventPhotos: CollectionConfig = {
  slug: 'event-photos',
  admin: {
    useAsTitle: 'id',
    group: 'Events',
    defaultColumns: ['image', 'event', 'uploader', 'status', 'createdAt'],
    listSearchableFields: ['status'],
    hidden: ({ user }) => {
      if (!user) return true
      if (user.role === 'super-admin' || user.role === 'admin') return false
      return true
    },
  },
  access: {
    create: authenticated,
    read: () => true,
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: [
    {
      path: '/batch-moderation',
      method: 'post',
      handler: async (req) => {
        const { payload, user } = req
        if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: { ids: string[]; status: string }
        try {
          body = await req.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const { ids, status } = body
        if (!ids?.length || !['approved', 'rejected'].includes(status)) {
          return Response.json({ error: 'ids[] and status (approved|rejected) required' }, { status: 400 })
        }

        const results = []
        for (const id of ids) {
          try {
            await payload.update({
              collection: 'event-photos',
              id,
              data: { status },
              req,
            })
            results.push({ id, status: 'updated' })
          } catch (err: any) {
            results.push({ id, status: 'error', error: err.message })
          }
        }

        return Response.json({ results })
      },
    },
    {
      path: '/pending-count',
      method: 'get',
      handler: async (req) => {
        const { payload } = req
        const result = await payload.count({
          collection: 'event-photos',
          where: { status: { equals: 'pending' } },
        })
        return Response.json({ count: result.totalDocs })
      },
    },
    {
      path: '/upload',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let formData: FormData
        try {
          formData = await req.formData()
        } catch {
          return Response.json({ error: 'Failed to parse form data' }, { status: 400 })
        }

        const file = formData.get('file') as File | null
        const dataStr = formData.get('data') as string | null

        if (!file) {
          return Response.json({ error: 'file is required' }, { status: 400 })
        }

        let eventId: string | null = null
        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr)
            eventId = parsed.eventId
          } catch {}
        }
        if (!eventId) {
          eventId = formData.get('eventId') as string | null
        }

        if (!eventId) {
          return Response.json({ error: 'eventId is required' }, { status: 400 })
        }

        try {
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const tmpDir = os.tmpdir()
          const tmpPath = path.join(tmpDir, file.name)
          fs.writeFileSync(tmpPath, buffer)

          const eventDoc = await req.payload.findByID({
            collection: 'events',
            id: Number(eventId),
            depth: 0,
          })

          const resolveTenant = (val: any): string | number | null => {
            if (!val) return null
            return typeof val === 'object' ? val.id : val
          }

          let tenantId = resolveTenant(eventDoc.tenant)

          if (!tenantId) {
            const userDoc = await req.payload.findByID({
              collection: 'users',
              id: req.user.id,
              depth: 1,
            })
            const userTenant = Array.isArray(userDoc.tenants) && userDoc.tenants.length > 0
              ? userDoc.tenants[0].tenant
              : null
            tenantId = resolveTenant(userTenant)
          }

          if (!tenantId) {
            const tenantsResult = await req.payload.find({
              collection: 'tenants',
              limit: 1,
              depth: 0,
            })
            if (tenantsResult.docs.length > 0) {
              tenantId = resolveTenant(tenantsResult.docs[0].id)
            }
          }

          const mediaData: any = { alt: 'Gallery photo' }
          if (tenantId) mediaData.tenant = tenantId

          const mediaDoc = await req.payload.create({
            collection: 'media',
            data: mediaData,
            filePath: tmpPath,
          })

          try { fs.unlinkSync(tmpPath) } catch {}

          const eventPhoto = await req.payload.create({
            collection: 'event-photos',
            data: {
              event: Number(eventId),
              uploader: req.user.id,
              image: mediaDoc.id,
              status: 'pending',
              tenant: tenantId || undefined,
            },
          })

          return Response.json({ photo: eventPhoto })
        } catch (error: any) {
          req.payload.logger.error(`Gallery upload error: ${error.message}`)
          return Response.json({ error: error.message }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && data?.image) {
          try {
            const mediaId = typeof data.image === 'object' ? data.image.id : data.image
            const mediaDoc = await req.payload.findByID({
              collection: 'media',
              id: mediaId,
              depth: 0,
            })
            if (mediaDoc?.url) {
              const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
              const imageUrl = mediaDoc.url.startsWith('http') ? mediaDoc.url : `${serverUrl}${mediaDoc.url}`
              const response = await fetch(imageUrl)
              const buffer = Buffer.from(await response.arrayBuffer())
              const sharp = (await import('sharp')).default
              const { blurDataURL } = await generateBlurHash(sharp, buffer)
              data.blurredPreview = blurDataURL
            }
          } catch (error) {
            req.payload.logger.error(`Error generating blurred preview: ${error}`)
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update' && doc.status === 'approved' && previousDoc?.status !== 'approved') {
          const uploaderId = typeof doc.uploader === 'object' ? doc.uploader.id : doc.uploader
          if (uploaderId) {
            try {
              const event = await req.payload.findByID({
                collection: 'events',
                id: typeof doc.event === 'object' ? doc.event.id : doc.event,
                depth: 0,
              })
              await req.payload.create({
                collection: 'notifications',
                data: {
                  user: uploaderId,
                  title: 'Your photo was approved!',
                  message: `Your photo at ${event?.title || 'the event'} has been approved and is now visible in the gallery.`,
                  type: 'gallery',
                  link: `/events/${event?.slug || ''}/gallery`,
                },
              })
            } catch (error) {
              req.payload.logger.error(`Error sending approval notification: ${error}`)
            }
          }
        }
      },
    ],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    {
      name: 'uploader',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      defaultValue: ({ user }: { user: any }) => user?.id,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'blurredPreview',
      type: 'textarea',
      admin: {
        readOnly: true,
        description: 'Auto-generated blurred preview for locked state',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}

async function generateBlurHash(sharp: any, buffer: Buffer): Promise<{ blurDataURL: string }> {
  const resized = await sharp(buffer)
    .resize(32, 32, { fit: 'cover' })
    .jpeg({ quality: 30 })
    .toBuffer()

  const base64 = resized.toString('base64')
  const blurDataURL = `data:image/jpeg;base64,${base64}`
  return { blurDataURL }
}
