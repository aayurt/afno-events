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
      <OrganiserHeader title="Reset password" />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">
                {success ? 'Check your email' : 'Forgot password'}
              </CardTitle>
              <CardDescription>
                {success
                  ? `We've sent a password reset link to ${email}`
                  : 'Enter your organiser account email and we’ll send you a reset link.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    <span>Reset link sent. It expires soon, so check your inbox (and spam).</span>
                  </div>
                  <Button asChild variant="outline" className="w-full gap-2">
                    <Link href="/organiser/login">
                      <ArrowLeft size={16} /> Back to sign in
                    </Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@yourevent.co.uk"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Sending link…
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>

                  <Button asChild variant="ghost" className="w-full gap-2">
                    <Link href="/organiser/login">
                      <ArrowLeft size={16} /> Back to sign in
                    </Link>
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
