'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import {
  Users,
  Plus,
  LogIn,
  User,
  MapPin,
  Loader2,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react'

type CircleDoc = {
  id: number
  name: string
  description?: string
  coverImage?: any
  inviteCode?: string
  creator?: any
  members?: { user: any; role?: string }[]
  events?: any[]
  updatedAt?: string
  createdAt?: string
}

function MemberAvatar({ user, size = 'md' }: { user: any; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  const img = user && typeof user.image === 'object' && user.image.url ? user.image.url : null
  if (img) {
    return (
      <img
        src={img}
        alt=""
        className={`${cls} rounded-full object-cover ring-2 ring-background shrink-0`}
      />
    )
  }
  return (
    <div className={`${cls} rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0`}>
      <User size={size === 'sm' ? 12 : 16} />
    </div>
  )
}

export default function CirclesPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [circles, setCircles] = useState<CircleDoc[]>([])
  const [error, setError] = useState<string | null>(null)

  // Create circle
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Join by code
  const [joinOpen, setJoinOpen] = useState(false)
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const [copiedCode, setCopiedCode] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/circles/my', { credentials: 'include' })
      if (!res.ok) {
        setError(`Failed to load circles (${res.status})`)
        return
      }
      const data = await res.json()
      setCircles(data.docs || [])
      setError(null)
    } catch {
      setError('Could not load your circles. Please try again.')
    }
  }, [])

  useEffect(() => {
    async function init() {
      const result = await authClient.getSession()
      setSession(result.data?.user ?? null)
      if (result.data?.user) await load()
      setLoading(false)
    }
    init()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.errors?.[0]?.message || `Failed to create circle (${res.status})`)
        return
      }
      setCreateOpen(false)
      setName('')
      setDescription('')
      await load()
      router.push(`/app/circles/${data.doc?.id ?? data.id}`)
    } catch {
      setCreateError('Network error while creating circle.')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setJoining(true)
    setJoinError(null)
    try {
      const res = await fetch('/api/circles/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        setJoinError(data.error || `Failed to join (${res.status})`)
        return
      }
      setJoinOpen(false)
      setCode('')
      await load()
      router.push(`/app/circles/${data.id}`)
    } catch {
      setJoinError('Network error while joining circle.')
    } finally {
      setJoining(false)
    }
  }

  const copyCode = async (id: number, inviteCode: string) => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 1500)
    } catch {}
  }

  if (loading) {
    return (
      <div className="container py-12 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <Users size={48} className="mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Your Circles</h1>
            <p className="text-muted-foreground">Sign in to create and join circles with your friends.</p>
          </div>
          <Link href="/app/auth/login?redirect=/app/circles">
            <Button size="lg" className="w-full">Sign In</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-12 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Circles</h1>
          <p className="text-muted-foreground">
            Share your live location, see who&apos;s nearby, and chat with your circle.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setJoinOpen(true)}>
            <LogIn size={16} /> Join
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New Circle
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {circles.length === 0 && !error ? (
        <Card>
          <CardContent className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Users size={28} className="text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">No circles yet</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Create a circle for your friends or family, then share the invite code so they can
                join and share live locations.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" className="gap-2" onClick={() => setJoinOpen(true)}>
                <LogIn size={16} /> Join with code
              </Button>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> Create circle
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {circles.map((circle) => {
            const members = circle.members || []
            const liveCount = 0 // filled in by detail page polling
            return (
              <Link key={circle.id} href={`/app/circles/${circle.id}`}>
                <Card className="group overflow-hidden hover:shadow-xl transition-all border-border rounded-2xl h-full">
                  <div className="relative h-32 bg-gradient-to-br from-primary/15 to-primary/5">
                    {typeof circle.coverImage === 'object' && circle.coverImage?.url ? (
                      <img
                        src={circle.coverImage.url}
                        alt={circle.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users size={40} className="text-primary/40" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur">
                        {members.length} {members.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <div>
                      <p className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {circle.name}
                      </p>
                      {circle.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {circle.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {members.slice(0, 5).map((m) => (
                          <MemberAvatar key={typeof m.user === 'object' ? m.user.id : m.user} user={m.user} size="sm" />
                        ))}
                        {members.length > 5 && (
                          <div className="w-7 h-7 rounded-full bg-muted text-xs flex items-center justify-center ring-2 ring-background shrink-0">
                            +{members.length - 5}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {circle.inviteCode && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              copyCode(circle.id, circle.inviteCode!)
                            }}
                            title="Copy invite code"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedCode === circle.id ? (
                              <Check size={16} className="text-green-500" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        )}
                        <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                    {liveCount > 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {liveCount} sharing live now
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create circle dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogHeader onClose={() => setCreateOpen(false)}>Create a new circle</DialogHeader>
        <DialogContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Circle name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekend Crew"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this circle about?"
                rows={3}
              />
            </div>
            {createError && (
              <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={creating || !name.trim()}>
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogHeader onClose={() => setJoinOpen(false)}>Join a circle</DialogHeader>
        <DialogContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Invite code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. a1b2c3d4"
                autoFocus
                className="font-mono uppercase tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Ask a circle member for their invite code.
              </p>
            </div>
            {joinError && (
              <p className="text-sm text-red-600 dark:text-red-400">{joinError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setJoinOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={joining || !code.trim()}>
                {joining ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {joining ? 'Joining…' : 'Join'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
