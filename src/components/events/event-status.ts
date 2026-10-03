export type EventStatus = 'live' | 'upcoming' | 'past'

/**
 * Shared event-status computation (mirrors the detail hero): an event is
 * live while now is within [start, end], upcoming before start, past after end.
 */
export function getEventStatus(
  startDatetime?: string | null,
  endDatetime?: string | null,
): EventStatus | null {
  const now = new Date()
  const start = startDatetime ? new Date(startDatetime) : null
  const end = endDatetime ? new Date(endDatetime) : null
  if (start && start > now) return 'upcoming'
  if (end && end < now) return 'past'
  if (start && start <= now && (!end || end >= now)) return 'live'
  return null
}
