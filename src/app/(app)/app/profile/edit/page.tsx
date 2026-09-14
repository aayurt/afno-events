'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  LogIn,
  User,
  AlertCircle,
} from 'lucide-react'
import { useScopedI18n } from '@/locales/client'

const GENDER_OPTIONS = [
  { value: 'male', labelKey: 'genderMale' },
  { value: 'female', labelKey: 'genderFemale' },
  { value: 'other', labelKey: 'genderOther' },
  { value: 'prefer-not-to-say', labelKey: 'genderPreferNotToSay' },
] as const

export default function EditProfilePage() {
  const t = useScopedI18n('profile')
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const result = await authClient.getSession()
      const user = result.data?.user ?? null
      if (cancelled) return
      setSession(user)
      if (user) {
        try {
          const res = await fetch(`/api/users/${user.id}?depth=1`)
          const doc = await res.json()
          if (cancelled) return
          setUser(doc)
          setName(doc.name || '')
          setPhone(doc.phoneNumber || '')
          const storedGender = doc.gender
          setGender(
            GENDER_OPTIONS.some((g) => g.value === storedGender) ? storedGender : '',
          )
          if (doc.image && typeof doc.image === 'object' && doc.image.url) {
            setAvatarUrl(doc.image.url)
          }
        } catch {}
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/users/avatar', { method: 'POST', body: formData, credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAvatarUrl(data.url)
      } else {
        setError(t('profileUpdateFailed'))
      }
    } catch {
      setError(t('profileUpdateFailed'))
    }
    setAvatarUploading(false)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || saving) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/users/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: phone.trim(),
          gender: gender || 'prefer-not-to-say',
        }),
        credentials: 'include',
      })
      if (!res.ok) {
        setError(t('profileUpdateFailed'))
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/app/profile'), 900)
    } catch {
      setError(t('profileUpdateFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-12 max-w-lg space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <User size={48} className="mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('signInRequired')}</h1>
            <p className="text-muted-foreground">{t('signInDescription')}</p>
          </div>
          <div className="pt-2" />
          <Link href="/app/auth/login?redirect=/app/profile/edit">
            <Button size="lg" className="w-full gap-2">
              <LogIn size={16} /> {t('signIn')}
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-lg space-y-6">
      <Link href="/app/profile">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft size={16} /> {t('backToProfile')}
        </Button>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t('editProfile')}</h1>
        <p className="text-sm text-muted-foreground">{t('editProfileInfo')}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={save} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-primary" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
                  {avatarUploading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Camera size={15} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatar}
                    disabled={avatarUploading}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">{t('profilePhotoHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-name">{t('fullName')}</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('fullNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">{t('email')}</Label>
              <Input id="profile-email" value={user?.email || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone">{t('phoneNumber')}</Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 …"
                type="tel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-gender">{t('gender')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                      gender === g.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {t(g.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {success && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 size={16} /> {t('profileUpdated')}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/app/profile')}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={saving || success}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {t('saveChanges')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
