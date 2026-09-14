export type TicketStatus =
  | 'unused'
  | 'checked-in'
  | 'cancelled'
  | 'refunded'
  | 'transferred'
  | 'expired'

export type TicketDoc = {
  id: number
  code: string
  status: TicketStatus
  checkedInAt?: string
  attendeeName?: string | null
  attendeeEmail?: string | null
  createdAt?: string
  order?: any
  event?: any
}

export type TicketFilter = 'all' | 'upcoming' | 'used' | 'cancelled'

export const TICKET_FILTERS: TicketFilter[] = ['all', 'upcoming', 'used', 'cancelled']

export const matchesFilter = (filter: TicketFilter, status: string): boolean => {
  switch (filter) {
    case 'all':
      return true
    case 'upcoming':
      return status === 'unused'
    case 'used':
      return status === 'checked-in'
    case 'cancelled':
      return (
        status === 'cancelled' ||
        status === 'refunded' ||
        status === 'transferred' ||
        status === 'expired'
      )
  }
}

/** Tailwind classes per ticket status, used by chips/badges across pages. */
export const statusBadgeClasses: Record<TicketStatus, string> = {
  unused: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'checked-in': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  transferred: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  expired: 'bg-muted text-muted-foreground',
}

export const shortCode = (code: string): string =>
  code.length >= 8 ? code.slice(0, 8).toUpperCase() : code.toUpperCase()

export const eventTitle = (ticket: TicketDoc): string => {
  if (typeof ticket.event === 'object' && ticket.event?.title) return ticket.event.title
  return `Ticket #${ticket.id}`
}

export const eventSlug = (ticket: TicketDoc): string | null => {
  if (typeof ticket.event === 'object' && ticket.event) {
    const ev = ticket.event
    const id = ev.slug || ev.id
    return id != null ? String(id) : null
  }
  return null
}

/** Formats a ticket's event date/time. Respects the event timezone when set. */
export const eventDateLabel = (ticket: TicketDoc): string => {
  const ev = typeof ticket.event === 'object' ? ticket.event : null
  const raw = ev?.startDatetime
  if (!raw) return ''
  const date = new Date(raw)
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  if (ev?.timezone) opts.timeZone = ev.timezone
  return date.toLocaleString('en-GB', opts)
}

export const eventLocationLabel = (ticket: TicketDoc): string => {
  const ev = typeof ticket.event === 'object' ? ticket.event : null
  const loc = ev?.location
  if (loc && typeof loc === 'object' && loc.location) return loc.location
  return ''
}

export const orderId = (ticket: TicketDoc): number | null => {
  if (typeof ticket.order === 'object' && ticket.order?.id != null) {
    return typeof ticket.order.id === 'number' ? ticket.order.id : parseInt(String(ticket.order.id), 10)
  }
  if (typeof ticket.order === 'number') return ticket.order
  if (typeof ticket.order === 'string') return parseInt(ticket.order, 10)
  return null
}

export const eventImageUrl = (ticket: TicketDoc): string | null => {
  const ev = typeof ticket.event === 'object' ? ticket.event : null
  const cover = ev?.coverImage
  if (!cover) return null
  if (typeof cover === 'string') return cover
  if (typeof cover === 'object') {
    const c = cover as Record<string, any>
    const url = typeof c.url === 'string' ? c.url : null
    const sizes = c.sizes as Record<string, any> | undefined
    const medium = sizes?.medium as Record<string, any> | undefined
    const mediumUrl = medium && typeof medium.url === 'string' ? medium.url : null
    return mediumUrl ?? url
  }
  return null
}
