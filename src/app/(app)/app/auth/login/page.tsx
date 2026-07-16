import type { Metadata } from 'next'
import LoginForm from '@/components/auth/login-form'

type Props = {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirect } = await searchParams

  return (
    <div className="container py-20 flex justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
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
