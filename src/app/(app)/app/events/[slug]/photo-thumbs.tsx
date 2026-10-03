'use client'

import { useState } from 'react'
import { ImageLightbox } from '@/components/ui/image-lightbox'

/**
 * Client grid for approved attendee-photo thumbnails on the event detail
 * page: clicking opens the fullscreen lightbox (previously navigated away
 * to the gallery page).
 */
export function PhotoThumbs({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  if (images.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setLightbox(i)}
            aria-label={`View photo ${i + 1}`}
            className="block aspect-square rounded-xl overflow-hidden bg-muted cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <ImageLightbox
          images={images}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
        />
      )}
    </>
  )
}
