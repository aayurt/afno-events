# Organiser Portal Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task, or execute sequentially. Each phase ships and deploys independently.

**Main Goal:** Organisers manage everything about their events — attendees, event creation/editing, ticket pricing — from a dedicated clean UI at `/organiser`, without ever seeing the complex Payload admin.

**Why:** Organisers today are dropped into the raw Payload admin (Posts, Pages, Forms, Redirects, GraphQL…) where all they need is: "my events, my ticket holders, my door scanner". The portal foundation (login, role gate, dashboard shell) already ships — commit `b421a9c`.

**Architecture:** Next.js route-group `(organiser)` renders its own layouts (no fan bottom-nav, no Payload chrome). Data flows through dedicated role-gated API routes (`/api/organiser/*`) that resolve the Better Auth session via `payload.auth({ headers, canSetHeaders: false })`, enforce tenant ownership with `getUserTenantIDs()`, and talk to Payload server-side with `overrideAccess: true` only after the ownership check. The existing Events `beforeChange` hook auto-creates Stripe products/prices for paid events — the portal rides on that, it does not reimplement it.

**Tech Stack:** Next.js 15 App Router · Payload 3.75 REST/local API · Better Auth (`@delmaredigital/payload-better-auth`) · Tailwind + shadcn/ui · Lucide icons · Resend (transactional email, already wired).

**Current state (already done):**
- `/organiser/login` — dedicated login, fan-account detection
- `/organiser/dashboard` — tenants, quick actions, upcoming/past event lists
- `/api/organiser/me` — session + tenants (401/403 semantics)
- `/api/organiser/events` — GET organiser's events (tenant-filtered server-side)

**Testing note:** this repo has no JS test runner (tests exist only in the Flutter app). Verification = `tsc --noEmit` for touched files, VPS build, curl contract checks against production, manual UI pass. TDD is intentionally not applied; instead each task ends with a verifiable curl or page-render check.

**Deployment ritual (every phase):**
```bash
cd ~/Projects/supreme/afno-events
rsync changed files → root@82.165.181.153:/var/www/vhosts/afnoevents.co.uk/…   # same paths as repo
ssh root@82.165.181.153 'source ~/.nvm/nvm.sh && cd /var/www/vhosts/afnoevents.co.uk \
  && NODE_OPTIONS="--max-old-space-size=2048 --no-deprecation" pnpm build:local \
  && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ \
  && ln -sfn /var/www/vhosts/afnoevents.co.uk/public/media .next/standalone/public/media \
  && pm2 reload multi-tenant-portfolio --update-env && pm2 save'
git commit + git push origin main
```

---

## Phase 1 — Attendees: see who's coming (read-only, highest value, zero risk)

**Objective:** Organiser opens an event and sees every sold ticket: buyer, quantity, status, check-in state — with search and revenue summary.

### Task 1.1: Attendees API endpoint

**Files:**
- Create: `src/app/api/organiser/events/[id]/attendees/route.ts`

**Contract:** `GET /api/organiser/events/:id/attendees`
- 401 signed out · 403 non-admin · 403 event not owned by organiser's tenants
- 200 `{ event: {id,title,startDatetime}, summary: { total, checkedIn, revenue }, docs: TicketDoc[] }`

**Implementation (complete):**
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: configPromise })
  const { id } = await ctx.params

  let user: any = (req as any).user ?? null
  if (!user) {
    const result = await payload.auth({ headers: req.headers, canSetHeaders: false }).catch(() => null)
    user = result?.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const event = await payload.findByID({ collection: 'events', id, depth: 0 }).catch(() => null)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Ownership: event.tenant must be one of the organiser's tenants
  if (user.role !== 'super-admin') {
    const tenantIds = getUserTenantIDs(user).map(String)
    const eventTenant = String((event as any).tenant && typeof (event as any).tenant === 'object' ? (event as any).tenant.id : (event as any).tenant ?? '')
    if (!eventTenant || !tenantIds.includes(eventTenant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const tickets = await payload.find({
    collection: 'tickets',
    where: { event: { equals: id } },
    depth: 2, // ticket.order -> buyer
    limit: 1000,
    sort: '-createdAt',
    overrideAccess: true,
  })

  const docs = tickets.docs.map((t: any) => ({
    id: t.id,
    code: t.code,
    status: t.status,
    checkedInAt: t.checkedInAt ?? null,
    attendeeName: t.attendeeName ?? t.order?.buyer?.name ?? null,
    attendeeEmail: t.attendeeEmail ?? t.order?.buyer?.email ?? null,
    price: t.order?.pricing?.priceRange ?? t.order?.amount ?? null, // adjust to real order shape on first run
    eventName: event.title,
  }))

  const summary = {
    total: docs.length,
    checkedIn: docs.filter((d) => d.status === 'checked-in').length,
    revenue: docs.filter((d) => d.status !== 'refunded' && d.status !== 'cancelled').length, // swap for real amounts when confirmed
  }

  return NextResponse.json({ event: { id: event.id, title: event.title, startDatetime: event.startDatetime }, summary, docs })
}
```
⚠️ First run: `console.log(JSON.stringify(tickets.docs[0], null, 2))` one ticket to confirm the real order/price field names, then fix the `price` mapping — do not guess.

**Verify:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://afnoevents.co.uk/api/organiser/events/41/attendees   # expect 401
# signed-in organiser browser: expect 200 + docs
```

### Task 1.2: Attendees page UI

**Files:**
- Create: `src/app/(organiser)/organiser/events/[id]/attendees/page.tsx`

**Contents:** client component. Fetch the endpoint above. Render:
- Header: back link `← Dashboard`, event title, date
- Summary strip: 3 stat cards (Tickets sold / Checked-in / Count summary)
- Search input (client-side filter on name/email/code)
- Table rows: name, email, status badge (reuse `statusBadgeClasses` pattern from `src/app/(app)/app/tickets/ticket-data.ts`), ticket code (mono), check-in time
- Empty state: "No tickets sold yet — share your event page" + copy-link button (`navigator.clipboard.writeText(location.origin + '/app/events/' + slug)`)

**Verify:** build, open `/organiser/dashboard` → click an event → attendees page renders with real data for event 39/40/41.

### Task 1.3: Dashboard links + ship Phase 1

**Files:**
- Modify: `src/app/(organiser)/organiser/dashboard/page.tsx` — `EventRow` gets an "Attendees →" affordance (whole row already links to public page; add a small explicit Link to `/organiser/events/${id}/attendees` inside the row, stopPropagation not needed if the row Link is removed in favor of two explicit links: title → public page, "Attendees" → portal page)

**Verify:** dashboard → attendees navigation works for both upcoming and past events.
**Commit:** `feat(organiser): attendee list per event with search + summary`

---

## Phase 2 — Event self-service: create & edit (the core ask)

**Objective:** Organiser creates a draft event (title, poster, venue, date, tags, free/paid pricing with ticket types), edits it anytime, and publishes when ready. Stripe prices auto-create via the existing hook.

### Task 2.1: Media upload endpoint (poster images)

**Files:**
- Create: `src/app/api/organiser/media/route.ts`

**Contract:** `POST multipart/form-data` field `file`. Same auth pattern as Task 1.1 (admin roles only). Creates a Media doc via `payload.create({ collection: 'media', data: { alt: file.name, tenant: <first tenant> }, filePath })` → returns `{ id, url }`. Reject >25 MB and non-images (reuse the 25MB constant from `src/collections/Users/index.ts` avatar endpoint).
**Why an endpoint:** the portal needs the created media **id** for `coverImage`, and forcing `tenant` keeps multi-tenant queries consistent.
**Verify:** curl with a session cookie posting a small jpg → `{ id, url }` → file appears under `public/media/`.

### Task 2.2: Create event endpoint

**Files:**
- Create: `src/app/api/organiser/events/route.ts` (extend existing file — add `POST` beside `GET`)

**Contract:** `POST /api/organiser/events` body:
```ts
{
  title: string            // required
  description?: string
  coverImage?: number      // media id from Task 2.1
  location?: { location: string }
  startDatetime?: string   // ISO
  endDatetime?: string
  tags?: string[]          // subset of TAG_OPTIONS values
  pricing?: {
    type: 'free' | 'paid'
    priceRange?: string    // display text for paid
    ticketTypes?: { name: string; price: number; description?: string }[]
  }
  publish?: boolean        // false = save as draft (enabled: false)
}
```
**Rules encoded:**
- Role gate identical to GET
- Force `tenant` = organiser's first tenant (super-admin may pass explicit `tenantId`)
- Force `enabled: !!publish`
- Do **not** accept `slug`, `stripeProductID`, `stripePriceID` from the client — generated server-side by existing hooks
- Paid events: pass `pricing.ticketTypes` through untouched; the Events `beforeChange` hook creates the Stripe product/prices. If the hook requires `stripeProductID` to be absent on create, that is already the case.
- Return the created doc `{ id, slug }`

**Verify:** curl POST as organiser → 200 + row in `events` with `enabled=false`, correct tenant; Payload admin (super-admin) sees it.

### Task 2.3: Update + publish endpoints

**Files:**
- Create: `src/app/api/organiser/events/[id]/route.ts` — `PATCH` (same body as POST, all optional) and `DELETE` (soft: set `enabled:false`; hard delete stays super-admin/Payload-only)

**Rules:** ownership check exactly like Task 1.1; never allow client to change `tenant`; `publish: true` → `enabled: true`.
**Verify:** PATCH title on own event → 200; PATCH other organiser's event id → 403.

### Task 2.4: Shared EventForm component

**Files:**
- Create: `src/components/organiser/EventForm.tsx`

**Shape:** client component, props `{ initial?: EventDoc; onSubmit: (body) => Promise<void>; submitLabel: string }`. Sections (single page, generous spacing, shadcn components):
1. **Basics** — Title*, Description (textarea)
2. **Poster** — image picker: file input → POST /api/organiser/media → preview + hidden `coverImage` id
3. **When & where** — start/end datetime-local inputs (send as ISO), venue text input (`location.location`)
4. **Category** — chips multi-select from `TAG_OPTIONS` (`src/config/tags`)
5. **Tickets** — segmented control Free | Paid.
   - Free → nothing more
   - Paid → priceRange display text + ticket-types repeater rows (`name`, `price` number, `description`) with add/remove; helper text "Stripe products are created automatically when you publish"
6. **Publish toggle** — checkbox "Ready for the public" (maps to `publish`)
- Client validation: title required; paid requires ≥1 ticket type with price ≥ 0; start date required for publish

### Task 2.5: New + Edit pages

**Files:**
- Create: `src/app/(organiser)/organiser/events/new/page.tsx` — renders `<EventForm onSubmit={POST /api/organiser/events}>`, on success `router.push('/organiser/dashboard')`
- Create: `src/app/(organiser)/organiser/events/[id]/edit/page.tsx` — fetch `/api/organiser/events` list and find by id (or extend the events endpoint with `?id=`), render `<EventForm initial=… onSubmit={PATCH}>`, plus a "View public page" link and "Attendees" link in a page header

**Verify:** full loop on production with a test event: create draft → visible in dashboard as Draft → edit → publish → appears on `/app/events` (enabled filter) → unpublish → gone from public list. Delete the test event afterwards.

### Task 2.6: Dashboard "New Event" action + ship Phase 2

**Files:**
- Modify: `src/app/(organiser)/organiser/dashboard/page.tsx` — "New Event" card becomes a Link to `/organiser/events/new` (remove the "contact us" placeholder); `EventRow` gains an edit pencil link to `/organiser/events/${id}/edit`

**Commit:** `feat(organiser): self-service event create/edit with poster upload, ticket types, publish toggle`

---

## Phase 3 — Keep organisers out of Payload admin entirely

**Objective:** Organiser-role accounts never land in or need the Payload admin; super-admin keeps everything.

### Task 3.1: Role-aware admin login redirect

**Files:**
- Modify: `src/components/auth/login-form.tsx` (`handleLogin` ~line 133 and `checkSession` ~line 105)

**Logic:** where `afterLoginPath` is applied, branch:
```ts
const role = user?.role
const target = afterLoginPath === '/admin' && role === 'admin' ? '/organiser/dashboard' : afterLoginPath
```
Super-admin → `/admin` unchanged. This component serves the Payload admin login view (configured in `src/plugins/index.ts` `createBetterAuthPlugin.admin`), so organisers signing in at `/admin` bounce to the portal automatically.

### Task 3.2: Portal login cross-link

**Files:**
- Modify: `src/app/(organiser)/organiser/login/page.tsx` — after successful organiser sign-in nothing changes; but if a super-admin signs in here, route them to `/admin` instead of the portal (they may prefer full admin).

### Task 3.3: Verify + ship Phase 3

**Verify:** sign in as `sunnyevents@…` (role admin) at `/admin` → lands on `/organiser/dashboard`; sign in as super+admin@gmail.com → lands on `/admin`; fan account at `/admin` still gets "Access Denied" card.
**Commit:** `feat(auth): role-aware login redirect — organisers to portal, super-admins to payload admin`

---

## Explicitly out of scope (YAGNI — revisit only with real demand)

- Refunds/cancellations in the portal (Stripe dashboard + Payload admin cover this; super-admin only)
- Staff/volunteer sub-accounts with scanner-only roles
- Event cloning, recurring events, seat maps
- Nepali i18n on the portal (English-first; fan app stays i18n)
- Custom domains per organiser

## Suggested execution order

| Phase | Ships | Risk | Why this order |
|---|---|---|---|
| 1 | Attendee list | None (read-only) | Immediate value for the 9 live organisers; informs what fields Phase 2's form must respect |
| 2 | Create/edit events | Medium (writes) | Core objective; Stripe hook does the heavy lifting; drafts make it safe |
| 3 | Redirect wiring | Trivial | Polish after the portal can actually absorb organisers |
