import type { Metadata } from 'next'
import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Args = {
  params: Promise<{ id: string }>
}

export default async function OrderCancelPage({ params: paramsPromise }: Args) {
  const { id } = await paramsPromise

  return (
    <div className="container py-20 flex justify-center">
      <div className="w-full max-w-lg">
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle size={40} className="text-red-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Payment Cancelled</h1>
              <p className="text-muted-foreground">
                Your payment for Order #{id} was cancelled. No charges have been made.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <Link href="/app/events">
                <Button variant="outline">Browse Events</Button>
              </Link>
              <Link href="/app/profile">
                <Button>My Profile</Button>
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
  return { title: `Order #${id} Cancelled | Afno Events` }
}
