import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/forgot-password-form'
import { getScopedI18n } from '@/locales/server'

export default async function ForgotPasswordPage() {
  const t = await getScopedI18n('auth')
  return (
    <div className="container py-20 flex justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('resetPassword')}</h1>
          <p className="text-muted-foreground">{t('resetPasswordDesc')}</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Forgot Password | Afno Events' }
}
