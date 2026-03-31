import { isAdmin } from '@/access/admin'
import type { CollectionConfig } from 'payload'
import crypto from 'crypto'
import { getStripe } from '@/utilities/stripe'

export const Orders: CollectionConfig = {
  slug: 'orders',
  access: {
    create: () => true,
    delete: isAdmin,
    read: () => true,
    update: () => true, // Allow users to update status for now (simulation)
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        // Only generate tickets when an order is created or updated to 'paid'
        // and doesn't already have tickets generated
        if (
          (operation === 'create' || operation === 'update') &&
          doc.status === 'paid' &&
          (!doc.tickets || doc.tickets.length === 0)
        ) {
          const generatedTickets: number[] = []

          if (doc.items && Array.isArray(doc.items)) {
            for (const item of doc.items) {
              for (let i = 0; i < item.quantity; i++) {
                const ticket = await req.payload.create({
                  collection: 'tickets',
                  data: {
                    event: doc.event,
                    order: doc.id,
                    attendeeName: (req.user as any)?.name || 'Guest',
                    attendeeEmail: (req.user as any)?.email || '',
                    status: 'unused',
                    code: crypto.randomBytes(16).toString('hex'), // Ensure code is generated
                  },
                  req,
                })
                generatedTickets.push(ticket.id)
              }
            }

            // Update the order with the generated tickets
            // We use req.payload.update to avoid triggering this hook again infinitely
            // though the doc.tickets check above should prevent it too.
            await req.payload.update({
              collection: 'orders',
              id: doc.id,
              data: {
                tickets: generatedTickets,
              },
              req,
            })
          }
        }
      },
    ],
  },
  admin: {
    hidden: true,
    useAsTitle: 'id',
    group: 'Events',
  },
  endpoints: [
    {
      path: '/:id/initiate-checkout',
      method: 'post',
      handler: async (req) => {
        const { payload, user } = req
        const id = (req.routeParams as any)?.id

        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const order = await payload.findByID({
            collection: 'orders',
            id,
            depth: 2, // Get event and ticket types
          })

          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 })
          }

          const event = order.event as any
          const line_items = order.items.map((item: any) => {
            // Find the matching ticket type in the event to get its stripePriceID
            const ticketType = event.pricing?.ticketTypes?.find(
              (tt: any) => tt.name === item.ticketType,
            )

            if (!ticketType?.stripePriceID) {
              throw new Error(`Ticket type ${item.ticketType} does not have a Stripe Price ID`)
            }

            return {
              price: ticketType.stripePriceID,
              quantity: item.quantity,
            }
          })

          const stripe = getStripe()
          const frontendUrl = process.env.NEXT_PUBLIC_CLIENT_URL || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8100'

          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${frontendUrl}/orders/${order.id}/success`,
            cancel_url: `${frontendUrl}/orders/${order.id}/cancel`,
            metadata: {
              orderId: order.id.toString(),
            },
            customer_email: user.email,
          })

          return Response.json({ url: session.url })
        } catch (error: any) {
          req.payload.logger.error(`Error creating checkout session: ${error.message}`)
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
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
    },

    { name: 'totalAmount', type: 'number' },

    {
      name: 'status',
      type: 'select',
      options: ['pending', 'paid', 'cancelled', 'refunded'],
      defaultValue: 'pending',
    },

    {
      name: 'tickets',
      type: 'relationship',
      relationTo: 'tickets',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'stripeCheckoutSessionID',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'ticketType',
          type: 'text',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'price',
          type: 'number',
          required: true,
        },
      ],
    },
  ],
}
