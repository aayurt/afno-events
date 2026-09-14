'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useScopedI18n } from '@/locales/client'
import { cn } from '@/utilities/ui'
import { getCardImageUrl } from '@/utilities/getCardImageUrl'
import {
  Users,
  User,
  MapPin,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  Send,
  LogOut,
  Share2,
  StopCircle,
  Timer,
  Radio,
  Ruler,
  Clock,
  ChevronRight,
  Eye,
  Bell,
  CircleAlert,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import {
  ShareVisibilityDialog,
  ShareTimeLimitDialog,
  WhoCanSeeYouDialog,
  clockLabel,
  timeLimitText,
} from './share-dialogs'
import {
  MemberSheetDialog,
  MemberSheetTarget,
  formatDistance,
  haversineMeters,
  lastSeenLabel,
} from './member-sheet'
import type { MemberChip } from './circle-map'

type ScopedT = (key: string, params?: Record<string, string | number>) => string

// react-leaflet touches `window` at module init, so it must only load in the
// browser — Next.js server-renders 'use client' pages for the initial HTML.
function MapLoading() {
  const t = useScopedI18n('circleDetail') as ScopedT
  return (
    <div className="h-full w-full flex items-center justify-center bg-muted/40 text-sm text-muted-foreground">
      {t('mapLoading')}
    </div>
  )
}

const CircleLiveMap = dynamic(() => import('./circle-map').then((m) => m.CircleLiveMap), {
  ssr: false,
  loading: MapLoading,
})

type Member = {
  user: any
  role?: string
}

type LocationRow = {
  id: number
  user: any
  lat: number
  lng: number
  accuracy?: number
  heading?: number
  expiresAt?: string
  updatedAt?: string
  visibleTo?: string[]
}

type LocationResponse = {
  docs: LocationRow[]
  viewers?: { id: number; name: string | null; image: string | null }[]
}

type MessageDoc = {
  id: number
  sender: any
  message: string
  createdAt?: string
}

const STALE_AFTER_MS = 60_000

const isLive = (row: LocationRow): boolean => {
  if (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) return false
  if (row.updatedAt && new Date(row.updatedAt).getTime() < Date.now() - STALE_AFTER_MS) return false
  return true
}

const remainingShareLabel = (expiresAt?: string): string | null => {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return null
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const userImageUrl = (user: any): string | null =>
  user && user.image && typeof user.image === 'object' && user.image.url
    ? user.image.url
    : null

function Avatar({ user, size = 'md' }: { user: any; size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'
  const img = userImageUrl(user)
  if (img) {
    return <img src={img} alt="" className={`${cls} rounded-full object-cover ring-2 ring-background shrink-0`} />
  }
  return (
    <div className={`${cls} rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0`}>
      <User size={size === 'sm' ? 12 : size === 'lg' ? 20 : 16} />
    </div>
  )
}

function memberName(user: any, t: ScopedT): string {
  if (!user) return t('unknown')
  if (typeof user === 'number') return t('userN', { id: user })
  return user.name || t('userN', { id: user.id ?? '' })
}

export default function CircleDetailPage() {
  const t = useScopedI18n('circleDetail') as ScopedT
  const params = useParams<{ id: string }>()
  const circleId = params.id

  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [circle, setCircle] = useState<any>(null)

  // Live locations
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [viewers, setViewers] = useState<NonNullable<LocationResponse['viewers']>>([])
  const [lastPoll, setLastPoll] = useState<Date | null>(null)

  // Share-my-location
  const [sharing, setSharing] = useState(false)
  const [locRequesting, setLocRequesting] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  // Share settings — who can see me (visibleTo) and for how long (expiresAt),
  // mirroring the mobile share-control panel. 'all' = every circle member.
  const [visibleTo, setVisibleTo] = useState<string[] | 'all'>('all')
  const [timeLimitMs, setTimeLimitMs] = useState<number | null>(null)
  const [endsAt, setEndsAt] = useState<Date | null>(null)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [timeLimitOpen, setTimeLimitOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [memberSheet, setMemberSheet] = useState<MemberSheetTarget | null>(null)
  const settingsRef = useRef<{ visibleTo: string[] | 'all'; expiresAt: string | null }>({
    visibleTo: 'all',
    expiresAt: null,
  })
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopSharingRef = useRef<() => void>(() => {})

  // Chat
  const [messages, setMessages] = useState<MessageDoc[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // Toast-like feedback for share state changes (the project has no toast lib —
  // a small self-contained pill, auto-dismissed after 3.5s).
  const [toast, setToast] = useState<{
    id: number
    text: string
    kind: 'success' | 'error'
  } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((text: string, kind: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current)
    setToast({ id: Date.now(), text, kind })
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(
    () => () => {
      if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current)
    },
    [],
  )

  // Squad alerts — unread badge (all squads, matching the mobile bell), polled
  // every 30s like the mobile app.
  const [alertsUnread, setAlertsUnread] = useState(0)

  const loadCircle = useCallback(async () => {
    try {
      const res = await fetch(`/api/circles/${circleId}`, { credentials: 'include' })
      if (!res.ok) {
        setError(t('squadNotFound', { status: res.status }))
        return
      }
      const data = await res.json()
      setCircle(data)
      setError(null)
    } catch {
      setError(t('loadCircleFailed'))
    }
  }, [circleId, t])

  const loadLocations = useCallback(async () => {
    try {
      const res = await fetch(`/api/circles/${circleId}/locations`, { credentials: 'include' })
      if (!res.ok) return
      const data: LocationResponse = await res.json()
      const rows = data.docs || []
      setLocations(rows)
      setViewers(data.viewers || [])
      setLastPoll(new Date())
      // Keep the pickers in sync with the server row while sharing (e.g. if a
      // second tab changed the settings). My row disappears once a time limit
      // expires, so only sync while it exists.
      const myId = sessionIdRef.current
      if (myId) {
        const mine = rows.find((r) => String(r.user?.id ?? r.user) === myId)
        if (mine) {
          const vis = mine.visibleTo && mine.visibleTo.length ? mine.visibleTo : 'all'
          settingsRef.current = { ...settingsRef.current, visibleTo: vis }
          setVisibleTo(vis)
          if (mine.expiresAt) setEndsAt(new Date(mine.expiresAt))
        }
      }
    } catch {}
  }, [circleId])

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/circles/${circleId}/messages`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.docs || [])
    } catch {}
  }, [circleId])

  const loadAlertsUnread = useCallback(async () => {
    try {
      // totalDocs from a single-doc response is the unread count.
      const res = await fetch('/api/circle-alerts?where[read][equals]=false&limit=1&depth=0', {
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setAlertsUnread(data.totalDocs || 0)
    } catch {}
  }, [])

  useEffect(() => {
    let cancelled = false
    let locTimer: ReturnType<typeof setInterval> | null = null
    let msgTimer: ReturnType<typeof setInterval> | null = null
    let alertsTimer: ReturnType<typeof setInterval> | null = null
    async function init() {
      const result = await authClient.getSession()
      const user = result.data?.user ?? null
      if (cancelled) return
      sessionIdRef.current = user ? String(user.id) : null
      setSession(user)
      if (user) {
        await Promise.all([loadCircle(), loadLocations(), loadMessages(), loadAlertsUnread()])
        if (cancelled) return
        setLoading(false)
        locTimer = setInterval(loadLocations, 10_000)
        msgTimer = setInterval(loadMessages, 15_000)
        alertsTimer = setInterval(loadAlertsUnread, 30_000)
      } else {
        setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
      if (locTimer) clearInterval(locTimer)
      if (msgTimer) clearInterval(msgTimer)
      if (alertsTimer) clearInterval(alertsTimer)
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (expiryTimerRef.current != null) {
        clearTimeout(expiryTimerRef.current)
        expiryTimerRef.current = null
      }
    }
  }, [loadCircle, loadLocations, loadMessages, loadAlertsUnread])

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const me = circle?.members?.find((m: Member) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return String(uid) === String(session?.id)
  })

  const copyCode = async () => {
    if (!circle?.inviteCode) return
    try {
      await navigator.clipboard.writeText(circle.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const sendLocation = useCallback(
    async (lat: number, lng: number, accuracy?: number) => {
      const settings = settingsRef.current
      try {
        const res = await fetch(`/api/circles/${circleId}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            accuracy,
            visibleTo: settings.visibleTo,
            expiresAt: settings.expiresAt,
          }),
          credentials: 'include',
        })
        if (!res.ok) {
          showToast(t('shareLocationFailed'), 'error')
        }
      } catch {
        showToast(t('shareLocationFailed'), 'error')
      }
    },
    [circleId, t, showToast],
  )

  const toggleSharing = () => {
    if (sharing) {
      stopSharing()
      showToast(t('toastSharingStopped'))
      return
    }
    if (!navigator.geolocation) {
      showToast(t('geolocationUnsupported'), 'error')
      return
    }
    if (locRequesting) return
    setLocRequesting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setLocRequesting(false)
        await sendLocation(latitude, longitude, accuracy)
        setSharing(true)
        const vis = settingsRef.current.visibleTo
        const visLabel =
          vis === 'all' || vis.length === 0
            ? t('visAll').toLowerCase()
            : t(vis.length === 1 ? 'visSelectedOne' : 'visSelectedMany', {
                count: vis.length,
              })
        showToast(t('toastSharingStarted', { vis: visLabel }))
        lastSentRef.current = { lat: latitude, lng: longitude, accuracy }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const { latitude, longitude, accuracy } = p.coords
            const last = lastSentRef.current
            // Only upload when moved meaningfully (~20m) to avoid spam
            if (
              !last ||
              Math.abs(last.lat - latitude) > 0.0002 ||
              Math.abs(last.lng - longitude) > 0.0002
            ) {
              lastSentRef.current = { lat: latitude, lng: longitude, accuracy }
              sendLocation(latitude, longitude, accuracy)
            }
          },
          () => {
            showToast(t('locationPermissionError'), 'error')
            stopSharing()
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
        )
      },
      () => {
        setLocRequesting(false)
        showToast(t('locationDenied'), 'error')
      },
      { enableHighAccuracy: true, timeout: 20000 },
    )
  }

  const stopSharing = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (expiryTimerRef.current != null) {
      clearTimeout(expiryTimerRef.current)
      expiryTimerRef.current = null
    }
    lastSentRef.current = null
    // Keep the chosen visibility for the next share, but always start fresh
    // with no time limit once stopped.
    settingsRef.current = { ...settingsRef.current, expiresAt: null }
    setTimeLimitMs(null)
    setEndsAt(null)
    setSharing(false)
    fetch(`/api/circles/${circleId}/location`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
  }, [circleId])

  useEffect(() => {
    stopSharingRef.current = stopSharing
  }, [stopSharing])

  /** Re-uploads the last known position so setting changes apply right away. */
  const uploadWithSettings = async () => {
    const last = lastSentRef.current
    if (!last) return
    await sendLocation(last.lat, last.lng, last.accuracy)
  }

  const applyVisibility = async (selected: string[]) => {
    const next: string[] | 'all' = selected.length === 0 ? 'all' : selected
    settingsRef.current = { ...settingsRef.current, visibleTo: next }
    setVisibleTo(next)
    await uploadWithSettings()
  }

  const applyTimeLimit = async (ms: number | null) => {
    if (expiryTimerRef.current != null) {
      clearTimeout(expiryTimerRef.current)
      expiryTimerRef.current = null
    }
    if (ms == null) {
      settingsRef.current = { ...settingsRef.current, expiresAt: null }
      setTimeLimitMs(null)
      setEndsAt(null)
      await uploadWithSettings()
      return
    }
    const at = new Date(Date.now() + ms)
    settingsRef.current = { ...settingsRef.current, expiresAt: at.toISOString() }
    setTimeLimitMs(ms)
    setEndsAt(at)
    // Auto-stop when the limit passes, mirroring the mobile expiry timer.
    expiryTimerRef.current = setTimeout(() => {
      stopSharingRef.current()
      showToast(t('toastSharingEnded'))
    }, ms + 1000)
    await uploadWithSettings()
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      await fetch(`/api/circles/${circleId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft.trim() }),
        credentials: 'include',
      })
      setDraft('')
      await loadMessages()
    } catch {} finally {
      setSending(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm(t('leaveConfirm', { name: circle?.name || '' }))) return
    setLeaving(true)
    try {
      await fetch(`/api/circles/${circleId}/leave`, { method: 'POST', credentials: 'include' })
      window.location.href = '/app/circles'
    } finally {
      setLeaving(false)
    }
  }

  // Map position: center on the last known positions, fallback to a world view
  const liveRows = locations.filter(isLive)
  const mapCenter: [number, number] =
    liveRows.length > 0 ? [liveRows[0]!.lat, liveRows[0]!.lng] : [20, 10]
  const mapZoom = liveRows.length > 1 ? 14 : 15

  if (loading) {
    return (
      <div className="container py-12 space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <Users size={48} className="mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('signInTitle')}</h1>
            <p className="text-muted-foreground">{t('signInDesc')}</p>
          </div>
          <Link href="/app/auth/login?redirect=/app/circles">
            <Button size="lg" className="w-full">{t('signIn')}</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-4">
          <Users size={48} className="mx-auto text-muted-foreground" />
          <p className="font-semibold">{error}</p>
          <p className="text-sm text-muted-foreground">{t('notMemberDesc')}</p>
          <Link href="/app/circles">
            <Button variant="outline">{t('backToCircles')}</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const members = circle?.members || []

  // Members I can restrict visibility to (everyone but me).
  const otherMembers = members
    .map((m: Member) => {
      const uid = typeof m.user === 'object' ? m.user?.id : m.user
      return { id: String(uid ?? ''), name: memberName(m.user, t) }
    })
    .filter((m: { id: string; name: string }) => m.id && m.id !== String(session?.id))

  /** My own live position (present only while I'm sharing). */
  const myLocationRow = locations.find(
    (r) => String(r.user?.id ?? r.user) === String(session?.id),
  )
  const myPoint =
    myLocationRow && isLive(myLocationRow)
      ? { lat: myLocationRow.lat, lng: myLocationRow.lng }
      : null

  /** Open the member sheet (snapshot) for a member location row. */
  const openMemberSheet = (row: LocationRow) => {
    const uid = String(row.user?.id ?? row.user ?? '')
    if (!uid || uid === String(session?.id)) return
    const circleMember = members.find((m: Member) => {
      const muid = typeof m.user === 'object' ? m.user?.id : m.user
      return String(muid) === uid
    })
    setMemberSheet({
      user: circleMember?.user ?? row.user,
      lat: row.lat,
      lng: row.lng,
      live: isLive(row),
      expiresAt: row.expiresAt,
      updatedAt: row.updatedAt,
    })
  }

  // Member avatar chips overlaid on the map (mirrors the mobile members
  // strip): a "You" chip while sharing + every member with a location row.
  const stripChips: MemberChip[] = []
  if (sharing && me) {
    stripChips.push({
      key: 'me',
      name: t('legendYou'),
      image: userImageUrl(me.user),
      live: true,
      mine: true,
    })
  }
  for (const m of members) {
    const muid = typeof m.user === 'object' ? m.user?.id : m.user
    if (String(muid) === String(session?.id)) continue
    const row = locations.find((l) => String(l.user?.id ?? l.user) === String(muid))
    if (!row) continue
    stripChips.push({
      key: String(muid),
      name: memberName(m.user, t),
      image: userImageUrl(m.user),
      live: isLive(row),
      timeLeft: row.expiresAt ? remainingShareLabel(row.expiresAt) : null,
      onTap: () => openMemberSheet(row),
    })
  }

  const visibilitySummary =
    visibleTo === 'all' || visibleTo.length === 0
      ? t('visAll')
      : t(visibleTo.length === 1 ? 'visSelectedOne' : 'visSelectedMany', {
          count: visibleTo.length,
        })

  const timeLimitSummary = endsAt
    ? timeLimitMs != null
      ? t('shareEnds', { label: timeLimitText(t, timeLimitMs), time: clockLabel(endsAt) })
      : t('shareEndsOnly', { time: clockLabel(endsAt) })
    : t('untilStop')

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/app/circles">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft size={16} /> {t('backLabel')}
          </Button>
        </Link>
        {session && (
          <Link
            href="/app/circles/alerts"
            title={t('squadAlerts')}
            className="relative w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Bell size={18} />
            {alertsUnread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {alertsUnread > 99 ? '99+' : alertsUnread}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Header */}
      <Card className="overflow-hidden rounded-2xl">
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
          {getCardImageUrl(circle.coverImage) ? (
            <img src={getCardImageUrl(circle.coverImage)!} alt={circle.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Users size={56} className="text-primary/40" />
            </div>
          )}
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">{circle.name}</h1>
              {circle.description && (
                <p className="text-muted-foreground max-w-xl">{circle.description}</p>
              )}
            </div>
            <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={handleLeave} disabled={leaving}>
              {leaving ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              {t('leaveSquad')}
            </Button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex -space-x-2">
              {members.slice(0, 8).map((m: Member) => (
                <Avatar key={typeof m.user === 'object' ? m.user.id : m.user} user={m.user} />
              ))}
              {members.length > 8 && (
                <div className="w-9 h-9 rounded-full bg-muted text-xs flex items-center justify-center ring-2 ring-background">
                  +{members.length - 8}
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? t('memberOne') : t('memberMany')}
            </span>

            {circle.inviteCode && (
              <button
                onClick={copyCode}
                className="flex items-center gap-2 text-sm font-mono bg-muted px-3 py-1.5 rounded-lg hover:bg-muted/70 transition-colors"
                title={t('copyInvite')}
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {circle.inviteCode}
              </button>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Live map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MapPin size={18} className="text-primary" /> {t('liveLocation')}
            </h2>
            {lastPoll && (
              <span className="text-xs text-muted-foreground">
                {t('updatedAt', { time: lastPoll.toLocaleTimeString() })}
              </span>
            )}
          </div>
        </div>

        {liveRows.length === 0 && !sharing ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground space-y-2">
              <Radio size={32} className="mx-auto opacity-30" />
              <p>{t('noOneSharing')}</p>
              {me && (
                <>
                  <p className="text-sm">{t('shareHint')}</p>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={toggleSharing}
                    disabled={locRequesting}
                  >
                    {locRequesting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Share2 size={16} />
                    )}
                    {locRequesting ? t('requestingLocation') : t('shareMyLocation')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-2xl">
            <div className="h-[420px] w-full relative z-0">
              <CircleLiveMap
                rows={liveRows}
                chips={stripChips}
                myUserId={String(session?.id)}
                center={mapCenter}
                zoom={mapZoom}
                onSelectRow={openMemberSheet}
              />
            </div>
            <CardContent className="p-3 border-t border-border">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                {/* Legend (passive) */}
                <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {t('legendSharingNow')}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {t('legendYou')}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {t('liveCount', { count: liveRows.length })}
                </span>

                {/* Controls (interactive) — share toggle + share settings */}
                {me && (sharing || liveRows.length > 0) && (
                  <>
                    <span className="w-px h-4 bg-border shrink-0" aria-hidden />
                    <button
                      type="button"
                      onClick={toggleSharing}
                      disabled={locRequesting}
                      title={
                        locRequesting
                          ? t('requestingLocation')
                          : sharing
                            ? t('stopSharing')
                            : t('shareMyLocation')
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors shrink-0',
                        locRequesting && 'opacity-70 cursor-wait',
                        sharing
                          ? 'border border-red-300 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                          : 'border border-primary bg-primary text-primary-foreground hover:opacity-90',
                      )}
                    >
                      {locRequesting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : sharing ? (
                        <StopCircle size={12} />
                      ) : (
                        <Share2 size={12} />
                      )}
                      {locRequesting
                        ? t('requestingLocation')
                        : sharing
                          ? t('stopSharing')
                          : t('shareMyLocation')}
                    </button>
                    {sharing && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewOpen(true)}
                          title={t('whoCanSeeYou')}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 font-medium text-primary hover:bg-primary/10 transition-colors shrink-0"
                        >
                          <Eye size={12} className="shrink-0" />
                          {viewers.length > 0
                            ? t('canSeeYouNow', { count: viewers.length })
                            : t('whoCanSeeYou')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisibilityOpen(true)}
                          title={t('visibleToLabel')}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                        >
                          <Eye size={12} className="shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {t('visibleToLabel')}{' '}
                            <span className="font-semibold text-foreground">{visibilitySummary}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimeLimitOpen(true)}
                          title={t('shareForLabel')}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                        >
                          <Timer size={12} className="shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {t('shareForLabel')}{' '}
                            <span className="font-semibold text-foreground">{timeLimitSummary}</span>
                          </span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members with live status */}
        {members.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              {members.map((m: Member) => {
                const uid = typeof m.user === 'object' ? m.user?.id : m.user
                const row = locations.find((l) => String(l.user?.id ?? l.user) === String(uid))
                const live = row ? isLive(row) : false
                const remaining = row ? remainingShareLabel(row.expiresAt) : null
                // Distance from me — shown live while both of us are sharing.
                const distTo =
                  row != null && live && myPoint
                    ? haversineMeters(myPoint, { lat: row.lat, lng: row.lng })
                    : null
                const isMe = String(uid) === String(session?.id)
                const openable = !!row && !isMe
                return (
                  <button
                    key={uid}
                    type="button"
                    disabled={!openable}
                    onClick={() => openable && row && openMemberSheet(row)}
                    className={cn(
                      'w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg text-left transition-colors',
                      openable ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default',
                    )}
                  >
                    <Avatar user={m.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {memberName(m.user, t)}
                        {m.role === 'admin' && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {t('admin')}
                          </span>
                        )}
                        {isMe && <span className="ml-1.5 text-xs text-muted-foreground">{t('you')}</span>}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        {live ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            {t('sharingNow')}
                          </span>
                        ) : row && row.updatedAt ? (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock size={11} /> {lastSeenLabel(row.updatedAt, t)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t('notSharing')}</span>
                        )}
                        {remaining && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Timer size={11} /> {t('timeLeft', { time: remaining })}
                          </span>
                        )}
                        {distTo != null && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Ruler size={11} /> {formatDistance(distTo, t)}
                          </span>
                        )}
                      </div>
                    </div>
                    {openable && (
                      <ChevronRight size={15} className="text-muted-foreground/40 shrink-0" />
                    )}
                  </button>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">{t('squadChat')}</h2>
        <Card className="rounded-2xl">
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                {t('chatEmpty')}
              </div>
            ) : (
              messages.map((msg) => {
                const mine = String(msg.sender?.id ?? msg.sender) === String(session?.id)
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        mine
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      }`}
                    >
                      {!mine && (
                        <p className={`text-[11px] font-medium mb-0.5 ${mine ? '' : 'text-primary'}`}>
                          {memberName(msg.sender, t)}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      {msg.createdAt && (
                        <p className={`text-[10px] mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-3 border-t border-border flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('chatPlaceholder')}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={sending || !draft.trim()}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </form>
        </Card>
      </div>

      {/* Share controls — visibility + time limit */}
      <ShareVisibilityDialog
        open={visibilityOpen}
        onClose={() => setVisibilityOpen(false)}
        members={otherMembers}
        initial={visibleTo === 'all' ? [] : visibleTo}
        onApply={applyVisibility}
      />
      <ShareTimeLimitDialog
        open={timeLimitOpen}
        onClose={() => setTimeLimitOpen(false)}
        initialMs={timeLimitMs}
        endsAt={endsAt}
        onApply={applyTimeLimit}
      />
      <WhoCanSeeYouDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        circleId={circleId}
        myId={session?.id != null ? String(session.id) : undefined}
      />
      <MemberSheetDialog
        open={!!memberSheet}
        onClose={() => setMemberSheet(null)}
        target={memberSheet}
        myPoint={myPoint}
      />

      {/* Toast for share state changes and errors */}
      {toast && (
        <div
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-4',
            toast.kind === 'error' ? 'bg-red-600 text-white' : 'bg-foreground text-background',
          )}
        >
          {toast.kind === 'error' ? (
            <CircleAlert size={14} className="shrink-0" />
          ) : (
            <Check size={14} className="text-green-500 dark:text-green-400 shrink-0" />
          )}
          {toast.text}
        </div>
      )}
    </div>
  )
}
