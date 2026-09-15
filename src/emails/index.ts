import { Resend } from 'resend'
import { renderVerifyEmailHtml, VerifyEmailProps } from './templates/VerifyEmail'
import { renderPasswordResetHtml, PasswordResetProps } from './templates/PasswordReset'
import { renderTicketPurchaseHtml, TicketPurchaseEmailProps } from './templates/TicketPurchase'
import { renderNewEventNotificationHtml, NewEventNotificationProps } from './templates/NewEventNotification'

// Lazy initialize Resend client
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
 * 4. Send New Event Announcement Notification
 */
export async function sendNewEventNotification(to: string | string[], props: NewEventNotificationProps) {
  const resend = getResend()
  const html = renderNewEventNotificationHtml(props)
  const recipients = Array.isArray(to) ? to : [to]

  return await resend.emails.send({
    from: EMAIL_SENDERS.info,
    to: recipients,
    subject: `New Event: ${props.eventTitle} — Tickets Open Now`,
    html,
  })
}
