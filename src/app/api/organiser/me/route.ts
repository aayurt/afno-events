import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

/**
 * Session/tenant info for the organiser portal.
 * Returns 401 when signed out, 403 when signed in without the organiser role.
 */
export async function GET(req: NextRequest) {
  const payload = await getPayload({ config: configPromise })

  let user: any = (req as any).user ?? null
  if (!user) {
    // Next route handlers don't auto-run Payload auth strategies — resolve the
    // (Better Auth) session from cookies via Payload's auth operation.
    try {
      const result = await payload.auth({
        headers: req.headers,
        canSetHeaders: false,
      })
      user = result?.user ?? null
    } catch {
      user = null
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = user.role
  if (role !== 'admin' && role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantIds = getUserTenantIDs(user)
  let tenants: { id: number; name: string; slug: string }[] = []

  if (tenantIds.length > 0) {
    const result = await payload.find({
      collection: 'tenants',
      where: { id: { in: tenantIds } },
      depth: 0,
      limit: 20,
      overrideAccess: true,
    })
    tenants = result.docs.map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      verified: Boolean(t.verified || t.status === 'verified'),
      status: t.status || (t.verified ? 'verified' : 'pending'),
    }))
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    },
    tenants,
  })
}
