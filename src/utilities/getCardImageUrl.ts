/**
 * Returns the best image URL for list/detail cards: the generated `medium`
 * variant when available (smaller download for grids), falling back to the
 * original full-resolution URL.
 *
 * Accepts a Payload media doc (coverImage / image / organisationImage etc.)
 * or a plain URL string, and returns `null` when there is nothing usable.
 */
export function getCardImageUrl(
  media: unknown,
): string | null {
  if (!media) return null
  if (typeof media === 'string') return media

  if (typeof media === 'object') {
    const m = media as Record<string, any>
    const url = typeof m.url === 'string' ? m.url : null
    const sizes = m.sizes as Record<string, any> | undefined
    const medium = sizes?.medium as Record<string, any> | undefined
    const mediumUrl = medium && typeof medium.url === 'string' ? medium.url : null
    return mediumUrl ?? url
  }

  return null
}
