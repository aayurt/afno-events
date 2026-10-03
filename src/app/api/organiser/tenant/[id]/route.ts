import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

async function resolveAuthAndTenant(req: NextRequest, idParam: string) {
  const payload = await getPayload({ config: configPromise })
  const tenantId = parseInt(idParam, 10)
  if (isNaN(tenantId)) return { error: 'Invalid ID', status: 400 }

  let user: any = (req as any).user ?? null
  if (!user) {
    const result = await payload.auth({ headers: req.headers, canSetHeaders: false }).catch(() => null)
    user = result?.user ?? null
  }
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (user.role !== 'admin' && user.role !== 'super-admin') return { error: 'Forbidden', status: 403 }

  const tenant = await payload.findByID({ collection: 'tenants', id: tenantId, depth: 0 }).catch(() => null)
  if (!tenant) return { error: 'Tenant not found', status: 404 }

  if (user.role !== 'super-admin') {
    const tenantIds = getUserTenantIDs(user).map(String)
    if (!tenantIds.includes(String(tenantId))) {
      return { error: 'Forbidden', status: 403 }
    }
  }

  return { payload, user, tenant, tenantId }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const resolved = await resolveAuthAndTenant(req, id)
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { payload, tenantId } = resolved
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body required' }, { status: 400 })

  const updateData: any = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.contactInfo !== undefined) updateData.contactInfo = body.contactInfo
  if (body.description !== undefined) updateData.description = body.description
  if (body.organisationImage !== undefined) updateData.organisationImage = body.organisationImage ? Number(body.organisationImage) : null

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await payload.update({
    collection: 'tenants',
    id: tenantId,
    data: updateData,
    overrideAccess: true,
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    contactInfo: updated.contactInfo,
    description: updated.description,
    organisationImage: updated.organisationImage,
    verified: updated.verified,
    status: updated.status,
  })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const resolved = await resolveAuthAndTenant(req, id)
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { payload, user, tenant, tenantId } = resolved

  // Deleting requires tenant-admin (not just membership) unless super-admin.
  if (user.role !== 'super-admin') {
    const adminIds = getUserTenantIDs(user, 'tenant-admin').map(String)
    if (!adminIds.includes(String(tenantId))) {
      return NextResponse.json(
        { error: 'Only an organisation admin can delete it.' },
        { status: 403 },
      )
    }
  }

  // Guard: refuse while events still belong to this tenant so shows,
  // tickets and attendee history can't be orphaned by accident.
  const events = await payload
    .find({
      collection: 'events',
      where: { tenant: { equals: tenantId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => ({ totalDocs: 0 }) as any)
  if (events.totalDocs > 0) {
    return NextResponse.json(
      {
        error: `“${tenant.name}” still has ${events.totalDocs} event${events.totalDocs === 1 ? '' : 's'}. Delete or move them first, then delete the organisation.`,
        eventCount: events.totalDocs,
      },
      { status: 409 },
    )
  }

  // Unlink members explicitly so no membership rows are left pointing at
  // a deleted tenant (the FK would only SET NULL them).
  let unlinked = 0
  const members = await payload
    .find({
      collection: 'users',
      where: { 'tenants.tenant': { equals: tenantId } },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] }) as any)
  for (const member of members.docs || []) {
    const kept = ((member as any).tenants || []).filter(
      (t: any) =>
        String(typeof t.tenant === 'object' && t.tenant !== null ? t.tenant.id : t.tenant) !==
        String(tenantId),
    )
    await payload.update({
      collection: 'users',
      id: (member as any).id,
      data: { tenants: kept } as any,
      overrideAccess: true,
    })
    unlinked += 1
  }

  await payload.delete({ collection: 'tenants', id: tenantId, overrideAccess: true })

  return NextResponse.json({ success: true, id: tenantId, unlinkedMembers: unlinked })
}