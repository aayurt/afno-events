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