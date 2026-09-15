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
    depth: 2,
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