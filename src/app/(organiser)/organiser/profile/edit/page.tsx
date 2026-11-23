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
  AlertCircle,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  UploadCloud,
  User,
} from 'lucide-react'
import { OrganiserHeader } from '@/components/organiser/OrganiserHeader'

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
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
    return () => {
      cancelled = true
    }
  }, [router])

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (tenant?.id) formData.append('tenantId', String(tenant.id))
      const res = await fetch('/api/organiser/media', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
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
    } finally {
      setAvatarUploading(false)
    }
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

  const removeTenant = async () => {
    if (!tenant || deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/organiser/tenant/${tenant.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete organisation')
      }
      router.push('/organiser/dashboard')
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete organisation')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <OrganiserHeader title="Profile" />
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-4 w-32 rounded-[2px]" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <Skeleton className="h-72 w-full rounded-[6px]" />
            </div>
            <div className="lg:col-span-5 space-y-4">
              <Skeleton className="h-64 w-full rounded-[6px]" />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!tenant) {
    return (
      <>
        <OrganiserHeader title="Profile" />
        <div className="mx-auto max-w-md py-16 px-4 text-center space-y-4">
          <Building2 size={40} className="mx-auto text-alpine-500 opacity-60" />
          <h1 className="text-xl font-bold font-sans">Organiser Access Required</h1>
          <p className="text-xs font-mono text-muted-foreground">Please sign in to edit your organisation profile.</p>
          <Button asChild className="rounded-[4px] font-mono text-xs bg-alpine-600 hover:bg-alpine-700 text-white">
            <Link href="/organiser/login">Sign In</Link>
          </Button>
        </div>
      </>
    )
  }

  const isVerified = tenant.verified === true || tenant.status === 'verified'

  return (
    <>
      <OrganiserHeader title="Profile" />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header */}
        <div>
          <Link
            href="/organiser/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft size={13} className="text-alpine-500" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Organiser Profile & Brand
              </h1>
              <p className="text-xs sm:text-sm font-mono text-muted-foreground mt-0.5">
                Manage your public organiser identity, brand artwork, and contact details.
              </p>
            </div>
          </div>
        </div>

        {!isVerified && (
          <div className="p-3.5 rounded-[4px] border border-amber-500/40 bg-amber-500/10 text-xs font-mono text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>
              <strong>Pending Verification:</strong> Your organiser account is awaiting administrator review. Changes will display to attendees upon approval.
            </span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Profile Settings Form (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-xs">
              <CardContent className="p-5 space-y-5">
                <form onSubmit={save} className="space-y-4">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-4 pb-4 border-b border-alpine-500/20">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-[6px] bg-slate-50 dark:bg-slate-900 border border-alpine-500/30 flex items-center justify-center overflow-hidden shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 size={32} className="text-alpine-500 opacity-60" />
                        )}
                      </div>
                      <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-[4px] bg-alpine-600 text-white flex items-center justify-center cursor-pointer hover:bg-alpine-700 transition-colors shadow-xs">
                        {avatarUploading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Camera size={13} />
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

                    <div className="space-y-1">
                      <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Brand Logo / Avatar
                      </h4>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        JPG, PNG, or WebP. Square 1:1 image works best for public event badges.
                      </p>
                    </div>
                  </div>

                  {/* Organisation Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="org-name" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Organisation Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="org-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Sunny Events London"
                      className="h-9 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-sans"
                      disabled={saving}
                      required
                    />
                  </div>

                  {/* Contact Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="org-email" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Public Support Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                      <Input
                        id="org-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="promoter@sunnyevents.co.uk"
                        className="pl-9 h-9 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="org-phone" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Phone / WhatsApp Helpline
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                      <Input
                        id="org-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+44 7123 456789"
                        className="pl-9 h-9 rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* About / Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="org-description" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      About Organisation
                    </Label>
                    <Textarea
                      id="org-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your collective, music genre specialisms, or community initiatives..."
                      rows={4}
                      className="rounded-[4px] border-alpine-500/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-y text-xs sm:text-sm leading-relaxed"
                      disabled={saving}
                    />
                  </div>

                  {/* Feedback alerts */}
                  {success && (
                    <div className="p-3 rounded-[4px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      <span>Profile updated successfully! Redirecting…</span>
                    </div>
                  )}
                  {error && (
                    <div className="p-3 rounded-[4px] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2.5 pt-2">
                    <Button
                      type="submit"
                      disabled={saving || success}
                      className="rounded-[4px] px-6 font-mono font-bold text-xs h-9 bg-alpine-600 hover:bg-alpine-700 text-white shadow-xs"
                    >
                      {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
                      SAVE CHANGES
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/organiser/dashboard')}
                      className="rounded-[4px] h-9 px-4 text-xs font-mono border-alpine-500/35 hover:bg-alpine-50 dark:hover:bg-slate-800"
                    >
                      DISCARD
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="rounded-[6px] border border-red-500/35 bg-white dark:bg-slate-900 shadow-xs">
              <CardContent className="p-5 space-y-3">
                <div>
                  <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-red-600 dark:text-red-400">
                    Danger Zone: Delete Organisation
                  </h3>
                  <p className="text-[11px] font-mono text-muted-foreground mt-1 leading-relaxed">
                    Permanently deletes “{tenant.name}” and unlinks all members. This action cannot be reversed.
                  </p>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-[4px] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                {!confirmDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDeleteError(null)
                      setConfirmDelete(true)
                    }}
                    className="h-8 px-3 rounded-[4px] font-mono text-xs text-red-600 dark:text-red-400 border-red-500/35 hover:bg-red-500/10"
                  >
                    <Trash2 size={13} className="mr-1.5" /> Delete Organisation…
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="h-8 px-3 rounded-[4px] font-mono text-xs border-alpine-500/30"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={removeTenant}
                      disabled={deleting}
                      className="h-8 px-3 rounded-[4px] font-mono text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      {deleting && <Loader2 size={13} className="animate-spin mr-1.5" />}
                      Confirm Delete “{tenant.name}”
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Organiser Public Brand Card Preview (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="lg:sticky lg:top-20 space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-alpine-500/20">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Public Brand Preview
                </span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  Attendee View
                </span>
              </div>

              {/* Public Organiser Badge Card */}
              <div className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-[6px] bg-slate-50 dark:bg-slate-900 border border-alpine-500/30 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={26} className="text-alpine-500 opacity-60" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-sans font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                        {name.trim() || 'Organiser Name'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded-[2px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
                        <ShieldCheck size={11} /> VERIFIED ORGANISER
                      </span>
                    </div>
                  </div>
                </div>

                {description.trim() ? (
                  <p className="text-xs font-sans text-slate-600 dark:text-slate-400 leading-relaxed border-t border-alpine-500/15 pt-3">
                    {description.trim()}
                  </p>
                ) : (
                  <p className="text-xs font-mono text-muted-foreground italic border-t border-alpine-500/15 pt-3">
                    No bio description provided yet.
                  </p>
                )}

                <div className="pt-2 border-t border-alpine-500/15 space-y-1.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                  {email.trim() && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-alpine-500 shrink-0" />
                      <span className="truncate">{email.trim()}</span>
                    </div>
                  )}
                  {phone.trim() && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-alpine-500 shrink-0" />
                      <span>{phone.trim()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Brand Guidelines Card */}
              <div className="rounded-[6px] border border-alpine-500/25 dark:border-alpine-400/25 bg-slate-50 dark:bg-slate-900 p-4 space-y-2 text-xs font-mono">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Brand Guidelines
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your organiser brand card is featured across all your event tickets, receipts, and discoverable event headers. Keep support details up to date so attendees can reach your team quickly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
