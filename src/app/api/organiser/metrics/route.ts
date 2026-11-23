import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config: configPromise })

  let user: any = (req as any).user ?? null
  if (!user) {
    try {
      const result = await payload.auth({ headers: req.headers, canSetHeaders: false })
      user = result?.user ?? null
    } catch {
      user = null
    }
  }

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantIds = getUserTenantIDs(user)
  if (tenantIds.length === 0 && user.role !== 'super-admin') {
    return NextResponse.json({ error: 'No tenant assigned' }, { status: 403 })
  }

  const where: Record<string, unknown> = {}
  if (user.role !== 'super-admin' || tenantIds.length > 0) {
    where.tenant = { in: tenantIds }
  }

  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Fetch all events for the organiser
  const allEvents = await payload.find({
    collection: 'events',
    where: where as any,
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  })

  const events = allEvents.docs
  const eventIds = events.map((e: any) => e.id)

  // Total events
  const totalEvents = events.length

  // Published events
  const publishedEvents = events.filter((e: any) => e.enabled && e.approvalStatus === 'approved').length

  let paidOrders: any[] = []
  let totalTicketsSold = 0

  if (eventIds.length > 0) {
    const [ordersResult, ticketsResult] = await Promise.all([
      payload.find({
        collection: 'orders',
        where: {
          event: { in: eventIds },
          status: { equals: 'paid' },
        },
        depth: 0,
        limit: 1000,
        overrideAccess: true,
      }),
      payload.count({
        collection: 'tickets',
        where: {
          event: { in: eventIds },
        },
        overrideAccess: true,
      }),
    ])
    paidOrders = ordersResult.docs
    totalTicketsSold = ticketsResult.totalDocs
  }

  const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0)

  // Calculate month-over-month changes
  const eventsThisMonth = events.filter((e: any) => new Date(e.createdAt) >= thisMonth).length
  const eventsLastMonth = events.filter((e: any) => {
    const d = new Date(e.createdAt)
    return d >= lastMonth && d < thisMonth
  }).length
  const eventsChange = eventsLastMonth > 0 ? Math.round(((eventsThisMonth - eventsLastMonth) / eventsLastMonth) * 100) : (eventsThisMonth > 0 ? 100 : 0)

  const publishedThisMonth = events.filter((e: any) => e.enabled && e.approvalStatus === 'approved' && new Date(e.createdAt) >= thisMonth).length
  const publishedLastMonth = events.filter((e: any) => {
    const d = new Date(e.createdAt)
    return e.enabled && e.approvalStatus === 'approved' && d >= lastMonth && d < thisMonth
  }).length
  const publishedChange = publishedLastMonth > 0 ? Math.round(((publishedThisMonth - publishedLastMonth) / publishedLastMonth) * 100) : (publishedThisMonth > 0 ? 100 : 0)

  const ordersThisMonth = paidOrders.filter((o: any) => new Date(o.createdAt) >= thisMonth).length
  const ordersLastMonth = paidOrders.filter((o: any) => {
    const d = new Date(o.createdAt)
    return d >= lastMonth && d < thisMonth
  }).length
  const ticketsChange = ordersLastMonth > 0 ? Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100) : (ordersThisMonth > 0 ? 100 : 0)

  const revenueThisMonth = paidOrders.filter((o: any) => new Date(o.createdAt) >= thisMonth).reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
  const revenueLastMonth = paidOrders.filter((o: any) => {
    const d = new Date(o.createdAt)
    return d >= lastMonth && d < thisMonth
  }).reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
  const revenueChange = revenueLastMonth > 0 ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100) : (revenueThisMonth > 0 ? 100 : 0)

  return NextResponse.json({
    totalEvents,
    publishedEvents,
    totalTicketsSold,
    totalRevenue,
    eventsChange,
    publishedChange,
    ticketsChange,
    revenueChange,
  })
}