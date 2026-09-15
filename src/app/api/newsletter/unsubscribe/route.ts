import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import crypto from 'crypto'

/**
 * Generate a deterministic token for 1-click unsubscribe verification
 */
export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.PAYLOAD_SECRET || 'afno-unsubscribe-secret'
  return crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = (searchParams.get('email') || '').trim().toLowerCase()
  const token = searchParams.get('token') || ''

  if (!email || !token) {
    return new NextResponse('Missing email or token parameter.', { status: 400 })
  }

  // Validate token
  const expectedToken = generateUnsubscribeToken(email)
  if (token !== expectedToken) {
    return new NextResponse('Invalid or expired unsubscribe link.', { status: 403 })
  }

  try {
    const payload = await getPayload({ config: configPromise })

    // 1. Update Subscribers collection if exists
    const subResult = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: email } },
      limit: 1,
    })

    if (subResult.docs.length > 0) {
      await payload.update({
        collection: 'subscribers',
        id: subResult.docs[0].id,
        data: { status: 'unsubscribed' },
      })
    }

    // 2. Update registered User notification preferences if user exists
    const userResult = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
    })

    if (userResult.docs.length > 0) {
      await payload.update({
        collection: 'users',
        id: userResult.docs[0].id,
        data: {
          notifications: {
            ...userResult.docs[0].notifications,
            email: false,
          },
        },
      })
    }

    // Clean confirmation page
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed — Afno Events</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b111e; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
          .card { background: #151d2e; border: 1px solid #243049; border-radius: 24px; padding: 40px; max-width: 480px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
          .icon { width: 56px; height: 56px; background: rgba(225,29,72,0.15); color: #e11d48; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; font-weight: bold; }
          h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
          a { display: inline-block; background: #e11d48; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 13px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>You're Unsubscribed</h1>
          <p><strong>${email}</strong> will no longer receive new event announcement notifications from Afno Events.<br/><br/><em>Note: You will still receive essential transactional emails (such as ticket receipts and gate QR passes).</em></p>
          <a href="https://afnoevents.co.uk">Return to Afno Events</a>
        </div>
      </body>
      </html>
    `

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: any) {
    console.error('Unsubscribe error:', err)
    return new NextResponse('Internal Server Error. Please try again later.', { status: 500 })
  }
}
