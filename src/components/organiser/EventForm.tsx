'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TAG_OPTIONS } from '@/config/tags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, ImageIcon, Loader2, Plus, Trash2, UploadCloud } from 'lucide-react'

export default function EventForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coverImageId, setCoverImageId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [startDatetime, setStartDatetime] = useState('')
  const [endDatetime, setEndDatetime] = useState('')
  const [location, setLocation] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [pricingType, setPricingType] = useState<'free' | 'paid'>('free')
  const [priceRange, setPriceRange] = useState('Free')
  const [ticketRows, setTicketRows] = useState<
    { name: string; price: number; description: string }[]
  >([{ name: '', price: 0, description: '' }])
  const [isPublish, setIsPublish] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleTagChange = (value: string) => {
    setSelectedTags(prev => {
      if (prev.includes(value)) return prev.filter(v => v !== value)
      return [...prev, value]
    })
  }

  const addTicketRow = () => {
    setTicketRows(prev => {
      if (prev.length >= 5) return prev
      return [...prev, { name: '', price: 0, description: '' }]
    })
  }

  const removeTicketRow = (idx: number) => {
    setTicketRows(prev => {
      if (prev.length <= 1) return prev
      return prev.slice(0, -1)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const ticketTypes = pricingType === 'paid'
      ? ticketRows.map(row => ({ name: row.name, price: row.price, description: row.description }))
      : [{ name: 'Free Admission', price: 0, description: 'General free admission' }]

    const formData = {
      title,
      description,
      coverImage: coverImageId,
      startDatetime,
      endDatetime,
      location,
      tags: selectedTags,
      pricing: {
        type: pricingType,
        priceRange,
        ticketTypes,
      },
      publish: isPublish,
    }

    try {
      const res = await fetch('/api/organiser/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to create event')
        return
      }

      const data = await res.json()
      router.push(`/organiser/events/${data.id}`)
    } catch (err) {
      alert('Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const res = await fetch('/api/organiser/media', {
        method: 'POST',
        body: new FormData(),
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Upload failed')
        return
      }
      const data = await res.json()
      setCoverImageId(data.id.toString())
      setCoverImageUrl(data.url)
    } catch (err) {
      alert('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">Create Event</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basics section */}
        <Card>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle((e.target as HTMLInputElement).value)}
                  placeholder="Event title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription((e.target as HTMLTextAreaElement).value)}
                  placeholder="Description of the event"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Poster Image section */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
              <Label>Poster Image</Label>
            </div>
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !coverImageUrl ? (
              <div className="border rounded border-border p-4 text-muted-foreground hover:border-primary cursor-pointer">
                <ImageIcon className="h-6 w-6 mb-2" />
                <span>Click to upload poster image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <img
                  src={coverImageUrl}
                  alt="Poster"
                  className="w-24 h-16 rounded object-cover"
                />
                <div>
                  <p className="font-medium">Preview</p>
                  <p className="text-xs text-muted-foreground">{coverImageUrl.substring(0, 50)}...</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setCoverImageUrl(null); setCoverImageId(null) }}
                >
                  <Trash2 size={16} /> Remove
                </Button>
              </div>
            )}
            <input
              type="hidden"
              name="coverImageId"
              value={coverImageId || ''}
            />
          </CardContent>
        </Card>

        {/* When & Where section */}
        <Card>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Starts <span className="text-red-500">*</span></Label>
                <Input
                  type="datetime-local"
                  id="startDatetime"
                  value={startDatetime || ''}
                  onChange={e => setStartDatetime((e.target as HTMLInputElement).value)}
                  required
                />
              </div>
              <div>
                <Label>Ends</Label>
                <Input
                  type="datetime-local"
                  id="endDatetime"
                  value={endDatetime || ''}
                  onChange={e => setEndDatetime((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Venue</Label>
                <Input
                  type="text"
                  id="location"
                  value={location || ''}
                  onChange={e => setLocation((e.target as HTMLInputElement).value)}
                  placeholder="Venue name or address"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category section */}
        <Card>
          <CardContent>
            <Label>Tags</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {TAG_OPTIONS.map((tag) => (
                <Label
                  key={tag.value}
                  className="flex items-center gap-1 border rounded px-2 py-1 text-sm"
                  onClick={() => handleTagChange(tag.value)}
                  style={{
                    background:
                      selectedTags.includes(tag.value) ? 'bg-primary' : 'bg-background',
                    color:
                      selectedTags.includes(tag.value)
                        ? 'bg-primary-foreground'
                        : 'text-primary',
                  }}>
                  <span>{tag.label}</span>
                </Label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tickets section */}
        <Card>
          <CardContent>
            <Label>Pricing Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => setPricingType('free')}
                disabled={pricingType === 'free'}
                className={pricingType === 'free' ? 'border-primary text-primary' : ''}
              >
                Free
              </Button>
              <Button
                variant="outline"
                onClick={() => setPricingType('paid')}
                disabled={pricingType === 'paid'}
                className={pricingType === 'paid' ? 'border-primary text-primary' : ''}
              >
                Paid
              </Button>
            </div>

            {pricingType === 'paid' && (
              <div className="mt-4 space-y-3">
                <Label>Price Range</Label>
                <Input
                  type="text"
                  placeholder="e.g. £5.00 - £15.00"
                  value={priceRange || ''}
                  onChange={e => setPriceRange((e.target as HTMLInputElement).value)}
                />

                <div className="space-y-2">
                  {ticketRows.map((row, idx) => (
                    <div key={idx} className="border rounded p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={row.name}
                          onChange={e => {
                            setTicketRows(prev =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, name: (e.target as HTMLInputElement).value } : r,
                              ),
                            )
                          }}
                        />
                        <Input
                          type="number"
                          value={row.price}
                          onChange={e => {
                            setTicketRows(prev =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, price: Number((e.target as HTMLInputElement).value) } : r,
                              ),
                            )
                          }}
                        />
                        <Textarea
                          value={row.description || ''}
                          onChange={e => {
                            setTicketRows(prev =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, description: (e.target as HTMLTextAreaElement).value } : r,
                              ),
                            )
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTicketRow(idx)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="link"
                    onClick={() => addTicketRow()}
                    className="text-primary hover:text-primary/90"
                  >
                    <Plus size={14} /> Add ticket type
                  </Button>
                </div>
              </div>
            )}

            {pricingType === 'free' && (
              <p className="mt-2 text-sm text-muted-foreground">
                Free Admission: General free admission
              </p>
            )}
          </CardContent>
        </Card>

        {/* Publish toggle */}
        <Card>
          <CardContent className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isPublish}
              onChange={(e) => setIsPublish(e.target.checked)}
              id="publish"
            />
            <Label htmlFor="publish">
              Publish immediately (make visible to fans)
            </Label>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4" />
            ) : null}
            Create Event
          </Button>
        </div>
      </form>
    </div>
  )
}