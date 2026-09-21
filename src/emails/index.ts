import { Resend } from 'resend'
import { renderVerifyEmailHtml, VerifyEmailProps } from './templates/VerifyEmail'
import { renderPasswordResetHtml, PasswordResetProps } from './templates/PasswordReset'
import { renderTicketPurchaseHtml, TicketPurchaseEmailProps } from './templates/TicketPurchase'
import { renderNewEventNotificationHtml, NewEventNotificationProps } from './templates/NewEventNotification'
import { renderEventApprovalEmailHtml, EventApprovalEmailProps } from './templates/EventApproval'
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

export const ADMIN_NOTIFICATION_EMAILS = [
  'nepalesebros@gmail.com',
  'mr.shusangrg@outlook.com',
]

export const PLATFORM_SELF_NOTIFICATION_EMAIL = 'afnoapplication@gmail.com'

/**
 * 5. Send Event Approval Emails:
 *    - To Admin reviewers (nepalesebros@gmail.com, mr.shusangrg@outlook.com)
 *    - To Platform self-inbox (afnoapplication@gmail.com) via info@afnoevents.co.uk
 *    - To Organiser submitter (confirmation that review is pending)
 */
export async function sendEventApprovalEmails(
  organiserEmail: string,
  props: Omit<EventApprovalEmailProps, 'type'>,
) {
  const resend = getResend()

  const adminHtml = renderEventApprovalEmailHtml({
    ...props,
    type: 'admin_alert',
  })

  const organiserHtml = renderEventApprovalEmailHtml({
    ...props,
    type: 'self_receipt',
  })

  const sendPromises: Promise<any>[] = []

  // 1. Send alert to Admins + Platform self (afnoapplication@gmail.com)
  const adminRecipients = Array.from(
    new Set([...ADMIN_NOTIFICATION_EMAILS, PLATFORM_SELF_NOTIFICATION_EMAIL]),
  )

  sendPromises.push(
    resend.emails
      .send({
        from: EMAIL_SENDERS.info, // sends from info@afnoevents.co.uk
        to: adminRecipients,
        subject: `🚨 Action Required: New Event Submitted for Review — "${props.eventTitle}" (${props.organisationName})`,
        html: adminHtml,
      })
      .catch((err) => console.error('Failed sending admin approval email:', err)),
  )

  // 2. Send receipt to Organiser (if valid email provided)
  if (organiserEmail && organiserEmail.includes('@')) {
    sendPromises.push(
      resend.emails
        .send({
          from: EMAIL_SENDERS.info,
          to: [organiserEmail],
          subject: `Submission Received: "${props.eventTitle}" is Pending Review — Afno Events`,
          html: organiserHtml,
        })
        .catch((err) => console.error('Failed sending organiser submission receipt email:', err)),
    )
  }

  await Promise.allSettled(sendPromises)
}
