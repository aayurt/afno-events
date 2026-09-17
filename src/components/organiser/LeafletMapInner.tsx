'use client'

import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Configure Leaflet default marker icons (Leaflet assets often 404 in Webpack without explicit URLs)
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function MapClickHandler({ onPinChange }: { onPinChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPinChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])
  return null
}

export type LeafletMapProps = {
  latitude: number
  longitude: number
  onPinChange: (lat: number, lng: number) => void
}

export default function LeafletMapInner({ latitude, longitude, onPinChange }: LeafletMapProps) {
  const position: [number, number] = [latitude, longitude]

  return (
    <MapContainer
      center={position}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={position}
        icon={markerIcon}
        draggable
        eventHandlers={{
          dragend(e) {
            const marker = e.target
            const pos = marker.getLatLng()
            onPinChange(pos.lat, pos.lng)
          },
        }}
      />
      <MapClickHandler onPinChange={onPinChange} />
      <MapCenterUpdater center={position} />
    </MapContainer>
  )
}
