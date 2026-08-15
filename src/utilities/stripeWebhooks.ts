import type { Payload, PayloadRequest } from 'payload'

type WebhookArgs = {
  event: any
  payload: Payload
  req?: PayloadRequest
}

/**
 * Mark every ticket of an order as refunded so they can no longer be used.
 */
export async function voidOrderTickets(
  payload: Payload,
  orderId: number,
  req?: PayloadRequest,
) {
  const { docs } = await payload.find({
    collection: 'tickets',
    where: { order: { equals: orderId } },
    limit: 500,
    req,
  })

  for (const ticket of docs) {
    if (ticket.status === 'refunded') continue
    await payload.update({
      collection: 'tickets',
      id: ticket.id,
      data: { status: 'refunded' },
      req,
    })
  }
}

/**
 * Void tickets and flip the order to refunded. Used by the charge.refunded
 * webhook (refunds initiated inside Stripe) and the admin refund endpoint.
 */
export async function markOrderRefunded(
  payload: Payload,
  orderId: number,
  req?: PayloadRequest,
) {
  await voidOrderTickets(payload, orderId, req)
  await payload.update({
    collection: 'orders',
    id: orderId,
    data: { status: 'refunded' },
    req,
  })
}

export async function paymentIntentSucceeded({ event, payload, req }: WebhookArgs) {
  const paymentIntent = event.data.object as any
  const orderId = paymentIntent.metadata?.orderId

  if (orderId) {
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        status: 'paid',
        stripePaymentIntentID: paymentIntent.id,
      },
      req,
    })
  }
}

export async function checkoutSessionCompleted({ event, payload, req }: WebhookArgs) {
  const session = event.data.object as any
  const orderId = session.metadata?.orderId
  const galleryAccessId = session.metadata?.galleryAccessId

  if (galleryAccessId) {
    await payload.update({
      collection: 'gallery-access',
      id: galleryAccessId,
      data: {
        status: 'paid',
        stripeSessionID: session.id,
      },
      req,
    })
  } else if (orderId) {
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        status: 'paid',
        stripeCheckoutSessionID: session.id,
      },
      req,
    })
  }
}

/**
 * Fires when a charge is (fully) refunded — covers both PaymentIntent
 * (mobile sheet) and Checkout Session (web) payments, including refunds
 * issued directly from the Stripe dashboard.
 */
export async function chargeRefunded({ event, payload, req }: WebhookArgs) {
  const charge = event.data.object as any
  const paymentIntentId = charge.payment_intent as string | undefined
  if (!paymentIntentId) return

  const { docs } = await payload.find({
    collection: 'orders',
    where: { stripePaymentIntentID: { equals: paymentIntentId } },
    limit: 1,
    req,
  })

  const order = docs[0]
  if (!order) return

  await markOrderRefunded(payload, order.id, req)
}
