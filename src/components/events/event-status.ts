export type EventStatus = 'live' | 'upcoming' | 'past'

const MS_DAY = 24 * 60 * 60 * 1000

/**
 * Shared event-status computation (mirrors the detail hero and CountdownChip):
 * an event is live while now is within [start, end], upcoming before start,
 * past after end. Events without an end time are treated as single-day events
 * — past once 24h after start (otherwise last week's events would show "live"
 * forever).
 */
export function getEventStatus(
  startDatetime?: string | null,
  endDatetime?: string | null,
  now: Date = new Date(),
): EventStatus | null {
  const start = startDatetime ? new Date(startDatetime) : null
  const end = endDatetime ? new Date(endDatetime) : null
  if (start && start > now) return 'upcoming'
  if (end) {
    if (end < now) return 'past'
  } else if (start && now.getTime() >= start.getTime() + MS_DAY) {
    return 'past'
  }
  if (start && start <= now) return 'live'
  return null
}
