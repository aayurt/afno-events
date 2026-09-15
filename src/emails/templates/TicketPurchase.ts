import { renderEmailLayout } from '../components/EmailLayout'

export interface TicketPurchaseItem {
  ticketType: string
  quantity: number
  price: number
}

export interface TicketPurchaseEmailProps {
  orderId: string | number
  buyerName: string
  eventTitle: string
  eventDateText: string
  eventVenue: string
  totalAmount: number
  items: TicketPurchaseItem[]
  ticketsViewUrl: string
  coverImageUrl?: string
}

export function renderTicketPurchaseHtml(props: TicketPurchaseEmailProps): string {
  const itemsHtml = props.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #0f172a;">
          <strong>${item.ticketType}</strong> &times; ${item.quantity}
        </td>
        <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">
          £${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('')

  const content = `
    <!-- Top Confirmation Banner -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge" style="background-color: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 11px;">
        &bull; BOOKING CONFIRMED &bull; ORDER #${props.orderId}
      </span>
      <h1 style="margin: 16px 0 6px; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
        You're going to ${props.eventTitle}!
      </h1>
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        Hi ${props.buyerName}, your order is confirmed and your mobile QR passes are ready.
      </p>
    </div>

    <!-- Event Summary Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          ${
            props.coverImageUrl
              ? `<td width="80" valign="top" style="padding-right: 16px;">
                  <img src="${props.coverImageUrl}" alt="${props.eventTitle}" width="80" style="border-radius: 10px; object-cover; display: block; border: 1px solid #e2e8f0;" />
                </td>`
              : ''
          }
          <td valign="top">
            <h3 style="margin: 0 0 6px; font-size: 18px; font-weight: 800; color: #0f172a;">${props.eventTitle}</h3>
            <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #e11d48;">
              🗓️ ${props.eventDateText}
            </p>
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              📍 ${props.eventVenue}
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- 1-Click View Tickets Button -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="${props.ticketsViewUrl}" class="btn-primary" style="display: inline-block; background-color: #e11d48; color: #ffffff !important; font-weight: 800; font-size: 16px; padding: 16px 36px; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.3);">
        View My Digital QR Passes &rarr;
      </a>
      <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">
        Or add directly to Apple Wallet on your iPhone
      </p>
    </div>

    <!-- Order Itemized Breakdown -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
      <h4 style="margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
        Order Receipt
      </h4>
      <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
        ${itemsHtml}
        <tr>
          <td style="padding: 12px 0 0; border-top: 1px solid #e2e8f0; font-size: 15px; font-weight: 800; color: #0f172a;">
            Total Paid
          </td>
          <td align="right" style="padding: 12px 0 0; border-top: 1px solid #e2e8f0; font-size: 16px; font-weight: 900; color: #e11d48; font-family: monospace;">
            £${props.totalAmount.toFixed(2)}
          </td>
        </tr>
      </table>
    </div>

    <!-- Gate Instructions -->
    <div style="margin-top: 24px; padding: 14px 18px; background-color: #f1f5f9; border-radius: 12px; font-size: 12px; color: #475569; line-height: 1.5;">
      <strong>Door Entry Information:</strong> Present the digital QR code from your phone screen at the venue gate for instant check-in. Printed copies are not required.
    </div>
  `

  return renderEmailLayout({
    title: `Tickets Confirmed: ${props.eventTitle} (Order #${props.orderId})`,
    previewText: `Your passes for ${props.eventTitle} are ready. View your QR codes.`,
    contentHtml: content,
  })
}
