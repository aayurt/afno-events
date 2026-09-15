'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowRight, Building2, Loader2 } from 'lucide-react'

/**
 * Dedicated organiser login. Fans use /app/auth/login; organisers land here.
 * After sign-in we verify role=admin/organiser before letting them into /organiser.
 */
export default function OrganiserLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [notOrganiser, setNotOrganiser] = useState(false)

  // Already signed in? Route them straight in (or show the not-organiser note).
  useState(() => {
    authClient
      .getSession()
      .then((result) => {
        const user = result.data?.user as { role?: string } | undefined
        if (user && (user.role === 'admin' || user.role === 'super-admin')) {
          router.replace('/organiser/dashboard')
        } else if (user) {
          setNotOrganiser(true)
        }
        setChecking(false)
      })
      .catch(() => setChecking(false))
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotOrganiser(false)
    setLoading(true)
    try {
      const result = await authClient.signIn.email({ email, password })
      if ((result as any)?.error) {
        setError((result as any).error?.message || 'Failed to sign in')
        return
      }
      const session = await authClient.getSession()
      const role = (session.data?.user as { role?: string } | undefined)?.role
      if (role === 'admin' || role === 'super-admin') {
        window.location.href = '/organiser/dashboard'
      } else {
        setNotOrganiser(true)
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 size={26} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Organiser Portal</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage your events, tickets and door scanning.
          </p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Use your organiser account credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            {checking ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@yourevent.co.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {notOrganiser && (
                  <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                    This account is a fan account, not an organiser account. Please use the{' '}
                    <Link href="/app" className="underline font-medium">fan app</Link> instead, or
                    contact us to upgrade your account.
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Signing in…
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Want to sell tickets for your event?{' '}
          <Link href="/contact-us" className="underline hover:text-foreground">
            Get in touch
          </Link>
        </p>
      </div>
    </div>
  )
}
