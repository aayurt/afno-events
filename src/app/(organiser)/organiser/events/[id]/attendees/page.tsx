'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Loader2, Search, Ticket, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'

type Attendee = {
  id: number
  code: string
  status: string
  checkedInAt: string | null
  attendeeName: string
  attendeeEmail: string
  orderId: number | null
  orderStatus: string | null
  eventName: string
}

type EventSummary = {
  total: number
  checkedIn: number
  revenue: number
}

type EventInfo = {
  id: number
  title: string
  startDatetime: string | null
}

export default function AttendeesPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [summary, setSummary] = useState<EventSummary>({ total: 0, checkedIn: 0, revenue: 0 })
  const [docs, setDocs] = useState<Attendee[]>([])
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch(`/api/organiser/events/${id}/attendees`, { credentials: 'include' })
        if (!active) return
        if (res.status === 401) {
          router.replace('/organiser/login')
          return
        }
        if (res.status === 403 || res.status === 404) {
          setError(res.status === 403 ? 'You do not have access to this event.' : 'Event not found.')
          setLoading(false)
          return
        }
        const data = await res.json()
        if (!active) return
        setEvent(data.event)
        setSummary(data.summary)
        setDocs(data.docs || [])
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to load attendees')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id, router])

  const filtered = useMemo(() => {
    if (!search.trim()) return docs
    const q = search.toLowerCase()
    return docs.filter(
      (d) =>
        d.attendeeName.toLowerCase().includes(q) ||
        d.attendeeEmail.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q),
    )
  }, [docs, search])

  const copyPublicLink = () => {
    if (!event) return
    const url = `${window.location.origin}/app/events/${event.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-8">
        <div>
          <Skeleton className="h-4 w-32 rounded mb-3" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        </div>

        {/* 3 Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/80 p-5 space-y-2">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-7 w-24 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          ))}
        </div>

        {/* Search Bar Skeleton */}
        <Skeleton className="h-11 w-full rounded-xl" />

        {/* Attendees list rows skeleton */}
        <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <p className="text-destructive font-semibold">{error || 'Event not found'}</p>
        <Button asChild variant="outline">
          <Link href="/organiser/dashboard">Return to dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <OrganiserHeader title="Attendees" />
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div>
        <Link
          href="/organiser/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {event.startDatetime
                ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Date TBA'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyPublicLink} className="gap-2">
              <Copy size={14} /> Copy link
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Attendees ({summary.total})</h2>
          <div className="flex items-center gap-2">
            <Search size={16} />
            <Input
              placeholder="Search attendees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <Card className="rounded-lg border border-border p-4">
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Tickets sold</p>
                <p className="font-bold">{summary.total}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Checked-in</p>
                <p className="font-bold text-primary">{summary.checkedIn}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Revenue</p>
                <p className="font-bold text-primary">£{summary.revenue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="overflow-x-auto">
          <table className="w-full rounded-lg border border-border">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Code</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Checked-in</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Order</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !search.trim() && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">
                    No attendees found
                  </td>
                </tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-border">
                  <td className="px-4 py-2 font-medium">{d.attendeeName}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{d.attendeeEmail}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <code className="text-xs font-mono text-muted-foreground">{d.code}</code>
                  </td>
                  <td className="px-4 py-2">
                    <span className={d.status === 'checked-in' ? 'text-primary' : 'text-muted-foreground'}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {d.checkedInAt ? new Date(d.checkedInAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {d.orderId ? (
                      <>
                        <span className="font-mono text-xs text-muted-foreground">{d.orderId}</span>
                        {d.orderStatus && <span className="ml-2 text-xs font-medium">{d.orderStatus}</span>}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </>
  )
}