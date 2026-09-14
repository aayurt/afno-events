'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Ticket as TicketIcon, Calendar, MapPin, LogIn } from 'lucide-react'
import { useScopedI18n } from '@/locales/client'
import { cn } from '@/utilities/ui'
import {
  type TicketDoc,
  statusBadgeClasses,
  eventTitle,
  eventDateLabel,
  eventLocationLabel,
  orderId,
} from '../ticket-data'

const STATUS_KEYS = {
  unused: 'statusUnused',
  'checked-in': 'statusCheckedIn',
  cancelled: 'statusCancelled',
  refunded: 'statusRefunded',
  transferred: 'statusTransferred',
  expired: 'statusExpired',
} as const

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>()
  const t = useScopedI18n('tickets')
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<TicketDoc | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const result = await authClient.getSession()
      const user = result.data?.user ?? null
      if (cancelled) return
      setSession(user)
      if (user) {
        try {
          // Only ever loads from the user's own tickets (paid orders), so a
          // ticket id that isn't theirs simply doesn't match.
          const res = await fetch('/api/my-tickets', { credentials: 'include' })
          if (!res.ok) {
            if (!cancelled) setError(`Failed to load ticket (${res.status})`)
          } else {
            const data = await res.json()
            const match = (data.docs || []).find(
              (d: any) => String(d.id) === String(params.id),
            )
            if (!cancelled) {
              if (match) setTicket(match)
              else setError('Ticket not found')
            }
          }
        } catch {
          if (!cancelled) setError('Could not load this ticket.')
        }
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="container py-12 flex justify-center">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-[560px] w-full rounded-2xl" />
        </div>
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
          <div className="pt-2" />
          <Link href="/app/auth/login?redirect=/app/tickets">
            <Button size="lg" className="w-full gap-2">
              <LogIn size={16} /> {t('signIn')}
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-4">
          <TicketIcon size={48} className="mx-auto text-muted-foreground" />
          <p className="font-semibold">{error || t('notFound')}</p>
          <Link href="/app/tickets">
            <Button variant="outline" className="gap-1.5">
              <ArrowLeft size={16} /> {t('backToTickets')}
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const oid = orderId(ticket)
  const statusLabel = t(STATUS_KEYS[ticket.status])

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/app/tickets">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft size={16} /> {t('backToTickets')}
          </Button>
        </Link>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <Card className="overflow-hidden rounded-3xl border-border shadow-brand-lg">
            {/* Event header */}
            <div className="bg-secondary text-secondary-foreground px-6 py-6 text-center space-y-2">
              <p className="text-lg sm:text-xl font-bold leading-snug">{eventTitle(ticket)}</p>
              {eventDateLabel(ticket) && (
                <p className="text-sm text-secondary-foreground/80 flex items-center justify-center gap-1.5">
                  <Calendar size={14} /> {eventDateLabel(ticket)}
                </p>
              )}
              {eventLocationLabel(ticket) && (
                <p className="text-xs text-secondary-foreground/70 flex items-center justify-center gap-1.5">
                  <MapPin size={12} /> {eventLocationLabel(ticket)}
                </p>
              )}
            </div>

            {/* QR body */}
            <div className="px-6 pt-8 pb-6 flex flex-col items-center space-y-4">
              <div className="rounded-2xl bg-white p-4 border border-border">
                <QRCodeSVG value={ticket.code} size={200} fgColor="#0a2559" />
              </div>
              <p className="font-mono font-semibold text-secondary tracking-[0.2em] uppercase break-all text-center">
                {ticket.code}
              </p>
              <span
                className={cn(
                  'text-xs px-3 py-1 rounded-full capitalize',
                  statusBadgeClasses[ticket.status] || 'bg-muted text-muted-foreground',
                )}
              >
                {statusLabel}
              </span>
            </div>

            {/* Dashed separator with notches */}
            <div className="px-6">
              <div className="relative border-t-2 border-dashed border-border">
                <span className="absolute -left-4 -top-3 w-6 h-6 rounded-full bg-background border border-border" />
                <span className="absolute -right-4 -top-3 w-6 h-6 rounded-full bg-background border border-border" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 bg-muted/40 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('order')}</span>
                <span className="font-semibold">#{oid ?? '—'}</span>
              </div>
              {ticket.attendeeName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('attendee')}</span>
                  <span className="font-semibold">{ticket.attendeeName}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center pt-3">
                {t('presentQr')}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
