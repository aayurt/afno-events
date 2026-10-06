/**
 * Display title for an order's event.
 * The event ref can be null (deleted / failed depth-population) — and
 * `typeof null === 'object'`, so naive typeof checks crash on `.title`.
 * Centralised + unit-tested after it took down the profile page once.
 */
export function orderEventTitle(order: { id: number | string; event?: unknown }): string {
  const event = order?.event
  if (event !== null && typeof event === 'object') {
    const title = (event as Record<string, unknown>).title
    if (typeof title === 'string' && title) return title
  }
  return `Order #${order?.id}`
}
