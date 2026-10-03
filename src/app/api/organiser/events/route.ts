import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'
import { displayPriceRange } from '@/utilities/pricing'
import { sendEventApprovalEmails } from '@/emails'

/**
 * Events owned by the signed-in organiser (across their tenants).
 * 401 signed out / 403 non-organiser.
 */
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

  if (!isPaid) {
    ticketTypes = [{ name: 'Free Admission', price: 0, description: 'General free admission' }]
  }

  let isTenantVerified = user.role === 'super-admin'
  let tenantDoc: any = null
  if (!isTenantVerified && assignedTenant) {
    tenantDoc = await payload.findByID({
      collection: 'tenants',
      id: assignedTenant,
      overrideAccess: true,
    }).catch(() => null)
    isTenantVerified = Boolean((tenantDoc as any)?.verified || (tenantDoc as any)?.status === 'verified')
  }

  const requestedPublish = body.enabled !== undefined ? !!body.enabled : (body.publish !== undefined ? !!body.publish : true)
  const finalEnabled = isTenantVerified ? requestedPublish : false
  const finalApprovalStatus = isTenantVerified ? 'approved' : (requestedPublish ? 'pending_review' : 'draft')

  const newEvent = await payload.create({
    collection: 'events',
    data: {
      title: body.title,
      description: body.description || '',
      coverImage: body.coverImage ? Number(body.coverImage) : undefined,
      startDatetime: body.startDatetime || new Date().toISOString(),
      endDatetime: body.endDatetime || new Date().toISOString(),
      location: body.location
        ? {
            location: body.location.location || '',
            mapLocation: body.location.mapLocation || body.location.location || '',
            latitude: body.location.latitude !== undefined ? Number(body.location.latitude) : undefined,
            longitude: body.location.longitude !== undefined ? Number(body.location.longitude) : undefined,
          }
        : undefined,
      tags: Array.isArray(body.tags) ? body.tags : [],
      pricing: {
        type: isPaid ? 'paid' : 'free',
        priceRange: isPaid ? displayPriceRange(ticketTypes, body.pricing?.priceRange) : 'Free',
        ticketTypes,
      },
      enabled: finalEnabled,
      isBookable: body.isBookable !== undefined ? !!body.isBookable : true,
      approvalStatus: finalApprovalStatus,
      tenant: typeof assignedTenant === 'string' && /^\d+$/.test(assignedTenant) ? parseInt(assignedTenant, 10) : assignedTenant,
    },
    overrideAccess: true,
  }).catch((err: any) => {
    // Temporary debug for tenant validation failures.
    console.error(
      `[organiser/events] create failed for user ${user?.id} (${user?.email}) tenantIds=${JSON.stringify(tenantIds)} assignedTenant=${JSON.stringify(assignedTenant)}:`,
      err,
    )
    throw err
  })

  // If submitted for review by an unverified organiser, send review email alerts to admins & confirmation to organiser
  if (!isTenantVerified && requestedPublish) {
    try {
      const orgName = (tenantDoc as any)?.name || 'Organiser'
      const venueStr = body.location?.location || body.location?.mapLocation || 'TBA'
      const dateStr = body.startDatetime
        ? new Date(body.startDatetime).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'TBA'

      let coverUrl: string | undefined = undefined
      if (body.coverImage) {
        const mediaDoc = await payload.findByID({
          collection: 'media',
          id: Number(body.coverImage),
          overrideAccess: true,
        }).catch(() => null)
        coverUrl = (mediaDoc as any)?.url || undefined
      }

      await sendEventApprovalEmails(user.email, {
        eventTitle: body.title,
        eventDateText: dateStr,
        eventVenue: venueStr,
        eventPriceRange: isPaid ? displayPriceRange(ticketTypes, body.pricing?.priceRange) : 'Free',
        eventId: newEvent.id,
        organisationName: orgName,
        contactName: user.name || orgName,
        contactEmail: user.email,
        contactPhone: user.phoneNumber || undefined,
        coverImageUrl: coverUrl,
      })
    } catch (emailErr) {
      console.error('Error dispatching event approval emails:', emailErr)
    }
  }

  return NextResponse.json({
    id: newEvent.id,
    pendingApproval: !isTenantVerified && requestedPublish,
  })
}

/**
 * Events owned by the signed-in organiser (across their tenants).
 * 401 signed out / 403 non-organiser.
 */
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
  if (tenantIds.length === 0) {
    // Super-admin with no tenants sees everything; organisers with no tenant see nothing.
    if (user.role !== 'super-admin') return NextResponse.json({ docs: [], totalDocs: 0 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100)
  const page = parseInt(searchParams.get('page') || '1', 10) || 1

  const where: Record<string, unknown> = {}
  if (user.role !== 'super-admin' || tenantIds.length > 0) {
    where.tenant = { in: tenantIds }
  }

  const result = await payload.find({
    collection: 'events',
    where: where as any,
    depth: 1,
    limit,
    page,
    sort: '-startDatetime',
    overrideAccess: true,
  })

  return NextResponse.json({
    docs: result.docs,
    totalDocs: result.totalDocs,
    page: result.page,
    totalPages: result.totalPages,
  })
}
