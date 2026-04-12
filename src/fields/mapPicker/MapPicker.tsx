'use client'

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { useState, useEffect, useMemo, FormEvent } from 'react'
import { useField, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = defaultIcon

function LocationMarker({
  latValue,
  lngValue,
  setLat,
  setLng,
}: {
  latValue: number | null
  lngValue: number | null
  setLat: (val: number) => void
  setLng: (val: number) => void
}) {
  const defaultPos: [number, number] = [27.7172, 85.3240] // Kathmandu
  const [position, setPosition] = useState<[number, number]>(
    latValue && lngValue ? [latValue, lngValue] : defaultPos,
  )

  useEffect(() => {
    if (latValue && lngValue) {
      setPosition([latValue, lngValue])
    }
  }, [latValue, lngValue])

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      setLat(e.latlng.lat)
      setLng(e.latlng.lng)
    },
  })

  return <Marker position={position} />
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])
  return null
}

type MapPickerProps = {
  latPath?: string
  lngPath?: string
  namePath?: string
  mapLocationPath?: string
} & UIFieldClientProps

const MapPickerComponent: React.FC<MapPickerProps> = ({ latPath, lngPath, namePath, mapLocationPath }) => {
  const actualLatPath = latPath || 'location.latitude'
  const actualLngPath = lngPath || 'location.longitude'
  const actualNamePath = namePath || 'location.location'
  const actualMapLocationPath = mapLocationPath || 'location.mapLocation'

  const latField = useField<number | null>({ path: actualLatPath })
  const lngField = useField<number | null>({ path: actualLngPath })
  const nameField = useField<string | null>({ path: actualNamePath })
  const mapLocationField = useField<string | null>({ path: actualMapLocationPath })

  const { value: latValue, setValue: setLat } = latField
  const { value: lngValue, setValue: setLng } = lngField
  const { setValue: setName } = nameField
  const { setValue: setMapLocation } = mapLocationField

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const center = useMemo<[number, number]>(() => {
    if (latValue && lngValue) {
      return [latValue, lngValue]
    }
    return [27.7172, 85.3240]
  }, [latValue, lngValue])

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data)
    } catch (err) {
      console.error('Map search failed', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectResult = (result: any) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    setLat(lat)
    setLng(lon)
    setName(result.display_name)
    setMapLocation(result.display_name)
    setSearchResults([])
    setSearchQuery('')
  }

  return (
    <div className="map-picker-container" style={{ marginTop: '10px' }}>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch(e as any);
            }
          }}
          placeholder="Search for a location..."
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#333', color: '#fff', cursor: 'pointer' }}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0', border: '1px solid #eee', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
          {searchResults.map((result: any, i: number) => (
            <li
              key={i}
              onClick={() => handleSelectResult(result)}
              style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '13px' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.color = '#fff' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff' }}
            >
              {result.display_name}
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginBottom: '10px', fontSize: '13px', color: '#666' }}>
        Or click on the map to select location: {latValue?.toFixed(6)}, {lngValue?.toFixed(6)}
      </div>

      <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
        <MapContainer
          center={center}
          zoom={latValue && lngValue ? 15 : 13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={center} />
          <LocationMarker latValue={latValue} lngValue={lngValue} setLat={setLat} setLng={setLng} />
        </MapContainer>
      </div>
    </div>
  )
}

export const MapPicker: React.FC<MapPickerProps> = MapPickerComponent
