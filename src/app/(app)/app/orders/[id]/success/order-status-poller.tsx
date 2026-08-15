'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'

const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 20 // 40s of polling before giving up

export function OrderStatusPoller({
  orderId,
  initialStatus,
}: {
  orderId: number
  initialStatus: string
}) {
  const router = useRouter()
  const [timedOut, setTimedOut] = useState(false)
  const startedPaid = useRef(initialStatus === 'paid')

  useEffect(() => {
    if (startedPaid.current) return

    let attempts = 0
    let cancelled = false

    const interval = setInterval(async () => {
      if (cancelled) return
      attempts += 1

      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Order fetch failed: ${res.status}`)
        const data = await res.json()
        const status = data?.doc?.status ?? data?.status

        if (status === 'paid') {
          clearInterval(interval)
          // Re-render the server component so it shows the confirmed view.
          router.refresh()
          return
        }
      } catch {
        // Transient failure — keep polling until the attempt budget runs out.
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(interval)
        setTimedOut(true)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [orderId, router])

  if (timedOut) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Payment is still processing</p>
          <p className="mt-1 text-amber-700">
            We haven&apos;t received confirmation of your payment yet. Your tickets will
            appear in your orders once it goes through — refresh this page in a minute.
          </p>
        </div>
      </div>
    )
  }

  return null
}
