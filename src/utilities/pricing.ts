/**
 * Canonical card/display price for paid events: "From £X" based on the
 * cheapest tier, so cards read e.g. "From £5" instead of a bare number.
 * Respects a manually entered priceRange (organiser override).
 */
export function displayPriceRange(
  ticketTypes: Array<{ price?: number | null }> | null | undefined,
  manualRange?: string | null,
): string {
  // If actual ticket types exist, compute the real minimum price so card doesn't
  // show stale manual strings (e.g. "£5+" when tickets are actually £15).
  const validPrices = (ticketTypes || [])
    .map((t) => Number(t?.price))
    .filter((p) => Number.isFinite(p) && p >= 0)

  if (validPrices.length > 0) {
    const min = Math.min(...validPrices)
    const formatted = Number.isInteger(min) ? String(min) : min.toFixed(2)
    return `From £${formatted}`
  }

  if (manualRange?.trim()) return manualRange.trim()
  return 'Paid'
}
