import type { Metadata } from 'next'
import SignUpForm from '@/components/auth/signup-form'
import { getScopedI18n } from '@/locales/server'

type Props = {
  searchParams: Promise<{ redirect?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const t = await getScopedI18n('auth')
  const { redirect } = await searchParams

  return (
    <div className="container py-20 flex justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('createAccount')}</h1>
          <p className="text-muted-foreground">{t('joinToday')}</p>
        </div>
        <SignUpForm redirectPath={redirect || '/app'} />
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Sign Up | Afno Events' }
}
