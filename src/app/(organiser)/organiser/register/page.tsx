'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { PasswordInput } from '@/components/ui/password-input'
import { cn } from '@/utilities/ui'

export default function OrganiserRegisterPage() {
  const router = useRouter()
  const [organisationName, setOrganisationName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const passwordsMatch = password === confirmPassword && password.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // 1. Sign up user account via Better Auth (creates auth record + session cookie)
      const signUpRes = await authClient.signUp.email({
        email,
        password,
        name,
      })

      if ((signUpRes as any)?.error) {
        const msg = (signUpRes as any).error?.message || ''
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
          throw new Error('An account with this email already exists. Please sign in.')
        }
        throw new Error(msg || 'Failed to create account')
      }

      // 2. Provision tenant and assign admin role & Assigned Tenant
      const res = await fetch('/api/organiser/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationName,
          name,
          email,
          phone,
          password,
        }),
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize organisation profile')
      }

      // 3. Route straight to organiser dashboard
      window.location.href = '/organiser/dashboard'
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during registration')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2.5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 size={26} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Register as an Organiser</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
            List community events, sell tickets, and run door entry scanning.
          </p>
        </div>

        {/* Informational Callout */}
        <div className="p-3.5 rounded-2xl border border-primary/20 bg-primary/5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            New organiser accounts can draft events immediately. Shows are verified before going live to fans.
          </p>
        </div>

        <Card className="rounded-2xl shadow-xs border-border/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create Organiser Profile</CardTitle>
            <CardDescription className="text-xs">
              Enter your organisation and personal contact details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="orgName" className="text-xs font-semibold">
                  Organisation or Brand Name *
                </Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="e.g. Purbeli Samaj UK or Bassline Events"
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactName" className="text-xs font-semibold">
                  Contact Person Name *
                </Label>
                <Input
                  id="contactName"
                  type="text"
                  placeholder="e.g. Aayush Shrestha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Work / Contact Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="promoter@organisation.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  Phone / WhatsApp Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+44 7123 456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Password *
                </Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                  Confirm Password *
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    "h-10 rounded-xl text-sm",
                    confirmPassword && !passwordsMatch && "border-destructive"
                  )}
                  required
                  disabled={loading}
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 rounded-xl font-bold text-sm h-11 bg-primary text-primary-foreground shadow-sm"
                disabled={loading || !passwordsMatch}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Creating account…
                  </>
                ) : (
                  <>
                    Register & Start Creating <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Already registered as an organiser?{' '}
          <Link href="/organiser/login" className="underline font-semibold text-foreground hover:text-primary transition-colors">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  )
}
