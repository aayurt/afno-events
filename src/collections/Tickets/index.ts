import crypto from 'crypto'
import type { CollectionConfig } from 'payload'

export const Tickets: CollectionConfig = {
  slug: 'tickets',
  admin: {
    useAsTitle: 'code',
    group: 'Events',
  },

  access: {
    read: () => true,
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

  endpoints: [{
      path: '/:id/check-in',
      method: 'post',
      handler: async (req) => {
        const { payload, user } = req
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const id = (req.routeParams as any)?.id

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
          return Response.json({ error: error.message }, { status: 500 })
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
