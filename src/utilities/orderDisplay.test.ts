import { describe, expect, it } from 'vitest'
import { orderEventTitle } from './orderDisplay'

describe('orderEventTitle', () => {
  it('returns the event title for populated events', () => {
    expect(orderEventTitle({ id: 1, event: { id: 9, title: 'Boat Party' } as any })).toBe(
      'Boat Party',
    )
  })

  it('falls back to Order #id when the event is null (deleted/unpopulated)', () => {
    expect(orderEventTitle({ id: 28, event: null } as any)).toBe('Order #28')
  })

  it('falls back for numeric refs and missing events', () => {
    expect(orderEventTitle({ id: 28, event: 9 } as any)).toBe('Order #28')
    expect(orderEventTitle({ id: 28 } as any)).toBe('Order #28')
  })

  it('falls back when the populated event has no title', () => {
    expect(orderEventTitle({ id: 28, event: { id: 9 } as any })).toBe('Order #28')
  })
})
