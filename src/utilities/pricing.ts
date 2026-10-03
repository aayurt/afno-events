/**
 * Canonical card/display price for paid events: "From £X" based on the
 * cheapest tier, so cards read e.g. "From £5" instead of a bare number.
 * Respects a manually entered priceRange (organiser override).
 */
export function displayPriceRange(
  ticketTypes: Array<{ price?: number | null }> | null | undefined,
  manualRange?: string | null,
): string {
  if (manualRange?.trim()) return manualRange.trim()
  const prices = (ticketTypes || [])
    .map((t) => Number(t?.price))
    .filter((p) => Number.isFinite(p) && p >= 0)
  if (prices.length === 0) return 'Paid'
  const min = Math.min(...prices)
  return `From £${Number.isInteger(min) ? min : min.toFixed(2)}`
}
