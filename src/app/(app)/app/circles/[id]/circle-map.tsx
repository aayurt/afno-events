'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { useScopedI18n } from '@/locales/client'

export type MapRow = {
  id: number
  user: any
  lat: number
  lng: number
}

type Point = { lat: number; lng: number }

/** One chip in the member strip overlaid on the map (mirrors the mobile `_MembersStrip`). */
export type MemberChip = {
  key: string
  name: string
  /** Media URL for the member's avatar, if any. */
  image?: string | null
  /** Whether the member's position is currently live. */
  live: boolean
  /** The "You" chip while sharing — rendered but not tappable. */
  mine?: boolean
  /** Remaining share time shorthand (e.g. "2h 5m"), when the share has an expiry. */
  timeLeft?: string | null
  /** Opens the member sheet for this member. */
  onTap?: () => void
}

const GLIDE_MS = 700

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

const rowUid = (row: MapRow): string => String(row.user?.id ?? row.user ?? row.id)

/**
 * Drives markers between polled positions instead of jumping — mirrors the
 * mobile glide (700ms easeOutCubic over a single shared timeline). Displayed
 * positions live in state so react-leaflet moves each CircleMarker smoothly;
 * brand-new members appear instantly at their position (no previous point).
 */
function useGlidePositions(rows: MapRow[]): Record<string, Point> {
  const [pos, setPos] = useState<Record<string, Point>>({})
  const posRef = useRef<Record<string, Point>>({})
  const targetsRef = useRef<Record<string, Point>>({})
  const rafRef = useRef<number | null>(null)
  const animRef = useRef<{
    uids: string[]
    from: Record<string, Point>
    to: Record<string, Point>
    start: number
  } | null>(null)

  const commit = (next: Record<string, Point>) => {
    posRef.current = next
    setPos(next)
  }

  useEffect(() => {
    const target: Record<string, Point> = {}
    for (const r of rows) target[rowUid(r)] = { lat: r.lat, lng: r.lng }

    // Which members actually moved since the last poll?
    const prevTargets = targetsRef.current
    const changed: string[] = []
    for (const uid of Object.keys(target)) {
      const t = prevTargets[uid]
      if (!t || t.lat !== target[uid]!.lat || t.lng !== target[uid]!.lng) changed.push(uid)
    }
    targetsRef.current = target

    // Seed brand-new markers at their target and drop members no longer shown.
    const seeded: Record<string, Point> = {}
    const cur = posRef.current
    for (const uid of Object.keys(target)) seeded[uid] = cur[uid] ?? target[uid]!
    commit(seeded)

    if (changed.length === 0) return

    // A new poll mid-glide re-targets from the current rendered positions
    // (mobile: `forward(from: current value)`), carrying any in-flight glide.
    const running = animRef.current?.uids ?? []
    const uids = Array.from(new Set([...running, ...changed]))
    const from: Record<string, Point> = {}
    for (const uid of uids) from[uid] = posRef.current[uid] ?? target[uid]!

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    const anim = { uids, from, to: target, start: performance.now() }
    animRef.current = anim

    const tick = (now: number) => {
      if (animRef.current !== anim) return
      const t = Math.min(1, (now - anim.start) / GLIDE_MS)
      const e = easeOutCubic(t)
      const next: Record<string, Point> = {}
      for (const uid of anim.uids) {
        const f = anim.from[uid]!
        const to = anim.to[uid]!
        next[uid] =
          t >= 1
            ? to
            : { lat: f.lat + (to.lat - f.lat) * e, lng: f.lng + (to.lng - f.lng) * e }
      }
      commit({ ...posRef.current, ...next })
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else animRef.current = null
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [rows])

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  return pos
}

/**
 * "Show all members" refit — mirrors the mobile live-map refit button. Fits
 * the view to every live member once the first positions arrive, then only
 * re-centers when the user taps the button (so polling never yanks the map).
 */
function RefitControl({ rows }: { rows: MapRow[] }) {
  const map = useMap()
  const t = useScopedI18n('circleDetail') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string
  const autoFitted = useRef(false)

  const fit = (maxZoom = 16) => {
    if (rows.length === 0) return
    map.fitBounds(
      rows.map((r) => [r.lat, r.lng] as [number, number]),
      { padding: [48, 48], maxZoom },
    )
  }

  useEffect(() => {
    if (autoFitted.current || rows.length === 0) return
    autoFitted.current = true
    // Defer one frame so the map container has its final size.
    const frame = requestAnimationFrame(() => fit())
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, rows.length])

  if (rows.length === 0) return null
  return (
    <button
      type="button"
      onClick={() => fit()}
      title={t('showAllMembers')}
      aria-label={t('showAllMembers')}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute top-3 right-3 z-[1000] w-9 h-9 rounded-full bg-background/95 backdrop-blur border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
    >
      <LocateFixed size={17} />
    </button>
  )
}

/**
 * Horizontal member strip overlaid on the map — mirrors the mobile members
 * strip: a "You" chip while sharing plus one chip per member with a location
 * row (live or stale). Tapping a member chip opens the member sheet.
 */
function MemberStrip({ chips }: { chips: MemberChip[] }) {
  return (
    <div
      className="absolute top-3 left-3 right-12 z-[1000] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 w-max">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            disabled={chip.mine}
            onClick={chip.onTap}
            title={chip.name}
            aria-label={chip.name}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full border bg-card/95 backdrop-blur px-2 py-1 text-xs shadow-md transition-colors',
              chip.live
                ? 'border-green-500/50 text-foreground'
                : 'border-border text-muted-foreground',
              !chip.mine && chip.onTap ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default',
            )}
          >
            <span className="relative shrink-0">
              {chip.image ? (
                <img
                  src={chip.image}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                // Avatar tint mirrors the live state (brand for live, muted for
                // stale), matching the mobile strip's active/inactive chip.
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold',
                    chip.live ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {chip.name.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <span
                className={cn(
                  'absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2 border-background',
                  chip.live ? 'bg-green-500' : 'bg-muted-foreground/50',
                )}
              />
            </span>
            <span className="leading-tight min-w-0">
              <span className="block font-medium max-w-[110px] truncate">{chip.name}</span>
              {chip.timeLeft && (
                <span className="block text-[10px] text-muted-foreground">⏱ {chip.timeLeft}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function CircleLiveMap({
  rows,
  myUserId,
  center,
  zoom,
  onSelectRow,
  chips,
}: {
  rows: MapRow[]
  myUserId: string | undefined
  center: [number, number]
  zoom: number
  /** Called when a (non-self) member marker is tapped → member sheet. */
  onSelectRow?: (row: MapRow) => void
  /** Member avatar chips overlaid on the map (see `MemberChip`). */
  chips?: MemberChip[]
}) {
  const t = useScopedI18n('circleDetail') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string
  const display = useGlidePositions(rows)
  const colorFor = (row: MapRow) =>
    String(row.user?.id ?? row.user) === String(myUserId) ? '#3b82f6' : '#22c55e'
  const nameFor = (user: any) =>
    !user
      ? t('unknown')
      : typeof user === 'number'
        ? t('userN', { id: user })
        : user.name || t('userN', { id: user.id ?? '' })

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {rows.map((row) => {
        const mine = String(row.user?.id ?? row.user) === String(myUserId)
        const at = display[rowUid(row)] ?? { lat: row.lat, lng: row.lng }
        return (
          <CircleMarker
            key={row.id}
            center={[at.lat, at.lng]}
            radius={mine ? 9 : 7}
            pathOptions={{
              color: colorFor(row),
              fillColor: colorFor(row),
              fillOpacity: 0.35,
              weight: 2,
            }}
            eventHandlers={
              !mine && onSelectRow ? { click: () => onSelectRow(row) } : undefined
            }
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="text-xs font-medium">
                {nameFor(row.user)}
                {mine && ` ${t('you')}`}
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}
      <RefitControl rows={rows} />
      {chips && chips.length > 0 && <MemberStrip chips={chips} />}
    </MapContainer>
  )
}
