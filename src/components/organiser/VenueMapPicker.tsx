'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { LeafletMapProps } from './LeafletMapInner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin, Search, Navigation } from 'lucide-react'

export type VenueLocation = {
  location: string
  mapLocation?: string
  latitude?: number
  longitude?: number
}

type Props = {
  value?: VenueLocation
  onChange: (loc: VenueLocation) => void
}

// Leaflet map component loaded client-side only
const LeafletMap = dynamic<LeafletMapProps>(
  () => import('./LeafletMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full rounded-[6px] bg-alpine-50/50 dark:bg-slate-900/60 flex flex-col items-center justify-center text-muted-foreground border border-alpine-500/30">
        <Loader2 className="animate-spin mb-2 text-alpine-500" size={24} />
        <span className="text-xs font-mono">Loading map view…</span>
      </div>
    ),
  }
)

export function VenueMapPicker({ value, onChange }: Props) {
  const [venueName, setVenueName] = useState(value?.location || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [showMap, setShowMap] = useState(Boolean(value?.latitude && value?.longitude))

  useEffect(() => {
    if (value?.location !== undefined && value.location !== venueName) {
      setVenueName(value.location || '')
    }
  }, [value?.location])

  const handleVenueNameChange = (name: string) => {
    setVenueName(name)
    onChange({
      ...value,
      location: name,
      mapLocation: value?.mapLocation || name,
      latitude: value?.latitude,
      longitude: value?.longitude,
    })
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = searchQuery.trim() || venueName.trim()
    if (!q) return

    setIsSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      setResults(data || [])
      setShowMap(true)
    } catch (err) {
      console.error('Location search failed', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectResult = (item: any) => {
    const lat = parseFloat(item.lat)
    const lon = parseFloat(item.lon)
    const displayName = item.display_name

    // If venue name is blank or generic, set it to the location name
    const finalName = venueName || displayName.split(',')[0]
    setVenueName(finalName)
    setResults([])
    setSearchQuery('')
    setShowMap(true)

    onChange({
      location: finalName,
      mapLocation: displayName,
      latitude: lat,
      longitude: lon,
    })
  }

  const handleMapPinMove = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      const displayName = data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      onChange({
        location: venueName || displayName.split(',')[0],
        mapLocation: displayName,
        latitude: lat,
        longitude: lng,
      })
    } catch {
      onChange({
        location: venueName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        mapLocation: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        latitude: lat,
        longitude: lng,
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Venue Name Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="venueName" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Venue Name or Address <span className="text-destructive">*</span>
          </Label>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="text-xs text-alpine-600 dark:text-alpine-400 font-mono font-medium hover:underline flex items-center gap-1"
          >
            <MapPin size={12} />
            {showMap ? 'Hide map' : 'Choose on map'}
          </button>
        </div>
        <div className="relative">
          <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="venueName"
            value={venueName}
            onChange={(e) => handleVenueNameChange(e.target.value)}
            placeholder="e.g. Scala, 275 Pentonville Rd, London"
            className="pl-9 h-9 rounded-[4px] border-alpine-500/30 text-xs sm:text-sm"
            required
          />
        </div>
      </div>

      {/* Map search & interactive picker */}
      {showMap && (
        <div className="p-3.5 rounded-[6px] border border-alpine-500/30 bg-alpine-50/50 dark:bg-slate-900 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                placeholder="Search city, venue or postcode..."
                className="pl-8 h-8 rounded-[4px] border-alpine-500/30 text-xs bg-white dark:bg-slate-900 w-full"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="rounded-[4px] h-8 text-xs font-mono gap-1 px-3 shrink-0 border-alpine-500/30"
            >
              {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
              <span className="hidden sm:inline">Search</span>
            </Button>
          </div>

          {/* Search suggestions dropdown */}
          {results.length > 0 && (
            <div className="border border-alpine-500/30 rounded-[4px] bg-white dark:bg-slate-900 overflow-hidden divide-y divide-alpine-500/15 text-xs shadow-md max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left p-2.5 hover:bg-alpine-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-2 min-w-0"
                >
                  <MapPin size={13} className="text-alpine-500 shrink-0 mt-0.5" />
                  <span className="truncate flex-1 font-sans">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Interactive Leaflet Map */}
          <div className="h-56 sm:h-64 w-full rounded-[4px] overflow-hidden border border-alpine-500/30 shadow-xs">
            <LeafletMap
              latitude={value?.latitude || 51.5312} // Default London
              longitude={value?.longitude || -0.1226}
              onPinChange={handleMapPinMove}
            />
          </div>

          {value?.mapLocation && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono min-w-0">
              <span className="font-semibold text-foreground shrink-0 uppercase text-[10px]">PINNED:</span>
              <span className="truncate flex-1">{value.mapLocation}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
