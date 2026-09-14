'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth/client'
import { useScopedI18n } from '@/locales/client'
import { cn } from '@/utilities/ui'

type Props = {
  eventId: number | string
  className?: string
}

/**
 * Heart toggle for the event detail hero. Reads the user's favorite state on
 * mount and creates/deletes via the Payload Favorites API on click. Redirects
 * to login when a signed-out user taps it.
 */
export function FavoriteButton({ eventId, className }: Props) {
  const t = useScopedI18n('eventDetail')
  const router = useRouter()
  const [isFav, setIsFav] = useState(false)
  const [favId, setFavId] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const result = await authClient.getSession()
      if (cancelled) return
      if (result.data?.user) {
        try {
          // Access rules on the collection scope reads to the current user,
          // so no user filter is needed here.
          const res = await fetch(`/api/favorites?where[event][equals]=${eventId}&limit=1&depth=0`)
          if (res.ok) {
            const data = await res.json()
            const doc = data.docs?.[0]
            if (doc) {
              setIsFav(true)
              setFavId(typeof doc.id === 'number' ? doc.id : parseInt(String(doc.id), 10))
            }
          }
        } catch {
          // Leave in the default (not saved) state on failure.
        }
      }
      if (!cancelled) setReady(true)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [eventId])

  const toggle = useCallback(async () => {
    if (saving) return
    const result = await authClient.getSession()
    if (!result.data?.user) {
      router.push(`/app/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    setSaving(true)
    try {
      if (isFav && favId != null) {
        const res = await fetch(`/api/favorites/${favId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (res.ok) {
          setIsFav(false)
          setFavId(null)
        }
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: eventId }),
          credentials: 'include',
        })
        const data = await res.json()
        if (res.ok) {
          const id = data.doc?.id ?? data.id
          setIsFav(true)
          setFavId(id != null ? parseInt(String(id), 10) : null)
        }
      }
    } catch {
      // Swallow network errors; state stays as-is so the user can retry.
    } finally {
      setSaving(false)
    }
  }, [eventId, isFav, favId, saving, router])

  const label = isFav ? t('saved') : t('save')

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready || saving}
      title={label}
      aria-label={label}
      aria-pressed={isFav}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full',
        'bg-black/40 text-white shadow-lg backdrop-blur-sm transition-colors',
        'hover:bg-black/60 disabled:cursor-default disabled:opacity-60',
        className,
      )}
    >
      {saving ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <Heart size={20} className={isFav ? 'fill-red-500 text-red-500' : ''} />
      )}
    </button>
  )
}