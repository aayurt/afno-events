'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false)
      }}
    >
      <div className="bg-background rounded-2xl shadow-xl border border-border w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
      <div className="text-lg font-semibold">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6 space-y-4">{children}</div>
}
