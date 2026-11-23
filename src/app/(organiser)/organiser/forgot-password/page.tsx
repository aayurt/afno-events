'use client'

import { useState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'

export default function OrganiserForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await requestPasswordReset({
        email,
        redirectTo: '/organiser/reset-password',
      })

      if (error) {
        const status = (error as { status?: number }).status
        if (status === 429) {
          setError('Too many attempts. Wait a few minutes and try again.')
        } else if (status !== undefined && status >= 500) {
          console.error('[organiser/forgot-password] reset request failed:', error)
          setError('Something went wrong sending the email. Please try again in a moment.')
        } else {
          setError(error.message || 'Failed to send reset email')
        }
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      // Network-level failure (server unreachable, offline, CORS, …)
      console.error('[organiser/forgot-password] reset request threw:', err)
      setError('Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <OrganiserHeader title="Password Reset" />
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] space-y-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground border border-border/80 bg-muted/40 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Security
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground pt-1">
              {success ? 'Check your email' : 'Forgot password'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {success
                ? `We've sent a password reset link to ${email}`
                : 'Enter your organiser account email and we’ll send you a recovery link.'}
            </p>
          </div>

          <div className="border border-border/80 bg-card/40 backdrop-blur-sm rounded-xl p-6 sm:p-7 shadow-xs">
            {success ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3.5 font-mono">
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                  <span>Reset link sent. Check your inbox (and spam folder).</span>
                </div>
                <Button asChild variant="outline" className="w-full h-10 rounded-lg border-border/80 text-xs font-mono uppercase tracking-wider gap-2">
                  <Link href="/organiser/login">
                    <ArrowLeft size={14} /> Back to sign in
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@organisation.co.uk"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10 rounded-lg border-border/80 bg-background/70 text-sm focus-visible:ring-1 focus-visible:ring-foreground transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
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
                      <Loader2 className="animate-spin" size={14} /> Sending…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </Button>

                <Button asChild variant="ghost" className="w-full h-9 text-xs font-mono text-muted-foreground hover:text-foreground gap-1.5">
                  <Link href="/organiser/login">
                    <ArrowLeft size={13} /> Back to sign in
                  </Link>
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
