import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

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
