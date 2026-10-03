import { cn } from '@/utilities/ui'

/**
 * Organiser avatar: logo image when available, otherwise a coloured
 * initial-letter tile (no more generic silhouette).
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
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={name || ''} className={cn('object-cover', className)} />
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
