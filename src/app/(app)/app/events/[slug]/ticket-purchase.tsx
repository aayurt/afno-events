'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Loader2, Minus, Plus, ExternalLink, TicketCheck, Ban, Lock, User, AlertCircle, ArrowRight } from 'lucide-react'
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
  const [alreadyOrdered, setAlreadyOrdered] = useState(false)

  // Guest checkout modal state
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // One order per account: if this account already holds a live order,
  // replace the buy box (server still enforces as backstop).
  useEffect(() => {
    if (!event.limitOneOrderPerAccount) return
    let active = true
    ;(async () => {
      try {
        const session = await authClient.getSession()
        const user = session.data?.user
        const buyerID = Number((user as { id?: unknown } | undefined)?.id)
        if (!user || !Number.isInteger(buyerID)) return
        const params = new URLSearchParams({
          'where[event][equals]': String(event.id),
          'where[buyer][equals]': String(buyerID),
          limit: '5',
          depth: '0',
        })
        const res = await fetch(`/api/orders?${params}`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const hasLive = (data?.docs || []).some(
          (o: any) => o?.status === 'paid' || o?.status === 'pending',
        )
        if (active && hasLive) {
          setAlreadyOrdered(true)
          setQuantities({})
        }
      } catch {}
    })()
    return () => {
      active = false
    }
  }, [event.id, event.limitOneOrderPerAccount])

  const isFree = event.pricing?.type === 'free'
  const hasExternalLink = !!event.pricing?.paymentExternalLink

  const total = ticketTypes.reduce((sum, tt) => {
    return sum + (quantities[tt.name] || 0) * tt.price
  }, 0)

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0)

  const updateQuantity = (name: string, delta: number) => {
    const tier = ticketTypes.find((tt) => tt.name === name)
    const max = tier ? effectiveMax(tier) : null
    // One order per account events are single-ticket: cap the ORDER total at 1.
    const singleTicket = Boolean(event.limitOneOrderPerAccount)
    setQuantities((prev) => {
      const current = prev[name] || 0
      let next = Math.max(0, current + delta)
      if (max !== null) next = Math.min(next, max)
      if (singleTicket && delta > 0) {
        const others = Object.entries(prev).reduce(
          (sum, [k, v]) => sum + (k === name ? 0 : v || 0),
          0,
        )
        next = Math.min(next, Math.max(0, 1 - others))
      }
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
        setAuthModalOpen(true)
        setLoading(false)
        return
      }

      const buyerID = Number((user as { id?: unknown }).id)
      if (!Number.isInteger(buyerID)) {
        setAuthModalOpen(true)
        setLoading(false)
        return
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
        if (res.status === 401) {
          setAuthModalOpen(true)
          setLoading(false)
          return
        }
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

  const handleModalAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)

    try {
      if (authMode === 'signin') {
        const res = await authClient.signIn.email({
          email: authEmail,
          password: authPassword,
        })
        if ((res as any)?.error) {
          throw new Error((res as any).error?.message || 'Invalid email or password')
        }
      } else {
        const res = await authClient.signUp.email({
          email: authEmail,
          password: authPassword,
          name: authName.trim() || 'Attendee',
        })
        if ((res as any)?.error) {
          throw new Error((res as any).error?.message || 'Failed to create account')
        }
      }

      setAuthModalOpen(false)
      // Automatically proceed with purchase now that user is logged in
      setTimeout(() => {
        handlePurchase()
      }, 300)
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  // Booking paused by the organiser: no quantity steppers, no buy button.
  // (Server-side Orders hook enforces this too — this is the visible state.)
  if (event.isBookable === false) {
    return (
      <div className="space-y-4">
        <div className="rounded-[8px] border border-muted bg-white/70 dark:bg-slate-800/70 p-4 text-center space-y-3 shadow-xs">
          <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Ban size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm">{t('bookingPaused')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('bookingPausedDesc')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {alreadyOrdered ? (
        <div className="rounded-[8px] border border-alpine-500/30 bg-white/70 dark:bg-slate-800/70 p-4 text-center space-y-3 shadow-xs">
          <div className="mx-auto w-10 h-10 rounded-full bg-alpine-500/10 flex items-center justify-center">
            <TicketCheck size={20} className="text-alpine-600" />
          </div>
          <div>
            <p className="font-bold text-sm">You&apos;re already booked</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              One order per account for this event.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-[4px] border-alpine-500/30 font-mono text-xs uppercase tracking-wider"
            onClick={() => router.push('/app/tickets')}
          >
            View my tickets
          </Button>
        </div>
      ) : hasExternalLink ? (
        <Button
          size="lg"
          className="w-full rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white font-mono text-xs uppercase tracking-wider shadow-sm"
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
          {event.limitOneOrderPerAccount && !allSoldOut && (
            <p className="text-xs text-muted-foreground text-center font-mono">
              Limit: 1 ticket per account for this event.
            </p>
          )}
          {allSoldOut && (
            <div className="rounded-[8px] border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="font-bold text-sm">Sold out</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                All tickets for this event have been sold.
              </p>
            </div>
          )}
          <div className="border border-alpine-500/30 rounded-[8px] divide-y divide-alpine-500/20 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
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
                  <p className="text-sm font-bold text-alpine-600 font-mono mt-1">£{tt.price}</p>
                  {soldOut ? (
                    <p className="text-[11px] font-bold text-destructive font-mono mt-0.5">Sold out</p>
                  ) : (
                    <>
                      {tt.maxPerOrder && tt.maxPerOrder > 0 && (
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Max {tt.maxPerOrder} per order</p>
                      )}
                      {remaining !== null && (
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Only {remaining} left</p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 rounded-[4px] border border-alpine-500/25 bg-background p-1 shrink-0">
                  <button
                    onClick={() => updateQuantity(tt.name, -1)}
                    className="w-7 h-7 rounded-[3px] flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={loading || q === 0}
                    aria-label={`Remove one ${tt.name}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm font-mono">{q}</span>
                  <button
                    onClick={() => updateQuantity(tt.name, 1)}
                    className="w-7 h-7 rounded-[3px] bg-alpine-600 text-white flex items-center justify-center hover:bg-alpine-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
            <div className="flex justify-between items-center pt-2 border-t border-alpine-500/25">
              <span className="font-semibold text-sm">{t('total')}</span>
              <span className="font-black text-lg text-alpine-600 font-mono">£{total.toFixed(2)}</span>
            </div>
          )}

          <Button
            size="lg"
            className="w-full rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white font-mono text-xs uppercase tracking-wider shadow-sm"
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
            <p className="text-xs text-destructive text-center font-mono">{error}</p>
          )}
        </>
      ) : isFree ? (
        <Button
          size="lg"
          className="w-full rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white font-mono text-xs uppercase tracking-wider shadow-sm"
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : t('registerFree')}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground text-center font-mono">{t('noTickets')}</p>
      )}

      {/* Guest Checkout Authentication Modal */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-alpine-500/20">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {authMode === 'signin' ? 'Sign in to complete order' : 'Create attendee account'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your tickets will be saved directly to this account.
              </p>
            </div>
          </div>

          <form onSubmit={handleModalAuth} className="space-y-3.5">
            {authMode === 'signup' && (
              <div className="space-y-1">
                <Label htmlFor="authName" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Your Name
                </Label>
                <Input
                  id="authName"
                  type="text"
                  placeholder="Full name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="h-10 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs"
                  required
                  disabled={authLoading}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="authEmail" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Email address
              </Label>
              <Input
                id="authEmail"
                type="email"
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="h-10 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs"
                required
                disabled={authLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="authPassword" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <PasswordInput
                id="authPassword"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="h-10 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs"
                required
                disabled={authLoading}
              />
            </div>

            {authError && (
              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-[4px] p-2.5 font-mono">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Please wait…
                </>
              ) : authMode === 'signin' ? (
                <>
                  Sign in & Continue <ArrowRight size={14} />
                </>
              ) : (
                <>
                  Create Account & Continue <ArrowRight size={14} />
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-1 border-t border-alpine-500/15 text-xs text-muted-foreground font-mono">
            {authMode === 'signin' ? (
              <span>
                New attendee?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup')
                    setAuthError(null)
                  }}
                  className="text-alpine-600 hover:text-alpine-700 underline underline-offset-2 font-semibold"
                >
                  Create account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin')
                    setAuthError(null)
                  }}
                  className="text-alpine-600 hover:text-alpine-700 underline underline-offset-2 font-semibold"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  )
}
