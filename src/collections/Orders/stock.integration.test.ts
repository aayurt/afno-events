import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { unlink } from 'node:fs/promises'
import { buildConfig, getPayload, type Payload } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { Orders } from './index'
import { Tickets } from '../Tickets/index'

// End-to-end oversell protection through the real Orders collection hooks:
// a 50-ticket tier must refuse the order that would take sales past 50.
//
// File-backed temp DB: the repo's other integration suite shares the
// default in-memory handle, so a second memory DB collides with it.
const DB_PATH = '/tmp/afno-stock-test.db'
const testConfig = buildConfig({
  secret: 'test-secret-stock',
  db: sqliteAdapter({
    client: { url: `file:${DB_PATH}` },
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
        { name: 'limitOneOrderPerAccount', type: 'checkbox', defaultValue: false },
        {
          name: 'pricing',
          type: 'group',
          fields: [
            {
              name: 'ticketTypes',
              type: 'array',
              fields: [
                { name: 'name', type: 'text' },
                { name: 'price', type: 'number' },
                { name: 'maxPerOrder', type: 'number' },
                { name: 'totalStock', type: 'number' },
              ],
            },
          ],
        },
      ],
    },
    Orders,
    Tickets,
  ],
})

let payload: Payload
let buyerId: number
let eventId: number

beforeAll(async () => {
  payload = await getPayload({ config: testConfig })

  const user = await payload.create({
    collection: 'users',
    data: { email: 'stock-buyer@example.com', password: 'password123', name: 'Buyer' } as any,
    overrideAccess: true,
  })
  buyerId = user.id

  const event = await payload.create({
    collection: 'events',
    data: {
      title: 'Stock Test Gig',
      pricing: {
        // No per-order cap here: this suite isolates TOTAL stock (caps are
        // covered by the unit tests).
        ticketTypes: [{ name: 'GA', price: 10, maxPerOrder: null, totalStock: 50 }],
      },
    } as any,
    overrideAccess: true,
  })
  eventId = event.id
})

afterAll(async () => {
  await payload.destroy()
  await unlink(DB_PATH).catch(() => {})
})

async function createOrder(qty: number, status = 'pending') {
  return payload.create({
    collection: 'orders',
    data: {
      buyer: buyerId,
      event: eventId,
      totalAmount: qty * 10,
      status,
      items: [{ ticketType: 'GA', quantity: qty, price: 10 }],
    } as any,
    overrideAccess: true,
  })
}

describe('50-ticket tier end to end', () => {
  it('sells the first 30 tickets', async () => {
    const order = await createOrder(30, 'paid')
    expect(order.id).toBeDefined()
  })

  it('refuses the order that would oversell (25 more, only 20 left)', async () => {
    await expect(createOrder(25, 'paid')).rejects.toThrow(/20 left/i)
  })

  it('sells exactly the remaining 20', async () => {
    const order = await createOrder(20, 'paid')
    expect(order.id).toBeDefined()
  })

  it('is sold out afterwards', async () => {
    await expect(createOrder(1, 'paid')).rejects.toThrow(/sold out|0 left/i)
  })
})

describe('free tier stock + one order per account', () => {
  let freeEventId: number
  let otherBuyerId: number

  beforeAll(async () => {
    const other = await payload.create({
      collection: 'users',
      data: { email: 'stock-buyer-2@example.com', password: 'password123' } as any,
      overrideAccess: true,
    })
    otherBuyerId = other.id

    const event = await payload.create({
      collection: 'events',
      data: {
        title: 'Free Stock Gig',
        limitOneOrderPerAccount: true,
        pricing: {
          ticketTypes: [{ name: 'Free Admission', price: 0, maxPerOrder: 2, totalStock: 2 }],
        },
      } as any,
      overrideAccess: true,
    })
    freeEventId = event.id
  })

  async function createFreeOrder(qty: number, buyer: number, status = 'pending') {
    return payload.create({
      collection: 'orders',
      data: {
        buyer,
        event: freeEventId,
        totalAmount: 0,
        status,
        items: [{ ticketType: 'Free Admission', quantity: qty, price: 0 }],
      } as any,
      overrideAccess: true,
    })
  }

  it('enforces stock on the free tier (2 available)', async () => {
    await expect(createFreeOrder(3, otherBuyerId)).rejects.toThrow(/2 left/i)
    const order = await createFreeOrder(2, otherBuyerId)
    expect(order.id).toBeDefined()
  })

  it('rejects a second order from the same account', async () => {
    await expect(createFreeOrder(1, otherBuyerId)).rejects.toThrow(/already.*order/i)
  })

  it('lets a different account order', async () => {
    // Fresh event so stock is untouched; one-order rule is per account.
    const event = await payload.create({
      collection: 'events',
      data: {
        title: 'Free Stock Gig 2',
        limitOneOrderPerAccount: true,
        pricing: { ticketTypes: [{ name: 'Free Admission', price: 0 }] },
      } as any,
      overrideAccess: true,
    })
    const order = await payload.create({
      collection: 'orders',
      data: {
        buyer: buyerId,
        event: event.id,
        totalAmount: 0,
        status: 'pending',
        items: [{ ticketType: 'Free Admission', quantity: 1, price: 0 }],
      } as any,
      overrideAccess: true,
    })
    expect(order.id).toBeDefined()
  })
})
