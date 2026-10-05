import { isAdmin } from '@/access/admin'
import { checkRateLimit, rateLimitedResponse } from '@/utilities/rateLimit'
import type { CollectionConfig } from 'payload'
import crypto from 'crypto'
import { getStripe } from '@/utilities/stripe'
import { getServerSideURL } from '@/utilities/getURL'
import { markOrderRefunded } from '@/utilities/stripeWebhooks'
import {
  getEventTierAvailability,
  hasActiveOrder,
  validateOrderStock,
} from '@/utilities/ticketAvailability'

export const Orders: CollectionConfig = {
  slug: 'orders',
  access: {
    create: () => true,
    delete: isAdmin,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'super-admin') return true
      return { buyer: { equals: user.id } }
    },
    update: isAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Better Auth sessions hand back serial IDs as strings ("1"), but the
        // postgres adapter validates relationships as numbers — a string buyer
        // fails with "invalid relationships". Coerce numeric strings up front
        // so ticket purchase (and any API client) can't trip on ID types.
        if (data) {
          for (const field of ['buyer', 'event'] as const) {
            const value = (data as any)[field]
            if (typeof value === 'string' && /^\d+$/.test(value)) {
              ;(data as any)[field] = parseInt(value, 10)
            }
          }
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, originalDoc, operation }) => {
        // Enforce organiser limits: per-order caps AND total tier stock
        // (client clamps too — this stops direct API abuse and oversells).
        const items = (data as any)?.items
        const eventRef = (data as any)?.event
        if (Array.isArray(items) && items.length > 0 && eventRef != null) {
          const eventId = typeof eventRef === 'object' ? eventRef.id : eventRef
          const availability = await getEventTierAvailability(req.payload, eventId).catch(
            () => [],
          )
          // One order per account: reject before stock checks (more specific).
          const buyerRef = (data as any)?.buyer
          const buyerId = buyerRef !== null && typeof buyerRef === 'object' ? buyerRef.id : buyerRef
          if (buyerId != null) {
            const eventDoc = await req.payload
              .findByID({
                collection: 'events',
                id: eventId,
                depth: 0,
                overrideAccess: true,
              })
              .catch(() => null)
            if ((eventDoc as any)?.limitOneOrderPerAccount) {
              const where: any = {
                and: [
                  { buyer: { equals: buyerId } },
                  { event: { equals: eventId } },
                  { status: { in: ['pending', 'paid'] } },
                ],
              }
              if (operation === 'update' && (originalDoc as any)?.id != null) {
                where.and.push({ id: { not_equals: (originalDoc as any).id } })
              }
              const existing = await req.payload.find({
                collection: 'orders',
                where,
                depth: 0,
                limit: 1,
                overrideAccess: true,
              })
              if (hasActiveOrder(existing.docs, buyerId)) {
                throw new Error('You already have an order for this event — one order per account.')
              }
            }
          }
          const tiers = availability.map((a) => ({
            name: a.name,
            maxPerOrder: a.maxPerOrder,
            totalStock: a.totalStock,
          }))
          const soldByTier: Record<string, number> = {}
          for (const a of availability) soldByTier[a.name] = a.sold
          // On update the hook sees the merged doc (items always present, id
          // is not) — use originalDoc for identity. Exclude this order's own
          // previous quantities so edits don't count stock twice, and skip
          // entirely when items are untouched (status-only updates like
          // pending → paid must never strand a paying customer — this also
          // covers the afterChange ticket-attach update).
          if (operation === 'update') {
            const prevItems = ((originalDoc as any)?.items || []) as any[]
            if (JSON.stringify(prevItems) === JSON.stringify(items)) return data
            for (const prev of prevItems) {
              if (typeof prev?.ticketType === 'string') {
                soldByTier[prev.ticketType] = Math.max(
                  0,
                  (soldByTier[prev.ticketType] ?? 0) - Math.max(0, Number(prev.quantity) || 0),
                )
              }
            }
          }
          const violation = validateOrderStock(tiers, items, soldByTier)
          if (violation) throw new Error(violation)
        }
        return data
      },
    ],
    afterChange: [      async ({ doc, operation, req }) => {
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

        const ip = req.headers.get('x-forwarded-for') ?? `checkout:${id}`
        const rl = checkRateLimit(`initiate-checkout:${ip}`, 10)
        if (!rl.allowed) return rateLimitedResponse()

        try {
          const order = await payload.findByID({
            collection: 'orders',
            id,
            depth: 0,
          })

          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 })
          }

          if (order.buyer !== user.id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }

          // Free order — mark as paid immediately, no Stripe needed
          if (!order.totalAmount || order.totalAmount === 0) {
            await payload.update({
              collection: 'orders',
              id: order.id,
              data: { status: 'paid' },
              req,
            })
            return Response.json({ clientSecret: null })
          }

          const stripe = getStripe()

          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(order.totalAmount * 100),
            currency: 'gbp',
            metadata: {
              orderId: order.id.toString(),
            },
            receipt_email: user.email,
          })

          // Remember the PaymentIntent so confirm-payment can verify it server-side.
          await payload.update({
            collection: 'orders',
            id: order.id,
            data: { stripePaymentIntentID: paymentIntent.id },
            req,
          })

          return Response.json({ clientSecret: paymentIntent.client_secret })
        } catch (error: any) {
          req.payload.logger.error(`Error initiating payment: ${error.message}`)
          return Response.json({ error: 'Payment processing failed' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/checkout-session',
      method: 'post',
      handler: async (req) => {
        const { payload, user } = req
        const id = (req.routeParams as any)?.id

        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const ip = req.headers.get('x-forwarded-for') ?? `checkout-session:${id}`
        const rl = checkRateLimit(`checkout-session:${ip}`, 10)
        if (!rl.allowed) return rateLimitedResponse()

        try {
          const order = await payload.findByID({
            collection: 'orders',
            id,
            depth: 0,
          })

          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 })
          }

          if (order.buyer !== user.id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }

          // Free order — mark as paid immediately, no Stripe needed.
          if (!order.totalAmount || order.totalAmount === 0) {
            await payload.update({
              collection: 'orders',
              id: order.id,
              data: { status: 'paid' },
              req,
            })
            return Response.json({ url: null })
          }

          const stripe = getStripe()

          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: (order.items || []).map((item: any) => ({
              quantity: item.quantity,
              price_data: {
                currency: 'gbp',
                unit_amount: Math.round(item.price * 100),
                product_data: {
                  name: item.ticketType,
                },
              },
            })),
            metadata: {
              orderId: order.id.toString(),
            },
            customer_email: user.email,
            success_url: `${getServerSideURL()}/app/orders/${order.id}/success`,
            cancel_url: `${getServerSideURL()}/app/orders/${order.id}/cancel`,
          })

          await payload.update({
            collection: 'orders',
            id: order.id,
            data: { stripeCheckoutSessionID: session.id },
            req,
          })

          return Response.json({ url: session.url })
        } catch (error: any) {
          req.payload.logger.error(`Error creating checkout session: ${error.message}`)
          return Response.json({ error: 'Payment processing failed' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/refund',
      method: 'post',
      handler: async (req) => {
        const { payload, user } = req
        const id = (req.routeParams as any)?.id

        if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        const ip = req.headers.get('x-forwarded-for') ?? `refund:${id}`
        const rl = checkRateLimit(`refund:${ip}`, 20)
        if (!rl.allowed) return rateLimitedResponse()

        try {
          const order = await payload.findByID({
            collection: 'orders',
            id,
            depth: 0,
          })

          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 })
          }

          if (order.status !== 'paid') {
            return Response.json(
              { error: 'Only paid orders can be refunded' },
              { status: 400 },
            )
          }

          if (!order.stripePaymentIntentID) {
            return Response.json(
              { error: 'No Stripe payment found for this order' },
              { status: 400 },
            )
          }

          const stripe = getStripe()
          await stripe.refunds.create({
            payment_intent: order.stripePaymentIntentID,
          })

          await markOrderRefunded(payload, order.id, req)

          return Response.json({ success: true })
        } catch (error: any) {
          req.payload.logger.error(`Error refunding order: ${error.message}`)
          return Response.json({ error: 'Refund failed' }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/confirm-payment',
      method: 'post',
      handler: async (req) => {
        const { payload, user } = req
        const id = (req.routeParams as any)?.id

        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const ip = req.headers.get('x-forwarded-for') ?? `confirm:${id}`
        const rl = checkRateLimit(`confirm-payment:${ip}`, 10)
        if (!rl.allowed) return rateLimitedResponse()

        try {
          const order = await payload.findByID({
            collection: 'orders',
            id,
            depth: 0,
          })

          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 })
          }

          if (order.buyer !== user.id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }

          if (order.status === 'paid') {
            return Response.json({ success: true })
          }

          // Never trust the client: verify the PaymentIntent actually succeeded
          // with Stripe before marking the order as paid.
          if (!order.stripePaymentIntentID) {
            return Response.json(
              { error: 'No payment found for this order' },
              { status: 400 },
            )
          }

          const stripe = getStripe()
          const paymentIntent = await stripe.paymentIntents.retrieve(
            order.stripePaymentIntentID,
          )

          if (paymentIntent.status !== 'succeeded') {
            return Response.json(
              { error: 'Payment not completed' },
              { status: 400 },
            )
          }

          await payload.update({
            collection: 'orders',
            id: order.id,
            data: { status: 'paid' },
            req,
          })

          return Response.json({ success: true })
        } catch (error: any) {
          req.payload.logger.error(`Error confirming payment: ${error.message}`)
          return Response.json({ error: 'Payment confirmation failed' }, { status: 500 })
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
      // required: true,
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
      name: 'stripePaymentIntentID',
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
