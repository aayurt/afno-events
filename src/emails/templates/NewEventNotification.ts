import { renderEmailLayout } from '../components/EmailLayout'

export interface NewEventNotificationProps {
  recipientName?: string
  eventTitle: string
  eventDateText: string
  eventVenue: string
  eventPriceRange: string
  eventSlugOrId: string | number
  eventDescription?: string
  coverImageUrl?: string
  organiserName?: string
}

export function renderNewEventNotificationHtml(props: NewEventNotificationProps): string {
  const greeting = props.recipientName ? `Hi ${props.recipientName},` : 'Hi there,'
  const eventUrl = `https://afnoevents.co.uk/app/events/${props.eventSlugOrId}`

  const content = `
    <!-- Top Alert Tag -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge" style="background-color: #ffe4e6; color: #e11d48; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 11px;">
        ✨ NEW EVENT ANNOUNCED
      </span>
      <h1 style="margin: 16px 0 8px; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
        ${props.eventTitle}
      </h1>
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        ${greeting} A new verified Nepalese community event has just opened bookings in the UK.
      </p>
    </div>

    <!-- Event Poster / Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; margin: 24px 0;">
      ${
        props.coverImageUrl
          ? `<div style="max-height: 260px; overflow: hidden; background-color: #0f172a; text-align: center;">
              <img src="${props.coverImageUrl}" alt="${props.eventTitle}" style="width: 100%; max-height: 260px; object-fit: cover; display: block;" />
            </div>`
          : ''
      }
      
      <div style="padding: 22px 20px;">
        <div style="margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #e11d48; letter-spacing: 0.5px;">
            🗓️ ${props.eventDateText}
          </span>
        </div>

        <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.25;">
          ${props.eventTitle}
        </h2>

        <p style="margin: 0 0 16px; font-size: 13px; color: #475569; line-height: 1.5;">
          📍 <strong>Venue:</strong> ${props.eventVenue}
          ${props.organiserName ? `<br />🎪 <strong>Organised by:</strong> ${props.organiserName}` : ''}
          <br />🎟️ <strong>Tickets:</strong> <span style="font-weight: 700; color: #e11d48;">${props.eventPriceRange}</span>
        </p>

        ${
          props.eventDescription
            ? `<div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 13px; color: #64748b; line-height: 1.6; max-height: 120px; overflow: hidden;">
                ${props.eventDescription.replace(/\n/g, '<br />')}
              </div>`
            : ''
        }
      </div>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="${eventUrl}" class="btn-primary" style="display: inline-block; background-color: #e11d48; color: #ffffff !important; font-weight: 800; font-size: 15px; padding: 16px 36px; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.3);">
        Book Tickets Now &rarr;
      </a>
      <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
        Instant booking with mobile QR pass and Apple Wallet support.
      </p>
    </div>

    <div style="margin-top: 24px; padding: 12px; background-color: #f1f5f9; border-radius: 10px; text-align: center; font-size: 11px; color: #64748b;">
      You received this because you are subscribed to new event announcements on Afno Events UK.
    </div>
  `

  return renderEmailLayout({
    title: `New Event: ${props.eventTitle}`,
    previewText: `New event announcement: ${props.eventTitle} (${props.eventDateText}). Tickets now open.`,
    contentHtml: content,
  })
}
