import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { checkRateLimit, rateLimitedResponse } from '@/utilities/rateLimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'subscribe'
  const rl = checkRateLimit(`newsletter-sub:${ip}`, 10)
  if (!rl.allowed) return rateLimitedResponse()

  try {
    const body = await req.json()
    const email = (body?.email || '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })

    // Check if already subscribed
    const existing = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: email } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      const sub = existing.docs[0]
      if (sub.status === 'active') {
        return NextResponse.json({ message: 'You are already subscribed to Afno Events announcements!' })
      } else {
        // Reactivate
        await payload.update({
          collection: 'subscribers',
          id: sub.id,
          data: { status: 'active' },
        })
        return NextResponse.json({ message: 'Welcome back! Your subscription has been reactivated.' })
      }
    }

    // Create new subscriber
    await payload.create({
      collection: 'subscribers',
      data: {
        email,
        status: 'active',
      },
    })

    return NextResponse.json({
      message: 'Subscribed successfully! You will now receive alerts when major events drop.',
    })
  } catch (error: any) {
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json({ error: 'Failed to subscribe. Please try again later.' }, { status: 500 })
  }
}
