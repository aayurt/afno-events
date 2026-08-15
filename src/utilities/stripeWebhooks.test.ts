import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { buildConfig, getPayload, type Payload } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { Orders } from '../collections/Orders/index'
import { Tickets } from '../collections/Tickets/index'
import {
  paymentIntentSucceeded,
  checkoutSessionCompleted,
  chargeRefunded,
} from './stripeWebhooks'

// A minimal real Payload instance on in-memory SQLite so the Orders
// afterChange hook (which generates tickets) runs for real.
const testConfig = buildConfig({
  secret: 'test-secret',
  db: sqliteAdapter({
    client: { url: 'file::memory:?cache=shared' },
  }),
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [{ name: 'name', type: 'text' }],
    },
    {
      slug: 'events',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'startDatetime', type: 'date' },
        { name: 'endDatetime', type: 'date' },
      ],
    },
    Orders,
    Tickets,
  ],
})

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config: testConfig })
})

afterAll(async () => {
  await payload.destroy()
})

async function createPendingOrder(totalAmount: number, items: any[]) {
  const user = await payload.create({
    collection: 'users',
    data: {
      email: `buyer-${Date.now()}-${Math.random()}@test.com`,
      password: 'test1234',
    } as any,
  })

  const order = await payload.create({
    collection: 'orders',
    data: {
      buyer: user.id,
      totalAmount,
      status: 'pending',
      items,
    },
  })
  return order
}

describe('Stripe webhook handlers', () => {
  it('generates tickets ONLY after an order is marked paid', async () => {
    const order = await createPendingOrder(50, [
      { ticketType: 'General', quantity: 2, price: 25 },
      { ticketType: 'VIP', quantity: 1, price: 0 },
    ])

    // While pending: no tickets may exist yet.
    const pending = await payload.findByID({ collection: 'orders', id: order.id })
    expect(pending.status).toBe('pending')
    expect((pending.tickets as any[] | undefined) || []).toHaveLength(0)

    // Simulate Stripe firing payment_intent.succeeded for this order.
    await paymentIntentSucceeded({
      event: {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_test_123', metadata: { orderId: String(order.id) } },
        },
      },
      payload,
    })

    const paid = await payload.findByID({
      collection: 'orders',
      id: order.id,
      depth: 1,
    })
    expect(paid.status).toBe('paid')
    expect(paid.stripePaymentIntentID).toBe('pi_test_123')

    // One ticket per item quantity (2 + 1 = 3).
    const tickets = (paid.tickets as any[] | undefined) || []
    expect(tickets).toHaveLength(3)
    for (const ticket of tickets) {
      expect(ticket.status).toBe('unused')
    }
  })

  it('marks the order paid via checkout.session.completed (web Checkout Session)', async () => {
    const order = await createPendingOrder(10, [
      { ticketType: 'GA', quantity: 1, price: 10 },
    ])

    await checkoutSessionCompleted({
      event: {
        type: 'checkout.session.completed',
        data: {
          object: { id: 'cs_test_123', metadata: { orderId: String(order.id) } },
        },
      },
      payload,
    })

    const paid = await payload.findByID({
      collection: 'orders',
      id: order.id,
      depth: 1,
    })
    expect(paid.status).toBe('paid')
    expect(paid.stripeCheckoutSessionID).toBe('cs_test_123')
    expect((paid.tickets as any[] | undefined) || []).toHaveLength(1)
  })

  it('does not double-generate tickets when the webhook fires twice', async () => {
    const order = await createPendingOrder(20, [
      { ticketType: 'GA', quantity: 1, price: 20 },
    ])

    for (let i = 0; i < 2; i++) {
      await paymentIntentSucceeded({
        event: {
          type: 'payment_intent.succeeded',
          data: {
            object: { id: 'pi_test_456', metadata: { orderId: String(order.id) } },
          },
        },
        payload,
      })
    }

    const paid = await payload.findByID({
      collection: 'orders',
      id: order.id,
      depth: 1,
    })
    expect(paid.status).toBe('paid')
    expect((paid.tickets as any[] | undefined) || []).toHaveLength(1)
  })

  it('voids tickets and marks the order refunded via charge.refunded', async () => {
    const order = await createPendingOrder(30, [
      { ticketType: 'General', quantity: 2, price: 15 },
    ])

    await paymentIntentSucceeded({
      event: {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_test_789', metadata: { orderId: String(order.id) } },
        },
      },
      payload,
    })

    await chargeRefunded({
      event: {
        type: 'charge.refunded',
        data: {
          object: { id: 'ch_test_789', payment_intent: 'pi_test_789' },
        },
      },
      payload,
    })

    const refunded = await payload.findByID({
      collection: 'orders',
      id: order.id,
      depth: 1,
    })
    expect(refunded.status).toBe('refunded')

    const { docs } = await payload.find({
      collection: 'tickets',
      where: { order: { equals: order.id } },
      limit: 100,
    })
    expect(docs).toHaveLength(2)
    for (const ticket of docs) {
      expect(ticket.status).toBe('refunded')
    }
  })

  it('ignores charge.refunded when no order matches the payment intent', async () => {
    // No order references pi_unknown, so this must not throw or change anything.
    await expect(
      chargeRefunded({
        event: {
          type: 'charge.refunded',
          data: { object: { id: 'ch_unknown', payment_intent: 'pi_unknown' } },
        },
        payload,
      }),
    ).resolves.toBeUndefined()
  })
})
