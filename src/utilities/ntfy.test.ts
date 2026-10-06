import { describe, expect, it } from 'vitest'
import { formatPurchaseTime, publishNtfy, sanitizeNtfyHeader } from './ntfy'

describe('formatPurchaseTime', () => {
  it('formats in UK time with a label', () => {
    expect(formatPurchaseTime('2026-10-05T13:00:00Z')).toBe('5 Oct 2026, 14:00 UK')
  })

  it('falls back to ISO on garbage input', () => {
    const out = formatPurchaseTime('not-a-date')
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
  })
})

describe('sanitizeNtfyHeader', () => {
  it('converts em dashes and other non-Latin1 to safe ASCII', () => {
    expect(sanitizeNtfyHeader('New ticket purchase — Maan Ko Raja')).toBe(
      'New ticket purchase - Maan Ko Raja',
    )
    expect(sanitizeNtfyHeader('2 × GA')).toBe('2 x GA')
  })

  it('output is always header-safe (regression: ByteString throw)', () => {
    const out = sanitizeNtfyHeader('— š ž —')
    expect(() => new Headers({ Title: out })).not.toThrow()
    expect(/^[\x20-\x7E]*$/.test(out)).toBe(true)
  })
})
describe('publishNtfy', () => {
  it('skips silently without env and never throws', async () => {
    const prev = { ...process.env }
    delete process.env.NTFY_URL
    delete process.env.NTFY_TOPIC
    delete process.env.NTFY_TOKEN
    await expect(publishNtfy({ title: 't', message: 'm' })).resolves.toBe(false)
    process.env = prev
  })
})
