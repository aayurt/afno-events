import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config: configPromise })
  try {
    const body = await req.json().catch(() => ({}))
    const { name, email, password, organisationName, phone } = body

    if (!organisationName?.trim()) {
      return NextResponse.json(
        { error: 'Organisation name is required.' },
        { status: 400 },
      )
    }

    // Check if session already exists (e.g. client called authClient.signUp first)
    let user: any = null
    try {
      const authResult = await payload.auth({
        headers: req.headers,
        canSetHeaders: false,
      })
      user = authResult?.user ?? null
    } catch {
      user = null
    }

    const cleanEmail = (email || user?.email || '').toLowerCase().trim()
    const cleanName = (name || user?.name || organisationName).trim()
    const cleanPhone = (phone || user?.phoneNumber || '').trim()

    // If user not signed in yet, find existing user by email
    if (!user && cleanEmail) {
      const userRes = await payload.find({
        collection: 'users',
        where: { email: { equals: cleanEmail } },
        limit: 1,
        overrideAccess: true,
      })
      user = userRes.docs[0] || null
    }

    // 1. Generate unique slug for the tenant
    let slug = slugify(organisationName)
    if (!slug) slug = `org-${Date.now()}`
    const existingTenant = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existingTenant.totalDocs > 0) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
    }

    // 2. Create Tenant (Pending & Unverified)
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: organisationName.trim(),
        slug,
        contactInfo: { phone: cleanPhone, email: cleanEmail || user?.email || '' },
        enabled: false,
        verified: false,
        status: 'pending',
      } as any,
      overrideAccess: true,
    })

    // 3. Update existing user or create user with Assigned Tenant
    if (user) {
      user = await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          role: 'admin',
          phoneNumber: cleanPhone || user.phoneNumber || '',
          tenant: tenant.id,
          tenants: [
            {
              tenant: tenant.id,
              roles: ['tenant-admin', 'tenant-viewer'],
            },
          ],
        } as any,
        context: { allowRoleUpdate: true },
        overrideAccess: true,
      })
    } else {
      if (!cleanEmail) {
        return NextResponse.json(
          { error: 'Email is required to register an organisation.' },
          { status: 400 },
        )
      }

      user = await payload.create({
        collection: 'users',
        data: {
          name: cleanName,
          email: cleanEmail,
          password: password || undefined,
          role: 'admin',
          phoneNumber: cleanPhone,
          tenant: tenant.id,
          tenants: [
            {
              tenant: tenant.id,
              roles: ['tenant-admin', 'tenant-viewer'],
            },
          ],
        } as any,
        context: { allowRoleUpdate: true },
        overrideAccess: true,
      })
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    })
  } catch (err: any) {
    console.error('Organiser registration error:', err)
    const msg = err.message || 'Registration failed'
    // Trashed users keep their email reserved (unique constraint), so creating
    // an account for a deleted email surfaces here instead of "already exists".
    if (/duplicate|unique|constraint/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            'An account with this email already exists (it may be a deleted account). Try signing in, or contact support to restore it.',
        },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
