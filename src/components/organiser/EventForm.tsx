'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TAG_OPTIONS } from '@/config/tags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { VenueMapPicker, VenueLocation } from './VenueMapPicker'
import { displayPriceRange } from '@/utilities/pricing'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Globe,
  ImageIcon,
  Loader2,
  Lock,
  MapPin,
  PauseCircle,
  Plus,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  UploadCloud,
} from 'lucide-react'

type TicketTier = {
  name: string
  price: number
  description?: string | null
  stripePriceID?: string | null
  maxPerOrder?: number | null
  totalStock?: number | null
}

export type EventFormData = {
  id?: number
  title: string
  description?: string
  coverImage?: number | null
  coverImageUrl?: string | null
  showcaseImages?: Array<{ image: number | { id: number; url?: string } }> | null
  showcaseImageUrls?: string[]
  startDatetime?: string
  endDatetime?: string
  location?: {
    location?: string
    mapLocation?: string
    latitude?: number
    longitude?: number
  } | null
  tags?: string[]
  pricing?: {
    type?: 'free' | 'paid' | null
    priceRange?: string | null
    ticketTypes?: TicketTier[] | null
  } | null
  enabled?: boolean
  isBookable?: boolean
  publish?: boolean
  timezone?: string
  tenant?: number | { id: number; name?: string | null } | null
  limitOneOrderPerAccount?: boolean | null
}

type Props = {
  initial?: EventFormData | null
  onSubmit: (data: any) => Promise<void>
  submitLabel: string
  isTenantVerified?: boolean
}

export function EventForm({ initial, onSubmit, submitLabel, isTenantVerified = true }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [coverImageId, setCoverImageId] = useState<number | null>(initial?.coverImage || null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initial?.coverImageUrl || null)
  const [isUploading, setIsUploading] = useState(false)

  const [showcaseImageIds, setShowcaseImageIds] = useState<number[]>(
    initial?.showcaseImages?.map((s) => (typeof s.image === 'object' ? s.image.id : s.image)) || []
  )
  const [showcaseImageUrls, setShowcaseImageUrls] = useState<string[]>(initial?.showcaseImageUrls || [])
  const [isGalleryUploading, setIsGalleryUploading] = useState(false)

  const toLocalInput = (iso?: string, timeZone?: string) => {
    if (!iso) return ''
    try {
      const tz = timeZone || 'Europe/London'
      const dtf = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      const parts = Object.fromEntries(
        dtf.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
      )
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
    } catch {
      return ''
    }
  }

  const zonedTimeToUtc = (localInput: string, timeZone: string): string => {
    const [datePart = '', timePart = ''] = localInput.split('T')
    const [y = 0, m = 1, d = 1] = datePart.split('-').map(Number)
    const [hh = 0, mm = 0] = timePart.split(':').map(Number)
    const guess = Date.UTC(y, m - 1, d, hh, mm)
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = Object.fromEntries(
      dtf.formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
    )
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second),
    )
    return new Date(guess - (asUtc - guess)).toISOString()
  }

  const [startDatetime, setStartDatetime] = useState(
    toLocalInput(initial?.startDatetime, initial?.timezone),
  )
  const [endDatetime, setEndDatetime] = useState(
    toLocalInput(initial?.endDatetime, initial?.timezone),
  )

  const [locationData, setLocationData] = useState<VenueLocation>({
    location: initial?.location?.location || '',
    mapLocation: initial?.location?.mapLocation || '',
    latitude: initial?.location?.latitude,
    longitude: initial?.location?.longitude,
  })

  const [selectedTags, setSelectedTags] = useState<string[]>(initial?.tags || [])
  const [pricingType, setPricingType] = useState<'free' | 'paid'>(initial?.pricing?.type || 'free')
  const [priceRange, setPriceRange] = useState(initial?.pricing?.priceRange || '')

  const initialFreeTier = initial?.pricing?.ticketTypes?.[0] as any
  const [freeMaxPerOrder, setFreeMaxPerOrder] = useState<number | null>(
    initialFreeTier?.maxPerOrder ?? null,
  )
  const [freeTotalStock, setFreeTotalStock] = useState<number | null>(
    initialFreeTier?.totalStock ?? null,
  )
  const [limitOneOrder, setLimitOneOrder] = useState<boolean>(
    initial?.limitOneOrderPerAccount ?? false,
  )

  const [ticketRows, setTicketRows] = useState<TicketTier[]>(
    initial?.pricing?.ticketTypes && initial.pricing.ticketTypes.length > 0
      ? initial.pricing.ticketTypes.map((t) => ({
          name: t.name || 'General Admission',
          price: t.price ?? 15,
          description: t.description || '',
          stripePriceID: t.stripePriceID || null,
          maxPerOrder: (t as any).maxPerOrder ?? null,
          totalStock: (t as any).totalStock ?? null,
        }))
      : [{ name: 'General Admission', price: 15, description: 'Standard event entry' }]
  )

  const [isEnabled, setIsEnabled] = useState(initial?.enabled ?? (initial?.publish ?? true))
  const [isBookable, setIsBookable] = useState(initial?.isBookable ?? true)
  const [timezone, setTimezone] = useState(initial?.timezone || 'Europe/London')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialTenant = initial?.tenant ?? null
  const initialTenantId =
    initialTenant && typeof initialTenant === 'object' ? initialTenant.id : initialTenant
  const [myTenants, setMyTenants] = useState<{ id: number; name: string }[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(initialTenantId)

  useEffect(() => {
    let active = true
    fetch('/api/organiser/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return
        setIsSuperAdmin(data.user?.role === 'super-admin')
        const list = Array.isArray(data.tenants) ? data.tenants : []
        setMyTenants(list)
        if (!initial?.id && selectedTenantId == null && list.length > 0) {
          setSelectedTenantId(list[0].id)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [initial?.id, selectedTenantId])

  const showTenantPicker = isSuperAdmin && !initial?.id && myTenants.length > 0
  const uploadTenantId = !initial?.id ? selectedTenantId : initialTenantId

  const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const COMPRESS_MAX_DIM = 2048
  const COMPRESS_MIN_BYTES = 4 * 1024 * 1024

  const compressImageIfNeeded = async (file: File): Promise<File> => {
    try {
      if (file.type === 'image/gif') return file
      if (file.size < COMPRESS_MIN_BYTES) return file
      const bitmap = await createImageBitmap(file)
      const longest = Math.max(bitmap.width, bitmap.height)
      if (longest <= COMPRESS_MAX_DIM) {
        bitmap.close()
        return file
      }
      const scale = COMPRESS_MAX_DIM / longest
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        bitmap.close()
        return file
      }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.85),
      )
      if (!blob) return file
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
      return new File([blob], name, { type: 'image/jpeg' })
    } catch {
      return file
    }
  }

  const handleTagToggle = (tagValue: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagValue) ? prev.filter((t) => t !== tagValue) : [...prev, tagValue]
    )
  }

  const addTicketRow = () => {
    setTicketRows((prev) => [...prev, { name: '', price: 20, description: '' }])
  }

  const updateTicketRow = (idx: number, field: keyof TicketTier, val: any) => {
    setTicketRows((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val } as TicketTier
      return next
    })
  }

  const removeTicketRow = (idx: number) => {
    if (ticketRows.length <= 1) return
    setTicketRows((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError(`"${file.name}" is not a supported image (use JPG, PNG, WebP or GIF).`)
      e.target.value = ''
      return
    }

    setIsUploading(true)
    setError(null)
    const fd = new FormData()
    const coverFile = await compressImageIfNeeded(file)
    fd.append('file', coverFile)
    if (uploadTenantId) fd.append('tenantId', String(uploadTenantId))

    try {
      const res = await fetch('/api/organiser/media', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Failed to upload image')
      }
      const data = await res.json()
      setCoverImageId(data.id)
      setCoverImageUrl(data.url)
    } catch (err: any) {
      setError(err.message || 'Image upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const picked = Array.from(files)
    const badType = picked.find((f) => f.type && !ACCEPTED_IMAGE_TYPES.includes(f.type))
    if (badType) {
      setError(`"${badType.name}" is not a supported image (use JPG, PNG, WebP or GIF).`)
      e.target.value = ''
      return
    }

    setIsGalleryUploading(true)
    setError(null)

    const uploadedIds: number[] = []
    const uploadedUrls: string[] = []

    try {
      for (const original of picked) {
        const file = await compressImageIfNeeded(original)
        const fd = new FormData()
        fd.append('file', file)
        if (uploadTenantId) fd.append('tenantId', String(uploadTenantId))

        const res = await fetch('/api/organiser/media', {
          method: 'POST',
          body: fd,
          credentials: 'include',
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }))
          throw new Error(err.error || 'Failed to upload image')
        }

        const data = await res.json()
        uploadedIds.push(data.id)
        uploadedUrls.push(data.url)
      }

      setShowcaseImageIds((prev) => [...prev, ...uploadedIds])
      setShowcaseImageUrls((prev) => [...prev, ...uploadedUrls])
    } catch (err: any) {
      setError(err.message || 'Image upload failed')
    } finally {
      setIsGalleryUploading(false)
      e.target.value = ''
    }
  }

  const removeShowcaseImage = (index: number) => {
    setShowcaseImageIds((prev) => prev.filter((_, i) => i !== index))
    setShowcaseImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (
    e?: React.FormEvent,
    forceStatus?: { enabled?: boolean; isBookable?: boolean }
  ) => {
    if (e) e.preventDefault()
    if (!title.trim()) {
      setError('Please enter an event title.')
      return
    }
    if (showTenantPicker && !selectedTenantId) {
      setError('Please select an organisation for this event.')
      return
    }

    const finalEnabled = forceStatus?.enabled !== undefined ? forceStatus.enabled : isEnabled
    const finalBookable = forceStatus?.isBookable !== undefined ? forceStatus.isBookable : isBookable

    setIsSubmitting(true)
    setError(null)

    const ticketTypes =
      pricingType === 'paid'
        ? ticketRows.map((r) => ({
            name: r.name,
            price: Number(r.price) || 0,
            description: r.description || '',
            stripePriceID: r.stripePriceID || null,
            maxPerOrder: r.maxPerOrder ? Number(r.maxPerOrder) || null : null,
            totalStock: r.totalStock ? Number(r.totalStock) || null : null,
          }))
        : [
            {
              name: 'Free Admission',
              price: 0,
              description: 'General free admission',
              maxPerOrder: freeMaxPerOrder || null,
              totalStock: freeTotalStock || null,
            },
          ]

    const tz = timezone || 'Europe/London'
    const startIso = startDatetime ? zonedTimeToUtc(startDatetime, tz) : new Date().toISOString()
    const endIso = endDatetime ? zonedTimeToUtc(endDatetime, tz) : startIso

    if (endDatetime && new Date(endIso).getTime() < new Date(startIso).getTime()) {
      setError('Event end time must be after the start time.')
      setIsSubmitting(false)
      return
    }

    const payloadData: any = {
      title,
      description,
      coverImage: coverImageId,
      showcaseImages: showcaseImageIds.map((id) => ({ image: id })),
      startDatetime: startIso,
      endDatetime: endIso,
      location: {
        location: locationData.location || '',
        mapLocation: locationData.mapLocation || locationData.location || '',
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      },
      tags: selectedTags,
      pricing: {
        type: pricingType,
        priceRange: pricingType === 'paid' ? displayPriceRange(ticketRows, priceRange) : 'Free',
        ticketTypes,
      },
      enabled: finalEnabled,
      isBookable: finalBookable,
      publish: finalEnabled,
      timezone,
      limitOneOrderPerAccount: limitOneOrder,
      ...(!initial?.id && selectedTenantId ? { tenantId: selectedTenantId } : {}),
    }

    try {
      await onSubmit(payloadData)
    } catch (err: any) {
      setError(err.message || 'Failed to save event. Please check inputs.')
      setIsSubmitting(false)
    }
  }

  // Live Buyer Preview Calculations
  const computedPriceRange = useMemo(() => {
    if (pricingType === 'free') return 'FREE ADMISSION'
    if (priceRange.trim()) return priceRange
    const validPrices = ticketRows.map((r) => Number(r.price) || 0)
    if (validPrices.length === 0) return '£0.00'
    const min = Math.min(...validPrices)
    const max = Math.max(...validPrices)
    if (min === max) return `£${min.toFixed(2)}`
    return `£${min.toFixed(2)} – £${max.toFixed(2)}`
  }, [pricingType, priceRange, ticketRows])

  const formatPreviewDate = (localIso?: string, tz?: string) => {
    if (!localIso) return 'Date & time to be scheduled'
    try {
      const d = new Date(localIso)
      if (isNaN(d.getTime())) return 'Date & time to be scheduled'
      return (
        d.toLocaleString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + (tz ? ` (${tz.split('/')[1]?.replace('_', ' ') || tz})` : '')
      )
    } catch {
      return localIso
    }
  }

  const readinessChecks = useMemo(() => [
    { label: 'Event title entered', complete: Boolean(title.trim().length > 0) },
    { label: 'Poster artwork uploaded', complete: Boolean(coverImageUrl) },
    { label: 'Date & schedule set', complete: Boolean(startDatetime) },
    { label: 'Venue location specified', complete: Boolean(locationData.location?.trim()) },
    {
      label: 'Ticket tier configured',
      complete: pricingType === 'free' ? true : ticketRows.length > 0 && ticketRows.some((t) => t.name.trim().length > 0),
    },
  ], [title, coverImageUrl, startDatetime, locationData.location, pricingType, ticketRows])

  const readyCount = readinessChecks.filter((c) => c.complete).length

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {error && (
        <div className="mb-6 p-3.5 rounded-[4px] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono font-medium flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls (lg:col-span-7 xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          {/* Organisation Picker (Super-admin only) */}
          {showTenantPicker && (
            <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <Label htmlFor="eventTenant" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Target Organisation <span className="text-destructive">*</span>
                </Label>
                <select
                  id="eventTenant"
                  value={selectedTenantId ?? ''}
                  onChange={(e) => setSelectedTenantId(e.target.value ? Number(e.target.value) : null)}
                  className="h-9 rounded-[4px] border border-alpine-500/30 bg-white dark:bg-slate-900 px-3 text-xs font-mono w-full"
                  required
                >
                  <option value="" disabled>
                    Select organisation…
                  </option>
                  {myTenants.map((tn) => (
                    <option key={tn.id} value={tn.id}>
                      {tn.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Filing under this tenant as super-admin.
                </p>
              </CardContent>
            </Card>
          )}

          {/* 1. Basic Info */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-alpine-500/20 text-slate-900 dark:text-slate-100 font-sans font-bold text-sm tracking-tight">
                <Sparkles size={16} className="text-alpine-500 shrink-0" />
                <span>1. EVENT DETAILS</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Event Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Nepali New Year Cultural Night 2026"
                  className="h-9 rounded-[4px] border-alpine-500/30 text-xs sm:text-sm font-sans w-full focus:border-alpine-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Description & Highlights
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the artists, dress code, age limits, food & drink, schedule..."
                  rows={4}
                  className="rounded-[4px] border-alpine-500/30 resize-y text-xs sm:text-sm leading-relaxed w-full focus:border-alpine-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Poster Artwork */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-alpine-500/20 text-slate-900 dark:text-slate-100 font-sans font-bold text-sm tracking-tight">
                <UploadCloud size={16} className="text-alpine-500 shrink-0" />
                <span>2. POSTER ARTWORK</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-1">
                <div className="w-28 h-36 rounded-[4px] bg-alpine-50/40 dark:bg-slate-900 border border-alpine-500/30 flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative">
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt="Poster" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2 text-slate-400 dark:text-slate-600">
                      <ImageIcon size={26} className="mx-auto mb-1 opacity-50" />
                      <span className="text-[9px] font-mono uppercase tracking-wider">4:5 Poster</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload official event poster flyer. High-resolution JPG, PNG or WebP (up to 25MB). Tall portrait displays best on mobile feeds.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-white dark:bg-slate-800 border border-alpine-500/35 hover:border-alpine-500 text-xs font-mono font-semibold cursor-pointer transition-colors shadow-xs text-slate-800 dark:text-slate-200">
                      <UploadCloud size={14} className="text-alpine-500" />
                      <span>{coverImageUrl ? 'Change Artwork' : 'Upload Flyer'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>

                    {coverImageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCoverImageUrl(null)
                          setCoverImageId(null)
                        }}
                        className="text-red-500 hover:text-red-600 text-xs font-mono hover:bg-red-500/10 h-8 rounded-[4px] px-2.5"
                      >
                        <Trash2 size={13} className="mr-1" /> Remove
                      </Button>
                    )}
                  </div>

                  {isUploading && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-mono text-alpine-600 dark:text-alpine-400">
                      <Loader2 size={13} className="animate-spin" /> Uploading image to media CDN…
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Showcase Gallery Images */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-alpine-500/20 text-slate-900 dark:text-slate-100 font-sans font-bold text-sm tracking-tight">
                <ImageIcon size={16} className="text-alpine-500 shrink-0" />
                <span>3. SHOWCASE GALLERY (OPTIONAL)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add additional photos of the venue, past editions, or artist line-ups for the public event carousel.
              </p>

              <div className="space-y-3">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-white dark:bg-slate-800 border border-alpine-500/35 hover:border-alpine-500 text-xs font-mono font-semibold cursor-pointer transition-colors shadow-xs text-slate-800 dark:text-slate-200">
                  <UploadCloud size={14} className="text-alpine-500" />
                  <span>Add Gallery Photos</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleGalleryUpload}
                    disabled={isGalleryUploading}
                    className="hidden"
                  />
                </label>

                {isGalleryUploading && (
                  <div className="flex items-center gap-2 text-xs font-mono text-alpine-600 dark:text-alpine-400">
                    <Loader2 size={13} className="animate-spin" /> Processing gallery uploads…
                  </div>
                )}

                {showcaseImageUrls && showcaseImageUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {showcaseImageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-[4px] overflow-hidden bg-alpine-50 dark:bg-slate-950 border border-alpine-500/25 group"
                      >
                        <img src={url} alt={`Showcase ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeShowcaseImage(idx)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-[3px] bg-slate-900/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                          aria-label="Remove image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 4. Schedule & Timezone */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-alpine-500/20 text-slate-900 dark:text-slate-100 font-sans font-bold text-sm tracking-tight">
                <Calendar size={16} className="text-alpine-500 shrink-0" />
                <span>4. DATE & TIME SCHEDULE</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="startDatetime" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Event Starts <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    id="startDatetime"
                    value={startDatetime}
                    onChange={(e) => setStartDatetime(e.target.value)}
                    className="h-9 rounded-[4px] border-alpine-500/30 font-mono text-xs w-full focus:border-alpine-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endDatetime" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Event Ends
                  </Label>
                  <Input
                    type="datetime-local"
                    id="endDatetime"
                    value={endDatetime}
                    onChange={(e) => setEndDatetime(e.target.value)}
                    className="h-9 rounded-[4px] border-alpine-500/30 font-mono text-xs w-full focus:border-alpine-500"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="timezone" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Event Timezone
                  </Label>
                  <select
                    id="timezone"
                    value={timezone || 'Europe/London'}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="h-9 rounded-[4px] border border-alpine-500/30 bg-white dark:bg-slate-900 px-3 text-xs font-mono w-full focus:border-alpine-500"
                  >
                    <option value="Europe/London">UK (GMT / BST)</option>
                    <option value="Europe/Berlin">Central Europe (CET / CEST)</option>
                    <option value="America/New_York">US Eastern (ET)</option>
                    <option value="America/Chicago">US Central (CT)</option>
                    <option value="America/Denver">US Mountain (MT)</option>
                    <option value="America/Los_Angeles">US Pacific (PT)</option>
                    <option value="Asia/Kathmandu">Nepal (UTC+5:45)</option>
                    <option value="Asia/Kolkata">India (UTC+5:30)</option>
                    <option value="Asia/Dhaka">Bangladesh (UTC+6)</option>
                    <option value="Australia/Sydney">Australia Eastern (AET)</option>
                    <option value="Asia/Tokyo">Japan (UTC+9)</option>
                    <option value="Asia/Dubai">Dubai (UTC+4)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Venue & Map Location */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-alpine-500/20 text-slate-900 dark:text-slate-100 font-sans font-bold text-sm tracking-tight">
                <MapPin size={16} className="text-alpine-500 shrink-0" />
                <span>5. VENUE & MAP LOCATION</span>
              </div>

              <VenueMapPicker
                value={locationData}
                onChange={(loc) => setLocationData(loc)}
              />
            </CardContent>
          </Card>

          {/* 6. Tickets & Pricing */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-alpine-500/20 text-slate-900 dark:text-slate-100 font-sans font-bold text-sm tracking-tight">
                <Ticket size={16} className="text-alpine-500 shrink-0" />
                <span>6. TICKETS & PRICING</span>
              </div>

              {/* Free vs Paid Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPricingType('free')}
                  className={`flex-1 px-4 py-2 rounded-[4px] text-xs font-mono font-bold transition-all border text-center ${
                    pricingType === 'free'
                      ? 'bg-alpine-600 text-white border-alpine-600 shadow-xs'
                      : 'bg-alpine-50/40 dark:bg-slate-900 text-muted-foreground border-alpine-500/25 hover:border-alpine-500'
                  }`}
                >
                  FREE EVENT
                </button>
                <button
                  type="button"
                  onClick={() => setPricingType('paid')}
                  className={`flex-1 px-4 py-2 rounded-[4px] text-xs font-mono font-bold transition-all border text-center ${
                    pricingType === 'paid'
                      ? 'bg-alpine-600 text-white border-alpine-600 shadow-xs'
                      : 'bg-alpine-50/40 dark:bg-slate-900 text-muted-foreground border-alpine-500/25 hover:border-alpine-500'
                  }`}
                >
                  PAID TICKETS (STRIPE)
                </button>
              </div>

              {pricingType === 'paid' ? (
                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="priceRange" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Display Price Range
                    </Label>
                    <Input
                      id="priceRange"
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value)}
                      placeholder="e.g. £15 - £35 or From £15"
                      className="h-9 rounded-[4px] border-alpine-500/30 text-xs font-mono w-full focus:border-alpine-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Ticket Tiers
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addTicketRow}
                        className="h-7 gap-1 text-xs font-mono rounded-[4px] border-alpine-500/30 hover:bg-alpine-50 dark:hover:bg-slate-800"
                      >
                        <Plus size={12} className="text-alpine-500" /> Add Tier
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {ticketRows.map((row, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-[4px] border border-alpine-500/30 bg-alpine-50/40 dark:bg-slate-900 space-y-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={row.name}
                              onChange={(e) => updateTicketRow(idx, 'name', e.target.value)}
                              placeholder="Tier Name (e.g. Early Bird, VIP)"
                              className="h-8 rounded-[4px] text-xs font-semibold bg-white dark:bg-slate-900 border-alpine-500/30 flex-1 min-w-0"
                              required
                            />

                            <div className="flex items-center gap-1 w-28 shrink-0">
                              <span className="text-xs font-bold font-mono text-muted-foreground">£</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.price}
                                onChange={(e) => updateTicketRow(idx, 'price', parseFloat(e.target.value) || 0)}
                                placeholder="Price"
                                className="h-8 rounded-[4px] text-xs font-mono font-bold bg-white dark:bg-slate-900 border-alpine-500/30"
                                required
                              />
                            </div>

                            {ticketRows.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTicketRow(idx)}
                                className="text-muted-foreground hover:text-red-500 h-8 px-2 shrink-0 rounded-[4px]"
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>

                          <Input
                            value={row.description || ''}
                            onChange={(e) => updateTicketRow(idx, 'description', e.target.value)}
                            placeholder="Perks, entrance window, or inclusions (optional)"
                            className="h-7 rounded-[4px] text-xs bg-white dark:bg-slate-900 border-alpine-500/25 w-full"
                          />

                          <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground">Max/order:</span>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={row.maxPerOrder ?? ''}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10)
                                  updateTicketRow(idx, 'maxPerOrder', Number.isInteger(v) && v > 0 ? v : null)
                                }}
                                placeholder="No limit"
                                className="h-7 rounded-[4px] text-xs bg-white dark:bg-slate-900 border-alpine-500/25 w-24"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground">Total stock:</span>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={row.totalStock ?? ''}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10)
                                  updateTicketRow(idx, 'totalStock', Number.isInteger(v) && v > 0 ? v : null)
                                }}
                                placeholder="Unlimited"
                                className="h-7 rounded-[4px] text-xs bg-white dark:bg-slate-900 border-alpine-500/25 w-24"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1 font-mono text-xs">
                    <input
                      type="checkbox"
                      checked={limitOneOrder}
                      onChange={(e) => setLimitOneOrder(e.target.checked)}
                      className="w-3.5 h-3.5 rounded-[2px] accent-alpine-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      One order per account
                    </span>
                    <span className="text-muted-foreground font-normal">
                      (Prevents duplicate ticket booking by the same user)
                    </span>
                  </label>
                </div>
              ) : (
                <div className="p-3.5 rounded-[4px] border border-alpine-500/30 bg-alpine-50/40 dark:bg-slate-900 text-xs font-mono space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Free Admission Registration
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Attendees receive a zero-cost ticket with unique QR code upon reservation.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Max/order:</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={freeMaxPerOrder ?? ''}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          setFreeMaxPerOrder(Number.isInteger(v) && v > 0 ? v : null)
                        }}
                        placeholder="No limit"
                        className="h-7 rounded-[4px] text-xs bg-white dark:bg-slate-900 border-alpine-500/25 w-24"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Total stock:</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={freeTotalStock ?? ''}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          setFreeTotalStock(Number.isInteger(v) && v > 0 ? v : null)
                        }}
                        placeholder="Unlimited"
                        className="h-7 rounded-[4px] text-xs bg-white dark:bg-slate-900 border-alpine-500/25 w-24"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={limitOneOrder}
                      onChange={(e) => setLimitOneOrder(e.target.checked)}
                      className="w-3.5 h-3.5 rounded-[2px] accent-alpine-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      One order per account
                    </span>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 7. Tags & Categories */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-alpine-500/20 text-slate-900 dark:text-slate-100 font-sans font-bold text-sm tracking-tight">
                <Tag size={16} className="text-alpine-500 shrink-0" />
                <span>7. DISCOVERY CATEGORIES & TAGS</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose genre tags to make this event discoverable across the search feed.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedTags.includes(tag.value)
                  return (
                    <button
                      type="button"
                      key={tag.value}
                      onClick={() => handleTagToggle(tag.value)}
                      className={`px-2.5 py-1 rounded-[3px] text-xs font-mono font-medium transition-all border ${
                        active
                          ? 'bg-alpine-600 text-white border-alpine-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-alpine-500/25 hover:border-alpine-500'
                      }`}
                    >
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 8. Visibility & Booking Status */}
          <Card className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 shadow-card">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-alpine-500/20 text-slate-900 dark:text-slate-100 font-sans font-bold text-sm tracking-tight">
                <Globe size={16} className="text-alpine-500 shrink-0" />
                <span>8. PUBLICATION & CHECKOUT SETTINGS</span>
              </div>

              {!isTenantVerified && (
                <div className="p-3 rounded-[4px] border border-amber-500/40 bg-amber-500/10 text-xs font-mono text-amber-700 dark:text-amber-400">
                  Organiser account is pending verification. Publishing will queue this event in <strong>Pending Review</strong>.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Public vs Draft */}
                <button
                  type="button"
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`p-3 rounded-[4px] border text-left transition-all space-y-1.5 ${
                    isEnabled
                      ? 'border-alpine-500 bg-alpine-500/10 dark:bg-alpine-950/40'
                      : 'border-alpine-500/25 bg-alpine-50/40 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                      <Eye size={14} className={isEnabled ? 'text-emerald-500' : 'text-slate-400'} />
                      Listing Visibility
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] font-bold ${
                        isEnabled
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isEnabled ? 'PUBLIC LIVE' : 'DRAFT'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isEnabled
                      ? 'Event is indexed in discovery feeds and public exploration.'
                      : 'Hidden from public fans. Visible only on your organiser dashboard.'}
                  </p>
                </button>

                {/* Booking Open vs Paused */}
                <button
                  type="button"
                  onClick={() => setIsBookable(!isBookable)}
                  className={`p-3 rounded-[4px] border text-left transition-all space-y-1.5 ${
                    isBookable
                      ? 'border-alpine-500 bg-alpine-500/10 dark:bg-alpine-950/40'
                      : 'border-alpine-500/25 bg-alpine-50/40 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                      <Ticket size={14} className={isBookable ? 'text-emerald-500' : 'text-amber-500'} />
                      Ticket Checkout
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] font-bold ${
                        isBookable
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isBookable ? 'OPEN' : 'PAUSED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isBookable
                      ? 'Attendees can purchase and book tickets immediately.'
                      : 'Checkout is suspended. Useful for door-only sales or sold-out shows.'}
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
            {submitLabel === 'Save Changes' ? (
              <>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e)}
                  disabled={isSubmitting}
                  className="rounded-[4px] px-6 font-mono font-bold text-xs h-10 w-full sm:w-auto bg-alpine-600 hover:bg-alpine-700 text-white shadow-xs"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                  SAVE CHANGES
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/organiser/dashboard')}
                  className="rounded-[4px] h-10 px-5 text-xs font-mono border-alpine-500/35 hover:bg-alpine-50 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground w-full sm:w-auto"
                >
                  DISCARD
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, { enabled: true, isBookable })}
                  disabled={isSubmitting}
                  className="rounded-[4px] px-6 font-mono font-bold text-xs h-10 w-full sm:w-auto bg-alpine-600 hover:bg-alpine-700 text-white shadow-xs"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                  {!isTenantVerified ? 'SUBMIT FOR REVIEW' : 'PUBLISH SHOW LIVE'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => handleSubmit(e, { enabled: false, isBookable })}
                  disabled={isSubmitting}
                  className="rounded-[4px] px-5 font-mono text-xs h-10 w-full sm:w-auto border-alpine-500/35 hover:bg-alpine-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
                >
                  SAVE AS DRAFT
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push('/organiser/dashboard')}
                  className="rounded-[4px] h-10 px-4 text-xs font-mono text-muted-foreground hover:text-foreground w-full sm:w-auto"
                >
                  CANCEL
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Live Buyer Preview (lg:col-span-5 xl:col-span-5) */}
        <div className="lg:col-span-5 xl:col-span-5">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Live Indicator Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-alpine-500/20">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-800 dark:text-slate-200">
                  Live Buyer Preview
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                Real-time Sync
              </span>
            </div>

            {/* Buyer Event Card */}
            <div className="rounded-[6px] border border-alpine-500/35 dark:border-alpine-400/35 bg-white dark:bg-slate-900 overflow-hidden shadow-card">
              {/* Cover Artwork Container */}
              <div className="relative aspect-[16/10] bg-alpine-50 dark:bg-slate-950 overflow-hidden border-b border-alpine-500/20">
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt={title || 'Event poster'}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-1.5 p-4 text-center">
                    <ImageIcon size={28} className="opacity-40 text-alpine-500" />
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                      Poster Artwork
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      Upload 4:5 or 16:9 flyer
                    </span>
                  </div>
                )}

                {/* Floating Tags */}
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                  {selectedTags.length > 0 ? (
                    selectedTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-[3px] bg-slate-900/85 text-white font-mono text-[9px] font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-0.5 rounded-[3px] bg-slate-900/70 text-slate-200 font-mono text-[9px] uppercase tracking-wider backdrop-blur-xs">
                      LIVE EVENT
                    </span>
                  )}
                </div>

                {/* Live / Draft Pill */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-[3px] font-mono text-[9px] font-bold uppercase tracking-wider shadow-xs ${
                      isEnabled
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800/85 text-slate-300'
                    }`}
                  >
                    {isEnabled ? 'LIVE' : 'DRAFT'}
                  </span>
                  {!isBookable && (
                    <span className="px-2 py-0.5 rounded-[3px] font-mono text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                      PAUSED
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <h3 className="font-sans font-bold text-base sm:text-lg leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">
                  {title.trim() || 'Untitled Event Title'}
                </h3>

                {/* Schedule */}
                <div className="flex items-start gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <Calendar size={13} className="text-alpine-500 mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{formatPreviewDate(startDatetime, timezone)}</span>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <MapPin size={13} className="text-alpine-500 mt-0.5 shrink-0" />
                  <span className="line-clamp-1 font-mono text-[11px]">
                    {locationData.location || locationData.mapLocation || 'Venue location to be announced'}
                  </span>
                </div>

                {/* Pricing & Checkout preview */}
                <div className="pt-3 border-t border-alpine-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {pricingType === 'free' ? 'Admittance' : 'Starting Price'}
                    </div>
                    <div className="text-sm font-mono font-bold text-alpine-600 dark:text-alpine-400">
                      {computedPriceRange}
                    </div>
                  </div>

                  <div
                    className={`px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold select-none pointer-events-none ${
                      isBookable
                        ? 'bg-alpine-600 text-white shadow-xs'
                        : 'bg-alpine-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isBookable ? 'Get Tickets' : 'Sales Paused'}
                  </div>
                </div>
              </div>
            </div>

            {/* Configured Ticket Tiers Box */}
            <div className="rounded-[6px] border border-alpine-500/30 dark:border-alpine-400/30 bg-alpine-50/50 dark:bg-slate-900 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Configured Tiers ({pricingType === 'free' ? 1 : ticketRows.length})
                </span>
                <span className="text-[10px] font-mono text-alpine-600 dark:text-alpine-400">
                  {pricingType === 'free' ? 'Free RSVP' : 'Stripe Sync'}
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {pricingType === 'free' ? (
                  <div className="p-2 rounded-[4px] border border-alpine-500/20 bg-white dark:bg-slate-900 flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Free Admission</div>
                      <div className="text-[10px] text-muted-foreground">
                        {freeTotalStock ? `${freeTotalStock} capacity` : 'Unlimited capacity'}
                        {freeMaxPerOrder ? ` • Max ${freeMaxPerOrder}/order` : ''}
                      </div>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">£0.00</span>
                  </div>
                ) : (
                  ticketRows.map((tier, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-[4px] border border-alpine-500/20 bg-white dark:bg-slate-900 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {tier.name.trim() || `Tier ${idx + 1}`}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {tier.totalStock ? `${tier.totalStock} tickets` : 'Unlimited stock'}
                          {tier.maxPerOrder ? ` • Max ${tier.maxPerOrder}/order` : ''}
                        </div>
                      </div>
                      <span className="font-bold text-alpine-600 dark:text-alpine-400 shrink-0">
                        £{Number(tier.price || 0).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Readiness Checklist */}
            <div className="rounded-[6px] border border-alpine-500/25 dark:border-alpine-400/25 bg-white dark:bg-slate-900 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Readiness Checklist
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {readyCount}/{readinessChecks.length} complete
                </span>
              </div>

              <div className="space-y-1.5">
                {readinessChecks.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-mono">
                    {item.complete ? (
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Circle size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />
                    )}
                    <span
                      className={
                        item.complete
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400 dark:text-slate-600'
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
