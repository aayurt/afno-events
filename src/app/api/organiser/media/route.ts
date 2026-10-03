import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

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

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })

  const MAX_SIZE = 25 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Image is ${(file.size / (1024 * 1024)).toFixed(1)}MB — maximum is 25MB.` },
      { status: 413 },
    )
  }

  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported image type. Please upload JPG, PNG, WebP or GIF.' },
      { status: 415 },
    )
  }

  const tenantIds = getUserTenantIDs(user)
  const tenantId = tenantIds.length > 0 ? tenantIds[0] : null

  // Media requires a tenant (multi-tenant plugin validation) — fail with a
  // clear message instead of a cryptic "invalid: Assigned Tenant" 500.
  if (!tenantId) {
    return NextResponse.json(
      { error: 'No organisation is linked to this account. Ask an administrator to assign you to an organisation, then try again.' },
      { status: 403 },
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: file.name,
        ...(tenantId ? { tenant: tenantId } : {}),
      },
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
      overrideAccess: true,
    })

    return NextResponse.json({ id: doc.id, url: doc.url })
  } catch (err: any) {
    // Temporary debug: tenant validation failures need the full picture.
    console.error(
      `[organiser/media] upload failed for user ${user?.id} (${user?.email}) tenantIds=${JSON.stringify(tenantIds)} file=${file.name} ${file.size}B:`,
      err,
    )
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}