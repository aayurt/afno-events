import type { Metadata } from 'next'
import SignUpForm from '@/components/auth/signup-form'

export default function RegisterPage() {
  return (
    <div className="container py-20 flex justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="text-muted-foreground">Join Afno Events today</p>
        </div>
        <SignUpForm />
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Sign Up | Afno Events' }
}
