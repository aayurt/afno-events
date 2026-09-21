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

  const { payload, user, event, eventId } = resolved
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body required' }, { status: 400 })

  const isPaid = body.pricing?.type === 'paid'
  let ticketTypes = isPaid ? body.pricing?.ticketTypes || [] : []

  if (!isPaid) {
    ticketTypes = [{ name: 'Free Admission', price: 0, description: 'General free admission' }]
  } else {
    // If ticket price changed, clear stripePriceID so beforeChange hook creates a fresh immutable price
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
  if (body.location !== undefined) {
    updateData.location = body.location
      ? {
          location: body.location.location || '',
          mapLocation: body.location.mapLocation || body.location.location || '',
          latitude: body.location.latitude !== undefined ? Number(body.location.latitude) : undefined,
          longitude: body.location.longitude !== undefined ? Number(body.location.longitude) : undefined,
        }
      : null
  }
  if (body.tags !== undefined) updateData.tags = body.tags
  
  const tenantId = (event as any).tenant?.id || (event as any).tenant
  let isTenantVerified = user.role === 'super-admin'
  if (!isTenantVerified && tenantId) {
    const tenantDoc = await payload.findByID({
      collection: 'tenants',
      id: Number(tenantId),
      overrideAccess: true,
    }).catch(() => null)
    isTenantVerified = Boolean((tenantDoc as any)?.verified || (tenantDoc as any)?.status === 'verified')
  }

  if (body.enabled !== undefined || body.publish !== undefined) {
    const wantPublish = body.enabled !== undefined ? !!body.enabled : !!body.publish
    if (wantPublish && !isTenantVerified) {
      updateData.enabled = false
      updateData.approvalStatus = 'pending_review'
    } else if (isTenantVerified) {
      updateData.enabled = wantPublish
      updateData.approvalStatus = 'approved'
    } else {
      updateData.enabled = false
      updateData.approvalStatus = 'draft'
    }
  }

  if (body.isBookable !== undefined) updateData.isBookable = !!body.isBookable

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

  await resolved.payload.update({
    collection: 'events',
    id: resolved.eventId,
    data: { enabled: false },
    overrideAccess: true,
  })

  return NextResponse.json({ success: true })
}