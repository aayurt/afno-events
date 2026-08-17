'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
} from 'lucide-react'
import dynamic from 'next/dynamic'

// react-leaflet touches `window` at module init, so it must only load in the
// browser — Next.js server-renders 'use client' pages for the initial HTML.
const CircleLiveMap = dynamic(() => import('./circle-map').then((m) => m.CircleLiveMap), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/40 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
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

function Avatar({ user, size = 'md' }: { user: any; size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'
  const img = user && user.image && typeof user.image === 'object' && user.image.url ? user.image.url : null
  if (img) {
    return <img src={img} alt="" className={`${cls} rounded-full object-cover ring-2 ring-background shrink-0`} />
  }
  return (
    <div className={`${cls} rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0`}>
      <User size={size === 'sm' ? 12 : size === 'lg' ? 20 : 16} />
    </div>
  )
}

function memberName(user: any): string {
  if (!user) return 'Unknown'
  if (typeof user === 'number') return `User ${user}`
  return user.name || `User ${user.id ?? ''}`
}

export default function CircleDetailPage() {
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
  const [shareError, setShareError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef<{ lat: number; lng: number } | null>(null)

  // Chat
  const [messages, setMessages] = useState<MessageDoc[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const loadCircle = useCallback(async () => {
    try {
      const res = await fetch(`/api/circles/${circleId}`, { credentials: 'include' })
      if (!res.ok) {
        setError(`Squad not found (${res.status})`)
        return
      }
      const data = await res.json()
      setCircle(data)
      setError(null)
    } catch {
      setError('Could not load this circle.')
    }
  }, [circleId])

  const loadLocations = useCallback(async () => {
    try {
      const res = await fetch(`/api/circles/${circleId}/locations`, { credentials: 'include' })
      if (!res.ok) return
      const data: LocationResponse = await res.json()
      setLocations(data.docs || [])
      setViewers(data.viewers || [])
      setLastPoll(new Date())
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

  useEffect(() => {
    let cancelled = false
    let locTimer: ReturnType<typeof setInterval> | null = null
    let msgTimer: ReturnType<typeof setInterval> | null = null
    async function init() {
      const result = await authClient.getSession()
      const user = result.data?.user ?? null
      if (cancelled) return
      setSession(user)
      if (user) {
        await Promise.all([loadCircle(), loadLocations(), loadMessages()])
        if (cancelled) return
        setLoading(false)
        locTimer = setInterval(loadLocations, 10_000)
        msgTimer = setInterval(loadMessages, 15_000)
      } else {
        setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
      if (locTimer) clearInterval(locTimer)
      if (msgTimer) clearInterval(msgTimer)
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [loadCircle, loadLocations, loadMessages])

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
      try {
        await fetch(`/api/circles/${circleId}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, accuracy }),
          credentials: 'include',
        })
      } catch {}
    },
    [circleId],
  )

  const toggleSharing = () => {
    if (sharing) {
      stopSharing()
      return
    }
    if (!navigator.geolocation) {
      setShareError('Geolocation is not supported by this browser.')
      return
    }
    setShareError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        await sendLocation(latitude, longitude, accuracy)
        setSharing(true)
        lastSentRef.current = { lat: latitude, lng: longitude }
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
              lastSentRef.current = { lat: latitude, lng: longitude }
              sendLocation(latitude, longitude, accuracy)
            }
          },
          () => {
            setShareError('Could not get your location. Check browser permission.')
            stopSharing()
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
        )
      },
      () => {
        setShareError('Location access was denied. Allow location for this site to share.')
      },
      { enableHighAccuracy: true, timeout: 20000 },
    )
  }

  const stopSharing = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    lastSentRef.current = null
    setSharing(false)
    fetch(`/api/circles/${circleId}/location`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
  }, [circleId])

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
    if (!confirm(`Leave "${circle?.name}"? You will stop sharing your location with this circle.`)) return
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
            <h1 className="text-2xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Sign in to view this circle.</p>
          </div>
          <Link href="/app/auth/login?redirect=/app/circles">
            <Button size="lg" className="w-full">Sign In</Button>
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
          <p className="text-sm text-muted-foreground">
            You may not be a member of this squad, or it no longer exists.
          </p>
          <Link href="/app/circles">
            <Button variant="outline">Back to circles</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const members = circle?.members || []

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/circles">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft size={16} /> Circles
          </Button>
        </Link>
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
              Leave squad
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
            <span className="text-sm text-muted-foreground">{members.length} members</span>

            {circle.inviteCode && (
              <button
                onClick={copyCode}
                className="flex items-center gap-2 text-sm font-mono bg-muted px-3 py-1.5 rounded-lg hover:bg-muted/70 transition-colors"
                title="Copy invite code"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {circle.inviteCode}
              </button>
            )}
          </div>

          {shareError && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm">
              {shareError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MapPin size={18} className="text-primary" /> Live location
            </h2>
            {lastPoll && (
              <span className="text-xs text-muted-foreground">
                updated {lastPoll.toLocaleTimeString()}
              </span>
            )}
          </div>
          {me && (
            <Button
              variant={sharing ? 'destructive' : 'default'}
              size="sm"
              className="gap-2"
              onClick={toggleSharing}
            >
              {sharing ? <StopCircle size={16} /> : <Share2 size={16} />}
              {sharing ? 'Stop sharing' : 'Share my location'}
            </Button>
          )}
        </div>

        {liveRows.length === 0 && !sharing ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground space-y-2">
              <Radio size={32} className="mx-auto opacity-30" />
              <p>No one is sharing their location right now.</p>
              {me && <p className="text-sm">Tap “Share my location” to appear on this map.</p>}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-2xl">
            <div className="h-[420px] w-full relative z-0">
              <CircleLiveMap rows={liveRows} myUserId={String(session?.id)} center={mapCenter} zoom={mapZoom} />
            </div>
            <CardContent className="p-3 border-t border-border">
              <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Sharing now
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> You
                </span>
                <span>{liveRows.length} live</span>
                {viewers.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users size={12} />
                    {viewers.length} can see you now
                  </span>
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
                const isMe = String(uid) === String(session?.id)
                return (
                  <div key={uid} className="flex items-center gap-3 py-2">
                    <Avatar user={m.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {memberName(m.user)}
                        {m.role === 'admin' && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            admin
                          </span>
                        )}
                        {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        {live ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Sharing now
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not sharing</span>
                        )}
                        {remaining && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Timer size={11} /> {remaining} left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Squad chat</h2>
        <Card className="rounded-2xl">
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No messages yet. Say hi! 👋
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
                          {memberName(msg.sender)}
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
              placeholder="Message the squad…"
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={sending || !draft.trim()}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
