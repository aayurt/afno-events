import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Calendar, MapPin, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Args = {
  params: Promise<{ id: string }>
}

export default async function OrderSuccessPage({ params: paramsPromise }: Args) {
  const { id } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  let order
  try {
    order = await payload.findByID({
      collection: 'orders',
      id: parseInt(id, 10),
      depth: 2,
    })
  } catch {
    notFound()
  }

  if (!order) notFound()

  const o = order as any
  const event = typeof o.event === 'object' ? o.event : null

  return (
    <div className="container py-20 flex justify-center">
      <div className="w-full max-w-lg">
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={40} className="text-green-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Booking Confirmed!</h1>
              <p className="text-muted-foreground">
                Your order has been confirmed. Order ID: #{o.id}
              </p>
            </div>

            {event && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-left">
                <p className="font-semibold text-lg">{event.title}</p>
                {event.startDatetime && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(event.startDatetime).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                {event.location?.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin size={14} />
                    {event.location.location}
                  </p>
                )}
              </div>
            )}

            {o.items && o.items.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-sm">Tickets</p>
                {o.items.map((item: any, i: number) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket size={16} className="text-muted-foreground" />
                      <span className="font-medium">{item.ticketType}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">x{item.quantity}</span>
                      <span className="font-semibold">£{item.price?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {o.totalAmount != null && (
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">£{o.totalAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 justify-center pt-4">
              <Link href="/app/events">
                <Button variant="outline">Browse More Events</Button>
              </Link>
              <Link href="/app/profile?tab=orders">
                <Button>View My Orders</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { id } = await paramsPromise
  return { title: `Order #${id} Confirmed | Afno Events` }
}
