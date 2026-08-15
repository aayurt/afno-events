import type { Metadata } from 'next'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="container py-16 max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Information we collect</h2>
        <p className="text-muted-foreground">
          When you create an account we collect your name and email address. When you purchase tickets we
          collect your order details and payment confirmation. When you use Squads live location sharing, we
          collect and store your location only while you choose to share it, and only with the members of
          your circle.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. How we use your information</h2>
        <p className="text-muted-foreground">
          We use your information to provide and improve our services: to process ticket orders, send booking
          confirmations and event updates you opt into, notify you about your squads, and keep the platform
          secure. We never sell your personal data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Location sharing</h2>
        <p className="text-muted-foreground">
          Live location sharing is opt-in and privacy-first. You control exactly when you share and who can
          see you (including per-member visibility). Sharing stops automatically when you stop sharing, leave
          a squad, or when a time limit you set expires. Location data is only visible to members you
          explicitly allow.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Data retention</h2>
        <p className="text-muted-foreground">
          We keep account and order records for as long as needed to provide our services and comply with
          legal obligations. Location rows are deleted when sharing ends; stale records are purged
          automatically. You may request deletion of your account and data at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Your rights</h2>
        <p className="text-muted-foreground">
          You can access, correct, or delete your personal information from your profile settings, or by
          contacting us. You can disable push notifications and stop location sharing at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Contact</h2>
        <p className="text-muted-foreground">
          Questions about this policy? Contact us via the{' '}
          <Link href="/contact" className="text-primary hover:underline">contact page</Link>.
        </p>
      </section>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Privacy Policy | Afno Events' }
}
