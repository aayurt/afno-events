import type { Metadata } from 'next'
import { Mail, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function ContactPage() {
  return (
    <div className="container py-16 max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="text-muted-foreground">
          Questions about an event, your tickets, or your account? We&apos;re here to help.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Mail size={22} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold">Email us</p>
              <p className="text-sm text-muted-foreground">We usually reply within 1–2 business days.</p>
              <a
                href="mailto:afnoapplication@gmail.com"
                className="text-sm text-primary hover:underline mt-1 inline-block"
              >
                afnoapplication@gmail.com
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare size={22} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold">Order support</p>
              <p className="text-sm text-muted-foreground">
                Include your order number (found in your profile → Orders) so we can help faster.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Contact Us | Afno Events' }
}
