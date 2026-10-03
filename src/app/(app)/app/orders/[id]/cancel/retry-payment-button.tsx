'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScopedI18n } from '@/locales/client'

export function RetryPaymentButton({ orderId }: { orderId: number }) {
  const t = useScopedI18n('orders')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRetry = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/orders/${orderId}/checkout-session`, {
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || t('retryFailed'))
      }

      const { url } = await res.json()
      if (url) {
        window.location.href = url
      } else {
        // Free order — no Stripe redirect needed.
        router.push(`/app/orders/${orderId}/success`)
      }
    } catch (err: any) {
      setError(err.message ?? t('retryFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleRetry} disabled={loading} className="gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
        {loading ? '…' : t('tryAgain')}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
