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
    const body = await req.json()
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

    if (!user) {
      if (!cleanEmail || !password?.trim()) {
        return NextResponse.json(
          { error: 'Email and password are required to create an account.' },
          { status: 400 },
        )
      }

      // 1. Check if user already exists
      const existing = await payload.find({
        collection: 'users',
        where: { email: { equals: cleanEmail } },
        limit: 1,
        overrideAccess: true,
      })
      if (existing.totalDocs > 0) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 400 },
        )
      }
    }

    // 2. Generate unique slug for the tenant
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

    // 3. Create Tenant (Pending & Unverified)
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: organisationName.trim(),
        slug,
        contactInfo: { phone: cleanPhone, email: cleanEmail },
        enabled: false,
        verified: false,
        status: 'pending',
      } as any,
      overrideAccess: true,
    })

    // 4. Create or update User as 'admin' belonging to this tenant
    if (user) {
      // User signed up via Better Auth in client right before this call
      user = await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          role: 'admin',
          phoneNumber: cleanPhone,
          tenants: [
            {
              tenant: tenant.id,
              roles: ['tenant-admin', 'tenant-viewer'],
            },
          ],
        } as any,
        overrideAccess: true,
      })
    } else {
      user = await payload.create({
        collection: 'users',
        data: {
          name: cleanName,
          email: cleanEmail,
          password,
          role: 'admin',
          phoneNumber: cleanPhone,
          tenants: [
            {
              tenant: tenant.id,
              roles: ['tenant-admin', 'tenant-viewer'],
            },
          ],
        } as any,
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
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 })
  }
}
