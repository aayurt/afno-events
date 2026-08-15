'use client'

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export type MapRow = {
  id: number
  user: any
  lat: number
  lng: number
}

export function CircleLiveMap({
  rows,
  myUserId,
  center,
  zoom,
}: {
  rows: MapRow[]
  myUserId: string | undefined
  center: [number, number]
  zoom: number
}) {
  const colorFor = (row: MapRow) =>
    String(row.user?.id ?? row.user) === String(myUserId) ? '#3b82f6' : '#22c55e'
  const nameFor = (user: any) =>
    !user
      ? 'Unknown'
      : typeof user === 'number'
        ? `User ${user}`
        : user.name || `User ${user.id ?? ''}`

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {rows.map((row) => (
        <CircleMarker
          key={row.id}
          center={[row.lat, row.lng]}
          radius={String(row.user?.id ?? row.user) === String(myUserId) ? 9 : 7}
          pathOptions={{
            color: colorFor(row),
            fillColor: colorFor(row),
            fillOpacity: 0.35,
            weight: 2,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <div className="text-xs font-medium">
              {nameFor(row.user)}
              {String(row.user?.id ?? row.user) === String(myUserId) && ' (you)'}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
