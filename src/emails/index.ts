import { Resend } from 'resend'
import { renderVerifyEmailHtml, VerifyEmailProps } from './templates/VerifyEmail'
import { renderPasswordResetHtml, PasswordResetProps } from './templates/PasswordReset'
import { renderTicketPurchaseHtml, TicketPurchaseEmailProps } from './templates/TicketPurchase'
import { renderNewEventNotificationHtml, NewEventNotificationProps } from './templates/NewEventNotification'
import { generateUnsubscribeToken } from '@/app/api/newsletter/unsubscribe/route'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    const key = process.env.RESEND_API_KEY || ''
    if (!key) {
      console.warn('⚠️ RESEND_API_KEY is not set in environment variables.')
    }
    resendInstance = new Resend(key)
  }
  return resendInstance
}

export const EMAIL_SENDERS = {
  onboarding: 'Afno Events <onboarding@afnoevents.co.uk>',
  tickets: 'Afno Events <tickets@afnoevents.co.uk>',
  info: 'Afno Events <info@afnoevents.co.uk>',
  support: 'Afno Support <support@afnoevents.co.uk>',
}

/**
 * 1. Send Account Email Verification
 */
export async function sendVerificationEmail(to: string, props: VerifyEmailProps) {
  const resend = getResend()
  const html = renderVerifyEmailHtml(props)

  return await resend.emails.send({
    from: EMAIL_SENDERS.onboarding,
    to: [to],
    subject: 'Verify your Afno Events email address',
    html,
  })
}

/**
 * 2. Send Password Reset
 */
export async function sendPasswordResetEmail(to: string, props: PasswordResetProps) {
  const resend = getResend()
  const html = renderPasswordResetHtml(props)

  return await resend.emails.send({
    from: EMAIL_SENDERS.onboarding,
    to: [to],
    subject: 'Reset your Afno Events password',
    html,
  })
}

/**
 * 3. Send Order Confirmation & Ticket QR Passes
 */
export async function sendTicketPurchaseEmail(to: string, props: TicketPurchaseEmailProps) {
  const resend = getResend()
  const html = renderTicketPurchaseHtml(props)

  return await resend.emails.send({
    from: EMAIL_SENDERS.tickets,
    to: [to],
    subject: `Your Tickets: ${props.eventTitle} (Order #${props.orderId})`,
    html,
  })
}

/**
 * 4. Send New Event Announcement with RFC 8058 1-Click Unsubscribe Headers
 */
export async function sendNewEventNotification(to: string, props: Omit<NewEventNotificationProps, 'unsubscribeUrl'>) {
  const resend = getResend()
  
  // Generate secure unsubscribe URL per recipient
  const token = generateUnsubscribeToken(to)
  const unsubscribeUrl = `https://afnoevents.co.uk/api/newsletter/unsubscribe?email=${encodeURIComponent(to)}&token=${token}`

  const html = renderNewEventNotificationHtml({
    ...props,
    recipientEmail: to,
    unsubscribeUrl,
  })

  return await resend.emails.send({
    from: EMAIL_SENDERS.info,
    to: [to],
    subject: `New Event: ${props.eventTitle} — Tickets Open Now`,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
}
