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
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'

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
        const lower = msg.toLowerCase()
        if (lower.includes('already') || lower.includes('exist')) {
          throw new Error('An account with this email already exists. Please sign in.')
        }
        // Trashed accounts keep their email reserved at the database level, so
        // re-registering a deleted email fails here with a unique-constraint
        // error instead of "already exists".
        if (lower.includes('duplicate') || lower.includes('unique') || lower.includes('constraint')) {
          throw new Error(
            'An account with this email already exists (it may be a deleted account). Try signing in, or contact support to restore it.',
          )
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
    <>
      <OrganiserHeader title="Registration" />
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[460px] space-y-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground border border-border/80 bg-muted/40 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              New Organiser
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground pt-1">
              Register organisation
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Publish community events, manage ticketing, and access live door scanning.
            </p>
          </div>

          <div className="border border-alpine-500/35 bg-alpine-50/70 dark:bg-slate-900 rounded-[8px] p-6 sm:p-7 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="orgName" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Organisation / Brand Name *
                </Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="e.g. Bassline Events or Purbeli Samaj"
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  className="h-10 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="contactName" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Contact Name *
                  </Label>
                  <Input
                    id="contactName"
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Phone / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+44 7123 456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Work Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@organisation.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Password *
                  </Label>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Confirm *
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      "h-10 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs",
                      confirmPassword && !passwordsMatch && "border-destructive"
                    )}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive font-mono">Passwords do not match</p>
              )}

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-[6px] p-3 font-mono">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="default"
                className="w-full h-10 rounded-[4px] bg-alpine-600 hover:bg-alpine-700 text-white font-medium text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                disabled={loading || !passwordsMatch}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Creating account…
                  </>
                ) : (
                  <>
                    Register Organisation <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="text-center text-xs text-muted-foreground font-mono">
            Already registered?{' '}
            <Link href="/organiser/login" className="text-foreground underline underline-offset-4 hover:opacity-80 transition-opacity">
              Sign in to workspace →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
