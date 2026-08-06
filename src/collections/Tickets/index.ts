import crypto from 'crypto'
import type { CollectionConfig } from 'payload'
import type { User } from '../../payload-types.js'
import { checkRateLimit, rateLimitedResponse } from '@/utilities/rateLimit'
import { generatePassEndpoint } from './endpoints/pass'

export const Tickets: CollectionConfig = {
  slug: 'tickets',
  admin: {
    useAsTitle: 'code',
    group: 'Events',
  },

  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'super-admin') return true
      return { order: { exists: true } }
    },
  },

  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (!data.code) {
          data.code = crypto.randomBytes(16).toString('hex')
        }
        return data
      },
    ],
  },

  endpoints: [
    generatePassEndpoint,
    {
      path: '/lookup/:code',
      method: 'get',
      handler: async (req) => {
        const { payload, user } = req as { payload: any; user: User | null }
        if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        const ip = req.headers.get('x-forwarded-for') ?? 'lookup'
        const rl = checkRateLimit(`lookup:${ip}`, 20)
        if (!rl.allowed) return rateLimitedResponse()

        const code = (req.routeParams as any)?.code
        if (!code) {
          return Response.json({ error: 'Code is required' }, { status: 400 })
        }

        try {
          const result = await payload.find({
            collection: 'tickets',
            where: { code: { equals: code } },
            depth: 2,
            limit: 1,
          })

          if (!result.docs.length) {
            return Response.json({ error: 'Ticket not found' }, { status: 404 })
          }

          return Response.json(result.docs[0])
        } catch (error: any) {
          req.payload.logger.error(`Error looking up ticket: ${error.message}`)
          return Response.json({ error: 'Failed to look up ticket' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/check-in',
      method: 'post',
      handler: async (req) => {
        const { payload, user } = req
        if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        const id = (req.routeParams as any)?.id

        const ip = req.headers.get('x-forwarded-for') ?? `checkin:${id}`
        const rl = checkRateLimit(`check-in:${ip}`, 30)
        if (!rl.allowed) return rateLimitedResponse()

        try {
          const ticket = await payload.findByID({
            collection: 'tickets',
            id,
            depth: 1,
          })

          if (!ticket) {
            return Response.json({ error: 'Ticket not found' }, { status: 404 })
          }

          if (ticket.status !== 'unused') {
            return Response.json({ error: `Ticket already ${ticket.status}` }, { status: 400 })
          }

          const updated = await payload.update({
            collection: 'tickets',
            id,
            data: {
              status: 'checked-in',
              checkedInAt: new Date().toISOString(),
            },
            req,
          })

          return Response.json(updated)
        } catch (error: any) {
          req.payload.logger.error(`Error checking in ticket: ${error.message}`)
          return Response.json({ error: 'Check-in failed' }, { status: 500 })
        }
      },
    },
  ],

  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
    },
    {
      name: 'code',
      type: 'text',
      unique: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      options: ['unused', 'checked-in', 'cancelled', 'refunded', 'transferred', 'expired'],
      defaultValue: 'unused',
    },
    {
      name: 'checkedInAt',
      type: 'date',
    },
    {
      name: 'attendeeName',
      type: 'text',
    },
    {
      name: 'attendeeEmail',
      type: 'email',
    },
  ],
}
