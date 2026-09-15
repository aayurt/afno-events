# Organiser Portal Implementation Plan (Updated & Hardened)

> **For Implementer:** Use subagent-driven development or execute sequentially task-by-task. Each phase ships and deploys independently. Do not skip verification steps.

**Main Goal:** Organisers manage everything about their events — attendees, event creation/editing, ticket pricing — from a dedicated clean UI at `/organiser`, without seeing the complex Payload admin.

**Architecture:** Next.js route-group `(organiser)` renders dedicated layouts (no fan navigation, no Payload chrome). Data flows through role-gated API routes (`/api/organiser/*`) resolving Better Auth sessions via `payload.auth({ headers, canSetHeaders: false })`, enforcing tenant isolation with `getUserTenantIDs(user)`, and interacting with Payload server-side.

**Tech Stack:** Next.js 15 App Router · Payload 3.75 REST/Local API · Better Auth (`@delmaredigital/payload-better-auth`) · PostgreSQL via `@payloadcms/db-postgres` · Tailwind + shadcn/ui · Lucide icons · Resend.

---

## Pre-flight Checklist & Critical Landmines Addressed

1. **FCM / Notification Spam Guard:** `Events.afterChange` hook in `src/collections/Events/index.tsx` unconditionally dispatched notifications on *every* create/update. This plan guards it (Phase 0) so drafts and edits do not trigger notifications.
2. **Slug Misconception:** Events in this codebase do **not** possess a `slug` field. Events use integer `id` (e.g. `/app/events/41`). All routes and share links use numeric `id`.
3. **Free Events Ticket Generation:** An empty `ticketTypes` array results in `orders.items = []`, preventing `Orders.afterChange` from generating tickets. The form and API auto-seed a "Free Admission (£0)" ticket type for free events.
4. **Stripe Price Immutability:** Editing an existing ticket's price requires clearing `stripePriceID` so the `beforeChange` hook creates a new Stripe Price.
5. **App Router File Upload:** Uses in-memory buffer handling for `payload.create({ collection: 'media' })` to avoid ephemeral path errors.
6. **Payload Admin Gate:** Updating `login-form.tsx` alone does not block `/admin` direct access. Phase 3 updates `Users.access.admin` to `isSuperAdmin`.

---

## Phase 0 — Guarding Event Notifications (Prerequisite)

**Objective:** Ensure draft events and routine edits never blast push notifications to production users.

### Task 0.1: Guard `Events.afterChange` against drafts and edits

**File:** `src/collections/Events/index.tsx` (around lines 91–148)

**Change:** Only trigger FCM and in-app notifications if `doc.enabled === true` AND `previousDoc?.enabled !== true` (first time published).

```ts
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Only notify users when an event is PUBLISHED for the first time
        const isNewlyPublished = doc.enabled === true && (!previousDoc || previousDoc.enabled === false)
        if (!isNewlyPublished || !req?.payload) {
          return doc
        }

        try {
          const users = await req.payload.find({
            collection: 'users',
            limit: 1000,
          })
          users.docs.forEach((user) => {
            req.payload.create({
              collection: 'notifications',
              data: {
                user: user.id,
                title: 'Check out for ' + doc.title + ' event.',
                message: doc.description || 'Check out the ' + doc.title + ' event.',
                type: 'event',
                link: `/events/${doc.id}`,
              },
            })
          })
          const ci = typeof doc.coverImage === 'object' ? doc.coverImage : null
          const imageUrl = ci?.url
          const eventTags: string[] = Array.isArray(doc.tags) ? doc.tags : []
          if (eventTags.length > 0) {
            for (const tag of eventTags) {
              try {
                await sendFCMTopicNotification({
                  topic: `category-${tag}`,
                  notification: {
                    title: 'New ' + tag + ' event: ' + doc.title,
                    body: doc.description || 'Check out the ' + doc.title + ' event.',
                    imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
                    id: doc.id,
                  },
                })
              } catch (topicErr) {
                console.error(`FCM topic notification failed for category-${tag}:`, topicErr)
              }
            }
          } else {
            try {
              await sendFCMTopicNotification({
                topic: 'afno-app-event',
                notification: {
                  title: 'Check out for ' + doc.title + ' event.',
                  body: doc.description || 'Check out the ' + doc.title + ' event.',
                  imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
                  id: doc.id,
                },
              })
            } catch (topicErr) {
              console.error('FCM topic notification failed:', topicErr)
            }
          }
        } catch (err) {
          console.error('FCM notification failed (non-fatal):', err)
        }
        return doc
      },
    ],
```

**Verification:**
```bash
npx tsc --noEmit
```

---

## Phase 1 — Attendees: See Who's Coming

**Objective:** Organiser opens an event from `/organiser/dashboard` and views all sold tickets: buyer, status, check-in time, and revenue summary.

### Task 1.1: Attendees API Endpoint

**File:** Create `src/app/api/organiser/events/[id]/attendees/route.ts`

**Contract:** `GET /api/organiser/events/:id/attendees`
- 401 signed out · 403 non-admin · 403 event not owned by organiser's tenants · 404 event not found
- 200 `{ event: { id, title, startDatetime }, summary: { total, checkedIn, revenue }, docs: TicketDoc[] }`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: configPromise })
  const { id } = await ctx.params
  const eventId = parseInt(id, 10)

  if (isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  let user: any = (req as any).user ?? null
  if (!user) {
    const result = await payload.auth({ headers: req.headers, canSetHeaders: false }).catch(() => null)
    user = result?.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const event = await payload.findByID({ collection: 'events', id: eventId, depth: 0 }).catch(() => null)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  if (user.role !== 'super-admin') {
    const tenantIds = getUserTenantIDs(user).map(String)
    const eventTenant = String(
      (event as any).tenant && typeof (event as any).tenant === 'object'
        ? (event as any).tenant.id
        : (event as any).tenant ?? '',
    )
    if (!eventTenant || !tenantIds.includes(eventTenant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const tickets = await payload.find({
    collection: 'tickets',
    where: { event: { equals: eventId } },
    depth: 2, // ticket.order -> buyer
    limit: 1000,
    sort: '-createdAt',
    overrideAccess: true,
  })

  let totalRevenue = 0
  const processedOrders = new Set<number>()

  const docs = tickets.docs.map((t: any) => {
    const order = typeof t.order === 'object' ? t.order : null
    const buyer = order && typeof order.buyer === 'object' ? order.buyer : null

    // Track order revenue once per order for paid orders
    if (order && order.id && !processedOrders.has(order.id)) {
      processedOrders.add(order.id)
      if (order.status === 'paid' && typeof order.totalAmount === 'number') {
        totalRevenue += order.totalAmount
      }
    }

    return {
      id: t.id,
      code: t.code,
      status: t.status,
      checkedInAt: t.checkedInAt ?? null,
      attendeeName: t.attendeeName || buyer?.name || 'Guest',
      attendeeEmail: t.attendeeEmail || buyer?.email || '',
      orderId: order?.id ?? null,
      orderStatus: order?.status ?? null,
      eventName: event.title,
    }
  })

  const summary = {
    total: docs.length,
    checkedIn: docs.filter((d) => d.status === 'checked-in').length,
    revenue: totalRevenue,
  }

  return NextResponse.json({
    event: { id: event.id, title: event.title, startDatetime: event.startDatetime },
    summary,
    docs,
  })
}
```

**Verification:**
```bash
npx tsc --noEmit
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/organiser/events/41/attendees # 401
```

---

### Task 1.2: Attendees Page UI

**File:** Create `src/app/(organiser)/organiser/events/[id]/attendees/page.tsx`

**Features:**
- Header with back link `← Dashboard`, event title, date, and "Copy public event link" button (`/app/events/${id}`).
- 3 Stat Cards: Total Tickets, Checked In, Total Revenue (£).
- Search input: Live client filter on name, email, and ticket code.
- Status badges: Reusing existing styling tokens (`bg-emerald-500/10 text-emerald-500` for checked-in, `bg-muted` for unused).
- Empty state: "No tickets sold yet".

```tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Loader2, Search, Ticket, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
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
              <Copy size={14} /> {copied ? 'Link Copied!' : 'Copy Event Link'}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/app/events/${event.id}`} target="_blank" className="gap-1.5">
                View Public <ExternalLink size={14} />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Ticket size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tickets Sold</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Checked In</p>
              <p className="text-2xl font-bold">{summary.checkedIn}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">£{summary.revenue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Attendees ({filtered.length})</h2>
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, code..."
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              {search ? 'No attendees match your search.' : 'No tickets sold yet for this event.'}
            </CardContent>
          </Card>
        ) : (
          <div className="border border-border rounded-2xl bg-card overflow-hidden divide-y divide-border">
            {filtered.map((doc) => (
              <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{doc.attendeeName}</p>
                  <p className="text-xs text-muted-foreground truncate">{doc.attendeeEmail || 'No email'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                    {doc.code.slice(0, 10)}…
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded capitalize ${
                      doc.status === 'checked-in'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : doc.status === 'cancelled' || doc.status === 'refunded'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### Task 1.3: Link Dashboard to Attendees

**File:** `src/app/(organiser)/organiser/dashboard/page.tsx`

**Change:** Update `EventRow` (around lines 221–266) to add an explicit "Attendees" link button.

```tsx
function EventRow({ event }: { event: EventDoc }) {
  const img = coverUrl(event.coverImage)
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-3 hover:border-primary/50 transition-colors">
      <Link href={`/app/events/${event.id}`} className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
          {img ? (
            <img src={img} alt="" className="w-full h-full object-cover" />
          ) : (
            <Calendar size={20} className="text-muted-foreground/40" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{event.title}</p>
            {event.enabled === false && (
              <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                Draft
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            {event.startDatetime && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(event.startDatetime).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
            {event.location?.location && (
              <span className="flex items-center gap-1 truncate max-w-[16rem]">
                <MapPin size={12} />
                <span className="truncate">{event.location.location}</span>
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
          <Link href={`/organiser/events/${event.id}/attendees`}>
            <Users size={13} /> Attendees
          </Link>
        </Button>
      </div>
    </div>
  )
}
```

**Verification:**
```bash
npx tsc --noEmit
```

---

## Phase 2 — Event Self-Service: Create & Edit

### Task 2.1: Media Upload Endpoint (Poster Images)

**File:** Create `src/app/api/organiser/media/route.ts`

**Implementation:**
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config: configPromise })

  let user: any = (req as any).user ?? null
  if (!user) {
    const result = await payload.auth({ headers: req.headers, canSetHeaders: false }).catch(() => null)
    user = result?.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })

  const MAX_SIZE = 25 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 413 })
  }

  const tenantIds = getUserTenantIDs(user)
  const tenantId = tenantIds.length > 0 ? tenantIds[0] : null

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: file.name,
        ...(tenantId ? { tenant: tenantId } : {}),
      },
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
      overrideAccess: true,
    })

    return NextResponse.json({ id: doc.id, url: doc.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
```

---

### Task 2.2: Create Event Endpoint

**File:** Extend `src/app/api/organiser/events/route.ts` with `POST`

**Implementation:**
```ts
export async function POST(req: NextRequest) {
  const payload = await getPayload({ config: configPromise })

  let user: any = (req as any).user ?? null
  if (!user) {
    const result = await payload.auth({ headers: req.headers, canSetHeaders: false }).catch(() => null)
    user = result?.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantIds = getUserTenantIDs(user)
  if (user.role !== 'super-admin' && tenantIds.length === 0) {
    return NextResponse.json({ error: 'No tenant assigned to organiser account' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || !body.title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Tenant selection: validate if passed, otherwise default to first tenant
  let assignedTenant = tenantIds[0]
  if (body.tenantId) {
    const tid = Number(body.tenantId)
    if (user.role === 'super-admin' || tenantIds.includes(tid)) {
      assignedTenant = tid
    } else {
      return NextResponse.json({ error: 'Unauthorized tenant selection' }, { status: 403 })
    }
  }

  const isPaid = body.pricing?.type === 'paid'
  let ticketTypes = isPaid ? body.pricing?.ticketTypes || [] : []

  // Crucial: Free events must seed a free admission tier so orders can generate tickets!
  if (!isPaid) {
    ticketTypes = [{ name: 'Free Admission', price: 0, description: 'General free admission' }]
  }

  const newEvent = await payload.create({
    collection: 'events',
    data: {
      title: body.title,
      description: body.description || '',
      coverImage: body.coverImage ? Number(body.coverImage) : undefined,
      startDatetime: body.startDatetime || new Date().toISOString(),
      endDatetime: body.endDatetime || new Date().toISOString(),
      location: body.location?.location ? { location: body.location.location } : undefined,
      tags: Array.isArray(body.tags) ? body.tags : [],
      pricing: {
        type: isPaid ? 'paid' : 'free',
        priceRange: isPaid ? body.pricing?.priceRange || '' : 'Free',
        ticketTypes,
      },
      enabled: !!body.publish,
      isBookable: true,
      tenant: assignedTenant,
    },
    overrideAccess: true,
  })

  return NextResponse.json({ id: newEvent.id })
}
```

---

### Task 2.3: Single Event GET / PATCH / DELETE Endpoint

**File:** Create `src/app/api/organiser/events/[id]/route.ts`

**Implementation:**
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

async function resolveAuthAndEvent(req: NextRequest, idParam: string) {
  const payload = await getPayload({ config: configPromise })
  const eventId = parseInt(idParam, 10)
  if (isNaN(eventId)) return { error: 'Invalid ID', status: 400 }

  let user: any = (req as any).user ?? null
  if (!user) {
    const result = await payload.auth({ headers: req.headers, canSetHeaders: false }).catch(() => null)
    user = result?.user ?? null
  }
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (user.role !== 'admin' && user.role !== 'super-admin') return { error: 'Forbidden', status: 403 }

  const event = await payload.findByID({ collection: 'events', id: eventId, depth: 1 }).catch(() => null)
  if (!event) return { error: 'Event not found', status: 404 }

  if (user.role !== 'super-admin') {
    const tenantIds = getUserTenantIDs(user).map(String)
    const eventTenant = String(
      (event as any).tenant && typeof (event as any).tenant === 'object'
        ? (event as any).tenant.id
        : (event as any).tenant ?? '',
    )
    if (!eventTenant || !tenantIds.includes(eventTenant)) {
      return { error: 'Forbidden', status: 403 }
    }
  }

  return { payload, user, event, eventId }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const resolved = await resolveAuthAndEvent(req, id)
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }
  return NextResponse.json(resolved.event)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const resolved = await resolveAuthAndEvent(req, id)
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { payload, event, eventId } = resolved
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body required' }, { status: 400 })

  const isPaid = body.pricing?.type === 'paid'
  let ticketTypes = isPaid ? body.pricing?.ticketTypes || [] : []

  if (!isPaid) {
    ticketTypes = [{ name: 'Free Admission', price: 0, description: 'General free admission' }]
  } else {
    // Stripe price immutability: if price changed, clear stripePriceID so beforeChange recreates it!
    const existingTypes = ((event as any).pricing?.ticketTypes || []) as any[]
    ticketTypes = ticketTypes.map((tt: any) => {
      const existing = existingTypes.find((e) => e.name === tt.name)
      if (existing && existing.price !== tt.price) {
        return { ...tt, stripePriceID: null }
      }
      return tt
    })
  }

  const updateData: any = {}
  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.coverImage !== undefined) updateData.coverImage = body.coverImage ? Number(body.coverImage) : null
  if (body.startDatetime !== undefined) updateData.startDatetime = body.startDatetime
  if (body.endDatetime !== undefined) updateData.endDatetime = body.endDatetime
  if (body.location !== undefined) updateData.location = { location: body.location?.location || '' }
  if (body.tags !== undefined) updateData.tags = body.tags
  if (body.publish !== undefined) updateData.enabled = !!body.publish

  updateData.pricing = {
    type: isPaid ? 'paid' : 'free',
    priceRange: isPaid ? body.pricing?.priceRange || '' : 'Free',
    ticketTypes,
  }

  const updated = await payload.update({
    collection: 'events',
    id: eventId,
    data: updateData,
    overrideAccess: true,
  })

  return NextResponse.json({ id: updated.id })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const resolved = await resolveAuthAndEvent(req, id)
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  // Soft unpublish/disable
  await resolved.payload.update({
    collection: 'events',
    id: resolved.eventId,
    data: { enabled: false },
    overrideAccess: true,
  })

  return NextResponse.json({ success: true })
}
```

---

### Task 2.4: Shared `EventForm` Component

**File:** Create `src/components/organiser/EventForm.tsx`

**Features:**
- Cover image picker with upload progress to `/api/organiser/media`.
- Start/end datetime pickers.
- Tags multi-select chips from `TAG_OPTIONS`.
- Free vs Paid selector. If Paid, repeater rows for ticket types (`name`, `price`, `description`).
- "Publish immediately" checkbox toggle.
- Submit button with spinner.

---

### Task 2.5: New & Edit Pages

- **File 1:** Create `src/app/(organiser)/organiser/events/new/page.tsx`
  Renders `<EventForm onSubmit={createEvent} submitLabel="Create Event" />`.
- **File 2:** Create `src/app/(organiser)/organiser/events/[id]/edit/page.tsx`
  Loads event via `GET /api/organiser/events/[id]`, renders `<EventForm initial={event} onSubmit={updateEvent} submitLabel="Save Changes" />`.

---

### Task 2.6: Dashboard "New Event" Button & Edit Links

**File:** `src/app/(organiser)/organiser/dashboard/page.tsx`

**Changes:**
1. Turn "New Event" quick action card into `<Link href="/organiser/events/new">`.
2. Add an "Edit" pencil button beside the "Attendees" button in `EventRow`.

---

## Phase 3 — Keep Organisers Out of Payload Admin

### Task 3.1: Restrict Payload Admin to Super-Admins

**File:** `src/collections/Users/index.ts` (around line 50)

**Change:**
```ts
admin: ({ req: { user } }) => {
  return Boolean(user && user.role === 'super-admin')
},
```
Now Payload's internal admin gate rejects anyone with `role === 'admin'`.

### Task 3.2: Role-Aware Login Redirect

**File:** `src/components/auth/login-form.tsx` (in `handleLogin` and `checkSession`)

**Change:**
```ts
const role = user?.role
const target = afterLoginPath === '/admin' && role === 'admin' ? '/organiser/dashboard' : afterLoginPath
```

---

## Verification Runbook

1. **Phase 0:** Run `npx tsc --noEmit`. Verify draft updates do not send FCM notifications.
2. **Phase 1:** Check attendees list:
   `curl -s http://localhost:3000/api/organiser/events/41/attendees` returns 401 unauthenticated.
   Login as organiser → open dashboard → click Attendees → renders table and stats cards with correct revenue.
3. **Phase 2:**
   - Create a draft event with a poster image and 2 paid ticket types.
   - Confirm it appears on the dashboard as `Draft`.
   - Edit the event and toggle "Publish".
   - Confirm event appears at `/app/events/:id`.
4. **Phase 3:**
   - Sign in as an organiser account at `/admin` → redirects to `/organiser/dashboard`.
   - Direct navigation to `/admin` as organiser displays Access Denied.
