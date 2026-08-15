import type { Metadata } from 'next'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="container py-16 max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Acceptance of terms</h2>
        <p className="text-muted-foreground">
          By creating an account or purchasing tickets through Afno Events you agree to these terms. If you do
          not agree, please do not use the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Accounts</h2>
        <p className="text-muted-foreground">
          You are responsible for keeping your account credentials secure and for all activity under your
          account. You must provide accurate information when registering. We may suspend accounts that
          violate these terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Tickets and events</h2>
        <p className="text-muted-foreground">
          Tickets are subject to the event organiser&apos;s own terms, including refund and resale policies.
          We facilitate ticket sales but are not the organiser of events listed on the platform. Check event
          details carefully before purchasing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Acceptable use</h2>
        <p className="text-muted-foreground">
          You agree not to misuse the service: no unlawful activity, no harassment of other users, no
          attempts to disrupt the platform, and no use of location sharing to track others without their
          consent.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Limitation of liability</h2>
        <p className="text-muted-foreground">
          To the maximum extent permitted by law, Afno Events is not liable for indirect or consequential
          losses arising from your use of the service, including event cancellations or changes made by
          organisers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Changes to these terms</h2>
        <p className="text-muted-foreground">
          We may update these terms from time to time. Continued use of the service after changes are posted
          constitutes acceptance of the revised terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Contact</h2>
        <p className="text-muted-foreground">
          Questions about these terms? Contact us via the{' '}
          <Link href="/contact" className="text-primary hover:underline">contact page</Link>.
        </p>
      </section>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Terms of Service | Afno Events' }
}
