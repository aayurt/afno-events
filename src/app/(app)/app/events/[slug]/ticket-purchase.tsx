'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Minus, Plus, ExternalLink } from 'lucide-react'
import { authClient } from '@/lib/auth/client'
import { useScopedI18n } from '@/locales/client'

type TicketType = {
  name: string
  price: number
  description?: string | null
  stripePriceID?: string | null
  maxPerOrder?: number | null
  totalStock?: number | null
  id?: string | null
}

export type TierAvailabilityInfo = {
  name: string
  /** null = unlimited */
  remaining: number | null
}

export function TicketPurchase({
  event,
  availability,
}: {
  event: any
  availability?: TierAvailabilityInfo[]
}) {
  const t = useScopedI18n('eventDetail')
  const router = useRouter()
  const ticketTypes: TicketType[] = event.pricing?.ticketTypes || []

  const remainingFor = (name: string): number | null => {
    const found = (availability || []).find((a) => a.name === name)
    // No availability info (older callers): fall back to the tier's own
    // stock as unlimited — enforcement still happens server-side.
    return found ? found.remaining : null
  }
  const effectiveMax = (tt: TicketType): number | null => {
    const perOrder = tt.maxPerOrder && tt.maxPerOrder > 0 ? tt.maxPerOrder : null
    const remaining = remainingFor(tt.name)
    if (perOrder !== null && remaining !== null) return Math.min(perOrder, remaining)
    return perOrder ?? remaining
  }

  // Default to 1 of the first tier that still has stock.
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const first = ticketTypes.find((tt) => {
      const r = remainingFor(tt.name)
      return r === null || r > 0
    })
    return first?.name ? { [first.name]: 1 } : {}
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFree = event.pricing?.type === 'free'
  const hasExternalLink = !!event.pricing?.paymentExternalLink

  const total = ticketTypes.reduce((sum, tt) => {
    return sum + (quantities[tt.name] || 0) * tt.price
  }, 0)

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0)

  const updateQuantity = (name: string, delta: number) => {
    const tier = ticketTypes.find((tt) => tt.name === name)
    const max = tier ? effectiveMax(tier) : null
    setQuantities((prev) => {
      const current = prev[name] || 0
      let next = Math.max(0, current + delta)
      if (max !== null) next = Math.min(next, max)
      return { ...prev, [name]: next }
    })
  }

  const allSoldOut =
    ticketTypes.length > 0 &&
    ticketTypes.every((tt) => remainingFor(tt.name) === 0)

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)

    try {
      // External-link events sell tickets elsewhere (Eventbrite, Ticketmaster,
      // etc.) — send the user straight to that link instead of a Stripe order.
      if (hasExternalLink) {
        window.location.href = event.pricing?.paymentExternalLink
        return
      }

      const session = await authClient.getSession()
      const user = session.data?.user

      if (!user) {
        router.push(`/app/auth/login?redirect=/app/events/${event.slug || event.id}`)
        return
      }

      const buyerID = Number((user as { id?: unknown }).id)
      if (!Number.isInteger(buyerID)) {
        throw new Error('Could not determine your account. Please sign out and sign in again.')
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer: buyerID,
          event: event.id,
          totalAmount: total,
          status: 'pending',
          items: ticketTypes
            .filter((tt) => (quantities[tt.name] || 0) > 0)
            .map((tt) => ({
              ticketType: tt.name,
              quantity: quantities[tt.name],
              price: tt.price,
            })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.errors?.[0]?.message || 'Failed to create order')
      }

      const order = await res.json()

      const checkoutRes = await fetch(`/api/orders/${order.doc.id}/checkout-session`, {
        method: 'POST',
      })

      if (!checkoutRes.ok) {
        const err = await checkoutRes.json().catch(() => null)
        throw new Error(err?.error || 'Failed to initiate checkout')
      }

      const { url } = await checkoutRes.json()
      if (url) {
        window.location.href = url
      } else {
        router.push(`/app/orders/${order.doc.id}/success`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {hasExternalLink ? (
        <Button
          size="lg"
          className="w-full rounded-full"
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : (
            <>
              {t('getTickets')} <ExternalLink size={16} className="ml-2" />
            </>
          )}
        </Button>
      ) : ticketTypes.length > 0 ? (
        <>
          {allSoldOut && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="font-bold">Sold out</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                All tickets for this event have been sold.
              </p>
            </div>
          )}
          <div className="border border-border rounded-2xl divide-y divide-border bg-card overflow-hidden">
            {ticketTypes.map((tt) => {
              const q = quantities[tt.name] || 0
              const max = effectiveMax(tt)
              const atMax = max !== null && q >= max
              const remaining = remainingFor(tt.name)
              const soldOut = remaining === 0
              return (
              <div key={tt.name} className={`flex items-center justify-between gap-3 p-3.5 ${soldOut ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm tracking-tight">{tt.name}</p>
                  {tt.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{tt.description}</p>
                  )}
                  <p className="text-sm font-bold text-primary mt-1">£{tt.price}</p>
                  {soldOut ? (
                    <p className="text-[11px] font-bold text-destructive mt-0.5">Sold out</p>
                  ) : (
                    <>
                      {tt.maxPerOrder && tt.maxPerOrder > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">Max {tt.maxPerOrder} per order</p>
                      )}
                      {remaining !== null && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">Only {remaining} left</p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1 shrink-0">
                  <button
                    onClick={() => updateQuantity(tt.name, -1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={loading || q === 0}
                    aria-label={`Remove one ${tt.name}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{q}</span>
                  <button
                    onClick={() => updateQuantity(tt.name, 1)}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={loading || atMax || soldOut}
                    aria-label={`Add one ${tt.name}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              )
            })}
          </div>

          {totalTickets > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-semibold">{t('total')}</span>
              <span className="font-bold text-lg text-primary">£{total.toFixed(2)}</span>
            </div>
          )}

          <Button
            size="lg"
            className="w-full rounded-full"
            onClick={handlePurchase}
            disabled={loading || totalTickets === 0}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : totalTickets === 0 ? (
              t('selectTickets')
            ) : (
              `${t('getTickets')}${total > 0 ? ` — £${total.toFixed(2)}` : ''}`
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </>
      ) : isFree ? (
        <Button
          size="lg"
          className="w-full rounded-full"
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : t('registerFree')}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground text-center">{t('noTickets')}</p>
      )}
    </div>
  )
}
