'use client'

import dynamic from 'next/dynamic'

export const MapPickerDynamic = dynamic(
  () => import('./MapPicker').then((mod) => mod.MapPicker),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: '300px', background: '#f0f0f0', borderRadius: '8px' }}>
        Loading map...
      </div>
    ),
  },
)
