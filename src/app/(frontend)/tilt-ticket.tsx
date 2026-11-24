'use client'

import React, { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, QrCode, Sparkles, Ticket } from 'lucide-react'

interface TiltTicketProps {
  event: any
  featuredCover?: string | null
  isBookable?: boolean
  isExpired?: boolean
  priceText: string
}

export function TiltTicketCard({
  event,
  featuredCover,
  isBookable,
  isExpired,
  priceText,
}: TiltTicketProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [sheenPos, setSheenPos] = useState({ x: 50, y: 50, opacity: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Maximum tilt angles (degrees)
    const maxTilt = 14
    const rotX = ((y - centerY) / centerY) * -maxTilt
    const rotY = ((x - centerX) / centerX) * maxTilt

    setRotateX(rotX)
    setRotateY(rotY)

    // Sheen reflection position (%)
    const sheenX = (x / rect.width) * 100
    const sheenY = (y / rect.height) * 100
    setSheenPos({ x: sheenX, y: sheenY, opacity: 0.65 })
  }, [])

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotateX(0)
    setRotateY(0)
    setSheenPos((prev) => ({ ...prev, opacity: 0 }))
  }

  const formattedDate = event.startDatetime
    ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).toUpperCase()
    : 'DATE TBD'

  const locationCity = event.location?.location
    ? event.location.location.split(',')[0].toUpperCase()
    : 'UK'

  return (
    <div
      className="perspective-[1200px] w-full flex items-center justify-center py-2"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={`/app/events/${event.slug || event.id}`}
        className="block w-full outline-none focus:outline-none"
      >
        <div
          ref={cardRef}
          style={{
            transform: isHovered
              ? `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(24px) scale3d(1.02, 1.02, 1.02)`
              : 'rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)',
            transition: isHovered
              ? 'transform 0.08s ease-out'
              : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
            transformStyle: 'preserve-3d',
          }}
          className="relative w-full aspect-[4/5] sm:aspect-[3/4] rounded-[16px] overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl cursor-pointer bg-slate-950 select-none group"
        >
          {/* 3D Depth Layer 1: Poster Background */}
          {featuredCover ? (
            <img
              src={featuredCover}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
              <Calendar className="w-16 h-16 text-alpine-500/30" />
            </div>
          )}

          {/* Depth Layer 2: Gradient Ambient Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20 pointer-events-none" />

          {/* Depth Layer 3: Dynamic Holographic Light Sheen */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-300"
            style={{
              opacity: sheenPos.opacity,
              background: `radial-gradient(circle 320px at ${sheenPos.x}% ${sheenPos.y}%, rgba(220, 21, 60, 0.45), rgba(255, 255, 255, 0.4) 30%, rgba(120, 220, 255, 0.25) 55%, transparent 75%)`,
            }}
          />

          {/* Depth Layer 4: Diagonal Prismatic Foil Shimmer */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity duration-500"
            style={{
              background:
                'linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.4) 45%, rgba(220,21,60,0.5) 50%, rgba(255,255,255,0.4) 55%, transparent 80%)',
              backgroundSize: '250% 250%',
              transform: `translate(${rotateY * 2}px, ${rotateX * 2}px)`,
            }}
          />

          {/* Depth Layer 5: Glass Border Ring */}
          <div className="absolute inset-0 rounded-[16px] ring-1 ring-inset ring-white/25 pointer-events-none" />

          {/* Depth Layer 6: Floating Header Elements (translates in 3D Z-plane) */}
          <div
            className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none"
            style={{
              transform: 'translateZ(30px)',
            }}
          >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-lg">
              <span className="w-2 h-2 rounded-full bg-alpine-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                {isBookable ? 'VIP Pass • Bookable' : isExpired ? 'Archived Pass' : 'Exclusive Pass'}
              </span>
            </div>

            <div className="w-8 h-8 rounded-[6px] bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 shadow-lg">
              <QrCode size={16} />
            </div>
          </div>

          {/* Perforated Ticket Notches (Decorative Authentic Ticket Element) */}
          <div className="absolute left-0 bottom-24 -translate-x-1/2 w-5 h-5 rounded-full bg-white dark:bg-slate-950 border border-black/40 z-20 pointer-events-none" />
          <div className="absolute right-0 bottom-24 translate-x-1/2 w-5 h-5 rounded-full bg-white dark:bg-slate-950 border border-black/40 z-20 pointer-events-none" />
          <div className="absolute left-4 right-4 bottom-26.5 border-b border-dashed border-white/25 pointer-events-none" />

          {/* Depth Layer 7: Floating Bottom Ticket Metadata */}
          <div
            className="absolute inset-x-0 bottom-0 p-5 space-y-2 text-left pointer-events-none"
            style={{
              transform: 'translateZ(40px)',
            }}
          >
            {/* Red Monospace Kicker */}
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-alpine-400 flex items-center gap-1.5 drop-shadow-md">
              <Calendar size={12} className="shrink-0" />
              <span>{formattedDate}</span>
              <span>•</span>
              <MapPin size={12} className="shrink-0" />
              <span className="truncate max-w-[160px]">{locationCity}</span>
            </div>

            {/* Heavy Title */}
            <h2 className="text-2xl sm:text-3xl font-sans font-black text-white leading-tight drop-shadow-lg line-clamp-2">
              {event.title}
            </h2>

            {/* Ticket Stub Footer Row */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-[4px] bg-white/10 backdrop-blur-md border border-white/20 text-white font-mono text-xs font-black shadow-xs flex items-center gap-1.5">
                  <Ticket size={12} className="text-alpine-400" />
                  <span>{priceText}</span>
                </div>
                <span className="text-[10px] font-mono text-white/70 uppercase tracking-widest hidden sm:inline">
                  Verified Gate Access
                </span>
              </div>

              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-[4px] bg-alpine-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg group-hover:bg-alpine-500 transition-colors">
                <span>Book</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
