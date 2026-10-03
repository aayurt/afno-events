'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'

function ResetPasswordFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!token) {
      setError('Invalid reset link')
      return
    }

    setLoading(true)

    try {
      const { error } = await resetPassword({
        newPassword: password,
        token,
      })

      if (error) {
        const status = (error as { status?: number }).status
        if (status === 429) {
          setError('Too many attempts. Wait a few minutes and try again.')
        } else if (status !== undefined && status >= 500) {
          console.error('[organiser/reset-password] reset failed:', error)
          setError('Something went wrong. Please request a new link and try again.')
        } else {
          setError(error.message || 'Failed to reset password')
        }
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/organiser/login')
        }, 3000)
      }
    } catch (err: any) {
      console.error('[organiser/reset-password] reset threw:', err)
      setError('Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Invalid link</CardTitle>
          <CardDescription>The password reset link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full gap-2">
            <Link href="/organiser/forgot-password">
              <ArrowLeft size={16} /> Request a new link
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">
          {success ? 'Password reset' : 'Set new password'}
        </CardTitle>
        <CardDescription>
          {success
            ? 'Your password has been reset. Redirecting to sign in…'
            : 'Choose a new password for your organiser account.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>Done! Taking you back to sign in…</span>
            </div>
            <Button asChild className="w-full gap-2">
              <Link href="/organiser/login">Sign in now</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
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
                  <Loader2 className="animate-spin" size={16} /> Resetting…
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function OrganiserResetPasswordPage() {
  return (
    <>
      <OrganiserHeader title="Reset password" />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <Suspense
            fallback={
              <Card className="rounded-2xl">
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-40 rounded" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </CardContent>
              </Card>
            }
          >
            <ResetPasswordFormContent />
          </Suspense>
        </div>
      </div>
    </>
  )
}
