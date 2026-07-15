'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Minus, Plus, ExternalLink } from 'lucide-react'
import { authClient } from '@/lib/auth/client'

type TicketType = {
  name: string
  price: number
  description?: string | null
  stripePriceID?: string | null
  id?: string | null
}

export function TicketPurchase({ event }: { event: any }) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFree = event.pricing?.type === 'free'
  const hasExternalLink = !!event.pricing?.paymentExternalLink
  const ticketTypes: TicketType[] = event.pricing?.ticketTypes || []

  const total = ticketTypes.reduce((sum, tt) => {
    return sum + (quantities[tt.name] || 0) * tt.price
  }, 0)

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0)

  const updateQuantity = (name: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[name] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [name]: next }
    })
  }

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)

    try {
      const session = await authClient.getSession()
      const user = session.data?.user

      if (!user) {
        router.push(`/app/auth/login?redirect=/app/events/${event.slug || event.id}`)
        return
      }

      if (hasExternalLink) {
        window.open(event.pricing.paymentExternalLink, '_blank')
        return
      }

      if (isFree || totalTickets === 0) {
        router.push(`/app/orders/new?eventId=${event.id}`)
        return
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer: user.id,
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

      const checkoutRes = await fetch(`/api/orders/${order.doc.id}/initiate-checkout`, {
        method: 'POST',
      })

      if (!checkoutRes.ok) {
        throw new Error('Failed to initiate checkout')
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
          className="w-full rounded-xl"
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : (
            <>
              Get Tickets <ExternalLink size={16} className="ml-2" />
            </>
          )}
        </Button>
      ) : ticketTypes.length > 0 ? (
        <>
          <div className="space-y-3">
            {ticketTypes.map((tt) => (
              <div
                key={tt.name}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm">{tt.name}</p>
                  {tt.description && (
                    <p className="text-xs text-muted-foreground">{tt.description}</p>
                  )}
                  <p className="text-sm font-bold text-primary mt-1">£{tt.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQuantity(tt.name, -1)}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                    disabled={loading}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-semibold">{quantities[tt.name] || 0}</span>
                  <button
                    onClick={() => updateQuantity(tt.name, 1)}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                    disabled={loading}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalTickets > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg text-primary">£{total.toFixed(2)}</span>
            </div>
          )}

          <Button
            size="lg"
            className="w-full rounded-xl"
            onClick={handlePurchase}
            disabled={loading || totalTickets === 0}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : totalTickets === 0 ? (
              'Select Tickets'
            ) : (
              `Get Tickets${total > 0 ? ` — £${total.toFixed(2)}` : ''}`
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </>
      ) : isFree ? (
        <Button
          size="lg"
          className="w-full rounded-xl"
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Register Free'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground text-center">No tickets available</p>
      )}
    </div>
  )
}
