'use client'

import { MapPin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MapLinkProps {
  latitude: number | null | undefined
  longitude: number | null | undefined
  locationName?: string | null
  className?: string
}

export function MapLink({ latitude, longitude, locationName, className }: MapLinkProps) {
  const hasCoords = latitude != null && longitude != null

  if (!hasCoords) {
    return null
  }

  const encodedName = encodeURIComponent(locationName || '')
  const encodedQuery = encodeURIComponent(`${latitude},${longitude}`)

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}${encodedName ? `&query_place_id=${encodedName}` : ''}`
  const appleMapsUrl = `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedName || 'Event Location'}`

  const handleOpenMaps = (e: React.MouseEvent) => {
    e.preventDefault()

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (isIOS) {
      window.open(appleMapsUrl, '_blank')
    } else {
      window.open(googleMapsUrl, '_blank')
    }
  }

  return (
    <div className={className}>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenMaps} asChild>
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPin className="w-4 h-4" />
          {locationName || 'View on Map'}
          <ExternalLink className="w-3 h-3" />
        </a>
      </Button>
    </div>
  )
}
