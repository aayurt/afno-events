'use client'

import { useEffect, useState } from 'react'
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
  Calendar,
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

  const [showcaseImageIds, setShowcaseImageIds] = useState<number[]>(initial?.showcaseImages?.map((s) => (typeof s.image === 'object' ? s.image.id : s.image)) || [])
  const [showcaseImageUrls, setShowcaseImageUrls] = useState<string[]>(initial?.showcaseImageUrls || [])
  const [isGalleryUploading, setIsGalleryUploading] = useState(false)

  const toLocalInput = (iso?: string, timeZone?: string) => {
    if (!iso) return ''
    try {
      // Show the stored UTC instant as wall-clock time in the event's timezone
      // (not the browser's), so what the organiser sees matches the tz dropdown.
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

  // Interpret a `datetime-local` wall-clock string as being in `timeZone`,
  // returning the correct UTC instant (DST-aware via Intl offset lookup).
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

  // Organisation context: regular organisers file under their own tenant
  // (server default); super-admins pick any organisation explicitly.
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
        // Default the picker when creating (edit keeps the event's tenant).
        if (!initial?.id && selectedTenantId == null && list.length > 0) {
          setSelectedTenantId(list[0].id)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showTenantPicker = isSuperAdmin && !initial?.id && myTenants.length > 0
  // Uploads ride on the explicitly chosen tenant (create) or the event's own
  // tenant (edit) so files never land tenant-less.
  const uploadTenantId = !initial?.id ? selectedTenantId : initialTenantId

  // Keep in sync with /api/organiser/media (server enforces the same caps).
  const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  // Downscale huge phone photos in-browser so uploads stay fast and never
  // hit the 25MB server cap (413). Skips GIFs (would lose animation) and
  // already-small files; falls back to the original on any failure.
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

    // Type-check the original (HEIC etc. rejected even though the picker
    // filters), then compress oversized photos before uploading.
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

    // Type-check everything up front (clear message instead of failing
    // mid-batch), then compress oversized photos before uploading.
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
      // Reset file input
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
        : [{ name: 'Free Admission', price: 0, description: 'General free admission' }]

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
      // Super-admin filing under a chosen organisation (create only).
      ...(!initial?.id && selectedTenantId ? { tenantId: selectedTenantId } : {}),
    }

    try {
      await onSubmit(payloadData)
    } catch (err: any) {
      setError(err.message || 'Failed to save event. Please check inputs.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 w-full max-w-3xl">
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Organisation (super-admin filing anywhere) */}
      {showTenantPicker && (
        <Card className="rounded-2xl border-primary/30 bg-primary/[0.03]">
          <CardContent className="p-4 sm:p-6 space-y-2">
            <Label htmlFor="eventTenant" className="text-xs font-semibold">
              Organisation <span className="text-destructive">*</span>
            </Label>
            <select
              id="eventTenant"
              value={selectedTenantId ?? ''}
              onChange={(e) => setSelectedTenantId(e.target.value ? Number(e.target.value) : null)}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm w-full"
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
            <p className="text-xs text-muted-foreground">
              As a super-admin you can file this event and its images under any organisation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 1. Basic Info */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Sparkles size={18} className="text-primary" />
            <span>1. Event Details</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold">
              Event Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Nepali New Year Cultural Night 2026"
              className="h-11 rounded-xl text-sm sm:text-base w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Description & Highlights
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide event details, schedule, age restrictions, performers, food & drink, parking..."
              rows={4}
              className="rounded-xl resize-y text-sm leading-relaxed w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Poster Artwork */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <UploadCloud size={18} className="text-primary" />
            <span>2. Poster Artwork</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 pt-1">
            <div className="w-32 h-44 rounded-2xl bg-muted/50 border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative">
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="Poster" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-2 text-muted-foreground/50">
                  <ImageIcon size={32} className="mx-auto mb-1 opacity-50" />
                  <span className="text-[10px] font-mono uppercase">4:5 Ratio</span>
                </div>
              )}
            </div>

            <div className="space-y-3 flex-1 w-full text-center sm:text-left">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload your official event flyer or poster. High-resolution JPG, PNG or WebP (up to 25MB). Tall portrait artwork displays best in the mobile discovery feed.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted/60 text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                  <UploadCloud size={15} />
                  <span>{coverImageUrl ? 'Change Poster' : 'Choose File'}</span>
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
                    className="text-destructive text-xs hover:bg-destructive/10 h-9 rounded-xl"
                  >
                    <Trash2 size={14} className="mr-1" /> Remove
                  </Button>
                )}
              </div>

              {isUploading && (
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-primary font-medium">
                  <Loader2 size={14} className="animate-spin" /> Uploading image to server…
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Event Gallery / Showcase Images */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <ImageIcon size={18} className="text-primary" />
            <span>3. Event Gallery / Showcase Images</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Add additional images for the event detail page gallery. Recommended: 16:9 landscape or 4:3 ratio. JPG, PNG, WebP (up to 25MB each).
          </p>

          <div className="space-y-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted/60 text-xs font-semibold cursor-pointer transition-colors shadow-xs">
              <UploadCloud size={15} />
              <span>Add Images</span>
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
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-primary font-medium">
                <Loader2 size={14} className="animate-spin" /> Uploading images…
              </div>
            )}

            {showcaseImageUrls && showcaseImageUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {showcaseImageUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                    <img src={url} alt={`Showcase ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeShowcaseImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
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

      {/* 4. Schedule */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Calendar size={18} className="text-primary" />
            <span>4. Date & Time</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="startDatetime" className="text-xs font-semibold">
                Event Starts <span className="text-destructive">*</span>
              </Label>
              <Input
                type="datetime-local"
                id="startDatetime"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                className="h-10 rounded-xl font-mono text-xs w-full min-w-0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDatetime" className="text-xs font-semibold">
                Event Ends
              </Label>
              <Input
                type="datetime-local"
                id="endDatetime"
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
                className="h-10 rounded-xl font-mono text-xs w-full min-w-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-xs font-semibold">
                Timezone
              </Label>
              <select
                id="timezone"
                value={timezone || 'Europe/London'}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 py-2 text-sm w-full"
              >
                <option value="Europe/London">UK (GMT/BST)</option>
                <option value="Europe/Berlin">Central Europe (CET/CEST)</option>
                <option value="America/New_York">US Eastern (ET)</option>
                <option value="America/Chicago">US Central (CT)</option>
                <option value="America/Denver">US Mountain (MT)</option>
                <option value="America/Los_Angeles">US Pacific (PT)</option>
                <option value="Asia/Kolkata">India (UTC+5:30)</option>
                <option value="Asia/Kathmandu">Nepal (UTC+5:45)</option>
                <option value="Asia/Dhaka">Bangladesh (UTC+6)</option>
                <option value="Australia/Sydney">Australia Eastern (AET)</option>
                <option value="Asia/Tokyo">Japan (UTC+9)</option>
                <option value="Asia/Dubai">Dubai (UTC+4)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Venue & Interactive Map */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <MapPin size={18} className="text-primary" />
            <span>5. Venue & Map Location</span>
          </div>

          <VenueMapPicker
            value={locationData}
            onChange={(loc) => setLocationData(loc)}
          />
        </CardContent>
      </Card>

      {/* 6. Categories & Tags */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Tag size={18} className="text-primary" />
            <span>6. Categories & Discovery Tags</span>
          </div>
          <p className="text-xs text-muted-foreground">Select tags to help attendees find your show in category filters.</p>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2">
            {TAG_OPTIONS.map((tag) => {
              const active = selectedTags.includes(tag.value)
              return (
                <button
                  type="button"
                  key={tag.value}
                  onClick={() => handleTagToggle(tag.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 6. Tickets & Pricing */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Ticket size={18} className="text-primary" />
            <span>6. Tickets & Pricing</span>
          </div>

          {/* Free vs Paid Toggle */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <button
              type="button"
              onClick={() => setPricingType('free')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border text-center ${
                pricingType === 'free'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              Free Event
            </button>
            <button
              type="button"
              onClick={() => setPricingType('paid')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border text-center ${
                pricingType === 'paid'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              Paid Tickets (Stripe)
            </button>
          </div>

          {pricingType === 'paid' ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="priceRange" className="text-xs font-semibold">
                  Display Price Range
                </Label>
                <Input
                  id="priceRange"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  placeholder="e.g. £15 - £35 or From £15"
                  className="h-10 rounded-xl text-sm w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Ticket Tiers</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTicketRow}
                    className="h-8 gap-1 text-xs rounded-xl"
                  >
                    <Plus size={13} /> Add Tier
                  </Button>
                </div>

                <div className="space-y-3">
                  {ticketRows.map((row, idx) => (
                    <div key={idx} className="p-3.5 sm:p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex-1 min-w-0 w-full">
                          <Input
                            value={row.name}
                            onChange={(e) => updateTicketRow(idx, 'name', e.target.value)}
                            placeholder="Tier Name (e.g. Early Bird, VIP)"
                            className="h-10 sm:h-9 rounded-xl text-xs font-semibold bg-background w-full"
                            required
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="flex items-center gap-1.5 flex-1 sm:w-32 sm:shrink-0">
                            <span className="text-sm font-bold text-muted-foreground">£</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.price}
                              onChange={(e) => updateTicketRow(idx, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="Price"
                              className="h-10 sm:h-9 rounded-xl text-xs font-mono font-bold bg-background flex-1 sm:w-full"
                              required
                            />
                          </div>

                          {ticketRows.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTicketRow(idx)}
                              className="text-muted-foreground hover:text-destructive h-10 sm:h-9 px-2.5 sm:px-2 shrink-0 rounded-xl"
                            >
                              <Trash2 size={15} />
                              <span className="sm:hidden text-xs ml-1 font-medium">Remove</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      <Input
                        value={row.description || ''}
                        onChange={(e) => updateTicketRow(idx, 'description', e.target.value)}
                        placeholder="Perks, entrance window, or inclusions (optional)"
                        className="h-9 sm:h-8 rounded-xl text-xs bg-background w-full"
                      />

                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">
                          Max per order
                        </Label>
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
                          className="h-9 sm:h-8 rounded-xl text-xs bg-background w-28"
                        />
                        <Label className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          Total stock
                        </Label>
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
                          className="h-9 sm:h-8 rounded-xl text-xs bg-background w-28"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-border bg-muted/30 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Free Registration Tier</p>
              <p>Attendees will receive a free admission QR ticket upon registration.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 8. Public Visibility & Listing Status (isEnabled) */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-foreground font-semibold min-w-0">
              <Globe size={18} className="text-primary shrink-0" />
              <span className="truncate">8. Public Visibility & Listing Status</span>
            </div>
            <span
              className={`text-[10px] sm:text-[11px] font-mono uppercase px-2 sm:px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                isEnabled
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {isEnabled ? 'Enabled / Live' : 'Disabled / Draft'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Controls whether the event is discoverable across the Afno Events public exploration feeds and mobile apps.
          </p>

          {!isTenantVerified && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
              Your organiser account is currently pending admin verification. Submitting this event will place it in <strong>Pending Review</strong> so our team can approve it before it goes live to fans.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsEnabled(true)}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 ${
                isEnabled
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/60 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Eye size={16} className="text-emerald-500 shrink-0" />
                  <span className="truncate">Public Listing (Enabled)</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold shrink-0">
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Visible to everyone on the homepage, search, and category feeds.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsEnabled(false)}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 ${
                !isEnabled
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/60 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Lock size={16} className="text-muted-foreground shrink-0" />
                  <span className="truncate">Unlisted Draft (Disabled)</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold shrink-0">
                  Private
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hidden from fans. Stored privately on your dashboard until you publish.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 9. Ticket Sales & Online Booking (isBookable) */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-foreground font-semibold min-w-0">
              <Ticket size={18} className="text-primary shrink-0" />
              <span className="truncate">9. Ticket Sales & Online Booking</span>
            </div>
            <span
              className={`text-[10px] sm:text-[11px] font-mono uppercase px-2 sm:px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                isBookable
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}
            >
              {isBookable ? 'Booking Open' : 'Booking Paused'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Controls whether attendees can register or buy tickets online. You can keep the show listed while pausing ticket checkout.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsBookable(true)}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 ${
                isBookable
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/60 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Ticket size={16} className="text-emerald-500 shrink-0" />
                  <span className="truncate">Open for Booking (isBookable)</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold shrink-0">
                  Open
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Attendees can purchase tickets or register online immediately.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsBookable(false)}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 ${
                !isBookable
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/60 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <PauseCircle size={16} className="text-amber-500 shrink-0" />
                  <span className="truncate">Booking Paused / Closed</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold shrink-0">
                  Paused
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Keeps event details visible, but disables ticket checkout (Sold Out, Door Only, Coming Soon).
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Form Action Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        {submitLabel === 'Save Changes' ? (
          <>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e)}
              disabled={isSubmitting}
              className="rounded-xl px-6 font-bold text-sm h-11 w-full sm:w-auto shadow-sm bg-primary text-primary-foreground"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Save Changes
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/organiser/dashboard')}
              className="rounded-xl h-11 px-5 text-sm text-muted-foreground hover:text-foreground w-full sm:w-auto border-border"
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, { enabled: true, isBookable })}
              disabled={isSubmitting}
              className="rounded-xl px-6 font-bold text-sm h-11 w-full sm:w-auto shadow-sm bg-primary text-primary-foreground"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {!isTenantVerified ? 'Submit for Review' : 'Publish Show Live'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, { enabled: false, isBookable })}
              disabled={isSubmitting}
              className="rounded-xl px-6 font-semibold text-sm h-11 w-full sm:w-auto border-border bg-card"
            >
              Save as Draft
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/organiser/dashboard')}
              className="rounded-xl h-11 px-5 text-sm text-muted-foreground hover:text-foreground w-full sm:w-auto"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </form>
  )
}
