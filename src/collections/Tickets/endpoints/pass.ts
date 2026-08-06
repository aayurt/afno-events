import type { Endpoint } from 'payload'

interface TicketData {
  id: number
  code: string
  status: string
  attendeeName?: string | null
  attendeeEmail?: string | null
  event?: {
    id: number
    title?: string | null
    startDatetime?: string | null
    endDatetime?: string | null
    location?: { location?: string | null } | null
  } | null
}

export const generatePassEndpoint: Endpoint = {
  path: '/:id/pass',
  method: 'get',
  handler: async (req) => {
    const { payload } = req as { payload: any }
    const id = (req.routeParams as any)?.id

    if (!id) {
      return Response.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    try {
      const ticket = await payload.findByID({
        collection: 'tickets',
        id,
        depth: 2,
      }) as TicketData | null

      if (!ticket) {
        return Response.json({ error: 'Ticket not found' }, { status: 404 })
      }

      if (!ticket.event) {
        return Response.json({ error: 'Ticket has no associated event' }, { status: 400 })
      }

      const passData = {
        ticketId: ticket.id,
        code: ticket.code,
        eventTitle: ticket.event.title ?? 'Event',
        eventDate: ticket.event.startDatetime ?? '',
        eventLocation: ticket.event.location?.location ?? '',
        attendeeName: ticket.attendeeName ?? '',
        attendeeEmail: ticket.attendeeEmail ?? '',
        status: ticket.status,
      }

      const appleWalletCert = process.env.APPLE_WALLET_CERT
      const appleWalletKey = process.env.APPLE_WALLET_KEY
      const appleWalletPassTypeId = process.env.APPLE_WALLET_PASS_TYPE_ID

      if (appleWalletCert && appleWalletKey && appleWalletPassTypeId) {
        // Apple Wallet pass generation is available.
        // In production, use passkit-generator to build and sign a .pkpass bundle:
        //   import { PKPass } from 'passkit-generator'
        //   const pass = new PKPass({ ... }, { cert, key })
        //   pass.barcode({ message: ticket.code, format: 'PKBarcodeFormatQR', altText: ticket.code })
        //   return new Response(await pass.render(), {
        //     headers: { 'Content-Type': 'application/vnd.apple.pkpass' }
        //   })

        return Response.json({
          ...passData,
          passType: 'apple-wallet',
          message: 'Apple Wallet pass generation configured. Endpoint ready for passkit-generator integration.',
        })
      }

      return Response.json({
        ...passData,
        passType: 'generic',
        message: 'Apple Wallet pass not available — APPLE_WALLET_CERT, APPLE_WALLET_KEY, and APPLE_WALLET_PASS_TYPE_ID must be set in environment.',
      })
    } catch (error: any) {
      req.payload.logger.error(`Error generating pass: ${error.message}`)
      return Response.json({ error: 'Failed to generate pass' }, { status: 500 })
    }
  },
}
