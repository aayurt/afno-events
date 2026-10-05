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
