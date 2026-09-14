'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Navigation, Ruler, Timer, User } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { useScopedI18n } from '@/locales/client'

/**
 * A resolved member + their location row — a snapshot taken when the member
 * sheet opens (mirroring mobile, where the sheet shows the tapped state).
 */
export type MemberSheetTarget = {
  /** Member's user doc (name/avatar) or raw id when depth is shallow. */
  user: any
  lat: number
  lng: number
  /** Whether the member's position is currently live on the map. */
  live: boolean
  expiresAt?: string
  updatedAt?: string
}

type ScopedT = (key: string, params?: Record<string, string | number>) => string

const isIOS = (): boolean => /iPad|iPhone|iPod/.test(navigator.userAgent)

const EARTH_RADIUS_M = 6_371_000

/** Great-circle distance between two points, in meters. */
export const haversineMeters = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s))
}

/** "… m away" / "… km away" — mirrors the mobile `_formatDistance`. */
export const formatDistance = (meters: number, t: ScopedT): string => {
  if (meters < 1000) return t('metersAway', { count: Math.round(meters) })
  return t('kilometersAway', { distance: (meters / 1000).toFixed(1) })
}

/** "45m" / "2h 10m" — same shorthand as the member list rows. */
const remainingShareLabel = (expiresAt: string): string | null => {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return null
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** "45s ago" / "12m ago" / "3h ago" — mirrors the mobile `_lastSeenLabel`. */
export const lastSeenLabel = (updatedAt: string | undefined, t: ScopedT): string => {
  if (!updatedAt) return t('notSharing')
  const diffSec = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000)
  if (diffSec < 90) return t('secondsAgo', { count: Math.max(diffSec, 0) })
  const mins = Math.floor(diffSec / 60)
  if (mins < 60) return t('minutesAgo', { count: mins })
  return t('hoursAgo', { count: Math.floor(mins / 60) })
}

/**
 * Member sheet — mirrors the mobile bottom sheet opened from a map marker or
 * member chip: name, live status + remaining share time, your distance to
 * them (only while both of you are live), and a Get Directions deep link.
 */
export function MemberSheetDialog({
  open,
  onClose,
  target,
  myPoint,
}: {
  open: boolean
  onClose: () => void
  target: MemberSheetTarget | null
  /** Your own live position, present only while you're sharing. */
  myPoint: { lat: number; lng: number } | null
}) {
  const t = useScopedI18n('circleDetail') as ScopedT
  if (!target) return null

  const user = target.user
  const name =
    user && typeof user === 'object' && user.name && String(user.name).trim()
      ? String(user.name)
      : t('userN', { id: typeof user === 'object' ? user?.id ?? '' : user ?? '' })
  const img =
    user && typeof user.image === 'object' && user.image.url ? user.image.url : null

  const remaining =
    target.live && target.expiresAt ? remainingShareLabel(target.expiresAt) : null
  const distance =
    myPoint && target.live
      ? haversineMeters(myPoint, { lat: target.lat, lng: target.lng })
      : null

  const openDirections = () => {
    const { lat, lng } = target
    const url = isIOS()
      ? `https://maps.apple.com/?daddr=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader onClose={onClose}>
        <span className="truncate">{name}</span>
      </DialogHeader>
      <DialogContent>
        <div className="flex items-center gap-3">
          {img ? (
            <img
              src={img}
              alt=""
              className="w-11 h-11 rounded-full object-cover ring-2 ring-background shrink-0"
            />
          ) : (
            <div
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold',
                target.live
                  ? 'bg-secondary/10 text-secondary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-0.5">
            {target.live ? (
              <p className="text-sm font-medium text-green-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {t('sharingNow')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <User size={13} className="shrink-0" />
                {lastSeenLabel(target.updatedAt, t)}
              </p>
            )}
            {remaining && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Timer size={12} className="shrink-0" />
                {t('timeLeft', { time: remaining })}
              </p>
            )}
          </div>
        </div>

        {distance != null && (
          <div className="flex items-center gap-2.5 rounded-xl border border-border px-4 py-3">
            <Ruler size={18} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">{formatDistance(distance, t)}</span>
          </div>
        )}

        <Button className="w-full gap-2" onClick={openDirections}>
          <Navigation size={16} />
          {t('getDirections')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
