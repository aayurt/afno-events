'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  QrCode,
  RotateCcw,
  ScanLine,
  Search,
  Ticket,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked-in' | 'unused'>('all')
  const [copied, setCopied] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

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
    return () => {
      active = false
    }
  }, [id, router])

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      // Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) {
        return false
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesName = d.attendeeName.toLowerCase().includes(q)
        const matchesEmail = d.attendeeEmail.toLowerCase().includes(q)
        const matchesCode = d.code.toLowerCase().includes(q)
        const matchesOrder = d.orderId ? String(d.orderId).includes(q) : false
        if (!matchesName && !matchesEmail && !matchesCode && !matchesOrder) {
          return false
        }
      }
      return true
    })
  }, [docs, search, statusFilter])

  const handleToggleCheckIn = async (attendee: Attendee) => {
    const nextStatus = attendee.status === 'checked-in' ? 'unused' : 'checked-in'
    setTogglingId(attendee.id)
    try {
      const res = await fetch(`/api/organiser/events/${id}/attendees`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: attendee.id, status: nextStatus }),
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update check-in status')
      }
      const updated = await res.json()
      setDocs((prev) =>
        prev.map((d) =>
          d.id === attendee.id ? { ...d, status: updated.status, checkedInAt: updated.checkedInAt } : d
        )
      )
      setSummary((prev) => ({
        ...prev,
        checkedIn: prev.checkedIn + (nextStatus === 'checked-in' ? 1 : -1),
      }))
    } catch (err: any) {
      alert(err.message || 'Check-in update failed')
    } finally {
      setTogglingId(null)
    }
  }

  const exportCSV = () => {
    if (!docs.length) return
    const headers = ['Attendee Name', 'Email', 'Ticket Code', 'Status', 'Checked-In Time', 'Order ID', 'Order Status']
    const rows = filtered.map((d) => [
      `"${d.attendeeName.replace(/"/g, '""')}"`,
      `"${d.attendeeEmail.replace(/"/g, '""')}"`,
      `"${d.code}"`,
      `"${d.status}"`,
      `"${d.checkedInAt ? new Date(d.checkedInAt).toLocaleString('en-GB') : ''}"`,
      `"${d.orderId || ''}"`,
      `"${d.orderStatus || ''}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `attendees-event-${id}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const copyPublicLink = () => {
    if (!event) return
    const url = `${window.location.origin}/app/events/${event.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const attendancePercent =
    summary.total > 0 ? Math.round((summary.checkedIn / summary.total) * 100) : 0

  if (loading) {
    return (
      <>
        <OrganiserHeader title="Attendees" />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-[2px]" />
            <Skeleton className="h-8 w-64 rounded-[4px]" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[6px] border border-alpine-500/20 p-4 space-y-2 bg-white dark:bg-slate-900">
                <Skeleton className="h-3 w-20 rounded-[2px]" />
                <Skeleton className="h-7 w-24 rounded-[4px]" />
              </div>
            ))}
          </div>

          <Skeleton className="h-9 w-full rounded-[4px]" />

          <div className="rounded-[6px] border border-alpine-500/20 p-4 bg-white dark:bg-slate-900 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-[4px]" />
            ))}
          </div>
        </div>
      </>
    )
  }

  if (error || !event) {
    return (
      <>
        <OrganiserHeader title="Attendees" />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
          <p className="text-destructive font-mono font-semibold text-sm">{error || 'Event not found'}</p>
          <Button asChild variant="outline" className="rounded-[4px] font-mono text-xs border-alpine-500/30">
            <Link href="/organiser/dashboard">Return to dashboard</Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <OrganiserHeader title="Attendees" />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/organiser/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
            >
              <ArrowLeft size={13} className="text-alpine-500" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {event.title}
              </h1>
              <span className="px-2 py-0.5 rounded-[3px] bg-alpine-50 text-alpine-700 dark:bg-alpine-950/60 dark:text-alpine-300 border border-alpine-500/30 text-[10px] font-mono font-bold uppercase">
                Attendee Roster
              </span>
            </div>
            <p className="text-xs sm:text-sm font-mono text-muted-foreground mt-0.5">
              {event.startDatetime
                ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Date to be announced'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              size="sm"
              className="gap-1.5 font-mono text-xs h-8 rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white shadow-xs"
            >
              <Link href={`/organiser/scanner?event=${id}`}>
                <ScanLine size={13} /> Open QR Scanner
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={docs.length === 0}
              className="gap-1.5 font-mono text-xs h-8 rounded-[4px] border-alpine-500/35 hover:bg-alpine-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <Download size={13} className="text-alpine-500" /> Export CSV
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={copyPublicLink}
              className="gap-1.5 font-mono text-xs h-8 rounded-[4px] border border-alpine-500/25 hover:bg-alpine-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Public Link'}
            </Button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Sold */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                  Total Tickets
                </span>
                <Users size={14} className="text-alpine-500" />
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100">
                {summary.total}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                Confirmed reservations
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Checked In */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                  Checked-In
                </span>
                <UserCheck size={14} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {summary.checkedIn}
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex-1 h-1.5 bg-alpine-100/60 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${attendancePercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {attendancePercent}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Awaiting Arrival */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                  Pending Arrival
                </span>
                <Clock size={14} className="text-amber-500" />
              </div>
              <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
                {Math.max(0, summary.total - summary.checkedIn)}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                Tickets awaiting scan
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Ticket Revenue */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                  Gross Revenue
                </span>
                <Ticket size={14} className="text-alpine-500" />
              </div>
              <div className="text-2xl font-mono font-bold text-alpine-600 dark:text-alpine-400">
                £{Number(summary.revenue || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                Settled through Stripe
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by guest name, email, ticket code, or order ID..."
              className="pl-9 h-8 rounded-[4px] border-alpine-500/30 text-xs font-mono bg-alpine-50/40 dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-[3px] text-xs font-mono font-medium transition-all border ${
                statusFilter === 'all'
                  ? 'bg-alpine-600 text-white border-alpine-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-alpine-500/25 hover:border-alpine-500'
              }`}
            >
              All ({docs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('checked-in')}
              className={`px-3 py-1 rounded-[3px] text-xs font-mono font-medium transition-all border ${
                statusFilter === 'checked-in'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-alpine-500/25 hover:border-alpine-500'
              }`}
            >
              Checked In ({summary.checkedIn})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unused')}
              className={`px-3 py-1 rounded-[3px] text-xs font-mono font-medium transition-all border ${
                statusFilter === 'unused'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-alpine-500/25 hover:border-alpine-500'
              }`}
            >
              Unused ({Math.max(0, summary.total - summary.checkedIn)})
            </button>
          </div>
        </div>

        {/* Data Grid / Table */}
        <div className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-alpine-500/20 bg-alpine-50/60 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Ticket Code</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Check-In Time</th>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-alpine-500/15">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 px-4 text-slate-400 dark:text-slate-600 font-mono">
                      <Ticket size={28} className="mx-auto mb-2 opacity-40 text-alpine-500" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No attendees found</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {search.trim() ? 'Try adjusting your search criteria' : 'Tickets booked will appear here automatically'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-alpine-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Guest Name */}
                      <td className="px-4 py-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                        {d.attendeeName}
                      </td>

                      {/* Guest Email */}
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {d.attendeeEmail || '—'}
                      </td>

                      {/* Ticket Code */}
                      <td className="px-4 py-3 font-mono">
                        <span className="px-2 py-0.5 rounded-[2px] bg-alpine-50 dark:bg-slate-800 border border-alpine-500/25 text-alpine-950 dark:text-slate-200 text-[11px]">
                          {d.code}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] font-mono text-[10px] font-bold uppercase tracking-wider ${
                            d.status === 'checked-in'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-alpine-50 dark:bg-slate-800 text-alpine-800 dark:text-alpine-300 border border-alpine-500/20'
                          }`}
                        >
                          {d.status === 'checked-in' ? (
                            <>
                              <CheckCircle2 size={11} className="text-emerald-500" /> CHECKED IN
                            </>
                          ) : (
                            <>
                              <Clock size={11} className="text-slate-400" /> UNUSED
                            </>
                          )}
                        </span>
                      </td>

                      {/* Check-in Time */}
                      <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">
                        {d.checkedInAt
                          ? new Date(d.checkedInAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      {/* Order info */}
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {d.orderId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-700 dark:text-slate-300">#{d.orderId}</span>
                            {d.orderStatus && (
                              <span
                                className={`text-[9px] uppercase px-1 py-0.2 rounded-[2px] ${
                                  d.orderStatus === 'paid'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                                    : 'bg-alpine-50 dark:bg-slate-800 text-muted-foreground'
                                }`}
                              >
                                {d.orderStatus}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant={d.status === 'checked-in' ? 'ghost' : 'outline'}
                          onClick={() => handleToggleCheckIn(d)}
                          disabled={togglingId === d.id}
                          className={`h-7 px-2.5 text-[11px] font-mono rounded-[4px] gap-1 ${
                            d.status === 'checked-in'
                              ? 'text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10'
                              : 'bg-alpine-600 hover:bg-alpine-700 text-white border-transparent shadow-xs'
                          }`}
                        >
                          {togglingId === d.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : d.status === 'checked-in' ? (
                            <>
                              <RotateCcw size={11} /> Undo
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={11} /> Check In
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer info */}
          <div className="p-3 border-t border-alpine-500/20 bg-alpine-50/50 dark:bg-slate-900 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>
              Showing {filtered.length} of {docs.length} total attendees
            </span>
            <span>
              Real-time sync enabled
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
