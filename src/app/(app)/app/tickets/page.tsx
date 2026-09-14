'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Ticket as TicketIcon, Calendar, MapPin, ChevronRight, LogIn } from 'lucide-react'
import { useScopedI18n } from '@/locales/client'
import { cn } from '@/utilities/ui'
import {
  type TicketDoc,
  type TicketFilter,
  TICKET_FILTERS,
  matchesFilter,
  statusBadgeClasses,
  shortCode,
  eventTitle,
  eventDateLabel,
  eventLocationLabel,
  eventImageUrl,
} from './ticket-data'

const STATUS_KEYS = {
  unused: 'statusUnused',
  'checked-in': 'statusCheckedIn',
  cancelled: 'statusCancelled',
  refunded: 'statusRefunded',
  transferred: 'statusTransferred',
  expired: 'statusExpired',
} as const

function TicketCard({ ticket, t }: { ticket: TicketDoc; t: (key: any) => string }) {
  const img = eventImageUrl(ticket)
  const statusLabel = t(STATUS_KEYS[ticket.status])

  return (
    <Link href={`/app/tickets/${ticket.id}`} className="block">
      <Card className="group overflow-hidden hover:shadow-xl transition-all border-border rounded-2xl">
        <CardContent className="p-0">
          <div className="flex">
            {img && (
              <div className="relative w-28 sm:w-36 shrink-0 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full min-h-[130px] object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0 p-4 sm:p-5 flex items-center">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold truncate group-hover:text-primary transition-colors">
                    {eventTitle(ticket)}
                  </p>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full shrink-0 capitalize',
                      statusBadgeClasses[ticket.status] || 'bg-muted text-muted-foreground',
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
                {eventDateLabel(ticket) && (
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                    <Calendar size={13} className="shrink-0" />
                    <span className="truncate">{eventDateLabel(ticket)}</span>
                  </p>
                )}
                {eventLocationLabel(ticket) && (
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">{eventLocationLabel(ticket)}</span>
                  </p>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <TicketIcon size={13} className="text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">#{shortCode(ticket.code)}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 ml-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function MyTicketsPage() {
  const t = useScopedI18n('tickets')
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<TicketDoc[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TicketFilter>('all')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/my-tickets', { credentials: 'include' })
      if (!res.ok) {
        setError(`Failed to load tickets (${res.status})`)
        return
      }
      const data = await res.json()
      setTickets(data.docs || [])
      setError(null)
    } catch {
      setError('Could not load your tickets. Please try again.')
    }
  }, [])

  useEffect(() => {
    async function init() {
      const result = await authClient.getSession()
      setSession(result.data?.user ?? null)
      if (result.data?.user) await load()
      setLoading(false)
    }
    init()
  }, [load])

  if (loading) {
    return (
      <div className="container py-12 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <TicketIcon size={48} className="mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('signInRequired')}</h1>
            <p className="text-muted-foreground">{t('signInDescription')}</p>
          </div>
          <Link href="/app/auth/login?redirect=/app/tickets">
            <Button size="lg" className="w-full gap-2">
              <LogIn size={16} /> {t('signIn')}
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const filtered = tickets.filter((tk) => matchesFilter(filter, tk.status))
  const countFor = (f: TicketFilter) => tickets.filter((tk) => matchesFilter(f, tk.status)).length

  return (
    <div className="container py-12 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {tickets.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {TICKET_FILTERS.map((f) => {
            const isActive = filter === f
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {t(f)} ({countFor(f)})
              </button>
            )
          })}
        </div>
      )}

      {!error && tickets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <TicketIcon size={28} className="text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{t('noTickets')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('noTicketsDesc')}</p>
            </div>
            <Link href="/app/events">
              <Button className="gap-2">
                {t('browseEvents')} <ChevronRight size={16} />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <p>{t('noFilteredTickets')}</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((tk) => <TicketCard key={tk.id} ticket={tk} t={t as any} />)
          )}
        </div>
      )}
    </div>
  )
}
