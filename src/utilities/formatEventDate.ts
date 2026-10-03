/**
 * Single place for rendering event instants.
 *
 * DB stores UTC ISO strings; every event also carries a `timezone`
 * (default Europe/London). Rendering in the EVENT's timezone with an
 * abbreviation ("6:00 pm BST") keeps SSR/client output identical (no
 * hydration flicker) and is unambiguous for fans in other zones — instead of
 * silently converting to whatever the viewer's device thinks.
 * When no timezone is stored we fall back to the viewer's locale zone.
 */

function tzAbbr(iso: string, timeZone?: string | null): string | null {
  if (!timeZone) return null
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(new Date(iso))
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? null
  } catch {
    return null
  }
}

export function formatEventDate(
  iso: string | null | undefined,
  timeZone?: string | null,
): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  })
}

export function formatEventDateLong(
  iso: string | null | undefined,
  timeZone?: string | null,
): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  })
}

export function formatEventTime(
  iso: string | null | undefined,
  timeZone?: string | null,
  opts?: { withAbbr?: boolean },
): string {
  if (!iso) return ''
  const time = new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  })
  if (opts?.withAbbr) {
    const abbr = tzAbbr(iso, timeZone)
    return abbr ? `${time} ${abbr}` : time
  }
  return time
}
