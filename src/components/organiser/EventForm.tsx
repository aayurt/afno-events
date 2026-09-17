'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TAG_OPTIONS } from '@/config/tags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { VenueMapPicker, VenueLocation } from './VenueMapPicker'
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
}

export type EventFormData = {
  id?: number
  title: string
  description?: string
  coverImage?: number | null
  coverImageUrl?: string | null
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
}

type Props = {
  initial?: EventFormData | null
  onSubmit: (data: any) => Promise<void>
  submitLabel: string
}

export function EventForm({ initial, onSubmit, submitLabel }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [coverImageId, setCoverImageId] = useState<number | null>(initial?.coverImage || null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initial?.coverImageUrl || null)
  const [isUploading, setIsUploading] = useState(false)

  const toLocalInput = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    } catch {
      return ''
    }
  }

  const [startDatetime, setStartDatetime] = useState(toLocalInput(initial?.startDatetime))
  const [endDatetime, setEndDatetime] = useState(toLocalInput(initial?.endDatetime))
  
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
        }))
      : [{ name: 'General Admission', price: 15, description: 'Standard event entry' }]
  )

  const [isEnabled, setIsEnabled] = useState(initial?.enabled ?? (initial?.publish ?? true))
  const [isBookable, setIsBookable] = useState(initial?.isBookable ?? true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    setIsUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)

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

  const handleSubmit = async (
    e?: React.FormEvent,
    forceStatus?: { enabled?: boolean; isBookable?: boolean }
  ) => {
    if (e) e.preventDefault()
    if (!title.trim()) {
      setError('Please enter an event title.')
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
          }))
        : [{ name: 'Free Admission', price: 0, description: 'General free admission' }]

    const payloadData: any = {
      title,
      description,
      coverImage: coverImageId,
      startDatetime: startDatetime ? new Date(startDatetime).toISOString() : new Date().toISOString(),
      endDatetime: endDatetime ? new Date(endDatetime).toISOString() : new Date().toISOString(),
      location: {
        location: locationData.location || '',
        mapLocation: locationData.mapLocation || locationData.location || '',
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      },
      tags: selectedTags,
      pricing: {
        type: pricingType,
        priceRange: pricingType === 'paid' ? priceRange || `£${ticketRows[0]?.price || 0}` : 'Free',
        ticketTypes,
      },
      enabled: finalEnabled,
      isBookable: finalBookable,
      publish: finalEnabled,
    }

    try {
      await onSubmit(payloadData)
    } catch (err: any) {
      setError(err.message || 'Failed to save event. Please check inputs.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold">
          {error}
        </div>
      )}

      {/* 1. Basic Info */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-6 space-y-5">
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
              className="h-11 rounded-xl text-base"
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
              className="rounded-xl resize-y text-sm leading-relaxed"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Poster Artwork */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <UploadCloud size={18} className="text-primary" />
            <span>2. Poster Artwork</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-5 pt-1">
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

            <div className="space-y-3 flex-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload your official event flyer or poster. High-resolution JPG, PNG or WebP (up to 25MB). Tall portrait artwork displays best in the mobile discovery feed.
              </p>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted/60 text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                  <UploadCloud size={15} />
                  <span>{coverImageUrl ? 'Change Poster' : 'Choose File'}</span>
                  <input
                    type="file"
                    accept="image/*"
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
                    className="text-destructive text-xs hover:bg-destructive/10 h-9"
                  >
                    <Trash2 size={14} className="mr-1" /> Remove
                  </Button>
                )}
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 text-xs text-primary font-medium">
                  <Loader2 size={14} className="animate-spin" /> Uploading image to server…
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Schedule */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Calendar size={18} className="text-primary" />
            <span>3. Date & Time</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="startDatetime" className="text-xs font-semibold">
                Event Starts <span className="text-destructive">*</span>
              </Label>
              <Input
                type="datetime-local"
                id="startDatetime"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                className="h-10 rounded-xl font-mono text-xs"
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
                className="h-10 rounded-xl font-mono text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Venue & Interactive Map */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <MapPin size={18} className="text-primary" />
            <span>4. Venue & Map Location</span>
          </div>

          <VenueMapPicker
            value={locationData}
            onChange={(loc) => setLocationData(loc)}
          />
        </CardContent>
      </Card>

      {/* 5. Categories & Tags */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Tag size={18} className="text-primary" />
            <span>5. Categories & Discovery Tags</span>
          </div>
          <p className="text-xs text-muted-foreground">Select tags to help attendees find your show in category filters.</p>

          <div className="flex flex-wrap gap-2 pt-2">
            {TAG_OPTIONS.map((tag) => {
              const active = selectedTags.includes(tag.value)
              return (
                <button
                  type="button"
                  key={tag.value}
                  onClick={() => handleTagToggle(tag.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
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
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Ticket size={18} className="text-primary" />
            <span>6. Tickets & Pricing</span>
          </div>

          {/* Free vs Paid Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPricingType('free')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
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
                  className="h-10 rounded-xl text-sm"
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
                    <div key={idx} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <Input
                            value={row.name}
                            onChange={(e) => updateTicketRow(idx, 'name', e.target.value)}
                            placeholder="Tier Name (e.g. Early Bird, VIP, General Admission)"
                            className="h-9 rounded-xl text-xs font-semibold bg-background"
                            required
                          />
                        </div>

                        <div className="flex items-center gap-1.5 w-32 shrink-0">
                          <span className="text-sm font-bold text-muted-foreground">£</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.price}
                            onChange={(e) => updateTicketRow(idx, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                            className="h-9 rounded-xl text-xs font-mono font-bold bg-background"
                            required
                          />
                        </div>

                        {ticketRows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTicketRow(idx)}
                            className="text-muted-foreground hover:text-destructive h-9 w-9 shrink-0"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>

                      <Input
                        value={row.description || ''}
                        onChange={(e) => updateTicketRow(idx, 'description', e.target.value)}
                        placeholder="Perks, entrance window, or inclusions (optional)"
                        className="h-8 rounded-xl text-xs bg-background"
                      />
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

      {/* 7. Public Visibility & Listing Status (isEnabled) */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Globe size={18} className="text-primary" />
              <span>7. Public Visibility & Listing Status</span>
            </div>
            <span
              className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold ${
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsEnabled(true)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 ${
                isEnabled
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/60 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Eye size={16} className="text-emerald-500" />
                  Public Listing (Enabled)
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">
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
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 ${
                !isEnabled
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/60 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Lock size={16} className="text-muted-foreground" />
                  Unlisted Draft (Disabled)
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">
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

      {/* 8. Ticket Sales & Online Booking (isBookable) */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Ticket size={18} className="text-primary" />
              <span>8. Ticket Sales & Online Booking</span>
            </div>
            <span
              className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold ${
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
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 ${
                isBookable
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/60 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Ticket size={16} className="text-emerald-500" />
                  Open for Booking (isBookable)
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">
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
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 ${
                !isBookable
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/60 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground flex items-center gap-2">
                  <PauseCircle size={16} className="text-amber-500" />
                  Booking Paused / Closed
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">
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
        <Button
          type="button"
          onClick={(e) => handleSubmit(e, { enabled: true, isBookable })}
          disabled={isSubmitting}
          className="rounded-xl px-8 font-bold text-sm h-11 shadow-sm bg-primary text-primary-foreground"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
          {submitLabel === 'Save Changes' ? 'Save & Publish Live' : 'Publish Show Live'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={(e) => handleSubmit(e, { enabled: false, isBookable })}
          disabled={isSubmitting}
          className="rounded-xl px-6 font-semibold text-sm h-11 border-border bg-card"
        >
          Save as Draft
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/organiser/dashboard')}
          className="rounded-xl h-11 px-5 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
