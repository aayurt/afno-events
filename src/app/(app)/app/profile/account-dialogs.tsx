'use client'

import { useState } from 'react'
import { authClient, signOut } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Trash2, CheckCircle2 } from 'lucide-react'
import { useScopedI18n } from '@/locales/client'

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useScopedI18n('profile')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (next.length < 8) {
      setError(t('passwordTooShort'))
      return
    }
    if (next !== confirm) {
      setError(t('passwordsDontMatch'))
      return
    }
    setLoading(true)
    try {
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      })
      if ((result as any)?.error) {
        setError((result as any).error?.message || t('passwordChangeFailed'))
        return
      }
      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      setTimeout(onClose, 1200)
    } catch (err: any) {
      setError(err?.message || t('passwordChangeFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader onClose={onClose}>{t('changePassword')}</DialogHeader>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t('currentPassword')}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('newPassword')}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('confirmNewPassword')}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 size={16} /> {t('passwordChanged')}
            </div>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={loading || success}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {t('updatePassword')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteAccountDialog({
  open,
  onClose,
  userId,
}: {
  open: boolean
  onClose: () => void
  userId: number
}) {
  const t = useScopedI18n('profile')
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmed = typed.trim() === 'DELETE'

  const submit = async () => {
    if (!confirmed || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        setError(t('accountDeleteFailed'))
        setLoading(false)
        return
      }
      await signOut()
      window.location.href = '/'
    } catch {
      setError(t('accountDeleteFailed'))
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader onClose={onClose}>{t('deleteAccountTitle')}</DialogHeader>
      <DialogContent>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
            <Trash2 size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('deleteAccount')}</p>
            <p className="text-sm text-muted-foreground">{t('deleteAccountDesc')}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="delete-confirm">{t('typeDeleteConfirm')}</Label>
          <Input
            id="delete-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            className="font-mono"
            autoFocus
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1 gap-2"
            disabled={!confirmed || loading}
            onClick={submit}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {t('deleteForever')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
