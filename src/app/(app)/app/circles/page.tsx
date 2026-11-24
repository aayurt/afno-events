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
import { useScopedI18n } from '@/locales/client'
import { getCardImageUrl } from '@/utilities/getCardImageUrl'
import {
  Users,
  Plus,
  LogIn,
  User,
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
  const img = user && user.image && typeof user.image === 'object' && user.image.url ? user.image.url : null
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
  const t = useScopedI18n('circles') as (
    key: string,
    params?: Record<string, string | number>,
  ) => string
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
        setError(t('loadFailed', { status: res.status }))
        return
      }
      const data = await res.json()
      setCircles(data.docs || [])
      setError(null)
    } catch {
      setError(t('loadFailedGeneric'))
    }
  }, [t])

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
        setCreateError(data.errors?.[0]?.message || t('createFailed', { status: res.status }))
        return
      }
      setCreateOpen(false)
      setName('')
      setDescription('')
      await load()
      router.push(`/app/circles/${data.doc?.id ?? data.id}`)
    } catch {
      setCreateError(t('createNetworkError'))
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
        setJoinError(data.error || t('joinFailed', { status: res.status }))
        return
      }
      setJoinOpen(false)
      setCode('')
      await load()
      router.push(`/app/circles/${data.id}`)
    } catch {
      setJoinError(t('joinNetworkError'))
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
        <div className="w-full max-w-md text-center p-8 space-y-6 rounded-[10px] border border-alpine-500/35 bg-alpine-50/70 dark:bg-slate-900 shadow-card">
          <Users size={48} className="mx-auto text-alpine-600" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('signInTitle')}</h1>
            <p className="text-muted-foreground text-sm">{t('signInDesc')}</p>
          </div>
          <div className="pt-2" />
          <Link href="/app/auth/login?redirect=/app/circles">
            <Button size="lg" className="w-full rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white font-mono text-xs uppercase tracking-wider shadow-sm">{t('signIn')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-[4px] border-alpine-500/30 text-xs font-mono uppercase tracking-wider" onClick={() => setJoinOpen(true)}>
            <LogIn size={14} /> {t('join')}
          </Button>
          <Button className="gap-2 rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white font-mono text-xs uppercase tracking-wider shadow-sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> {t('newSquad')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-[6px] p-4 text-xs font-mono">
          {error}
        </div>
      )}

      {circles.length === 0 && !error ? (
        <div className="rounded-[10px] border border-alpine-500/35 bg-alpine-50/60 dark:bg-slate-900 shadow-card">
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-alpine-500/10 flex items-center justify-center">
              <Users size={28} className="text-alpine-600" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{t('emptyTitle')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('emptyDesc')}</p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" className="gap-2 rounded-[4px] border-alpine-500/30 font-mono text-xs uppercase tracking-wider" onClick={() => setJoinOpen(true)}>
                <LogIn size={14} /> {t('joinWithCode')}
              </Button>
              <Button className="gap-2 rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white font-mono text-xs uppercase tracking-wider shadow-sm" onClick={() => setCreateOpen(true)}>
                <Plus size={14} /> {t('createSquad')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {circles.map((circle) => {
            const members = circle.members || []
            const liveCount = 0 // filled in by detail page polling
            return (
              <Link key={circle.id} href={`/app/circles/${circle.id}`}>
                <div className="group overflow-hidden hover:shadow-card-hover transition-all border border-alpine-500/30 rounded-[10px] bg-alpine-50/60 dark:bg-slate-900 shadow-card h-full flex flex-col">
                  <div className="relative h-32 bg-gradient-to-br from-alpine-500/20 to-alpine-500/5">
                    {getCardImageUrl(circle.coverImage) ? (
                      <img
                        src={getCardImageUrl(circle.coverImage)!}
                        alt={circle.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users size={40} className="text-alpine-600/40" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="bg-black/60 text-white text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] backdrop-blur">
                        {members.length} {members.length === 1 ? t('memberOne') : t('memberMany')}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-base font-semibold group-hover:text-alpine-600 transition-colors">
                        {circle.name}
                      </p>
                      {circle.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {circle.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex -space-x-2">
                        {members.slice(0, 5).map((m) => (
                          <MemberAvatar key={typeof m.user === 'object' ? m.user.id : m.user} user={m.user} size="sm" />
                        ))}
                        {members.length > 5 && (
                          <div className="w-7 h-7 rounded-full bg-muted text-xs font-mono flex items-center justify-center ring-2 ring-background shrink-0">
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
                            title={t('copyInvite')}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedCode === circle.id ? (
                              <Check size={16} className="text-green-500" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        )}
                        <ArrowRight size={16} className="text-muted-foreground group-hover:text-alpine-600 transition-colors" />
                      </div>
                    </div>
                    {liveCount > 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {liveCount} sharing live now
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create circle dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogHeader onClose={() => setCreateOpen(false)}>{t('createTitle')}</DialogHeader>
        <DialogContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('squadName')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('squadNamePlaceholder')}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('descriptionOptional')}</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
              />
            </div>
            {createError && (
              <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" className="flex-1" disabled={creating || !name.trim()}>
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creating ? t('creating') : t('create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogHeader onClose={() => setJoinOpen(false)}>{t('joinTitle')}</DialogHeader>
        <DialogContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('inviteCode')}</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('inviteCodePlaceholder')}
                autoFocus
                className="font-mono uppercase tracking-widest"
              />
              <p className="text-xs text-muted-foreground">{t('joinHint')}</p>
            </div>
            {joinError && (
              <p className="text-sm text-red-600 dark:text-red-400">{joinError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setJoinOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" className="flex-1" disabled={joining || !code.trim()}>
                {joining ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {joining ? t('joining') : t('join')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
