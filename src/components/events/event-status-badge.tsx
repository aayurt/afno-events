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
        'text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] backdrop-blur-sm inline-flex items-center gap-1.5 shadow-xs',
        status === 'live' && 'bg-alpine-600 text-white font-bold',
        status === 'upcoming' && 'bg-emerald-600 dark:bg-emerald-700 text-white font-medium',
        status === 'past' && 'bg-slate-900/80 text-slate-200 dark:bg-slate-800/90 dark:text-slate-300 border border-slate-700/50',
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
