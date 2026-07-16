import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/access/admin'
import { authenticated } from '@/access/authenticated'
import { getStripe } from '@/utilities/stripe'

export const GalleryAccess: CollectionConfig = {
  slug: 'gallery-access',
  admin: {
    useAsTitle: 'id',
    group: 'Events',
    hidden: ({ user }) => {
      if (!user) return true
      if (user.role === 'super-admin') return false
      return true
    },
  },
  access: {
    create: authenticated,
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'super-admin' || req.user.role === 'admin') return true
      return {
        buyer: { equals: req.user.id },
      }
    },
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: [
    {
      path: '/initiate-unlock',
      method: 'post',
      handler: async (req) => {
        const { payload, user } = req

        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let body: { eventId?: string }
        try {
          body = await req.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const { eventId } = body
        if (!eventId) {
          return Response.json({ error: 'eventId is required' }, { status: 400 })
        }

        try {
          const event = await payload.findByID({
            collection: 'events',
            id: eventId,
            depth: 0,
          })
          if (!event) {
            return Response.json({ error: 'Event not found' }, { status: 404 })
          }

          const existing = await payload.find({
            collection: 'gallery-access',
            where: {
              and: [
                { buyer: { equals: user.id } },
                { event: { equals: eventId } },
                { status: { equals: 'paid' } },
              ],
            },
            limit: 1,
          })
          if (existing.docs.length > 0) {
            return Response.json({ alreadyUnlocked: true })
          }

          const galleryAccess = await payload.create({
            collection: 'gallery-access',
            data: {
              buyer: user.id,
              event: eventId,
              status: 'pending',
            },
            req,
          })

          const stripe = getStripe()
          const frontendUrl = process.env.NEXT_PUBLIC_CLIENT_URL || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8100'

          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: 'gbp',
                  product_data: {
                    name: `Gallery Access — ${event.title || eventId}`,
                    description: 'Unlock event photo gallery',
                  },
                  unit_amount: 299,
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            success_url: `${frontendUrl}/events/${event.slug || eventId}/gallery?unlock=success`,
            cancel_url: `${frontendUrl}/events/${event.slug || eventId}/gallery?unlock=cancelled`,
            metadata: {
              galleryAccessId: galleryAccess.id.toString(),
              eventId: eventId,
            },
            customer_email: user.email,
          })

          return Response.json({ url: session.url })
        } catch (error: any) {
          req.payload.logger.error(`Error creating gallery unlock session: ${error.message}`)
          return Response.json({ error: error.message }, { status: 500 })
        }
      },
    },
  ],
  fields: [
    {
      name: 'buyer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      admin: { position: 'sidebar' },
    },
    {
      name: 'stripeSessionID',
      type: 'text',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Refunded', value: 'refunded' },
      ],
      index: true,
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
