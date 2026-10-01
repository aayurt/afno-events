/**
 * One-off: send the New Event Notification email for the latest event
 * (id=41, Maan Ko Raja Movie) to two recipients, using the exact same
 * template + List-Unsubscribe headers as the app's sendNewEventNotification.
 * Run on the VPS: node /tmp/send-new-event.mjs
 */
import { createRequire } from 'module'
import crypto from 'crypto'
import fs from 'fs'

const require = createRequire('/var/www/vhosts/afnoevents.co.uk/')
const { Resend } = require('resend')

// Load env exactly like the app
const envText = fs.readFileSync('/var/www/vhosts/afnoevents.co.uk/.env', 'utf8')
const getEnv = (k) => (envText.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim() || ''

const resend = new Resend(getEnv('RESEND_API_KEY'))

// Same HMAC scheme as src/app/api/newsletter/unsubscribe/route.ts
function generateUnsubscribeToken(email) {
  const secret = getEnv('PAYLOAD_SECRET') || 'afno-unsubscribe-secret'
  return crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex')
}

const EVENT = {
  id: 41,
  title: 'Maan Ko Raja Movie',
  dateText: 'SAT 19 SEP 2026 • 5:00 PM (Doors)',
  venue: 'Princes Hall, Aldershot, Hampshire',
  price: 'See booking info — contact Amrit Gurung 07405 705053',
  description:
    'A special community screening event at Princes Hall Aldershot. ' +
    'Contact Amrit Gurung 07405705053 for tickets or visit Panas Restaurant Aldershot.',
  coverImageUrl: 'https://afnoevents.co.uk/api/media/file/amrit%20movie.jpg',
  eventUrl: 'https://afnoevents.co.uk/app/events/41',
}

const RECIPIENTS = [
  { email: 'mrshusangrg007@gmail.com', name: 'Sam Gurung' },
  { email: 'aayurtshrestha@gmail.com', name: 'Aayurt' },
]

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderHtml(r) {
  const unsub = `https://afnoevents.co.uk/api/newsletter/unsubscribe?email=${encodeURIComponent(r.email)}&token=${generateUnsubscribeToken(r.email)}`
  return `
<div style="text-align:center;margin-bottom:20px">
  <span style="background-color:#ffe4e6;color:#e11d48;padding:4px 12px;border-radius:9999px;font-weight:700;font-size:11px">✨ NEW EVENT ANNOUNCED</span>
  <h1 style="margin:16px 0 8px;font-size:26px;font-weight:900;color:#0f172a;letter-spacing:-0.5px">${esc(EVENT.title)}</h1>
  <p style="margin:0;color:#64748b;font-size:14px">Hi ${esc(r.name)}, a new verified Nepalese community event has just opened bookings in the UK.</p>
</div>
<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;margin:24px 0">
  <div style="max-height:260px;overflow:hidden;background-color:#0f172a;text-align:center">
    <img src="${EVENT.coverImageUrl}" alt="${esc(EVENT.title)}" style="width:100%;max-height:260px;object-fit:cover;display:block" />
  </div>
  <div style="padding:22px 20px">
    <div style="margin-bottom:8px"><span style="font-size:12px;font-weight:800;text-transform:uppercase;color:#e11d48;letter-spacing:.5px">🗓️ ${EVENT.dateText}</span></div>
    <h2 style="margin:0 0 10px;font-size:20px;font-weight:800;color:#0f172a;line-height:1.25">${esc(EVENT.title)}</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.5">
      📍 <strong>Venue:</strong> ${esc(EVENT.venue)}<br />
      🎟️ <strong>Tickets:</strong> <span style="font-weight:700;color:#e11d48">${esc(EVENT.price)}</span>
    </p>
    <div style="border-top:1px solid #e2e8f0;padding-top:12px;font-size:13px;color:#64748b;line-height:1.6">${esc(EVENT.description)}</div>
  </div>
</div>
<div style="text-align:center;margin:28px 0 16px">
  <a href="${EVENT.eventUrl}" style="display:inline-block;background-color:#e11d48;color:#ffffff!important;font-weight:800;font-size:15px;padding:16px 36px;border-radius:14px;text-decoration:none;box-shadow:0 4px 14px rgba(225,29,72,.3)">Book Tickets Now &rarr;</a>
  <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Instant booking with mobile QR pass and Apple Wallet support.</p>
</div>
<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5">
  <p style="margin:0 0 4px">You received this announcement because you have an Afno Events UK account or subscribed to event drops.</p>
  <p style="margin:0">No longer want to receive these emails? <a href="${unsub}" style="color:#64748b;text-decoration:underline">Unsubscribe in 1 click</a>.</p>
</div>`
}

const results = []
for (const r of RECIPIENTS) {
  const unsub = `https://afnoevents.co.uk/api/newsletter/unsubscribe?email=${encodeURIComponent(r.email)}&token=${generateUnsubscribeToken(r.email)}`
  const res = await resend.emails.send({
    from: 'Afno Events <info@afnoevents.co.uk>',
    to: [r.email],
    subject: 'New Event: Maan Ko Raja Movie — Princes Hall Aldershot — Tickets Open Now',
    html: renderHtml(r),
    headers: {
      'List-Unsubscribe': `<${unsub}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  results.push({ to: r.email, id: res.data?.id, error: res.error?.message || null })
  console.log(JSON.stringify(results[results.length - 1]))
}
console.log('ALL DONE')
