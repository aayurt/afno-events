import { cn } from '@/utilities/ui'
import type { EventStatus } from './event-status'

/**
 * Shared LIVE / UPCOMING / PAST pill for event cards (same look as the
 * detail hero). Labels are passed in so both server and client callers can
 * supply their scoped translations.
 */
export function EventStatusBadge({
  status,
  labels,
  className,
}: {
  status: EventStatus | null
  labels: { live: string; upcoming: string; past: string }
  className?: string
}) {
  if (!status) return null
  return (
    <span
      className={cn(
        'text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full backdrop-blur-sm inline-flex items-center gap-1.5',
        status === 'live' && 'bg-red-500 text-white',
        status === 'upcoming' && 'bg-blue-500/85 text-white',
        status === 'past' && 'bg-muted/85 text-muted-foreground',
        className,
      )}
    >
      {status === 'live' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
        </span>
      )}
      {status === 'live' ? labels.live : status === 'upcoming' ? labels.upcoming : labels.past}
    </span>
  )
}
