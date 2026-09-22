'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react'

export default function OrganiserProfileEditPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [tenant, setTenant] = useState<{
    id: number
    name: string
    slug: string
    contactInfo?: { phone?: string; email?: string }
    organisationImage?: number | { id: number; url?: string; sizes?: Record<string, { url?: string }> }
    description?: string
    verified?: boolean
    status?: string
  } | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const res = await fetch('/api/organiser/me', { credentials: 'include' })
        if (!res.ok) {
          router.replace('/organiser/login')
          return
        }
        const data = await res.json()
        if (cancelled) return
        if (data.tenants && data.tenants.length > 0) {
          const t = data.tenants[0]
          setTenant(t)
          setName(t.name || '')
          setPhone(t.contactInfo?.phone || '')
          setEmail(t.contactInfo?.email || '')
          setDescription(t.description || '')
          if (t.organisationImage) {
            const img = typeof t.organisationImage === 'object' ? t.organisationImage : null
            const url = img?.sizes?.card?.url || img?.sizes?.thumbnail?.url || img?.url
            if (url) setAvatarUrl(url)
          }
        }
      } catch {
        router.replace('/organiser/login')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [router])

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/organiser/media', { method: 'POST', body: formData, credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAvatarUrl(data.url)
        // Update tenant organisationImage immediately via PATCH
        await fetch(`/api/organiser/tenant/${tenant?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organisationImage: data.id }),
          credentials: 'include',
        })
      } else {
        setError('Failed to upload image')
      }
    } catch {
      setError('Failed to upload image')
    }
    setAvatarUploading(false)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || saving) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/organiser/tenant/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contactInfo: { phone: phone.trim(), email: email.trim() },
          description: description.trim(),
        }),
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }))
        throw new Error(err.error || 'Failed to update profile')
      }
      setSuccess(true)
      setTimeout(() => router.push('/organiser/dashboard'), 900)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-12 max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="container py-20 flex justify-center">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <Building2 size={48} className="mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Organiser Access Required</h1>
            <p className="text-muted-foreground">Please sign in to edit your organisation profile.</p>
          </div>
          <Link href="/organiser/login">
            <Button size="lg" className="w-full gap-2">Sign In</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const isVerified = tenant.verified === true || tenant.status === 'verified'

  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <Link href="/organiser/dashboard">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft size={16} /> Back to Dashboard
        </Button>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Edit Organisation Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your organisation details and public profile.</p>
      </div>

      {!isVerified && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
          <strong>Account Under Review</strong> — Your organiser account is pending admin verification. Profile changes will be visible after approval.
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={save} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={40} className="text-primary" />
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
              <p className="text-xs text-muted-foreground">Click to upload organisation logo/image</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-name">Organisation Name *</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Purbeli Samaj UK"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-email">Contact Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="org-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="promoter@organisation.co.uk"
                  className="pl-10"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-phone">Phone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="org-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 7123 456789"
                  className="pl-10"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-description">About / Description</Label>
              <Textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your organisation, what events you run, your mission..."
                rows={4}
                className="rounded-xl resize-y"
                disabled={saving}
              />
            </div>

            {success && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 size={16} /> Profile updated successfully
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
                onClick={() => router.push('/organiser/dashboard')}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={saving || success}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}