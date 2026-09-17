import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { TAG_OPTIONS } from '@/config/tags'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })

    let user: any = (req as any).user ?? null
    if (!user) {
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

    let body: { categories?: string[] }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const categories = body.categories
    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'categories array is required' }, { status: 400 })
    }

    const validValues = TAG_OPTIONS.map((t) => t.value)
    const invalid = categories.filter((c) => !validValues.includes(c as any))
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid categories: ${invalid.join(', ')}` },
        { status: 400 },
      )
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { subscribedCategories: categories } as any,
      overrideAccess: true,
    })

    return NextResponse.json({ success: true, categories })
  } catch (err: any) {
    console.error('Error saving subscribed categories:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
