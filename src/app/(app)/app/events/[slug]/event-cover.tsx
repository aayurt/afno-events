'use client'

import { useState } from 'react'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { cn } from '@/utilities/ui'

/**
 * Clickable event cover: opens the shared fullscreen lightbox for a
 * larger view. Wraps the hero artwork (mobile + desktop variants).
 */
export function EventCoverImage({
  src,
  alt,
  className,
  imgClassName,
}: {
  src: string
  alt: string
  className?: string
  imgClassName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View cover image larger"
        className={cn('cursor-zoom-in', className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={imgClassName} />
      </button>
      {open && (
        <ImageLightbox images={[src]} index={0} onClose={() => setOpen(false)} onNavigate={() => {}} />
      )}
    </>
  )
}
