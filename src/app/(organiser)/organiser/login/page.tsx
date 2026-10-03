'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowRight, Building2, Loader2 } from 'lucide-react'
import { PasswordInput } from '@/components/ui/password-input'
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'

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
  const [orgName, setOrgName] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)

  // Already signed in? Route them straight in (or show the not-organiser note).
  useEffect(() => {
    let active = true
    authClient
      .getSession()
      .then((result) => {
        if (!active) return
        const user = result.data?.user as { role?: string } | undefined
        if (user && (user.role === 'admin' || user.role === 'super-admin')) {
          router.replace('/organiser/dashboard')
        } else if (user) {
          setNotOrganiser(true)
          setChecking(false)
        } else {
          setChecking(false)
        }
      })
      .catch(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
    }
  }, [router])

  // Fan account signed in on the organiser portal: let them request an
  // upgrade in place. Reuses /api/organiser/register, which provisions a
  // pending tenant and promotes the existing user to admin — new orgs can
  // draft immediately, events go live after admin verification.
  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim() || requesting) return
    setRequesting(true)
    setRequestError(null)
    try {
      const session = await authClient.getSession().catch(() => null)
      const sessionUser = session?.data?.user as { name?: string; email?: string } | undefined
      const res = await fetch('/api/organiser/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          organisationName: orgName.trim(),
          name: sessionUser?.name || '',
          email: sessionUser?.email || email,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Could not submit your request')
      setRequestSent(true)
      setTimeout(() => {
        window.location.href = '/organiser/dashboard'
      }, 1500)
    } catch (err: any) {
      setRequestError(err?.message || 'Could not submit your request. Please try again.')
    } finally {
      setRequesting(false)
    }
  }
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

      // Check role from signIn result or getSession
      const user = (result as any)?.data?.user
      let role = user?.role

      if (!role) {
        const session = await authClient.getSession().catch(() => null)
        role = (session?.data?.user as { role?: string } | undefined)?.role
      }

      if (role === 'admin' || role === 'super-admin') {
        window.location.href = '/organiser/dashboard'
        return
      }

      // Authoritative verification via /api/organiser/me
      const meRes = await fetch('/api/organiser/me', { credentials: 'include' }).catch(() => null)
      if (meRes && meRes.ok) {
        window.location.href = '/organiser/dashboard'
        return
      }

      if (meRes && meRes.status === 403) {
        setNotOrganiser(true)
        return
      }

      // Default landing for organiser portal logins
      window.location.href = '/organiser/dashboard'
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <OrganiserHeader title="Sign in" />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/organiser/forgot-password"
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <PasswordInput
                    id="password"
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
                  <div className="text-sm rounded-lg p-3 space-y-3 text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                    {requestSent ? (
                      <p className="font-medium">
                        Request received — your organiser workspace is being set up. Taking you
                        to the dashboard…
                      </p>
                    ) : (
                      <>
                        <p>
                          This account is a fan account, not an organiser account. Enter your
                          organisation name and we&apos;ll upgrade it — you can draft events
                          right away, and our team verifies organisations before events go live.
                        </p>
                        <form onSubmit={handleRequestAccess} className="space-y-2">
                          <Input
                            type="text"
                            placeholder="Organisation name"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            disabled={requesting}
                            required
                          />
                          {requestError && <p className="text-red-600">{requestError}</p>}
                          <Button
                            type="submit"
                            size="sm"
                            className="w-full gap-2"
                            disabled={requesting || !orgName.trim()}
                          >
                            {requesting ? (
                              <>
                                <Loader2 className="animate-spin" size={14} /> Submitting…
                              </>
                            ) : (
                              'Request organiser access'
                            )}
                          </Button>
                        </form>
                        <p>
                          Prefer to talk first?{' '}
                          <Link href="/contact" className="underline font-medium">
                            Contact us
                          </Link>
                        </p>
                      </>
                    )}
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

        <div className="text-center space-y-2 text-xs text-muted-foreground">
          <p>
            New promoter or organisation?{' '}
            <Link href="/organiser/register" className="font-semibold text-primary hover:underline">
              Register for Organiser Access →
            </Link>
          </p>
          <p>
            Want to speak with our team first?{' '}
            <Link href="/contact" className="underline hover:text-foreground">
              Contact us
            </Link>
          </p>
        </div>
      </div>
      </div>
    </>
  )
}
