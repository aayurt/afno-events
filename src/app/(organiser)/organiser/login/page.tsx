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
      <OrganiserHeader title="Workspace" />
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] space-y-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground border border-border/80 bg-muted/40 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Organiser Workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground pt-1">
              Sign in
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Manage your event ticketing, door scanning, and attendees.
            </p>
          </div>

          <div className="border border-border/80 bg-card/40 backdrop-blur-sm rounded-xl p-6 sm:p-7 shadow-xs">
            {checking ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="animate-spin text-muted-foreground" size={18} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@organisation.co.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-10 rounded-lg border-border/80 bg-background/70 text-sm focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-foreground transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Password
                    </Label>
                    <Link
                      href="/organiser/forgot-password"
                      className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
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
                    className="h-10 rounded-lg border-border/80 bg-background/70 text-sm focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-foreground transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {notOrganiser && (
                  <div className="text-xs rounded-lg p-3.5 space-y-3 text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
                    {requestSent ? (
                      <p className="font-medium font-mono">
                        Request received — setting up your workspace…
                      </p>
                    ) : (
                      <>
                        <p className="leading-relaxed">
                          This account is a fan account. Enter your organisation name below to request organiser access.
                        </p>
                        <form onSubmit={handleRequestAccess} className="space-y-2">
                          <Input
                            type="text"
                            placeholder="Organisation name"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            disabled={requesting}
                            required
                            className="h-9 rounded-lg border-border/80 bg-background/80 text-xs"
                          />
                          {requestError && <p className="text-red-500 text-xs">{requestError}</p>}
                          <Button
                            type="submit"
                            size="sm"
                            className="w-full h-8 rounded-lg text-xs font-medium"
                            disabled={requesting || !orgName.trim()}
                          >
                            {requesting ? (
                              <>
                                <Loader2 className="animate-spin" size={12} /> Submitting…
                              </>
                            ) : (
                              'Request organiser access'
                            )}
                          </Button>
                        </form>
                        <p className="text-[11px] text-muted-foreground">
                          Prefer to speak first?{' '}
                          <Link href="/contact" className="underline hover:text-foreground">
                            Contact team
                          </Link>
                        </p>
                      </>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  size="default"
                  className="w-full h-10 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-medium text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Signing in…
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight size={14} />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-muted-foreground font-mono">
            <span>
              New promoter?{' '}
              <Link href="/organiser/register" className="text-foreground underline underline-offset-4 hover:opacity-80 transition-opacity">
                Register access
              </Link>
            </span>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact support →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
