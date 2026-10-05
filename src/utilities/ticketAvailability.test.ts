import { describe, expect, it } from 'vitest'
import {
  PENDING_HOLD_MS,
  computeTierSold,
  hasActiveOrder,
  tierRemaining,
  validateOrderStock,
} from './ticketAvailability'

const MIN = 60 * 1000
const NOW = new Date('2026-10-03T12:00:00Z').getTime()

describe('computeTierSold', () => {
  it('counts paid orders in full', () => {
    const sold = computeTierSold(
      [{ items: [{ ticketType: 'GA', quantity: 30 }], status: 'paid' }],
      'GA',
      NOW,
    )
    expect(sold).toBe(30)
  })

  it('counts fresh pending orders (seat hold)', () => {
    const sold = computeTierSold(
      [
        {
          items: [{ ticketType: 'GA', quantity: 5 }],
          status: 'pending',
          createdAt: new Date(NOW - 10 * MIN).toISOString(),
        },
      ],
      'GA',
      NOW,
    )
    expect(sold).toBe(5)
  })

  it('ignores stale pending orders past the hold window', () => {
    const sold = computeTierSold(
      [
        {
          items: [{ ticketType: 'GA', quantity: 5 }],
          status: 'pending',
          createdAt: new Date(NOW - PENDING_HOLD_MS - MIN).toISOString(),
        },
      ],
      'GA',
      NOW,
    )
    expect(sold).toBe(0)
  })

  it('ignores cancelled and refunded orders', () => {
    const sold = computeTierSold(
      [
        { items: [{ ticketType: 'GA', quantity: 7 }], status: 'cancelled' },
        { items: [{ ticketType: 'GA', quantity: 3 }], status: 'refunded' },
      ],
      'GA',
      NOW,
    )
    expect(sold).toBe(0)
  })

  it('only counts the matching tier and sums across orders', () => {
    const sold = computeTierSold(
      [
        { items: [{ ticketType: 'GA', quantity: 10 }], status: 'paid' },
        { items: [{ ticketType: 'VIP', quantity: 99 }], status: 'paid' },
        {
          items: [
            { ticketType: 'GA', quantity: 4 },
            { ticketType: 'VIP', quantity: 1 },
          ],
          status: 'paid',
        },
      ],
      'GA',
      NOW,
    )
    expect(sold).toBe(14)
  })

  it('treats missing items and junk quantities as zero', () => {
    expect(computeTierSold([{ status: 'paid' } as any], 'GA', NOW)).toBe(0)
    expect(
      computeTierSold(
        [{ items: [{ ticketType: 'GA', quantity: NaN }], status: 'paid' }],
        'GA',
        NOW,
      ),
    ).toBe(0)
  })
})

describe('hasActiveOrder', () => {
  const orders = [
    { buyer: 7, status: 'paid' },
    { buyer: 8, status: 'pending' },
    { buyer: 9, status: 'cancelled' },
    { buyer: 10, status: 'refunded' },
  ]

  it('finds paid and pending orders by the same buyer', () => {
    expect(hasActiveOrder(orders, 7)).toBe(true)
    expect(hasActiveOrder(orders, 8)).toBe(true)
  })

  it('ignores cancelled, refunded and other buyers', () => {
    expect(hasActiveOrder(orders, 9)).toBe(false)
    expect(hasActiveOrder(orders, 10)).toBe(false)
    expect(hasActiveOrder(orders, 999)).toBe(false)
  })

  it('matches numeric-string buyer ids (Better Auth serials)', () => {
    expect(hasActiveOrder([{ buyer: '7', status: 'paid' }], 7)).toBe(true)
    expect(hasActiveOrder(orders, '8' as any)).toBe(true)
  })
})

describe('tierRemaining', () => {
  it('returns null (unlimited) when stock is not set', () => {
    expect(tierRemaining(null, 40)).toBeNull()
    expect(tierRemaining(undefined, 40)).toBeNull()
  })

  it('subtracts sold and clamps at zero', () => {
    expect(tierRemaining(50, 30)).toBe(20)
    expect(tierRemaining(50, 50)).toBe(0)
    expect(tierRemaining(50, 80)).toBe(0)
  })
})

describe('validateOrderStock', () => {
  const tiers = [{ name: 'GA', maxPerOrder: 4, totalStock: 50 }]

  it('accepts an order within limits', () => {
    expect(
      validateOrderStock(tiers, [{ ticketType: 'GA', quantity: 4 }], { GA: 30 }),
    ).toBeNull()
  })

  it('rejects quantities above maxPerOrder', () => {
    expect(validateOrderStock(tiers, [{ ticketType: 'GA', quantity: 5 }], { GA: 0 })).toMatch(
      /only 4/i,
    )
  })

  it('rejects quantities above remaining stock (the 50-ticket case)', () => {
    // 30 already sold of 50 → only 20 left, asking 25 must fail
    expect(
      validateOrderStock(tiers, [{ ticketType: 'GA', quantity: 25 }], { GA: 30 }),
    ).toMatch(/20 left/i)
  })

  it('accepts the exact remaining amount', () => {
    expect(
      validateOrderStock(
        [{ name: 'GA', totalStock: 50 }],
        [{ ticketType: 'GA', quantity: 20 }],
        { GA: 30 },
      ),
    ).toBeNull()
  })

  it('treats tiers without stock as unlimited', () => {
    expect(
      validateOrderStock([{ name: 'GA' }], [{ ticketType: 'GA', quantity: 500 }], {}),
    ).toBeNull()
  })
})
