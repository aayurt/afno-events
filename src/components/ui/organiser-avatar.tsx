'use client'

import { useState } from 'react'
import { cn } from '@/utilities/ui'

/**
 * Organiser avatar: logo image when available, otherwise a coloured
 * initial-letter tile (no more generic silhouette). If the image URL is
 * dead (missing file), falls back to the letter tile automatically.
 */
export function OrganiserAvatar({
  name,
  imageUrl,
  className,
  textClassName,
}: {
  name?: string | null
  imageUrl?: string | null
  className?: string
  textClassName?: string
}) {
  const [imgFailed, setImgFailed] = useState(false)

  if (imageUrl && !imgFailed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={imageUrl}
        alt={name || ''}
        onError={() => setImgFailed(true)}
        className={cn('object-cover', className)}
      />
    )
  }

  const letter = (name?.trim()?.charAt(0) || '?').toUpperCase()
  let hash = 0
  for (const ch of name || '?') hash = (hash * 31 + ch.charCodeAt(0)) % 360

  return (
    <div
      aria-label={name || undefined}
      style={{ backgroundColor: `hsl(${hash} 55% 42%)` }}
      className={cn('flex items-center justify-center font-bold text-white shrink-0', className)}
    >
      <span className={textClassName}>{letter}</span>
    </div>
  )
}
