/**
 * Ticket stock accounting.
 *
 * Organisers set an optional `totalStock` per tier (e.g. 50 tickets).
 * Sales stop when stock is gone:
 *  - paid orders always consume stock
 *  - fresh pending orders hold seats for PENDING_HOLD_MS (abandoned
 *    checkouts release automatically; stale pendings never block sales)
 *  - cancelled / refunded orders consume nothing
 */

export const PENDING_HOLD_MS = 30 * 60 * 1000

export type StockTier = {
  name: string
  maxPerOrder?: number | null
  totalStock?: number | null
}

export type StockOrderLine = {
  ticketType: string
  quantity: number
}

export type StockOrderLike = {
  items?: StockOrderLine[] | null
  status?: string | null
  createdAt?: string | Date | null
}

function asQty(n: unknown): number {
  const v = typeof n === 'string' ? Number(n) : (n as number)
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0
}

export function computeTierSold(
  orders: StockOrderLike[],
  tierName: string,
  nowMs: number = Date.now(),
  holdMs: number = PENDING_HOLD_MS,
): number {
  let sold = 0
  for (const order of orders || []) {
    const items = Array.isArray(order?.items) ? order.items : []
    const qty = items.reduce(
      (sum, item) => sum + (item?.ticketType === tierName ? asQty(item?.quantity) : 0),
      0,
    )
    if (qty === 0) continue
    if (order?.status === 'paid') {
      sold += qty
    } else if (order?.status === 'pending' && order?.createdAt) {
      const age = nowMs - new Date(order.createdAt).getTime()
      if (Number.isFinite(age) && age >= 0 && age <= holdMs) sold += qty
    }
  }
  return sold
}

/** null = unlimited (organiser set no stock). Otherwise max(0, stock - sold). */
export function tierRemaining(
  stock: number | null | undefined,
  sold: number,
): number | null {
  if (stock === null || stock === undefined) return null
  const s = Number(stock)
  if (!Number.isFinite(s) || s < 0) return 0
  return Math.max(0, Math.floor(s) - Math.max(0, sold))
}

/**
 * Returns the first stock violation for an order, or null when it can proceed.
 * Stock is checked before per-order caps (remaining seats is the urgent info).
 */
export function validateOrderStock(
  tiers: StockTier[],
  items: StockOrderLine[],
  soldByTier: Record<string, number>,
): string | null {
  for (const item of items || []) {
    const qty = asQty(item?.quantity)
    if (qty === 0) continue
    const tier = (tiers || []).find((t) => t?.name === item?.ticketType)
    if (!tier) continue

    const remaining = tierRemaining(tier.totalStock, soldByTier[tier.name] ?? 0)
    if (remaining !== null && qty > remaining) {
      if (remaining === 0) return `"${tier.name}" is sold out.`
      return `Only ${remaining} left for "${tier.name}" — reduce your quantity.`
    }

    const max = Number(tier.maxPerOrder)
    if (Number.isFinite(max) && max > 0 && qty > max) {
      return `Only ${max} × "${tier.name}" allowed per order.`
    }
  }
  return null
}

export type TierAvailability = {
  name: string
  maxPerOrder: number | null
  totalStock: number | null
  sold: number
  /** null = unlimited */
  remaining: number | null
}

/** Server-side: tiers + live sales for one event. */
export async function getEventTierAvailability(
  payload: { find: (args: any) => Promise<any>; findByID: (args: any) => Promise<any> },
  eventId: number | string,
  nowMs: number = Date.now(),
): Promise<TierAvailability[]> {
  const event = await payload
    .findByID({ collection: 'events', id: eventId, depth: 0, overrideAccess: true })
    .catch(() => null)
  const tiers = (((event as any)?.pricing?.ticketTypes || []) as any[]).map((t) => ({
    name: t.name,
    maxPerOrder: t.maxPerOrder ?? null,
    totalStock: t.totalStock ?? null,
  }))

  let orders: any[] = []
  try {
    const res = await payload.find({
      collection: 'orders',
      where: { event: { equals: eventId } },
      depth: 0,
      limit: 1000,
      overrideAccess: true,
    })
    orders = res?.docs || []
  } catch {
    orders = []
  }

  return tiers.map((tier) => {
    const sold = computeTierSold(orders, tier.name, nowMs)
    return { ...tier, sold, remaining: tierRemaining(tier.totalStock, sold) }
  })
}
