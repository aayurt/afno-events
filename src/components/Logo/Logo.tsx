import { cn } from '@/utilities/ui'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = (props: Props) => {
  const { loading: loadingFromProps, priority: priorityFromProps, className } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'

  return (
    <img
      alt="Afno Events Logo"
      loading={loading}
      fetchPriority={priority}
      decoding="async"
      className={cn('max-w-[9.375rem] w-full h-[100px] object-contain', className)}
      src="/logo.png"
    />
  )
}
