import { renderEmailLayout } from '../components/EmailLayout'

export interface EventApprovalEmailProps {
  type: 'self_receipt' | 'admin_alert'
  eventTitle: string
  eventDateText: string
  eventVenue: string
  eventPriceRange: string
  eventId: number | string
  organisationName: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  coverImageUrl?: string
}

export function renderEventApprovalEmailHtml(props: EventApprovalEmailProps): string {
  const isAdmin = props.type === 'admin_alert'
  const adminUrl = `https://afnoevents.co.uk/admin/collections/events/${props.eventId}`
  const organiserDashboardUrl = 'https://afnoevents.co.uk/organiser/dashboard'

  const content = `
    <!-- Header Badge -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${isAdmin ? '#fee2e2' : '#fef3c7'}; color: ${isAdmin ? '#b91c1c' : '#b45309'}; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;">
        ${isAdmin ? '🚨 ACTION REQUIRED: EVENT REVIEW' : '⏳ SUBMISSION RECEIVED & PENDING REVIEW'}
      </span>
      <h1 style="margin: 16px 0 8px; font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.25;">
        ${props.eventTitle}
      </h1>
      <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
        ${
          isAdmin
            ? `<strong>${props.organisationName}</strong> has submitted a new event for publication on Afno Events.`
            : `We have received your event submission for <strong>${props.organisationName}</strong>. Our team is currently reviewing the details.`
        }
      </p>
    </div>

    <!-- Event Summary Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; margin: 20px 0;">
      ${
        props.coverImageUrl
          ? `<div style="max-height: 220px; overflow: hidden; background-color: #0f172a; text-align: center;">
              <img src="${props.coverImageUrl}" alt="${props.eventTitle}" style="width: 100%; max-height: 220px; object-fit: cover; display: block;" />
            </div>`
          : ''
      }
      <div style="padding: 20px;">
        <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #0f172a;">Event Details:</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600; width: 120px; color: #64748b;">Title:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${props.eventTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Organisation:</td>
            <td style="padding: 6px 0;">${props.organisationName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Date & Time:</td>
            <td style="padding: 6px 0;">${props.eventDateText}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Venue:</td>
            <td style="padding: 6px 0;">${props.eventVenue}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Tickets:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #e11d48;">${props.eventPriceRange}</td>
          </tr>
          ${
            props.contactName
              ? `<tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Submitted by:</td>
                  <td style="padding: 6px 0;">${props.contactName} (${props.contactEmail || ''} ${props.contactPhone ? `• ${props.contactPhone}` : ''})</td>
                </tr>`
              : ''
          }
        </table>
      </div>
    </div>

    <!-- Instructions / Next Steps -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 24px; font-size: 13px; color: #475569; line-height: 1.5;">
      ${
        isAdmin
          ? `<strong>Admin Action:</strong> Please review the event details, check poster artwork, and ensure ticket tier prices are valid. Once verified, flip <strong>Approval Status</strong> to <code>Approved</code> and enable the event.`
          : `<strong>What happens next?</strong><br />Our moderation team reviews community events to prevent duplicate listings and ensure verified ticketing. This usually takes between 1–4 hours. Once approved, tickets will immediately go live to fans across the web and mobile app.`
      }
    </div>

    <!-- Call to Action Button -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="${isAdmin ? adminUrl : organiserDashboardUrl}"
         style="display: inline-block; background-color: #e11d48; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);">
        ${isAdmin ? 'Review & Approve in Admin Panel →' : 'View in Organiser Dashboard →'}
      </a>
    </div>

    ${
      !isAdmin
        ? `<p style="text-align: center; margin: 0; font-size: 12px; color: #94a3b8;">
            Need help or have urgent launch requirements? Reply directly to this email or reach us at <a href="mailto:info@afnoevents.co.uk" style="color: #e11d48;">info@afnoevents.co.uk</a>.
          </p>`
        : ''
    }
  `

  return renderEmailLayout({
    title: isAdmin ? 'New Event Submitted for Review' : 'Event Submission Received',
    contentHtml: content,
    previewText: isAdmin
      ? `Review submission: ${props.eventTitle} (${props.organisationName})`
      : `Submission received: ${props.eventTitle}`,
  })
}
