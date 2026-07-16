import type { Metadata } from 'next'
import LoginForm from '@/components/auth/login-form'
import { getScopedI18n } from '@/locales/server'

type Props = {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const t = await getScopedI18n('auth')
  const { redirect } = await searchParams

  return (
    <div className="container py-20 flex justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('welcomeBack')}</h1>
          <p className="text-muted-foreground">{t('signInToAccount')}</p>
        </div>
        <LoginForm
          title="Sign in to AfnoEvent"
          afterLoginPath={redirect || '/app'}
          requiredRole={null}
          enableSignUp
          signUpUrl="/app/auth/register"
          enableForgotPassword
          resetPasswordUrl="/app/auth/forgot-password"
        />
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Sign In | Afno Events' }
}
